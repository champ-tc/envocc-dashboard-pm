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

COPY dags /opt/airflow/dags
COPY config /opt/airflow/config
