# -*- coding: utf-8 -*-
"""
pm25/air4thai_pm25_hourly.py

✅ เป้าหมาย (ตามที่คุณสั่ง):
1) โหลด station_id_new ทุกตำแหน่งจากตาราง stations
2) โหลดข้อมูลจาก Air4Thai (JSON -> fallback XML) เพื่อได้ station_id + พิกัด + เวลา + ค่ามลพิษ
3) สร้าง station_id_new จาก station_id + latitude + longitude แล้วตรวจว่ามีใน stations
4) ตาราง pm25_hourly "ไม่เก็บที่อยู่/latlon/name/type" เก็บเฉพาะ:
   - station_id_new, air4_time (timestamptz), pm25, pm10, o3, co, no2, so2
5) ถ้าไม่มีพิกัดหรือ station_id_new ไม่พบใน stations -> ข้าม + log เตือน
6) เก็บเฉพาะข้อมูลวันที่ปัจจุบันตามเวลา Asia/Bangkok

✅ FIX เวลา "ให้ถูกแน่นอน":
- รองรับวันที่หลายรูปแบบ: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY และกรณีปี พ.ศ. (>=2400) จะลบ 543
- รองรับเวลา: HH:MM, HH:MM:SS, 1000, 930, 9:30 ฯลฯ -> normalize เป็น HH:MM:SS
- ตีความเวลาจาก Air4Thai เป็น "เวลาไทย" (Asia/Bangkok) แบบ tz-aware
- ก่อน insert ลง timestamptz จะ convert เป็น UTC (best practice) เพื่อกันแสดงผลเหลื่อมตาม environment

✅ FIX mapping รองรับสถานีย้ายตำแหน่ง:
- สร้าง station_id_new รูปแบบ station_id_latitude_longitude โดยพิกัดมีทศนิยม 6 ตำแหน่ง
- เทียบ station_id_new กับทุกตำแหน่งที่มีใน stations โดยตรง
"""

import os
import re
import requests
import numpy as np
import pandas as pd
import xml.etree.ElementTree as ET
from datetime import date, datetime
from typing import Optional, Tuple
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from requests.exceptions import SSLError
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib3.exceptions import InsecureRequestWarning
from zoneinfo import ZoneInfo

try:
    from notify.discord_notify import send_custom_discord_message
except ImportError:
    send_custom_discord_message = None


# =========================
# URLs / Headers
# =========================
AIR4_JSON_URLS = [
    "https://air4thai.pcd.go.th/services/getNewAQI_JSON.php",
    "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php",
]
AIR4_XML_URLS = [
    "https://air4thai.pcd.go.th/services/getNewAQI_XML.php",
    "http://air4thai.pcd.go.th/services/getNewAQI_XML.php",
]

REQ_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; envocc-airflow/1.0)",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    "Connection": "close",
}

POLLUTANTS = {
    "pm25": ["AQILast.PM25.value", "AQILast.PM2.5.value", "AQILast.PM25", "AQILast.PM2.5"],
    "pm10": ["AQILast.PM10.value", "AQILast.PM10"],
    "o3":   ["AQILast.O3.value", "AQILast.O3"],
    "co":   ["AQILast.CO.value", "AQILast.CO"],
    "no2":  ["AQILast.NO2.value", "AQILast.NO2"],
    "so2":  ["AQILast.SO2.value", "AQILast.SO2"],
}
INVALID_NUM = {-1.0, -999.0}

TH_TZ = ZoneInfo("Asia/Bangkok")
AIR4THAI_HOST = "air4thai.pcd.go.th"


