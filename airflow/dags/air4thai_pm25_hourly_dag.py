import sys
import traceback
from pathlib import Path
from datetime import datetime, timedelta

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator

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

    t_check_db >> t_fetch_and_upsert
