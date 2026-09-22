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

- Web ผ่าน Nginx: `https://pm25-patients.ddc.moph.go.th/` (DNS ต้องชี้มายังเซิร์ฟเวอร์)
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

หลังเปลี่ยน certificate ให้ใช้ไฟล์ full chain (leaf ตามด้วย intermediate CA) ที่
`nginx/ssl/star_ddc_moph_go_th_ca.crt` แล้ว recreate container ด้วยคำสั่งนี้

```bash
docker compose up -d --force-recreate nginx
```

ห้ามใช้ไฟล์ leaf-only กับ `ssl_certificate` ตัวตรวจตอนเริ่ม Nginx จะไม่ยอมให้
container ทำงานเมื่อ chain มีน้อยกว่า 2 ใบ, certificate/key ไม่ตรงกัน หรือ
certificate หมดอายุ/ยังไม่เริ่มมีผล รวมถึง chain ไม่เชื่อมถึง trusted CA หรือชื่อโดเมนไม่ตรง
ไม่มีการแจ้งเตือนหรือหยุด Nginx ตามจำนวนวันที่เหลือก่อนหมดอายุ
ยังตรวจวันเริ่มมีผลและวันหมดอายุจริงของ certificate ตามปกติ
ตัวตรวจอ่าน path จาก `nginx -T` โดยตรง ไม่ใช้ `TLS_CERTIFICATE` หรือ `TLS_PRIVATE_KEY` override

ใช้โดเมน `pm25-patients.ddc.moph.go.th` แทน IP สำหรับ HTTPS เสมอ:
TLS handshake เกิดก่อน HTTP redirect จึงแก้ certificate mismatch ของ HTTPS ผ่าน IP ด้วย redirect ไม่ได้
Nginx ส่งทุก HTTP host ไปยังโดเมนหลัก และส่ง HSTS หลังเชื่อมต่อ HTTPS สำเร็จ
ตั้งค่า `AIRFLOW__API__BASE_URL` และ `AIRFLOW__WEBSERVER__BASE_URL` ใน `.env`
(หากมี override) เป็น `https://pm25-patients.ddc.moph.go.th/airflow`
แล้ว recreate `airflow-webserver` ด้วย เพื่อให้ค่าใหม่มีผล

เมื่ออัปเดตตัวตรวจ TLS ต้องใช้ Nginx image ที่ build จาก Dockerfile ใหม่ด้วย
การเปลี่ยนเฉพาะไฟล์ config หรือ restart image เก่าจะไม่อัปเดตตัวตรวจ
สำหรับการ build จาก checkout นี้บนเครื่อง deployment:

```bash
./scripts/deploy-https.sh
# Also apply Airflow BASE_URL changes when needed:
docker compose up -d --force-recreate airflow-webserver
```

สคริปต์ตรวจทุก IPv4 ที่ DNS ตอบกลับ ตรวจ full chain และเทียบ fingerprint
กับ certificate ที่กำหนดไว้ ค่า IP ที่อนุญาตโดยปริยายคือ `192.168.110.5`
และ `203.156.15.88` หากย้ายปลายทางโดยตั้งใจ ให้รันเช่น
`EXPECTED_TLS_IPS="192.168.110.6 203.156.15.89" ./scripts/deploy-https.sh`
การตรวจ fingerprint จะพบ proxy หรือ antivirus ที่เปลี่ยน certificate ระหว่างทาง
ส่วน HTTPS inspection, เวลาเครื่อง และ root CA ของระบบเก่าต้องจัดการผ่าน GPO/MDM

ทดสอบตัวตรวจด้วย OpenSSL 3 บน PATH:

```bash
python3 -m unittest discover -s nginx/tests
```

ตรวจใบรับรองที่ปลายทางส่งจริงหลัง deploy จากเครือข่ายผู้ใช้งาน:

```bash
openssl s_client -connect pm25-patients.ddc.moph.go.th:443 -servername pm25-patients.ddc.moph.go.th -verify_hostname pm25-patients.ddc.moph.go.th -verify_return_error -showcerts </dev/null
```

ต้องได้ `Verify return code: 0 (ok)` และได้รับทั้ง leaf กับ intermediate certificate

Compose จะรัน service สำหรับเตรียม schema, seed ผู้ใช้ และเตรียม shared volumes ก่อนเริ่ม Web และ Airflow

## Path สำคัญ

- `docker-compose.yml`: services, environment และ volumes
- `web/`: Next.js Dashboard
- `airflow/dags/`: DAG และ pipeline
- `airflow/dags/scripts/`: processing scripts และ HDC seed files
- `nginx/nginx.conf`: SSL และ reverse proxy routing

ไฟล์ PM2.5 runtime อยู่ใน `duckdb-data-volume` โดย Airflow เขียนทั้ง
`/opt/airflow/data/pm25.parquet` และ `/opt/airflow/data/pm25.csv` ส่วน Web
เห็นไฟล์เดียวกันที่ `/app/public/duckdb/` และใช้ `pm25.parquet` สำหรับ query
แดชบอร์ดเป็นหลัก

กฎสำหรับผู้ช่วยเขียนโค้ดอยู่ใน `AGENTS.md` ตาม root และโฟลเดอร์ของแต่ละ service ส่วนรายละเอียดเฉพาะ Dashboard อยู่ใน `web/src/app/dashboard/*/README.md`

The HTTPS deployment script validates the new image and mounted certificates before replacing Nginx, then verifies the served chain on localhost and the public domain. If localhost passes but the domain fails, check the TLS certificate on the upstream load balancer/proxy. Run it on the deployment server with upstream services already running.
