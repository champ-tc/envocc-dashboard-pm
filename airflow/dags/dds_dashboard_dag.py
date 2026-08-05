# -*- coding: utf-8 -*-
import os
import shutil
import subprocess
import sys
from datetime import timedelta
from pathlib import Path
from typing import Dict

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator

from notify.discord_notify import discord_failure_callback


DAGS_DIR = Path(__file__).resolve().parent
DDS_DIR = DAGS_DIR / "dds"
SOURCE_FILE = Path(
    os.getenv("DDS_INPUT_DIR", str(DDS_DIR))
) / "original_dds.xlsx"
DDS_SCRIPT = DDS_DIR / "dashboard_dds.py"
GENERATED_PARQUET_FILE = DDS_DIR / "dashboard_dds.parquet"
GENERATED_CSV_FILE = DDS_DIR / "dashboard_dds.csv"
PUBLISHED_DATA_DIR = Path(
    os.getenv("DUCKDB_DATA_DIR", "/opt/airflow/data")
)
PUBLISHED_PARQUET_FILE = PUBLISHED_DATA_DIR / "dashboard_dds.parquet"
PUBLISHED_CSV_FILE = PUBLISHED_DATA_DIR / "dashboard_dds.csv"

DISCORD_VAR_KEY = "dds_dashboard"


def get_file_signature(path: Path) -> Dict[str, int]:
    stat = path.stat()
    return {
        "mtime_ns": stat.st_mtime_ns,
        "size": stat.st_size,
    }


def capture_source_signature() -> Dict[str, int]:
    if not SOURCE_FILE.is_file():
        raise FileNotFoundError(f"DDS source file not found: {SOURCE_FILE}")
    return get_file_signature(SOURCE_FILE)


def run_dds_script() -> None:
    if not DDS_SCRIPT.is_file():
        raise FileNotFoundError(f"DDS processing script not found: {DDS_SCRIPT}")

    subprocess.run(
        [sys.executable, str(DDS_SCRIPT)],
        cwd=str(DDS_DIR),
        check=True,
    )

    for generated_file in [GENERATED_PARQUET_FILE, GENERATED_CSV_FILE]:
        if not generated_file.is_file() or generated_file.stat().st_size == 0:
            raise RuntimeError(f"DDS output was not generated: {generated_file}")


def publish_dashboard_file(source_signature: Dict[str, int]) -> None:
    if get_file_signature(SOURCE_FILE) != source_signature:
        raise RuntimeError(
            "original_dds.xlsx changed during processing; "
            "skip publishing this result"
        )

    PUBLISHED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    outputs = [
        (GENERATED_PARQUET_FILE, PUBLISHED_PARQUET_FILE),
        (GENERATED_CSV_FILE, PUBLISHED_CSV_FILE),
    ]
    temporary_files = []
    try:
        for generated_file, published_file in outputs:
            temporary_file = published_file.with_suffix(f"{published_file.suffix}.tmp")
            shutil.copy2(generated_file, temporary_file)
            temporary_files.append(temporary_file)

        for temporary_file, (_, published_file) in zip(temporary_files, outputs):
            os.replace(temporary_file, published_file)
    finally:
        for temporary_file in temporary_files:
            if temporary_file.exists():
                temporary_file.unlink()

    print(f"Published DDS dashboard file: {PUBLISHED_PARQUET_FILE}")
    print(f"Published DDS download file: {PUBLISHED_CSV_FILE}")


default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
    "on_failure_callback": discord_failure_callback(DISCORD_VAR_KEY),
}


with DAG(
    dag_id="dds_dashboard_pipeline",
    description="Process original_dds.xlsx uploaded from the web admin UI for the DDS dashboard",
    default_args=default_args,
    schedule=None,
    start_date=pendulum.datetime(2026, 1, 1, tz="Asia/Bangkok"),
    catchup=False,
    max_active_runs=1,
    tags=["dds", "upload-trigger", "dashboard"],
) as dag:
    capture_signature = PythonOperator(
        task_id="capture_source_signature",
        python_callable=capture_source_signature,
    )

    process_dds = PythonOperator(
        task_id="process_dds",
        python_callable=run_dds_script,
    )

    publish_dashboard = PythonOperator(
        task_id="publish_dashboard",
        python_callable=publish_dashboard_file,
        op_args=[capture_signature.output],
    )

    capture_signature >> process_dds >> publish_dashboard
