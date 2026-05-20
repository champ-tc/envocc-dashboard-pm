import os
import sys
import pendulum
from datetime import timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

# ทำให้ import โฟลเดอร์ dags/ ได้
DAGS_DIR = os.path.dirname(os.path.abspath(__file__))
if DAGS_DIR not in sys.path:
    sys.path.insert(0, DAGS_DIR)

from check_db.check_db import check_db
from notify.discord_notify import discord_failure_callback, discord_success_callback

# ==============================================================================
# CONFIG
# ==============================================================================
SCRIPTS_PATH = "/opt/airflow/dags/scripts"
ENV_FILENAME = ".env"
SCRIPT_CLEAN_DB = "clean_data.py"
SCRIPT_SCRAPE = "scrape_moph.py"

DISCORD_VAR_KEY = "hdc_service"

default_args = {
    "owner": "data_engineer",
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
    "execution_timeout": timedelta(hours=4),
    "on_failure_callback": discord_failure_callback(DISCORD_VAR_KEY),  # ✅ reusable
}


def _run_script(script_path: str, script_name: str, env_file: str, timeout_sec: int) -> str:
    import subprocess
    from dotenv import load_dotenv

    env_path = os.path.join(script_path, env_file)
    full_script_path = os.path.join(script_path, script_name)

    if not os.path.exists(full_script_path):
        raise FileNotFoundError(f"Script not found: {full_script_path}")

    # โหลด .env -> เข้า os.environ ของ process นี้
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"  # ให้ print ออกใน Airflow log ทันที

    cmd = [sys.executable, full_script_path]

    print("=" * 80)
    print(f">>> RUN: {script_name}")
    print(f">>> CWD: {script_path}")
    print(f">>> ENV FILE: {env_path if os.path.exists(env_path) else '(missing)'}")
    print(f">>> TIMEOUT: {timeout_sec}s")
    print("=" * 80)

    try:
        result = subprocess.run(
            cmd,
            cwd=script_path,
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"Script Timeout ({script_name}) after {timeout_sec}s") from e

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()

    print(f">>> RETURN CODE: {result.returncode}")
    print("--- STDOUT ---")
    print(stdout[-8000:] if stdout else "(empty)")
    print("--- STDERR ---")
    print(stderr[-8000:] if stderr else "(empty)")

    if result.returncode != 0:
        msg = stderr or stdout or f"non-zero exit code {result.returncode}"
        raise RuntimeError(f"Script Error ({script_name}): {msg}")

    return f"{script_name} OK"



# ==============================================================================
# DAG
# ==============================================================================
with DAG(
    dag_id="hdc_service_dag",
    schedule="30 6 * * *",
    start_date=pendulum.datetime(2024, 1, 1, tz="Asia/Bangkok"),
    catchup=False,
    tags=["moph", "production"],
    default_args=default_args,
) as dag:

    # Task 1: check_db
    t_check_db = PythonOperator(
        task_id="check_db",
        python_callable=check_db,
        on_success_callback=discord_success_callback(DISCORD_VAR_KEY),
    )

    # Task 2: clean_database (run clean_data.py)
    clean_db_task = PythonOperator(
        task_id="clean_database",
        python_callable=_run_script,
        op_kwargs={
            "script_path": SCRIPTS_PATH,
            "script_name": SCRIPT_CLEAN_DB,
            "env_file": ENV_FILENAME,
            "timeout_sec": 300,
        },
        on_success_callback=discord_success_callback(DISCORD_VAR_KEY),
    )

    # Task 3: scrape_data (run scrape_moph.py)
    scrape_data_task = PythonOperator(
        task_id="scrape_data",
        python_callable=_run_script,
        op_kwargs={
            "script_path": SCRIPTS_PATH,
            "script_name": SCRIPT_SCRAPE,
            "env_file": ENV_FILENAME,
            "timeout_sec": 2400,
        },
        on_success_callback=discord_success_callback(DISCORD_VAR_KEY),
    )

    # Flow: check_db -> clean -> scrape
    t_check_db >> clean_db_task >> scrape_data_task