# =========================
# small helpers
# =========================
def flatten(obj, p="", out=None):
    """flatten nested dict/list -> dot keys"""
    out = {} if out is None else out
    if isinstance(obj, dict):
        for k, v in obj.items():
            flatten(v, f"{p}.{k}" if p else k, out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            flatten(v, f"{p}.{i}", out)
    else:
        out[p] = obj
    return out


def clean_str(s: pd.Series) -> pd.Series:
    """string: trim, NaN -> '' """
    if s is None:
        return pd.Series(dtype="string")
    return s.astype("string").fillna("").str.strip().replace("^nan$", "", regex=True)


def clean_num(s: pd.Series) -> pd.Series:
    """numeric: to float, -1/-999 -> NaN"""
    n = pd.to_numeric(clean_str(s), errors="coerce")
    return n.where(~n.isin(INVALID_NUM))


def build_station_id_new(station_id: object, latitude: object, longitude: object) -> str:
    """Build the same location-based station ID used by stations.py."""
    sid = str(station_id or "").strip()
    if not sid:
        return ""
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return ""
    if not np.isfinite(lat) or not np.isfinite(lon):
        return ""
    return f"{sid}_{lat:.6f}_{lon:.6f}"


def pick(df: pd.DataFrame, keys: list[str]) -> pd.Series:
    """pick first existing column from keys"""
    for k in keys:
        if k in df.columns:
            return df[k]
    return pd.Series([np.nan] * len(df))


def _looks_like_html(text_: str) -> bool:
    t = (text_ or "").lstrip().lower()
    return t.startswith("<!doctype") or t.startswith("<html") or "<head" in t[:500]


def _load_env():
    """load .env (one folder up from this file)"""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(dotenv_path=env_path)


def _engine():
    """build postgres engine from env"""
    return create_engine(
        f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}",
        pool_pre_ping=True,
    )


def _session_with_retries() -> requests.Session:
    """requests session with retry/backoff"""
    sess = requests.Session()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1.0,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    sess.mount("https://", adapter)
    sess.mount("http://", adapter)
    return sess


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _air4thai_ssl_fallback_enabled() -> bool:
    """
    Air4Thai has periodically served an incomplete TLS chain. Keep normal
    certificate verification first, then allow a scoped fallback for this host.
    Set AIR4THAI_ALLOW_INSECURE_SSL=false to disable the fallback.
    """
    return _bool_env("AIR4THAI_ALLOW_INSECURE_SSL", default=True)


def _request_get(
    sess: requests.Session,
    url: str,
    timeout_s: int,
    *,
    verify_ssl: bool = True,
) -> requests.Response:
    """GET with connect/read timeout + log preview"""
    timeout = (10, timeout_s)  # (connect, read)
    r = sess.get(
        url,
        headers=REQ_HEADERS,
        timeout=timeout,
        allow_redirects=True,
        verify=verify_ssl,
    )
    ct = (r.headers.get("Content-Type") or "")
    preview = (r.text or "")[:200].replace("\n", " ").replace("\r", " ")
    verify_label = "on" if verify_ssl else "off"
    print(
        f"[HTTP] url={url} status={r.status_code} final={r.url} "
        f"verify_ssl={verify_label} ct={ct} preview={preview}"
    )
    return r


def _request_air4thai_get(sess: requests.Session, url: str, timeout_s: int) -> requests.Response:
    """GET Air4Thai endpoint with verified TLS first and scoped cert fallback."""
    try:
        return _request_get(sess, url, timeout_s=timeout_s, verify_ssl=True)
    except SSLError as e:
        if AIR4THAI_HOST not in url or not _air4thai_ssl_fallback_enabled():
            raise

        print(
            "[WARN] Air4Thai SSL verification failed; retrying this host with "
            f"verify_ssl=off. Set AIR4THAI_ALLOW_INSECURE_SSL=false to disable. error={repr(e)}"
        )
        requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
        return _request_get(sess, url, timeout_s=timeout_s, verify_ssl=False)


# =========================
# fetch Air4Thai (JSON -> XML fallback)
# =========================
def _fetch_json(sess: requests.Session, timeout_s: int) -> pd.DataFrame:
    last_err = None
    for url in AIR4_JSON_URLS:
        try:
            r = _request_air4thai_get(sess, url, timeout_s=timeout_s)
            if r.status_code != 200:
                raise RuntimeError(f"JSON HTTP {r.status_code}")

            ct = (r.headers.get("Content-Type") or "").lower()
            if ("json" not in ct) and _looks_like_html(r.text):
                raise RuntimeError(f"JSON returned HTML (ct={ct})")

            j = r.json()
            stations = j.get("stations", [])
            raw = pd.DataFrame([flatten(x) for x in stations])
            if raw.empty:
                raise RuntimeError("JSON stations empty")
            print(f"[OK] JSON rows={len(raw)} via {url}")
            return raw
        except Exception as e:
            last_err = e
            print(f"[WARN] JSON failed via {url}: {repr(e)}")

    raise RuntimeError(f"All JSON endpoints failed: {repr(last_err)}")


