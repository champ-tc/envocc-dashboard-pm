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
  - Use `webdriver-manager` for driver management.
  - Implement robust wait conditions (`WebDriverWait`) instead of hard sleeps.
- **Environment**: Scripts should read database credentials from environment variables (`DB_HOST`, `DB_USER`, etc.) provided by the Docker service.

## Database Interfacing
- **Target**: Most analytical data should be pushed to the `postgres-etl` service.
- **Schema**: Before modifying the output schema of a script, verify if the `web` service's DuckDB or Drizzle queries need to be updated.

## Maintenance
- **Logs**: Check `/opt/airflow/logs` for execution details.
- **Variables**: Store dynamic configurations (like API keys or scraping targets) in Airflow Variables, imported via `config/variables.json` during init.
