import os
import sys
from datetime import datetime, timedelta

import requests
from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator
from airflow.sdk import Variable

DAGS_DIR = os.path.dirname(os.path.abspath(__file__))
if DAGS_DIR not in sys.path:
    sys.path.insert(0, DAGS_DIR)

from check_db.check_db import check_db
from notify.discord_notify import discord_failure_callback
from stations.stations import run as run_station_job

DISCORD_VAR_KEY = "air4thai_station"  # 👈 Airflow Variable key


def notify_station_changes(**context):
    """
    ดึง summary จาก XCom ของ task sync_stations แล้วส่ง Discord เฉพาะเมื่อมีการเพิ่ม/อัปเดต
    """
    ti = context["ti"]
    summary = ti.xcom_pull(task_ids="sync_stations") or {}

    inserted = int(summary.get("inserted_count") or 0)
    updated = int(summary.get("updated_count") or 0)

    if inserted == 0 and updated == 0:
        print("No station changes -> skip notify")
        return

    try:
        webhook = Variable.get(DISCORD_VAR_KEY)
    except Exception as e:
        print(f"Missing/Unreadable Airflow Variable '{DISCORD_VAR_KEY}': {type(e).__name__}: {e}")
        return

    msg = summary.get("message") or f"Station changes: inserted={inserted}, updated={updated}"
    requests.post(webhook, json={"content": msg}, timeout=15)
    print("Discord notified for station changes")


default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
    "on_failure_callback": discord_failure_callback(DISCORD_VAR_KEY),  # ✅ แจ้งเฉพาะตอน fail
}

with DAG(
    dag_id="air4thai_station",
    default_args=default_args,
    description="Sync Air4Thai Stations Master Data",
    schedule="20 6 * * *",
    start_date=datetime(2024, 12, 1),
    catchup=False,
    max_active_runs=1,
    tags=["air4thai", "station"],
) as dag:

    t_check_db = PythonOperator(
        task_id="check_db",
        python_callable=check_db,
    )

    t_sync_stations = PythonOperator(
        task_id="sync_stations",
        python_callable=run_station_job,  # ✅ ต้อง return dict (summary) จาก stations.py
    )

    t_notify = PythonOperator(
        task_id="notify_station_changes",
        python_callable=notify_station_changes,
    )

    t_check_db >> t_sync_stations >> t_notify
