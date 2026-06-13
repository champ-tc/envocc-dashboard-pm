# -*- coding: utf-8 -*-
import os
import shutil
import subprocess
import sys
import time
from datetime import timedelta
from pathlib import Path
from typing import Dict

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.sdk import Variable
from airflow.sensors.base import BaseSensorOperator

from notify.discord_notify import discord_failure_callback


DAGS_DIR = Path(__file__).resolve().parent
DDS_DIR = DAGS_DIR / "dds"
SOURCE_FILE = Path(
    os.getenv("DDS_INPUT_DIR", str(DDS_DIR))
) / "original_dds.xlsx"
DDS_SCRIPT = DDS_DIR / "dashboard_dds.py"
GENERATED_FILE = DDS_DIR / "dashboard_dds.csv"
PUBLISHED_FILE = Path(
    os.getenv("DUCKDB_DATA_DIR", "/opt/airflow/data")
) / "dashboard_dds.csv"

FILE_SIGNATURE_VARIABLE = "dds_original_file_last_processed"
DISCORD_VAR_KEY = "dds_dashboard"


def get_file_signature(path: Path) -> Dict[str, int]:
    stat = path.stat()
    return {
        "mtime_ns": stat.st_mtime_ns,
        "size": stat.st_size,
    }


class NewOriginalDdsFileSensor(BaseSensorOperator):
    """Wait until a new, fully written original_dds.xlsx is available."""

    template_fields = ("filepath",)

    def __init__(
        self,
        *,
        filepath: str,
        signature_variable: str,
        min_file_age_seconds: int = 60,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.filepath = filepath
        self.signature_variable = signature_variable
        self.min_file_age_seconds = min_file_age_seconds

    def poke(self, context) -> bool:
        path = Path(self.filepath)
        if not path.is_file():
            self.log.info("Waiting for file: %s", path)
            return False

        stat = path.stat()
        age_seconds = time.time() - stat.st_mtime
        if age_seconds < self.min_file_age_seconds:
            self.log.info(
                "File %s is only %.1f seconds old; waiting until it is stable.",
                path,
                age_seconds,
            )
            return False

        signature = f"{stat.st_mtime_ns}:{stat.st_size}"
        last_processed = Variable.get(
            self.signature_variable,
            default="",
        )
        if signature == last_processed:
            self.log.info("File has already been processed: %s", signature)
            return False

        self.log.info("Detected new DDS file: %s (%s)", path, signature)
        return True


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

    if not GENERATED_FILE.is_file() or GENERATED_FILE.stat().st_size == 0:
        raise RuntimeError(f"DDS output was not generated: {GENERATED_FILE}")


def publish_dashboard_file(source_signature: Dict[str, int]) -> None:
    if get_file_signature(SOURCE_FILE) != source_signature:
        raise RuntimeError(
            "original_dds.xlsx changed during processing; "
            "skip publishing this result"
        )

    PUBLISHED_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary_file = PUBLISHED_FILE.with_suffix(".csv.tmp")
    try:
        shutil.copy2(GENERATED_FILE, temporary_file)
        os.replace(temporary_file, PUBLISHED_FILE)
    finally:
        if temporary_file.exists():
            temporary_file.unlink()

    print(f"Published DDS dashboard file: {PUBLISHED_FILE}")


def mark_source_processed(source_signature: Dict[str, int]) -> None:
    current_signature = get_file_signature(SOURCE_FILE)
    if current_signature != source_signature:
        raise RuntimeError(
            "original_dds.xlsx changed during processing; "
            "the new version will be processed on the next DAG run"
        )

    signature = (
        f"{source_signature['mtime_ns']}:{source_signature['size']}"
    )
    Variable.set(FILE_SIGNATURE_VARIABLE, signature)
    print(f"Marked DDS source as processed: {signature}")


default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
    "on_failure_callback": discord_failure_callback(DISCORD_VAR_KEY),
}


with DAG(
    dag_id="dds_dashboard_file_sensor",
    description="Process a newly replaced original_dds.xlsx for the DDS dashboard",
    default_args=default_args,
    schedule="*/5 * * * *",
    start_date=pendulum.datetime(2026, 1, 1, tz="Asia/Bangkok"),
    catchup=False,
    max_active_runs=1,
    tags=["dds", "file-sensor", "dashboard"],
) as dag:
    wait_for_new_file = NewOriginalDdsFileSensor(
        task_id="wait_for_new_original_dds",
        filepath=str(SOURCE_FILE),
        signature_variable=FILE_SIGNATURE_VARIABLE,
        min_file_age_seconds=60,
        poke_interval=30,
        timeout=240,
        mode="reschedule",
        soft_fail=True,
    )

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

    mark_processed = PythonOperator(
        task_id="mark_source_processed",
        python_callable=mark_source_processed,
        op_args=[capture_signature.output],
    )

    (
        wait_for_new_file
        >> capture_signature
        >> process_dds
        >> publish_dashboard
        >> mark_processed
    )
