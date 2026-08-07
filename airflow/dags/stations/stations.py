# -*- coding: utf-8 -*-
import os
import re
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from zoneinfo import ZoneInfo
from urllib.parse import quote_plus

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from requests.exceptions import SSLError
from sqlalchemy import create_engine, text
from urllib3.exceptions import InsecureRequestWarning
from urllib3.util.retry import Retry

# ---------------------------------------------------------
# CONFIGURATION & CONSTANTS
# ---------------------------------------------------------
AIR4THAI_HOST = "air4thai.pcd.go.th"
AIR4_URLS = [
    "https://air4thai.pcd.go.th/services/getNewAQI_JSON.php",
    "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php",
]
REQ_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; envocc-airflow/1.0)",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    "Connection": "close",
}
DEFAULT_PROVINCE_XLSX = "/opt/airflow/dags/resources/Province.xlsx"
DEFAULT_SHEET = "Province"
BKK_ALIASES = {"กรุงเทพฯ", "กรุงเทพมหานคร", "กทม.", "กทม"}

# Standardize misspelled or inconsistent province names
PROVINCE_ALIASES: Dict[str, str] = {
    "กาฬสิน": "กาฬสินธุ์", "กาฬสินท": "กาฬสินธุ์", "กาฬสินธุ": "กาฬสินธุ์",
    "กาลสินธุ์": "กาฬสินธุ์", "กาลสิน": "กาฬสินธุ์", "กาฬสินธ์ุ": "กาฬสินธุ์",
    "ประจวบ": "ประจวบคีรีขันธ์", "ประจวบฯ": "ประจวบคีรีขันธ์",
    "ประจวบคีรีขัน": "ประจวบคีรีขันธ์", "ประจวบคีรีขัณฑ์": "ประจวบคีรีขันธ์",
    "ประจวบคีรีขันท": "ประจวบคีรีขันธ์", "ประจวบคิรีขันธ์": "ประจวบคีรีขันธ์",
}

COLS = [
    "station_id", "station_id_new", "station_name", "station_type",
    "latitude", "longitude", "province", "district", "subdistrict",
    "health_region",
]
DB_COLS = COLS + ["created_at"]
LOCATION_COLS = ["latitude", "longitude", "province", "district", "subdistrict"]

# Setup Logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ---------------------------------------------------------
# DATABASE HELPERS
# ---------------------------------------------------------
def _must_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val.strip()

def make_db_engine() -> Any:
    """Creates a SQLAlchemy engine using environment variables."""
    try:
        url = (
            f"postgresql://{_must_env('DB_USER')}:{quote_plus(_must_env('DB_PASSWORD'))}@"
            f"{_must_env('DB_HOST')}:{_must_env('DB_PORT')}/{_must_env('DB_NAME')}"
        )
        return create_engine(url, pool_pre_ping=True)
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
        raise

