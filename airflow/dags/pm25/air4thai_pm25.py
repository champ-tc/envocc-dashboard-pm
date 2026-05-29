# -*- coding: utf-8 -*-
"""
pm25/air4thai_pm25_hourly.py

✅ เป้าหมาย (ตามที่คุณสั่ง):
1) โหลด mapping จากฐานข้อมูลก่อน: stations (station_id -> station_id_new)
2) โหลดข้อมูลจาก Air4Thai (JSON -> fallback XML) เพื่อได้ station_id + เวลา + ค่ามลพิษ
3) ถ้า station_id ตรงกับ stations -> เติม station_id_new แล้วค่อย upsert ลง pm25_hourly
4) ตาราง pm25_hourly "ไม่เก็บที่อยู่/latlon/name/type" เก็บเฉพาะ:
   - station_id_new, air4_time (timestamptz), pm25, pm10, o3, co, no2, so2
5) ถ้า station_id หา station_id_new ไม่เจอ -> ข้าม + log เตือน

✅ FIX เวลา "ให้ถูกแน่นอน":
- รองรับวันที่หลายรูปแบบ: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY และกรณีปี พ.ศ. (>=2400) จะลบ 543
- รองรับเวลา: HH:MM, HH:MM:SS, 1000, 930, 9:30 ฯลฯ -> normalize เป็น HH:MM:SS
- ตีความเวลาจาก Air4Thai เป็น "เวลาไทย" (Asia/Bangkok) แบบ tz-aware
- ก่อน insert ลง timestamptz จะ convert เป็น UTC (best practice) เพื่อกันแสดงผลเหลื่อมตาม environment
- เพิ่ม debug sample 5 แถวแรกให้เห็นชัด ๆ ว่าจาก API -> parsed เป็นอะไร

✅ FIX mapping stations ไม่พังแม้ไม่มี created_at:
- ถ้ามี created_at -> เลือกแถวล่าสุดต่อ station_id
- ถ้าไม่มี created_at -> เลือกแถวคะแนนคุณภาพสูงสุด (subdistrict/lat/lon)
"""

import os
import re
import socket
import requests
import numpy as np
import pandas as pd
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
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


def _debug_env_network():
    """print DNS + proxy env for debugging"""
    host = "air4thai.pcd.go.th"
    try:
        ip = socket.gethostbyname(host)
        print(f"[NET] DNS {host} -> {ip}")
    except Exception as e:
        print(f"[NET] DNS resolve failed for {host}: {repr(e)}")

    for k in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "NO_PROXY", "no_proxy"]:
        v = os.getenv(k)
        if v:
            print(f"[NET] {k}={v}")


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


def _request_get(sess: requests.Session, url: str, timeout_s: int) -> requests.Response:
    """GET with connect/read timeout + log preview"""
    timeout = (10, timeout_s)  # (connect, read)
    r = sess.get(url, headers=REQ_HEADERS, timeout=timeout, allow_redirects=True)
    ct = (r.headers.get("Content-Type") or "")
    preview = (r.text or "")[:200].replace("\n", " ").replace("\r", " ")
    print(f"[HTTP] url={url} status={r.status_code} final={r.url} ct={ct} preview={preview}")
    return r


# =========================
# fetch Air4Thai (JSON -> XML fallback)
# =========================
def _fetch_json(sess: requests.Session, timeout_s: int) -> pd.DataFrame:
    last_err = None
    for url in AIR4_JSON_URLS:
        try:
            r = _request_get(sess, url, timeout_s=timeout_s)
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
            r = _request_get(sess, url, timeout_s=timeout_s)
            if r.status_code != 200:
                raise RuntimeError(f"XML HTTP {r.status_code}")
            if _looks_like_html(r.text):
                raise RuntimeError("XML returned HTML")

            root = ET.fromstring(r.text)
            rows = []
            for st in root.findall(".//station"):
                station_id = (st.findtext("stationID") or "").strip()

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

                row = {"stationID": station_id, "AQILast.date": date_txt, "AQILast.time": time_txt}

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
    _debug_env_network()
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


# =========================
# DB mapping: station_id -> station_id_new
# =========================
def _has_column(engine, table: str, column: str) -> bool:
    sql = text("""
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name=:t
        AND column_name=:c
      LIMIT 1
    """)
    with engine.begin() as cx:
        return cx.execute(sql, {"t": table, "c": column}).first() is not None


