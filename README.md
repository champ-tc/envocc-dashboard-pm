# PM2.5 Patient Database & Dashboard

ระบบติดตามข้อมูล PM2.5 และผลกระทบต่อสุขภาพ ประกอบด้วย Next.js, Apache Airflow, PostgreSQL, DuckDB, Redis และ Nginx โดยรันร่วมกันผ่าน Docker Compose

## โครงสร้างระบบ

- **Web**: Next.js 16 และ React 19 สำหรับ Dashboard, API และระบบผู้ใช้
- **Airflow**: ดึง ประมวลผล และเผยแพร่ข้อมูล PM2.5, HDC และ DDS
- **PostgreSQL `postgres`**: Airflow metadata และ Celery result backend
- **PostgreSQL `postgres-etl`**: ข้อมูลแอป ผู้ใช้ และข้อมูลเชิงสัมพันธ์ที่ผ่านการประมวลผล
- **DuckDB**: Query ไฟล์ CSV/Parquet สำหรับ Dashboard โดยฐานข้อมูลทำงานใน memory
- **Redis**: Broker ของ Airflow CeleryExecutor
- **Nginx**: SSL reverse proxy; `/` ไป Web และ `/airflow` ไป Airflow

## การจัดเก็บข้อมูล

ข้อมูลถาวรอยู่ใน Docker named volumes:

| Volume | ตำแหน่งใน container | หน้าที่ |
| --- | --- | --- |
| `postgres-db-volume` | `/var/lib/postgresql/data` | Airflow metadata |
| `postgres-etl-volume` | `/var/lib/postgresql/data` | ฐานข้อมูลแอปและ ETL |
| `duckdb-data-volume` | Airflow: `/opt/airflow/data`<br>Web: `/app/public/duckdb` | CSV/Parquet ที่ Airflow และ Web ใช้ร่วมกัน |
| `dds-input-volume` | Airflow: `/opt/airflow/input/dds`<br>Web: `/app/uploads/dds` | ไฟล์นำเข้าของ DDS |

ไฟล์ใน `web/public/duckdb/` และ `airflow/dags/scripts/` เป็นข้อมูลตั้งต้นที่บรรจุใน image สำหรับสร้าง volume ครั้งแรก ข้อมูลใหม่ที่ Airflow สร้างขณะรันจะอยู่ใน `duckdb-data-volume`

> การสั่ง `docker compose down -v` จะลบ named volumes และข้อมูลถาวรทั้งหมด ควรสำรองข้อมูลก่อนใช้งานคำสั่งนี้

## การตั้งค่า

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ ไฟล์นี้ใช้ร่วมกันทุก service และห้าม commit ลง Git

ตัวแปรสำคัญประกอบด้วย:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `ETL_POSTGRES_USER`, `ETL_POSTGRES_PASSWORD`, `ETL_POSTGRES_DB`
- `AIRFLOW__CORE__FERNET_KEY`
- `AIRFLOW__API__SECRET_KEY`, `AIRFLOW__API_AUTH__JWT_SECRET`
- `_AIRFLOW_WWW_USER_USERNAME`, `_AIRFLOW_WWW_USER_PASSWORD`
- ค่า secret ของ Web เช่น JWT ตามที่กำหนดใน `.env` ของ deployment

ตรวจสอบรายการตัวแปรและค่า default ล่าสุดจาก `docker-compose.yml` ก่อน deploy

## การรันจาก source

```bash
docker compose up -d --build
```

ตรวจสอบสถานะและ log:

```bash
docker compose ps
docker compose logs --tail=100 web airflow-webserver airflow-scheduler airflow-worker nginx
```

ช่องทางเข้าใช้งานในเครื่อง:

- Web ผ่าน Nginx: `https://localhost/` หรือ port/domain ที่ตั้งไว้
- Web โดยตรงภายใน Compose network: port `3000` (ไม่ได้ publish ออก host)
- Airflow: `http://localhost:8080/airflow/`
- PostgreSQL ETL: `localhost:15432` โดยค่าเริ่มต้น

## Production ผ่าน GHCR

Images หลัก:

- `ghcr.io/champ-tc/envocc-dashboard-pm-web:latest`
- `ghcr.io/champ-tc/envocc-dashboard-pm-airflow:latest`
- `ghcr.io/champ-tc/envocc-dashboard-pm-nginx:latest`

อัปเดตระบบ:

```bash
docker compose pull
docker compose up -d
```

Compose จะรัน service สำหรับเตรียม schema, seed ผู้ใช้ และเตรียม shared volumes ก่อนเริ่ม Web และ Airflow

## Path สำคัญ

- `docker-compose.yml`: services, environment และ volumes
- `web/`: Next.js Dashboard
- `airflow/dags/`: DAG และ pipeline
- `airflow/dags/scripts/`: processing scripts และ HDC seed files
- `nginx/nginx.conf`: SSL และ reverse proxy routing

กฎสำหรับผู้ช่วยเขียนโค้ดอยู่ใน `AGENTS.md` ตาม root และโฟลเดอร์ของแต่ละ service ส่วนรายละเอียดเฉพาะ Dashboard อยู่ใน `web/src/app/dashboard/*/README.md`
