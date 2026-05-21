import os
import sys
import pendulum
from datetime import timedelta

from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator

# ทำให้ import โฟลเดอร์ dags/ ได้
DAGS_DIR = os.path.dirname(os.path.abspath(__file__))
if DAGS_DIR not in sys.path:
    sys.path.insert(0, DAGS_DIR)

# Import notification helpers if they exist (following project pattern)
try:
    from notify.discord_notify import discord_failure_callback, discord_success_callback
    DISCORD_VAR_KEY = "pm25_pipeline"
    on_failure = discord_failure_callback(DISCORD_VAR_KEY)
    on_success = discord_success_callback(DISCORD_VAR_KEY)
except ImportError:
    on_failure = None
    on_success = None

# ==============================================================================
# CONFIG
# ==============================================================================
# ใช้ path สัมพัทธ์เพื่อให้ทำงานได้ทั้ง local และ container
SCRIPTS_DIR = os.path.join(DAGS_DIR, "scripts")

SCRIPT_SCRAPING = "scraping.py"
SCRIPT_MERGED = "merged.py"
SCRIPT_CELL = "cell.py"

default_args = {
    "owner": "data_engineer",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=6), # Scraping takes a long time
    "on_failure_callback": on_failure,
}

def _run_script(script_path: str, script_name: str, timeout_sec: int) -> str:
    import subprocess
    import sys
    
    full_script_path = os.path.join(script_path, script_name)

    if not os.path.exists(full_script_path):
        raise FileNotFoundError(f"Script not found: {full_script_path}")

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    cmd = [sys.executable, full_script_path]

    print("=" * 80)
    print(f">>> RUN: {script_name}")
    print(f">>> CWD: {script_path}")
    print(f">>> TIMEOUT: {timeout_sec}s")
    print("=" * 80)

    try:
        process = subprocess.Popen(
            cmd,
            cwd=script_path,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        # Stream output line-by-line
        for line in process.stdout:
            print(line, end="", flush=True)

        returncode = process.wait(timeout=timeout_sec)
    except subprocess.TimeoutExpired:
        process.kill()
        raise RuntimeError(f"Script Timeout ({script_name}) after {timeout_sec}s")
    except Exception as e:
        if 'process' in locals():
            process.kill()
        raise e

    print(f"\n>>> RETURN CODE: {returncode}")
    if returncode != 0:
        raise RuntimeError(f"Script Error ({script_name}): non-zero exit code {returncode}")

    return f"{script_name} OK"


# ==============================================================================
# DAG
# ==============================================================================
# Set schedule based on environment (Disable in development)
APP_ENV = os.getenv("APP_ENV", "development")
dag_schedule = "0 3 * * *" if APP_ENV == "production" else None

with DAG(
    dag_id="pm25_patients_pipeline_dag",
    description="Pipeline for scraping, merging, and concatenating PM2.5 patient data",
    schedule=dag_schedule,
    start_date=pendulum.datetime(2024, 1, 1, tz="Asia/Bangkok"),

    catchup=False,
    tags=["pm25", "moph", "pipeline"],
    default_args=default_args,
) as dag:

    # Task 1: Scrape raw data from HDC
    scrape_task = PythonOperator(
        task_id="scrape_hdc_data",
        python_callable=_run_script,
        op_kwargs={
            "script_path": SCRIPTS_DIR,
            "script_name": SCRIPT_SCRAPING,
            "timeout_sec": 14400, # 4 hours for full scraping
        },
        on_success_callback=on_success,
    )

    # Task 2: Merge raw data into long format (merged.py)
    merge_task = PythonOperator(
        task_id="merge_hdc_data",
        python_callable=_run_script,
        op_kwargs={
            "script_path": SCRIPTS_DIR,
            "script_name": SCRIPT_MERGED,
            "timeout_sec": 600,
        },
        on_success_callback=on_success,
    )

    # Task 3: Concatenate all years into final dataset (cell.py)
    cell_task = PythonOperator(
        task_id="concatenate_hdc_data",
        python_callable=_run_script,
        op_kwargs={
            "script_path": SCRIPTS_DIR,
            "script_name": SCRIPT_CELL,
            "timeout_sec": 300,
        },
        on_success_callback=on_success,
    )

    # Workflow: Scrape >> Merge >> Cell
    scrape_task >> merge_task >> cell_task