def _fetch_xml(sess: requests.Session, timeout_s: int) -> pd.DataFrame:
    last_err = None
    for url in AIR4_XML_URLS:
        try:
            r = _request_air4thai_get(sess, url, timeout_s=timeout_s)
            if r.status_code != 200:
                raise RuntimeError(f"XML HTTP {r.status_code}")
            if _looks_like_html(r.text):
                raise RuntimeError("XML returned HTML")

            root = ET.fromstring(r.text)
            rows = []
            for st in root.findall(".//station"):
                station_id = (st.findtext("stationID") or "").strip()
                latitude = (st.findtext("lat") or st.findtext("latitude") or "").strip()
                longitude = (st.findtext("long") or st.findtext("longitude") or "").strip()

                # พยายามหา date/time จากหลาย node (เผื่อ schema เปลี่ยน)
                date_txt, time_txt = "", ""
                for base in [".//AQILast", ".//LastUpdate", "."]:
                    b = st.find(base)
                    if b is None:
                        continue
                    d = (b.findtext("date") or "").strip()
                    t = (b.findtext("time") or "").strip()
                    if d:
                        date_txt = d
                    if t:
                        time_txt = t
                    if date_txt and time_txt:
                        break

                row = {
                    "stationID": station_id,
                    "lat": latitude,
                    "long": longitude,
                    "AQILast.date": date_txt,
                    "AQILast.time": time_txt,
                }

                # ค่า pollutants ใน XML จะมาเป็น attribute value
                for tag in ["PM25", "PM10", "O3", "CO", "NO2", "SO2"]:
                    el = st.find(f".//{tag}")
                    row[f"AQILast.{tag}.value"] = (el.attrib.get("value") or "").strip() if el is not None else ""

                rows.append(row)

            raw = pd.DataFrame(rows)
            if raw.empty:
                raise RuntimeError("XML stations empty")
            print(f"[OK] XML rows={len(raw)} via {url}")
            return raw
        except Exception as e:
            last_err = e
            print(f"[WARN] XML failed via {url}: {repr(e)}")

    raise RuntimeError(f"All XML endpoints failed: {repr(last_err)}")


def fetch_air4thai(timeout_s: int = 30) -> pd.DataFrame:
    """fetch stations AQI data (flattened)"""
    with _session_with_retries() as sess:
        try:
            return _fetch_json(sess, timeout_s=timeout_s)
        except Exception as e:
            print(f"[WARN] JSON fetch failed -> fallback XML: {repr(e)}")
            return _fetch_xml(sess, timeout_s=timeout_s)


# =========================
# robust datetime parser (TH time -> UTC for timestamptz)
# =========================
def _fix_be_year(date_txt: str) -> str:
    """
    แก้ปี พ.ศ. -> ค.ศ. (ถ้า year >= 2400 ให้ลบ 543)
    รองรับ:
      - DD/MM/YYYY
      - DD-MM-YYYY
      - YYYY-MM-DD
    """
    t = (date_txt or "").strip()
    if not t:
        return t

    # DD/MM/YYYY หรือ DD-MM-YYYY
    m = re.match(r"^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*$", t)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y >= 2400:
            y -= 543
        return f"{d:02d}/{mo:02d}/{y:04d}"

    # YYYY-MM-DD
    m = re.match(r"^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$", t)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y >= 2400:
            y -= 543
        return f"{y:04d}-{mo:02d}-{d:02d}"

    return t


def _fix_time(time_txt: str) -> str:
    """
    ทำให้เวลาเป็น HH:MM:SS เสมอ
    รองรับ:
      - "1000" -> "10:00:00"
      - "930"  -> "09:30:00"
      - "9:30" -> "09:30:00"
      - "09:30" / "09:30:00"
    """
    t = (time_txt or "").strip()
    if not t:
        return t

    # ตัวเลขล้วน เช่น 930, 1000
    if re.fullmatch(r"\d{3,4}", t):
        if len(t) == 3:
            h = int(t[0])
            m = int(t[1:3])
        else:
            h = int(t[0:2])
            m = int(t[2:4])
        return f"{h:02d}:{m:02d}:00"

    # HH:MM หรือ H:MM
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", t)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        return f"{h:02d}:{mi:02d}:00"

    # HH:MM:SS หรือ H:MM:SS
    m = re.fullmatch(r"(\d{1,2}):(\d{2}):(\d{2})", t)
    if m:
        h, mi, ss = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{h:02d}:{mi:02d}:{ss:02d}"

    return t


