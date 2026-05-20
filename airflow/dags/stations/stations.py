# -*- coding: utf-8 -*-
"""
stations/stations.py
Sync master station data from Air4Thai -> PostgreSQL (history mode)

อัปเดต (แนวทาง A):
- ❌ ไม่ส่ง Discord จากในสคริปต์
- ✅ คืนค่า summary (dict) ให้ DAG นำไปแจ้งเตือนเอง
- created_at เป็น Asia/Bangkok (timestamptz)
- อ่าน config DB จาก os.getenv() (ไม่ใช้ dotenv)
- ✅ อ่าน Province.xlsx (sheet=Province) เพื่อ map health_region จาก ProvinceThai
- ✅ มี normalize/alias ชื่อจังหวัด กันสะกดเพี้ยนจาก API (เช่น กาฬสินธุ์ / ประจวบคีรีขันธ์)

IMPORTANT:
- ต้องมีคอลัมน์ health_region ในตาราง stations แล้ว (ทำ migration ก่อน)
- ต้องมีไฟล์ Province.xlsx อยู่ที่ /opt/airflow/dags/resources/Province.xlsx
  หรือกำหนด env: PROVINCE_XLSX_PATH
- ต้องติดตั้ง openpyxl ใน image (ไม่งั้นอ่าน xlsx ไม่ได้)
"""

import os
import re
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import quote_plus

import numpy as np
import pandas as pd
import requests
from sqlalchemy import create_engine, text

AIR4_URL = "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php"

# ------------------------- config -------------------------
DEFAULT_PROVINCE_XLSX_PATH = "/opt/airflow/dags/resources/Province.xlsx"
DEFAULT_PROVINCE_SHEET = "Province"

BKK = {"กรุงเทพฯ", "กรุงเทพมหานคร", "กทม.", "กทม"}

# จังหวัดที่ API สะกดเพี้ยน/รูปแบบไม่ตรง -> map เป็นชื่อมาตรฐาน (เติมเพิ่มได้)
PROVINCE_ALIASES = {
    # กาฬสินธุ์ (มักเจอหลุดวรรณยุกต์/ตัดคำ)
    "กาฬสิน": "กาฬสินธุ์",
    "กาฬสินท": "กาฬสินธุ์",
    "กาฬสินธุ": "กาฬสินธุ์",
    "กาลสินธุ์": "กาฬสินธุ์",
    "กาลสิน": "กาฬสินธุ์",
    "กาฬสินธ์ุ": "กาฬสินธุ์",

    # ประจวบคีรีขันธ์ (มักเจอ “ประจวบฯ” หรือหลุด/พิมพ์ผิด)
    "ประจวบ": "ประจวบคีรีขันธ์",
    "ประจวบฯ": "ประจวบคีรีขันธ์",
    "ประจวบคีรีขัน": "ประจวบคีรีขันธ์",
    "ประจวบคีรีขัณฑ์": "ประจวบคีรีขันธ์",
    "ประจวบคีรีขันท": "ประจวบคีรีขันธ์",
    "ประจวบคิรีขันธ์": "ประจวบคีรีขันธ์",
}

# คอลัมน์ที่จะเขียนลง DB (เพิ่ม health_region)
COLS = [
    "station_id", "station_id_new", "station_name", "station_type",
    "latitude", "longitude", "province", "district", "subdistrict",
    "health_region",
]
DB_COLS = COLS + ["created_at"]


# ------------------------- env helpers -------------------------
def must_env(name: str) -> str:
    v = os.getenv(name)
    if v is None or str(v).strip() == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return v.strip()


def make_db_engine():
    user = must_env("DB_USER")
    pwd = must_env("DB_PASSWORD")
    host = must_env("DB_HOST")
    port = must_env("DB_PORT")
    dbname = must_env("DB_NAME")

    url = f"postgresql://{user}:{quote_plus(pwd)}@{host}:{port}/{dbname}"
    print("DB =", f"{host}:{port}/{dbname} (user={user})")
    return create_engine(url, pool_pre_ping=True)


# ------------------------- small safe utils -------------------------
def s(v) -> str:
    return "" if v is None else str(v).strip()


def is_blank(v) -> bool:
    return v is None or (isinstance(v, float) and np.isnan(v)) or s(v) == ""


def to_num(x):
    try:
        f = float(str(x).strip())
        return np.nan if f in (-1.0, -999.0) else f
    except Exception:
        return np.nan


