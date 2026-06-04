# CONTEXT.md: PM2.5 Patient Dashboard (System Overview)

## Project Overview
This is a multi-service platform for tracking and visualizing PM2.5 health impacts in Thailand. It consists of a data collection pipeline (Airflow), a web dashboard (Next.js), and supporting infrastructure (PostgreSQL, Redis, Nginx).

## System Architecture
The project is orchestrated using Docker Compose with the following services:

- **web**: Next.js 16 (React 19) dashboard. Serves as the primary user interface.
- **airflow**: Apache Airflow stack (Webserver, Scheduler, Worker, Triggerer, DAG Processor) for ETL tasks.
- **postgres**: Main database for Airflow and User management.
- **postgres-etl**: Secondary database for storing processed health and environmental data.
- **redis**: Message broker for Airflow's Celery Executor.
- **nginx**: Reverse proxy handling SSL and routing for `web` (at `/`) and `airflow` (at `/airflow`).

## Communication Flow
1. **Airflow** scrapes data from external sources (Air4Thai, HDC Service) and processes it.
2. Processed data is stored as **Parquet/CSV** files (shared with `web` via `public/duckdb`) or in the **postgres-etl** database.
3. **Web Dashboard** queries DuckDB (for large-scale analytics) and PostgreSQL (for user/app state).
4. **Nginx** routes external traffic to the appropriate service.

## Global Building and Running
- **Standard**: `docker compose up -d`
- **Build from source**: `docker compose up -d --build`
- **Environment**: Configuration is managed via a root `.env` file.

## Shared Data Directory
- `web/public/duckdb/`: Primary storage for analytical datasets used by DuckDB.
- `airflow/dags/scripts/`: Source scripts for data processing.