def parse_air4_datetime_th(date_s: pd.Series, time_s: pd.Series) -> pd.Series:
    """
    ✅ parse:
    - fix พ.ศ.
    - fix เวลา
    - parse หลาย format
    - localize ไทย -> convert UTC (สำหรับ timestamptz)
    """
    ds = clean_str(date_s).map(_fix_be_year)
    ts = clean_str(time_s).map(_fix_time)
    dt_txt = (ds + " " + ts).str.strip()

    dt1 = pd.to_datetime(dt_txt, format="%Y-%m-%d %H:%M:%S", errors="coerce")
    dt2 = pd.to_datetime(dt_txt, format="%d/%m/%Y %H:%M:%S", errors="coerce")
    dt3 = pd.to_datetime(dt_txt, format="%d-%m-%Y %H:%M:%S", errors="coerce")
    dt4 = pd.to_datetime(dt_txt, dayfirst=True, errors="coerce")  # fallback

    dt_naive = dt1.fillna(dt2).fillna(dt3).fillna(dt4)

    dt_th = dt_naive.dt.tz_localize(TH_TZ, nonexistent="shift_forward", ambiguous="NaT")
    return dt_th.dt.tz_convert("UTC")


def filter_current_th_date(
    poll: pd.DataFrame,
    current_date: Optional[date] = None,
) -> Tuple[pd.DataFrame, date]:
    """Keep only records whose Air4Thai date is today in Asia/Bangkok."""
    today = current_date or datetime.now(TH_TZ).date()
    air4_dates = poll["air4_time"].dt.tz_convert(TH_TZ).dt.date
    return poll.loc[air4_dates == today].copy(), today


# =========================
# DB mapping: valid station_id_new values
# =========================
def load_station_map(engine) -> pd.DataFrame:
    """Load every location-based station_id_new available in stations."""
    sql = """
      SELECT DISTINCT station_id_new
      FROM stations
      WHERE station_id_new IS NOT NULL
        AND btrim(station_id_new) <> ''
    """

    with engine.begin() as cx:
        rows = cx.execute(text(sql)).mappings().all()
        mp = pd.DataFrame.from_records([dict(row) for row in rows], columns=["station_id_new"])

    if mp.empty:
        return mp

    mp["station_id_new"] = clean_str(mp["station_id_new"])
    return mp[mp["station_id_new"] != ""].drop_duplicates("station_id_new")


