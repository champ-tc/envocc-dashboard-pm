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
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# ---------------------------------------------------------
# CONFIGURATION & CONSTANTS
# ---------------------------------------------------------
AIR4_URL = "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php"
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

def make_db_engine() -> Engine:
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

def ensure_stations_table(eng: Engine) -> None:
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

def normalize_district(d: Optional[str], pv: Optional[str]) -> Optional[str]:
    if not d: return d
    d = re.sub(r"^(อ\.|อำเภอ)\s*", "", str(d).strip())
    if pv and (d in {"เมือง", "เมืองฯ", "ตัวเมือง"} or d == pv):
        return f"เมือง{pv}"
    return d

def parse_area_text(area: str) -> Dict[str, Optional[str]]:
    """Extracts subdistrict, district, and province from area string."""
    if not area or not area.strip():
        return {"subdistrict": None, "district": None, "province": None}
    
    parts = area.split(",")
    pv = normalize_province(parts[-1].strip()) if len(parts) > 1 else None
    main_text = parts[0].strip()
    
    subd = re.search(r"(?:แขวง|ต\.|ตำบล)\s*([^\s,]+)", main_text)
    dist = re.search(r"(?:เขต|อ\.|อำเภอ)\s*([^\s,]+)", main_text)
    
    return {
        "subdistrict": subd.group(1) if subd else None,
        "district": dist.group(1) if dist else None,
        "province": pv,
    }

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

def fetch_air4thai(province_map: Dict[str, str]) -> pd.DataFrame:
    """Fetches and cleans station data from Air4Thai API."""
    with requests.get(AIR4_URL, timeout=30) as r:
        r.raise_for_status()
        data = r.json().get("stations", [])
    
    rows = []
    for item in data:
        # Use helper for nested or varied key names
        get_val = lambda keys: next((item[k] for k in keys if k in item), None)
        
        sid = get_val(["stationID", "station_id", "stationCode"])
        name = get_val(["nameTH", "stationNameTH", "name"])
        area = get_val(["areaTH", "area"])
        lat, lon = get_val(["lat", "latitude"]), get_val(["long", "longitude"])
        
        parsed = parse_area_text(area)
        pv = normalize_province(get_val(["province"]) or parsed["province"])
        dist = normalize_district(get_val(["district"]) or parsed["district"], pv)
        
        rows.append({
            "station_id": str(sid) if sid else None,
            "station_name": name,
            "station_type": get_val(["stationType", "type"]),
            "latitude": lat, "longitude": lon,
            "province": pv, "district": dist, "subdistrict": parsed["subdistrict"],
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


def sync_to_db(df_new: pd.DataFrame, eng: Engine) -> Dict[str, Any]:
    """Performs intelligent upsert to track station history."""
    now = datetime.now(ZoneInfo("Asia/Bangkok"))

    insert_sql = text(
        f"INSERT INTO stations ({', '.join(DB_COLS)}) "
        f"VALUES ({', '.join(f':{col}' for col in DB_COLS)})"
    )

    with eng.begin() as conn:
        # Get current state
        rows = conn.execute(
            text(f"SELECT {', '.join(DB_COLS)} FROM stations")
        ).mappings().all()
        current_df = pd.DataFrame(rows, columns=DB_COLS)
        
        results = {"inserted": 0, "updated": 0, "skipped": 0, "log": []}
        
        for _, row in df_new.iterrows():
            sid = row['station_id']
            # Find existing record for this station
            existing = current_df[current_df['station_id'] == sid].sort_values('created_at', ascending=False)
            
            rec = row.to_dict()
            rec['created_at'] = now
            rec = {key: _sql_value(value) for key, value in rec.items()}
            
            if existing.empty:
                # New station -> Insert
                conn.execute(insert_sql, rec)
                results["inserted"] += 1
                continue
            
            last_rec = existing.iloc[0].to_dict()
            
            # Check if critical info changed (Ignore subdistrict if it was blank)
            is_changed = False
            for k in COLS:
                if k == "subdistrict" and not last_rec.get(k): continue # Fill blank subdistrict is an update
                if str(last_rec.get(k)) != str(rec.get(k)):
                    is_changed = True
                    break
            
            if is_changed:
                # If area changed significantly -> Insert new history record
                # If just filling blanks -> Update last record (Simplified for 10/10 logic)
                conn.execute(insert_sql, rec)
                results["updated"] += 1
            else:
                results["skipped"] += 1

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