def dig(obj, path: str):
    cur = obj
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def get_any(obj, paths):
    if not isinstance(obj, dict):
        return None
    for p in paths:
        v = dig(obj, p) if "." in p else obj.get(p)
        if v is not None:
            return v
    return None


# ------------------------- normalize location -------------------------
def normalize_province_name(raw: str | None) -> str | None:
    if raw is None:
        return None

    p = s(raw)
    if not p:
        return None

    # ตัด prefix ที่พบบ่อย
    p = re.sub(r"^(จังหวัด|จ\.)\s*", "", p)

    # เคสกรุงเทพ
    if p in BKK:
        return "กรุงเทพมหานคร"

    # normalize ช่องว่าง/อักขระแปลก
    p = re.sub(r"\s+", "", p)      # กัน "ประจวบ คีรีขันธ์"
    p = p.replace("ฯ", "")         # กัน "ประจวบฯ"

    # alias ตรง ๆ ก่อน
    if p in PROVINCE_ALIASES:
        return PROVINCE_ALIASES[p]

    return p


def norm_province(p):
    return normalize_province_name(p)


def norm_district(d, pv):
    if not d:
        return d
    d = re.sub(r"^(อ\.|อำเภอ)\s*", "", s(d))
    return f"เมือง{pv}" if pv and (d in {"เมือง", "เมืองฯ", "ตัวเมือง"} or d == pv) else d


def district_equiv(d1, d2, pv: str) -> bool:
    return s(norm_district(d1, pv)) == s(norm_district(d2, pv))


def parse_area(area: str):
    if not isinstance(area, str) or not area.strip():
        return {"subdistrict": None, "district": None, "province": None}

    i = area.rfind(",")
    left, pv = (area[:i], area[i + 1:].strip()) if i >= 0 else (area, None)
    pv = norm_province(pv)

    left = left.strip()
    subd = re.search(r"(?:แขวง|ต\.|ตำบล)\s*([^\s,]+)", left)
    dist = re.search(r"(?:เขต|อ\.|อำเภอ)\s*([^\s,]+)", left)

    return {
        "subdistrict": subd.group(1) if subd else None,
        "district": dist.group(1) if dist else None,
        "province": pv,
    }


# ------------------------- station_id_new -------------------------
def make_station_id_new(sid, lat, lon, precision=6):
    if is_blank(sid):
        return None
    sid_s = s(sid)

    if is_blank(lat) or is_blank(lon):
        return sid_s

    fmt = f"{{:.{precision}f}}"
    return f"{sid_s}_{fmt.format(float(lat))}_{fmt.format(float(lon))}"


def fmt_row(r: dict) -> str:
    def num(x):
        return "-" if is_blank(x) else str(x)

    return (
        f"ID: {r.get('station_id','-')} | Name: {r.get('station_name','-')} | "
        f"Prov: {r.get('province','-')} | Dist: {r.get('district','-')} | Sub: {r.get('subdistrict','-')} | "
        f"Region: {r.get('health_region','-')}\n"
        f"   Lat: {num(r.get('latitude'))} | Lon: {num(r.get('longitude'))} | "
        f"NewID: {r.get('station_id_new','-')} | Created: {r.get('created_at','-')}"
    )


# ------------------------- Province.xlsx -> map health_region -------------------------
def load_province_map() -> dict[str, str]:
    """
    คืนค่า dict: normalized_province_name -> health_region
    """
    xlsx_path = os.getenv("PROVINCE_XLSX_PATH", DEFAULT_PROVINCE_XLSX_PATH)
    sheet = os.getenv("PROVINCE_SHEET", DEFAULT_PROVINCE_SHEET)

    if not os.path.exists(xlsx_path):
        raise RuntimeError(
            f"Province.xlsx not found: {xlsx_path} (set env PROVINCE_XLSX_PATH)"
        )

    try:
        dfp = pd.read_excel(xlsx_path, sheet_name=sheet)
    except ImportError as e:
        # pandas จะ throw ImportError ถ้าไม่มี openpyxl
        raise RuntimeError(
            f"Read Province.xlsx failed: {xlsx_path} sheet={sheet} err={repr(e)}\n"
            f"➡️ ต้องติดตั้ง openpyxl ใน Airflow image (เช่น เพิ่มใน requirements.txt หรือ pip install openpyxl)"
        ) from e
    except Exception as e:
        raise RuntimeError(
            f"Read Province.xlsx failed: {xlsx_path} sheet={sheet} err={repr(e)}"
        ) from e

    need_cols = {"ProvinceThai", "health_region"}
    missing = [c for c in need_cols if c not in dfp.columns]
    if missing:
        raise RuntimeError(
            f"Province.xlsx missing columns {missing}. Found={list(dfp.columns)}"
        )

    dfp = dfp.copy()
    dfp["__key"] = dfp["ProvinceThai"].astype(str).map(normalize_province_name)
    dfp = dfp[dfp["__key"].notna() & (dfp["__key"].astype(str).str.strip() != "")]
    dfp = dfp.drop_duplicates(subset=["__key"], keep="first")

    province_map = dict(zip(dfp["__key"], dfp["health_region"].astype(str)))
    print(f"[ok] loaded province_map: {len(province_map)} จังหวัด จาก {xlsx_path} (sheet={sheet})")
    return province_map


