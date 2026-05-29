import os
import sys
import traceback
from pathlib import Path
from datetime import datetime, timedelta
from urllib.parse import quote_plus

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator
from sqlalchemy import create_engine, text

# ให้ import โมดูลใน dags ได้แน่นอน
DAGS_DIR = Path(__file__).resolve().parent
if str(DAGS_DIR) not in sys.path:
    sys.path.insert(0, str(DAGS_DIR))

from check_db.check_db import check_db
import pm25.air4thai_pm25 as job
from notify.discord_notify import discord_failure_callback

DISCORD_VAR_KEY = "air4thai_pm25_hourly"

default_args = {
    "owner": "envocc",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
    "on_failure_callback": discord_failure_callback(DISCORD_VAR_KEY),
}

local_tz = pendulum.timezone("Asia/Bangkok")


def _must_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or str(value).strip() == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value.strip()


def _db_engine():
    user = _must_env("DB_USER")
    password = _must_env("DB_PASSWORD")
    host = _must_env("DB_HOST")
    port = _must_env("DB_PORT")
    dbname = _must_env("DB_NAME")

    url = f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"
    return create_engine(url, pool_pre_ping=True)


def ensure_pm25_hourly_table():
    engine = _db_engine()
    with engine.begin() as conn:
        conn.execute(text("SET TIME ZONE 'Asia/Bangkok'"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pm25_hourly (
                station_id_new TEXT NOT NULL,
                air4_time TIMESTAMPTZ NOT NULL,
                pm25 DOUBLE PRECISION,
                pm10 DOUBLE PRECISION,
                o3 DOUBLE PRECISION,
                co DOUBLE PRECISION,
                no2 DOUBLE PRECISION,
                so2 DOUBLE PRECISION
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_pm25_hourly_station_time
            ON pm25_hourly (station_id_new, air4_time)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_pm25_hourly_air4_time
            ON pm25_hourly (air4_time)
        """))
    print("[OK] pm25_hourly table/indexes are ready")


def run_air4thai_job(**context):
    """Wrapper เพื่อให้เห็น traceback เต็ม ๆ ใน Airflow log"""
    try:
        # context จะมีหรือไม่มีก็ไม่เป็นไร เราแค่พิมพ์เท่าที่มี
        print("[DEBUG] run_id:", context.get("run_id"))
        print("[DEBUG] task_id:", getattr(context.get("task"), "task_id", None))

        job.run(timeout=30)

    except Exception as e:
        print("[ERROR] job.run failed:", repr(e))
        print("".join(traceback.format_exc()))
        raise


with DAG(
    dag_id="air4thai_pm25_hourly",
    description="Fetch Air4Thai and upsert into pm25_hourly",
    default_args=default_args,
    start_date=datetime(2024, 1, 1, tzinfo=local_tz),
    schedule="20 * * * *",
    catchup=False,
    max_active_runs=1,
    tags=["pm25", "air4thai"],
) as dag:

    t_check_db = PythonOperator(
        task_id="check_db",
        python_callable=check_db,
    )

    t_fetch_and_upsert = PythonOperator(
        task_id="fetch_and_upsert",
        python_callable=run_air4thai_job,
        # ❌ ไม่ต้องใช้ provide_context ใน Airflow รุ่นนี้แล้ว
    )

    t_ensure_pm25_hourly_table = PythonOperator(
        task_id="ensure_pm25_hourly_table",
        python_callable=ensure_pm25_hourly_table,
    )

    t_check_db >> t_ensure_pm25_hourly_table >> t_fetch_and_upsert
