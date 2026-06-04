# CONTEXT.md: Airflow Data Pipelines

## Overview
The Airflow system in this project handles the automated collection, processing, and storage of PM2.5 and patient health data. It uses a **CeleryExecutor** with **Redis** as a broker and **PostgreSQL** as the backend.

## Data Pipelines (DAGs)
- **`pm25_patients_pipeline_dag.py`**: The core pipeline.
  - Scrapes data from external sources using Selenium.
  - Merges and cleans data using Pandas.
  - Outputs processed data to `web/public/duckdb/` and `postgres-etl`.
- **`air4thai_*_dag.py`**: Collects air quality data from the Air4Thai API.
- **`hdc_service_dag.py`**: Fetches health data from the HDC service.

## Directory Structure
- `dags/`: Contains DAG definitions.
- `dags/scripts/`: Standalone Python scripts executed by `PythonOperator` via `subprocess` for isolation.
- `dags/notify/`: Helper scripts for Discord notifications.
- `plugins/`: Custom Airflow plugins (if any).
- `config/`: Airflow configuration and variables.

## Technology Stack
- **Airflow**: 3.0 (approximate based on config) / Stable version used in Docker.
- **Python Libraries**: Pandas (Data manipulation), Selenium (Web scraping), openpyxl (Excel processing).
- **External Dependencies**: Requires Chromium and ChromeDriver for Selenium scripts.

## Data Outputs
- **CSV/Parquet**: Files generated in `web/public/duckdb/` for the Next.js dashboard.
- **Database**: Records inserted into the `postgres-etl` service.