def ensure_stations_table(eng: Any) -> None:
    """Ensures the stations table and all required columns/indexes exist."""
    create_sql = """
    CREATE TABLE IF NOT EXISTS stations (
        station_id TEXT, station_id_new TEXT, station_name TEXT, 
        station_type TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, 
        province TEXT, district TEXT, subdistrict TEXT, health_region TEXT, 
        created_at TIMESTAMPTZ DEFAULT now()
    )"""
    
    with eng.begin() as conn:
        conn.execute(text("SET TIME ZONE 'Asia/Bangkok'"))
        conn.execute(text(create_sql))
        # Ensure all columns exist (Migration handling)
        for col in DB_COLS:
            if col == "created_at": continue
            type_sql = "DOUBLE PRECISION" if col in ["latitude", "longitude"] else "TEXT"
            conn.execute(text(f"ALTER TABLE stations ADD COLUMN IF NOT EXISTS {col} {type_sql}"))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stations_id ON stations (station_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stations_id_new ON stations (station_id_new)"))
    logger.info("Database schema verification complete.")

# ---------------------------------------------------------
# DATA NORMALIZATION UTILS
# ---------------------------------------------------------
def normalize_province(raw: Optional[str]) -> Optional[str]:
    if not raw: return None
    p = str(raw).strip()
    p = re.sub(r"^(จังหวัด|จ\.)\s*", "", p)
    if p in BKK_ALIASES: return "กรุงเทพมหานคร"
    p = re.sub(r"\s+", "", p).replace("ฯ", "")
    return PROVINCE_ALIASES.get(p, p)

def resolve_province(station_id: Any, raw_province: Optional[str]) -> Optional[str]:
    province = normalize_province(raw_province)
    if not province and str(station_id or "").strip().lower().startswith("bkp"):
        return "กรุงเทพมหานคร"
    return province

def normalize_district(d: Optional[str], pv: Optional[str]) -> Optional[str]:
    if not d: return d
    d = re.sub(r"^(?:อำเภอ|เขต|อ\.?)\s*", "", str(d).strip())
    d = re.sub(r"\s+", " ", d).strip(" ,")
    if pv and (d in {"เมือง", "เมืองฯ", "ตัวเมือง"} or d == pv):
        return f"เมือง{pv}"
    return d


def normalize_subdistrict(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = re.sub(
        r"^(?:ตำบล|แขวง|ต\.?)\s*",
        "",
        str(value).strip(),
    )
    normalized = re.sub(r"\s+", " ", normalized).strip(" ,")
    return normalized or None


def parse_area_text(area: str) -> Dict[str, Optional[str]]:
    """Extracts subdistrict, district, and province from area string."""
    if not area or not area.strip():
        return {"subdistrict": None, "district": None, "province": None}

    text_value = re.sub(r"\s+", " ", str(area)).strip()
    subd = re.search(
        r"(?:^|[\s,])(?:ตำบล|แขวง|ต\.?)\s*"
        r"(.+?)(?=\s+(?:อำเภอ|จังหวัด|เขต|อ\.?|จ\.?)\s*|,|$)",
        text_value,
    )
    dist = re.search(
        r"(?:^|[\s,])(?:อำเภอ|เขต|อ\.?)\s*"
        r"(.+?)(?=\s+(?:จังหวัด|จ\.?)\s*|,|$)",
        text_value,
    )
    province_match = re.search(
        r"(?:^|[\s,])(?:จังหวัด|จ\.?)\s*(.+?)(?=,|$)",
        text_value,
    )
    if province_match:
        province = normalize_province(province_match.group(1))
    else:
        parts = [part.strip() for part in text_value.split(",") if part.strip()]
        province = normalize_province(parts[-1]) if len(parts) > 1 else None

    return {
        "subdistrict": normalize_subdistrict(subd.group(1)) if subd else None,
        "district": dist.group(1).strip(" ,") if dist else None,
        "province": province,
    }


def first_nonempty(item: Dict[str, Any], keys: List[str]) -> Any:
    """Return the first present API value that is not null or blank."""
    for key in keys:
        value = item.get(key)
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None

def generate_id_new(sid: str, lat: Any, lon: Any) -> Optional[str]:
    if not sid: return None
    try:
        return f"{str(sid).strip()}_{float(lat):.6f}_{float(lon):.6f}"
    except (ValueError, TypeError):
        return str(sid).strip()

# ---------------------------------------------------------
# DATA INGESTION
# ---------------------------------------------------------
def load_province_map() -> Dict[str, str]:
    """Loads health region mapping from Excel."""
    path = os.getenv("PROVINCE_XLSX_PATH", DEFAULT_PROVINCE_XLSX)
    try:
        df = pd.read_excel(path, sheet_name=os.getenv("PROVINCE_SHEET", DEFAULT_SHEET))
        df["key"] = df["ProvinceThai"].map(normalize_province)
        return dict(zip(df["key"], df["health_region"].astype(str)))
    except Exception as e:
        logger.error(f"Failed to load province map from {path}: {e}")
        raise

def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}

def _air4thai_ssl_fallback_enabled() -> bool:
    """
    Air4Thai can serve an incomplete TLS chain. Keep normal verification first,
    then allow a scoped fallback for this host.
    """
    return _bool_env("AIR4THAI_ALLOW_INSECURE_SSL", default=True)

def _session_with_retries() -> requests.Session:
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
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    sess.mount("https://", adapter)
    sess.mount("http://", adapter)
    return sess

def _request_air4thai_get(
    session: requests.Session,
    url: str,
    *,
    verify_ssl: bool = True,
) -> requests.Response:
    return session.get(
        url,
        headers=REQ_HEADERS,
        timeout=(10, 30),
        allow_redirects=True,
        verify=verify_ssl,
    )

def _fetch_air4thai_response(session: requests.Session) -> requests.Response:
    last_err: Optional[Exception] = None

    for url in AIR4_URLS:
        try:
            response = _request_air4thai_get(session, url, verify_ssl=True)
            logger.info(
                "Air4Thai response: url=%s final=%s status=%s",
                url,
                response.url,
                response.status_code,
            )
            response.raise_for_status()
            return response
        except SSLError as e:
            last_err = e
            if AIR4THAI_HOST not in url or not _air4thai_ssl_fallback_enabled():
                logger.warning("Air4Thai SSL verification failed without fallback: %r", e)
                continue

            logger.warning(
                "Air4Thai SSL verification failed; retrying this host with "
                "verify_ssl=off. Set AIR4THAI_ALLOW_INSECURE_SSL=false to disable. error=%r",
                e,
            )
            requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
            try:
                response = _request_air4thai_get(session, url, verify_ssl=False)
                logger.info(
                    "Air4Thai response: url=%s final=%s status=%s verify_ssl=off",
                    url,
                    response.url,
                    response.status_code,
                )
                response.raise_for_status()
                return response
            except Exception as fallback_err:
                last_err = fallback_err
                logger.warning("Air4Thai insecure SSL fallback failed for %s: %r", url, fallback_err)
        except Exception as e:
            last_err = e
            logger.warning("Air4Thai request failed for %s: %r", url, e)

    raise RuntimeError(f"Failed to fetch Air4Thai station data: {last_err}")

def fetch_air4thai(province_map: Dict[str, str]) -> pd.DataFrame:
    """Fetches and cleans station data from Air4Thai API."""
    with _session_with_retries() as session:
        r = _fetch_air4thai_response(session)
        data = r.json().get("stations", [])
    
    rows = []
    for item in data:
        sid = first_nonempty(item, ["stationID", "station_id", "stationCode"])
        name = first_nonempty(item, ["nameTH", "stationNameTH", "name"])
        area = first_nonempty(item, ["areaTH", "area"])
        lat = first_nonempty(item, ["lat", "latitude"])
        lon = first_nonempty(item, ["long", "longitude", "lon"])
        
        parsed = parse_area_text(area)
        pv = resolve_province(
            sid,
            first_nonempty(item, ["province", "provinceTH", "provinceNameTH"])
            or parsed["province"],
        )
        dist = normalize_district(
            first_nonempty(item, ["district", "districtTH", "amphoe", "amphoeTH"])
            or parsed["district"],
            pv,
        )
        subdistrict = normalize_subdistrict(
            first_nonempty(
                item,
                ["subdistrict", "subdistrictTH", "tambon", "tambonTH"],
            ) or parsed["subdistrict"]
        )
        
        rows.append({
            "station_id": str(sid) if sid else None,
            "station_name": name,
            "station_type": first_nonempty(item, ["stationType", "type"]),
            "latitude": lat, "longitude": lon,
            "province": pv, "district": dist, "subdistrict": subdistrict,
            "station_id_new": generate_id_new(sid, lat, lon),
            "health_region": province_map.get(pv)
        })
    
    return pd.DataFrame(rows).reindex(columns=COLS).dropna(subset=["station_id"])

# ---------------------------------------------------------
# CORE LOGIC (UPSERT)
# ---------------------------------------------------------
def _sql_value(value: Any) -> Any:
    """Convert pandas/NumPy values into DB-driver-friendly Python values."""
    if pd.isna(value):
        return None
    if isinstance(value, np.generic):
        return value.item()
    return value


def _display_value(value: Any) -> str:
    """Return a stable, human-readable value for comparisons and notifications."""
    value = _sql_value(value)
    return "-" if value is None or str(value).strip() == "" else str(value)


def _station_label(record: Dict[str, Any]) -> str:
    station_id = _display_value(record.get("station_id"))
    station_name = _display_value(record.get("station_name"))
    return f"{station_id} ({station_name})"


def sync_to_db(df_new: pd.DataFrame, eng: Any) -> Dict[str, Any]:
    """Upsert station metadata while keeping history only for location changes.

    ``station_id_new`` already includes the station ID and coordinates, so an
    existing value represents the same physical station location. Metadata
    changes for that value must update the latest row instead of creating a
    second row. A new history row is inserted only when ``station_id_new`` is
    new (for example, when a station moves).
    """
    now = datetime.now(ZoneInfo("Asia/Bangkok"))

    insert_sql = text(
        f"INSERT INTO stations ({', '.join(DB_COLS)}) "
        f"VALUES ({', '.join(f':{col}' for col in DB_COLS)})"
    )

    with eng.begin() as conn:
        # Get current state
        rows = conn.execute(
            text(f"SELECT ctid::text AS row_id, {', '.join(DB_COLS)} FROM stations")
        ).mappings().all()
        current_df = pd.DataFrame(rows, columns=["row_id", *DB_COLS])
        
        results = {
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "changes": [],
            "missing_subdistrict": [],
        }
        
        for _, row in df_new.iterrows():
            sid = row['station_id']
            rec = row.to_dict()
            rec['created_at'] = now
            rec = {key: _sql_value(value) for key, value in rec.items()}

            station_id_new = rec.get("station_id_new")
            existing_location = current_df[
                current_df["station_id_new"] == station_id_new
            ].sort_values("created_at", ascending=False, na_position="last")

            if not existing_location.empty:
                last_rec = existing_location.iloc[0].to_dict()

                # An occasionally incomplete API response must not erase good
                # metadata already stored for the same physical location.
                for key in COLS:
                    incoming = rec.get(key)
                    if incoming is None or (isinstance(incoming, str) and not incoming.strip()):
                        prior_values = existing_location[key].dropna()
                        prior_values = prior_values[
                            prior_values.astype(str).str.strip() != ""
                        ]
                        if not prior_values.empty:
                            rec[key] = _sql_value(prior_values.iloc[0])

                changed_fields = {
                    key: {
                        "old": _display_value(last_rec.get(key)),
                        "new": _display_value(rec.get(key)),
                    }
                    for key in COLS
                    if _display_value(last_rec.get(key)) != _display_value(rec.get(key))
                }

                if changed_fields:
                    set_clause = ", ".join(f"{col} = :{col}" for col in DB_COLS)
                    conn.execute(
                        text(f"UPDATE stations SET {set_clause} WHERE ctid::text = :row_id"),
                        {**rec, "row_id": last_rec["row_id"]},
                    )
                    results["updated"] += 1
                    results["changes"].append({
                        "station": _station_label(rec),
                        "type": "อัปเดตข้อมูล",
                        "fields": changed_fields,
                    })
                else:
                    results["skipped"] += 1
                continue

            # No row exists for this station/location combination. This is a
            # genuinely new station or a station that moved coordinates.
            existing = current_df[current_df['station_id'] == sid]
            
            if existing.empty:
                # New station -> Insert
                conn.execute(insert_sql, rec)
                results["inserted"] += 1
                results["changes"].append({
                    "station": _station_label(rec),
                    "type": "เพิ่มสถานีใหม่",
                    "location": {
                        key: _display_value(rec.get(key))
                        for key in LOCATION_COLS
                    },
                })
                continue

            conn.execute(insert_sql, rec)
            results["inserted"] += 1
            results["changes"].append({
                "station": _station_label(rec),
                "type": "ย้ายตำแหน่งสถานี",
                "location": {
                    key: _display_value(rec.get(key))
                    for key in LOCATION_COLS
                },
            })

        missing_df = df_new[
            df_new["subdistrict"].isna()
            | (df_new["subdistrict"].astype(str).str.strip() == "")
        ]
        results["missing_subdistrict"] = [
            {
                "station": _station_label(row.to_dict()),
                "province": _display_value(row.get("province")),
                "district": _display_value(row.get("district")),
            }
            for _, row in missing_df.iterrows()
        ]

    summary = f"Sync Summary: +{results['inserted']} new, ~{results['updated']} updated, {results['skipped']} skipped."
    logger.info(summary)
    return {**results, "message": summary}

# ---------------------------------------------------------
# ENTRYPOINT
# ---------------------------------------------------------
def run() -> Dict[str, Any]:
    try:
        engine = make_db_engine()
        ensure_stations_table(engine)
        p_map = load_province_map()
        df = fetch_air4thai(p_map)
        # Final Step: Sync
        return sync_to_db(df, engine)
    except Exception as e:
        logger.exception(f"Sync process failed: {e}")
        raise

if __name__ == "__main__":
    run()
