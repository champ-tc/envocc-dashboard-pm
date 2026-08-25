# AGENTS.md: Airflow Development Rules

## DAG Development Rules
- **Isolation**: Prefer running processing logic in standalone scripts (in `dags/scripts/`) using `subprocess` or `PythonOperator` to avoid dependency conflicts in the Airflow scheduler.
- **Paths**: Use absolute paths or define `DAGS_DIR` dynamically to ensure scripts can locate files when running inside the Docker container (`/opt/airflow/dags`).
- **Timezones**: Always use `pendulum` for time-related logic and specify `Asia/Bangkok` where applicable.
- **Callbacks**: Ensure `on_failure_callback` is configured with Discord notification helpers found in `dags/notify/`.

## Scripting Standards
- **Pandas**: Use vectorised operations where possible for efficiency.
- **Selenium**: 
  - Always run in `--headless` mode.
  - Use the Chromium and ChromiumDriver binaries installed by `airflow/Dockerfile`; do not download a driver at DAG runtime.
  - Implement robust wait conditions (`WebDriverWait`) instead of hard sleeps.
- **Environment**: Scripts should read database credentials from environment variables (`DB_HOST`, `DB_USER`, etc.) provided by the Docker service.

## Data Outputs and Database Interfacing
- **Files**: Publish dashboard CSV/Parquet outputs through `DUCKDB_DATA_DIR` (`/opt/airflow/data` in Docker). This is the shared `duckdb-data-volume` consumed by Web.
- **Database**: Use `postgres-etl` for processed relational data; `postgres` is reserved for Airflow metadata and Celery results.
- **Schema**: Before modifying an output schema, verify all affected DuckDB queries and Drizzle consumers in `web`.
- **Atomic Writes**: Write large CSV/Parquet outputs to a temporary file and rename them only after the write succeeds.

## Maintenance
- **Logs**: Check `/opt/airflow/logs` for execution details.
- **Variables**: Store dynamic configurations (like API keys or scraping targets) in Airflow Variables, imported via `config/variables.json` during init.