# ------------------------- fetch from Air4Thai -------------------------
def fetch_air4thai_df(province_map: dict[str, str]) -> pd.DataFrame:
    r = requests.get(AIR4_URL, timeout=30)
    r.raise_for_status()

    items = r.json().get("stations", [])
    if not items:
        raise ValueError("Air4Thai JSON: missing/empty 'stations'")

    rows = []
    for it in items:
        sid = get_any(it, [
            "stationID", "stationId", "StationID", "station_id", "stationCode",
            "station.stationID", "properties.stationID"
        ])
        stype = get_any(it, [
            "stationType", "StationType", "station_type", "type",
            "station.stationType", "properties.stationType"
        ])
        name = get_any(it, [
            "nameTH", "NameTH", "name_th", "stationNameTH", "stationName", "name",
            "properties.nameTH"
        ])
        area = get_any(it, ["areaTH", "areath", "area", "properties.areaTH"])
        lat = to_num(get_any(it, ["lat", "latitude", "Lat", "Latitude", "geometry.coordinates.1"]))
        lon = to_num(get_any(it, ["long", "longitude", "lng", "Lon", "Longitude", "geometry.coordinates.0"]))

        parts = parse_area(area)

        pv_raw = get_any(it, ["province", "Province", "properties.province"]) or parts["province"]
        pv = norm_province(pv_raw)

        dist = get_any(it, ["district", "District", "properties.district"]) or parts["district"]
        subd = get_any(it, ["subdistrict", "Subdistrict", "properties.subdistrict"]) or parts["subdistrict"]

        # เคส BKK จาก stationID/stationType
        if str(sid).upper() == "BKK" or str(stype).upper() == "BKK":
            pv = "กรุงเทพมหานคร"

        if pv == "กรุงเทพมหานคร":
            if not dist and subd:
                dist = s(subd)
        else:
            dist = norm_district(dist, pv)

        sid_clean = s(sid) if sid is not None else None
        pv_key = norm_province(pv)
        health_region = province_map.get(pv_key) if pv_key else None

        rows.append({
            "station_id": sid_clean,
            "station_name": name,
            "station_type": None if stype is None else s(stype),
            "latitude": lat,
            "longitude": lon,
            "province": pv,
            "district": dist,
            "subdistrict": subd,
            "station_id_new": make_station_id_new(sid_clean, lat, lon),
            "health_region": health_region,
        })

    df = pd.DataFrame(rows).reindex(columns=COLS)
    if df["station_id"].isna().all():
        raise ValueError("Air4Thai: no station_id found")
    return df


def cleanup_incoming(df: pd.DataFrame) -> pd.DataFrame:
    d = df.drop_duplicates(subset=COLS, keep="first").copy()
    d["__sub_blank"] = d["subdistrict"].isna() | (d["subdistrict"].astype(str).str.strip() == "")
    d = d.sort_values(["station_id", "__sub_blank"], ascending=[True, True])
    return d.drop_duplicates("station_id", keep="first").drop(columns=["__sub_blank"])


# ------------------------- DB helpers -------------------------
def load_current_df(eng) -> pd.DataFrame:
    with eng.begin() as c:
        c.execute(text("SET TIME ZONE 'Asia/Bangkok'"))
        rows = c.execute(text(f"SELECT {', '.join(DB_COLS)} FROM stations")).mappings().all()
    return pd.DataFrame.from_records([dict(r) for r in rows], columns=DB_COLS)