# =========================
# main run
# =========================
def run(timeout: int = 30):
    """
    ขั้นตอน:
    1) load env + engine
    2) load valid station_id_new values from stations
    3) fetch Air4Thai
    4) parse datetime (TH) + pollutants
    5) build and validate station_id_new from station_id + latitude + longitude
    6) upsert pm25_hourly (only station_id_new + values)
    """
    _load_env()
    engine = _engine()

    # 1) mapping
    mp = load_station_map(engine)
    if mp.empty:
        raise RuntimeError("stations mapping is empty: กรุณารัน sync stations ก่อน (ให้มี station_id_new)")
    print(f"[OK] stations mapping rows={len(mp)}")

    # 2) fetch API
    raw = fetch_air4thai(timeout_s=timeout)

    raw["station_id"] = clean_str(raw.get("stationID"))
    raw = raw[raw["station_id"] != ""]
    if raw.empty:
        raise RuntimeError("Air4Thai returned no stationID rows")

    latitude = clean_num(pick(raw, ["lat", "latitude"]))
    longitude = clean_num(pick(raw, ["long", "longitude", "lon"]))
    raw["station_id_new"] = [
        build_station_id_new(sid, lat, lon)
        for sid, lat, lon in zip(raw["station_id"], latitude, longitude)
    ]

    # 3) parse datetime -> UTC tz-aware
    dt_utc = parse_air4_datetime_th(raw.get("AQILast.date"), raw.get("AQILast.time"))

    poll = pd.DataFrame(
        {
            "station_id": raw["station_id"],
            "station_id_new": raw["station_id_new"],
            "air4_time": dt_utc,
            **{k: clean_num(pick(raw, v)) for k, v in POLLUTANTS.items()},
        }
    ).dropna(subset=["station_id", "air4_time"])

    if poll.empty:
        print("[INFO] no rows to upsert (all Air4Thai dates are missing or invalid)")
        return

    rows_before_date_filter = len(poll)
    poll, today_th = filter_current_th_date(poll)
    print(
        f"[INFO] current-date filter: date={today_th} "
        f"kept={len(poll)} skipped={rows_before_date_filter - len(poll)}"
    )
    if poll.empty:
        print(f"[INFO] no rows to upsert (no Air4Thai data for {today_th})")
        return

    # 4) record ล่าสุดต่อ station_id
    poll = (
        poll.sort_values(["station_id", "air4_time"])
            .drop_duplicates("station_id", keep="last")
            .reset_index(drop=True)
    )

    missing_coordinates = poll[poll["station_id_new"] == ""]
    if not missing_coordinates.empty:
        print(
            "[WARN] station rows missing valid latitude/longitude (first 50):",
            missing_coordinates["station_id"].unique().tolist()[:50],
        )

    candidates = poll[poll["station_id_new"] != ""].copy()
    df = candidates.merge(
        mp.assign(station_exists=True),
        on="station_id_new",
        how="left",
        validate="m:1",
    )

    missing = df[df["station_exists"].isna()]
    if not missing.empty:
        print(
            "[WARN] station_id_new not found in stations (first 50):",
            missing["station_id_new"].unique().tolist()[:50],
        )

    df = df[df["station_exists"].notna()].copy()
    if df.empty:
        print("[INFO] no rows to upsert (all station_id_new values unmapped)")
        return

    # 6) keep only required columns
    keep_cols = ["station_id_new", "air4_time", "pm25", "pm10", "o3", "co", "no2", "so2"]
    df = df[keep_cols].replace({pd.NA: None})

    # === เพิ่มเงื่อนไขแจ้งเตือน PM2.5 > 100 ===
    if send_custom_discord_message:
        # แปลงเป็นตัวเลขเผื่อมีค่าเป็น String เพื่อความปลอดภัยในการเปรียบเทียบ
        pm25_numeric = pd.to_numeric(df["pm25"], errors="coerce")
        high_pm25_df = df[pm25_numeric > 100]
        
        if not high_pm25_df.empty:
            msg = "🚨 **[แจ้งเตือน] พบค่าฝุ่น PM2.5 เกิน 100 µg/m³!** 🚨\n"
            for _, r in high_pm25_df.iterrows():
                # จัด Format เวลาให้แสดงผลสวยงาม
                t_str = r['air4_time'].tz_convert('Asia/Bangkok').strftime('%Y-%m-%d %H:%M') if pd.notnull(r['air4_time']) else '-'
                msg += f"📍 รหัสสถานี: `{r['station_id_new']}` | 😷 PM2.5: **{r['pm25']}** | 🕒 เวลา: {t_str}\n"
            
            # ส่งแจ้งเตือน (ใช้ key เดียวกับตัวแปลของ DAG)
            send_custom_discord_message("air4thai_pm25_hourly", msg)
            print(f"[ALERT] Sent Discord notification for {len(high_pm25_df)} stations with PM2.5 > 100")

    # 7) upsert
    sql_upsert = text("""
      INSERT INTO pm25_hourly (
        station_id_new, air4_time, pm25, pm10, o3, co, no2, so2
      ) VALUES (
        :station_id_new, :air4_time, :pm25, :pm10, :o3, :co, :no2, :so2
      )
      ON CONFLICT (station_id_new, air4_time) DO UPDATE SET
        pm25 = EXCLUDED.pm25,
        pm10 = EXCLUDED.pm10,
        o3   = EXCLUDED.o3,
        co   = EXCLUDED.co,
        no2  = EXCLUDED.no2,
        so2  = EXCLUDED.so2
    """)

    with engine.begin() as cx:
        # ให้ session ใช้ timezone ไทย (ช่วยเรื่องการ preview/แสดงผล)
        cx.execute(text("SET TIME ZONE 'Asia/Bangkok'"))
        cx.execute(sql_upsert, df.to_dict("records"))

    print(f"[OK] pm25_hourly upserted: {len(df)} rows")


if __name__ == "__main__":
    run()
