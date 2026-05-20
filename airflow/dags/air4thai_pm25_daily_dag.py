# -*- coding: utf-8 -*-
import os
import sys
import runpy
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

DAGS_DIR = os.path.dirname(os.path.abspath(__file__))
if DAGS_DIR not in sys.path:
    sys.path.insert(0, DAGS_DIR)

from check_db.check_db import check_db
from notify.discord_notify import discord_failure_callback

DISCORD_VAR_KEY = "air4thai_pm25_daily"

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
    "on_failure_callback": discord_failure_callback(DISCORD_VAR_KEY),
}


def run_pm25_daily_script():
    """
    รันไฟล์ pm25/air4thai_pm25_daily.py โดยตรง
    (ไม่ต้อง import ฟังก์ชันในโมดูล)
    """
    script_path = os.path.join(DAGS_DIR, "pm25", "air4thai_pm25_daily.py")
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"ไม่พบไฟล์: {script_path}")

    runpy.run_path(script_path, run_name="__main__")


with DAG(
    dag_id="air4thai_pm25_daily",
    default_args=default_args,
    description="Compute daily aggregates from pm25_hourly and upsert into pm25_daily",
    schedule="40 23 * * *",
    start_date=datetime(2024, 12, 1),
    catchup=False,
    max_active_runs=1,
    tags=["air4thai", "pm25", "daily"],
) as dag:

    t_check_db = PythonOperator(
        task_id="check_db",
        python_callable=check_db,
    )

    t_compute_daily = PythonOperator(
        task_id="compute_pm25_daily",
        python_callable=run_pm25_daily_script,
    )

    t_check_db >> t_compute_daily
