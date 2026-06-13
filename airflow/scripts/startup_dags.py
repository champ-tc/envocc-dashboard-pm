#!/usr/bin/env python3

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone


ENABLED = os.getenv("AIRFLOW_STARTUP_TRIGGER_DAGS", "true").lower() == "true"
WAIT_SECONDS = int(os.getenv("AIRFLOW_STARTUP_DAG_WAIT_SECONDS", "180"))
POLL_SECONDS = int(os.getenv("AIRFLOW_STARTUP_DAG_POLL_SECONDS", "10"))


def run_airflow(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    command = ["airflow", *args]
    result = subprocess.run(
        command,
        check=False,
        text=True,
        capture_output=True,
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            f"{' '.join(command)} failed: {result.stderr.strip() or result.stdout.strip()}"
        )
    return result


def list_dag_ids() -> list[str]:
    result = run_airflow("dags", "list", "--output", "json")
    rows = json.loads(result.stdout)
    return sorted(
        {
            str(row["dag_id"])
            for row in rows
            if row.get("dag_id")
        }
    )


def wait_for_dags() -> list[str]:
    deadline = time.monotonic() + WAIT_SECONDS
    last_error = ""
    previous_dag_ids: list[str] = []

    while time.monotonic() < deadline:
        try:
            dag_ids = list_dag_ids()
            if dag_ids and dag_ids == previous_dag_ids:
                return dag_ids
            if dag_ids:
                previous_dag_ids = dag_ids
                last_error = f"found {len(dag_ids)} DAGs; waiting for a stable list"
            else:
                last_error = "no DAGs found"
        except (RuntimeError, json.JSONDecodeError) as error:
            last_error = str(error)

        print(f"Waiting for Airflow DAGs: {last_error}", flush=True)
        time.sleep(POLL_SECONDS)

    raise RuntimeError(
        f"Airflow DAGs were not ready within {WAIT_SECONDS} seconds: {last_error}"
    )


def main() -> None:
    if not ENABLED:
        print("Airflow startup DAG triggering is disabled.", flush=True)
        return

    dag_ids = wait_for_dags()
    startup_time = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    for dag_id in dag_ids:
        unpause_result = run_airflow("dags", "unpause", dag_id, check=False)
        if unpause_result.returncode != 0:
            print(
                f"Failed to unpause DAG {dag_id}: "
                f"{unpause_result.stderr.strip() or unpause_result.stdout.strip()}",
                file=sys.stderr,
                flush=True,
            )

        run_id = f"startup__{startup_time}__{dag_id}"
        result = run_airflow(
            "dags",
            "trigger",
            "--run-id",
            run_id,
            dag_id,
            check=False,
        )
        if result.returncode == 0:
            print(f"Triggered startup run for DAG: {dag_id}", flush=True)
            continue

        print(
            f"Failed to trigger DAG {dag_id}: "
            f"{result.stderr.strip() or result.stdout.strip()}",
            file=sys.stderr,
            flush=True,
        )


if __name__ == "__main__":
    main()
