FROM apache/airflow:3.0.2

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

USER airflow
# ติดตั้ง FAB Provider เพื่อให้ใช้ระบบ Login และคำสั่ง 'airflow fab users' ได้
RUN pip install --no-cache-dir "apache-airflow-providers-fab>=1.0.0"

COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

COPY --chown=airflow:0 dags/ /opt/airflow/dags/
COPY --chown=airflow:0 config/ /opt/airflow/config/
RUN test -f /opt/airflow/dags/air4thai_pm25_daily_dag.py \
    && test -f /opt/airflow/dags/scripts/hdc.parquet \
    && find /opt/airflow/dags -type f | head