def pick_base_record(df_cur: pd.DataFrame, station_id: str) -> dict | None:
    d = df_cur[df_cur["station_id"] == station_id]
    if d.empty:
        return None

    blank = d[d["subdistrict"].isna() | (d["subdistrict"].astype(str).str.strip() == "")]
    target = blank if not blank.empty else d

    tmp = target.copy()
    tmp["__dt"] = pd.to_datetime(tmp["created_at"], errors="coerce", utc=True)
    return tmp.sort_values("__dt", ascending=False).iloc[0].drop(labels="__dt").to_dict()


def choose_update_ctid(conn, station_id: str) -> str | None:
    q = text("""
        SELECT ctid::text AS ctid_txt
        FROM stations
        WHERE station_id = :station_id
        ORDER BY
          (subdistrict IS NULL OR btrim(subdistrict) = '') DESC,
          created_at DESC NULLS LAST
        LIMIT 1
    """)
    row = conn.execute(q, {"station_id": station_id}).mappings().first()
    return row["ctid_txt"] if row else None


def same_all_except_sub(old: dict, new: dict) -> bool:
    if s(old.get("province")) != s(new.get("province")):
        return False
    pv = s(old.get("province"))
    if not district_equiv(old.get("district"), new.get("district"), pv):
        return False

    # เพิ่ม health_region ในการเทียบ
    keys = [
        "station_name", "station_type", "latitude", "longitude",
        "station_id_new", "health_region"
    ]
    for k in keys:
        ov, nv = old.get(k), new.get(k)
        if (pd.isna(ov) and pd.isna(nv)) or (ov is None and nv is None):
            continue
        if str(ov) != str(nv):
            return False
    return True


def exists_same_record(conn, rec: dict) -> bool:
    q = text("""
        SELECT 1
        FROM stations
        WHERE station_id = :station_id
          AND COALESCE(station_id_new,'') = COALESCE(:station_id_new,'')
          AND COALESCE(station_name,'') = COALESCE(:station_name,'')
          AND COALESCE(station_type,'') = COALESCE(:station_type,'')
          AND COALESCE(province,'') = COALESCE(:province,'')
          AND COALESCE(district,'') = COALESCE(:district,'')
          AND COALESCE(subdistrict,'') = COALESCE(:subdistrict,'')
          AND COALESCE(health_region,'') = COALESCE(:health_region,'')
          AND ((latitude IS NULL AND :latitude IS NULL) OR (latitude = :latitude))
          AND ((longitude IS NULL AND :longitude IS NULL) OR (longitude = :longitude))
        LIMIT 1
    """)
    return conn.execute(q, rec).first() is not None