def load_station_map(engine) -> pd.DataFrame:
    """
    โหลด mapping จาก stations แบบ "ไม่พัง":
    - ถ้ามี created_at -> ใช้แถวล่าสุดต่อ station_id
    - ถ้าไม่มี created_at -> เลือกแถวคุณภาพดีที่สุด (subdistrict/lat/lon) ต่อ station_id
    """
    has_created_at = _has_column(engine, "stations", "created_at")

    if has_created_at:
        sql = """
          SELECT DISTINCT ON (station_id)
            station_id, station_id_new
          FROM stations
          WHERE station_id IS NOT NULL
            AND station_id_new IS NOT NULL
            AND btrim(station_id_new) <> ''
          ORDER BY station_id, created_at DESC NULLS LAST
        """
    else:
        sql = """
          SELECT DISTINCT ON (station_id)
            station_id, station_id_new
          FROM (
            SELECT
              station_id,
              station_id_new,
              subdistrict,
              latitude,
              longitude,
              (
                CASE WHEN subdistrict IS NULL OR btrim(subdistrict) = '' THEN 0 ELSE 4 END
                + CASE WHEN latitude  IS NULL THEN 0 ELSE 1 END
                + CASE WHEN longitude IS NULL THEN 0 ELSE 1 END
              ) AS score
            FROM stations
            WHERE station_id IS NOT NULL
              AND station_id_new IS NOT NULL
              AND btrim(station_id_new) <> ''
          ) s
          ORDER BY station_id, score DESC
        """

    with engine.begin() as cx:
        mp = pd.read_sql(sql, cx)

    if mp.empty:
        return mp

    mp["station_id"] = clean_str(mp["station_id"])
    mp["station_id_new"] = clean_str(mp["station_id_new"])
    mp = mp[(mp["station_id"] != "") & (mp["station_id_new"] != "")]
    return mp


# =========================
# main run
# =========================
def run(timeout: int = 30):
    """
    ขั้นตอน:
    1) load env + engine
    2) load mapping stations
    3) fetch Air4Thai
    4) parse datetime (TH) + pollutants
    5) map station_id_new
    6) upsert pm25_hourly (only station_id_new + values)
    """
    print("[DEBUG] __file__ =", __file__)
    print("[DEBUG] JSON_URLS =", AIR4_JSON_URLS)
    print("[DEBUG] XML_URLS  =", AIR4_XML_URLS)

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

    # 3) parse datetime -> UTC tz-aware
    dt_utc = parse_air4_datetime_th(raw.get("AQILast.date"), raw.get("AQILast.time"))

    # debug sample 5 rows
    print("[DEBUG] sample api date/time -> parsed (TH + UTC)")
    for i in range(min(5, len(raw))):
        d0 = str(raw.get("AQILast.date").iloc[i]) if raw.get("AQILast.date") is not None else ""
        t0 = str(raw.get("AQILast.time").iloc[i]) if raw.get("AQILast.time") is not None else ""
        u0 = dt_utc.iloc[i]
        th0 = u0.tz_convert(TH_TZ) if pd.notna(u0) else None
        print(f"  api=({d0} {t0}) -> th={th0} | utc={u0}")

    poll = pd.DataFrame(
        {
            "station_id": raw["station_id"],
            "air4_time": dt_utc,
            **{k: clean_num(pick(raw, v)) for k, v in POLLUTANTS.items()},
        }
    ).dropna(subset=["station_id", "air4_time"])

    if poll.empty:
        raise RuntimeError("No valid datetime rows after parsing AQILast.date/time")

    # 4) record ล่าสุดต่อ station_id
    poll = (
        poll.sort_values(["station_id", "air4_time"])
            .drop_duplicates("station_id", keep="last")
            .reset_index(drop=True)
    )

    # 5) map station_id_new
    df = poll.merge(mp, on="station_id", how="left", validate="m:1")

    missing = df[df["station_id_new"].astype("string").fillna("") == ""]
    if not missing.empty:
        print("[WARN] station_id not found in stations (first 50):",
              missing["station_id"].unique().tolist()[:50])

    df = df[df["station_id_new"].astype("string").fillna("") != ""].copy()
    if df.empty:
        print("[INFO] no rows to upsert (all station_id unmapped)")
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