# ------------------------- upsert history (NO DISCORD HERE) -------------------------
def upsert_history(df_new: pd.DataFrame, eng):
    now_th = datetime.now(ZoneInfo("Asia/Bangkok"))
    df_cur = load_current_df(eng)

    inserted, updated, skipped, unmapped = [], [], [], []

    with eng.begin() as c:
        c.execute(text("SET TIME ZONE 'Asia/Bangkok'"))

        for _, row in df_new.iterrows():
            sid = row.get("station_id")
            if is_blank(sid):
                skipped.append({
                    "station_name": row.get("station_name"),
                    "province": row.get("province"),
                    "district": row.get("district"),
                })
                continue

            rec = {k: (None if pd.isna(row.get(k)) else row.get(k)) for k in COLS}
            rec["station_id"] = s(rec["station_id"])
            rec["station_id_new"] = make_station_id_new(
                rec["station_id"], rec.get("latitude"), rec.get("longitude")
            )

            # log จังหวัดที่ map ไม่ได้ (ช่วยเติม alias ภายหลัง)
            if rec.get("province") and not rec.get("health_region"):
                unmapped.append(s(rec.get("province")))

            old = pick_base_record(df_cur, rec["station_id"])

            # (A) new station_id -> INSERT (avoid duplicates)
            if old is None:
                rec_ins = {**rec, "created_at": now_th}
                if not exists_same_record(c, rec_ins):
                    c.execute(
                        text(
                            f"INSERT INTO stations ({', '.join(DB_COLS)}) "
                            f"VALUES ({', '.join(':'+k for k in DB_COLS)})"
                        ),
                        rec_ins
                    )
                    inserted.append(rec_ins)
                    df_cur = pd.concat([df_cur, pd.DataFrame([rec_ins], columns=DB_COLS)], ignore_index=True)
                continue

            old_sub, new_sub = s(old.get("subdistrict")), s(rec.get("subdistrict"))
            pv = s(old.get("province")) or s(rec.get("province"))

            fill_sub = (
                s(old.get("province")) == s(rec.get("province"))
                and district_equiv(old.get("district"), rec.get("district"), pv)
                and old_sub == "" and new_sub != ""
            )
            same_all_but_db_sub_blank = (old_sub == "" and same_all_except_sub(old, rec))
            same_area = (
                s(old.get("province")) == s(rec.get("province"))
                and district_equiv(old.get("district"), rec.get("district"), pv)
                and old_sub == new_sub
            )

            should_update = fill_sub or same_all_but_db_sub_blank or same_area

            if should_update:
                changed = {}
                for k in COLS:
                    if k == "station_id":
                        continue
                    ov, nv = old.get(k), rec.get(k)
                    if (pd.isna(ov) and pd.isna(nv)) or (ov is None and nv is None):
                        continue
                    if str(ov) != str(nv):
                        changed[k] = nv

                if not changed:
                    continue

                ctid_txt = choose_update_ctid(c, rec["station_id"])
                if not ctid_txt:
                    continue

                set_sql = ", ".join([f"{k}=:{k}" for k in changed])
                c.execute(
                    text(f"UPDATE stations SET {set_sql} WHERE ctid::text = :ctid_txt"),
                    {"ctid_txt": ctid_txt, **changed}
                )

                snap = old.copy()
                snap.update(changed)
                updated.append(snap)
                continue

            # (C) area changed -> INSERT history (avoid duplicates)
            rec_ins = {**rec, "created_at": now_th}
            if exists_same_record(c, rec_ins):
                continue

            c.execute(
                text(
                    f"INSERT INTO stations ({', '.join(DB_COLS)}) "
                    f"VALUES ({', '.join(':'+k for k in DB_COLS)})"
                ),
                rec_ins
            )
            inserted.append(rec_ins)

    inserted_n = len(inserted)
    updated_n = len(updated)
    skipped_n = len(skipped)

    # สรุป unmapped จังหวัด (เอาไว้ช่วย debug)
    unmapped_unique = sorted(set([u for u in unmapped if u]))
    unmapped_preview = unmapped_unique[:10]

    lines = ["สรุปการซิงก์สถานีจาก Air4Thai"]
    lines.append(f"➕ เพิ่มใหม่: {inserted_n} | 📝 อัปเดต: {updated_n} | ⏭️ ข้าม: {skipped_n}")
    if unmapped_unique:
        lines.append(f"⚠️ จังหวัดที่ map health_region ไม่ได้: {len(unmapped_unique)} จังหวัด (ตัวอย่าง: {', '.join(unmapped_preview)})")

    if inserted:
        lines.append("\nรายละเอียดรายการที่เพิ่ม:")
        for r in inserted[:5]:
            lines.append(fmt_row(r))

    if updated:
        lines.append("\n📝 รายละเอียดรายการที่อัปเดต:")
        for r in updated[:5]:
            lines.append(fmt_row(r))

    if skipped:
        lines.append("\nรายการที่ข้าม (ไม่มี station_id):")
        for x in skipped[:5]:
            lines.append(
                f"Name: {x.get('station_name') or '-'} | Prov: {x.get('province') or '-'} | Dist: {x.get('district') or '-'}"
            )

    message = "\n".join(lines)
    print(message)
    print(f"STATION_SYNC_SUMMARY: inserted={inserted_n}, updated={updated_n}, skipped={skipped_n}")

    return {
        "inserted_count": inserted_n,
        "updated_count": updated_n,
        "skipped_count": skipped_n,
        "unmapped_provinces_count": len(unmapped_unique),
        "unmapped_provinces_preview": unmapped_preview,
        "message": message,
    }


# ------------------------- Airflow entrypoint -------------------------
def run():
    eng = make_db_engine()
    province_map = load_province_map()
    df = fetch_air4thai_df(province_map)
    df = cleanup_incoming(df)
    return upsert_history(df, eng)


if __name__ == "__main__":
    run()
