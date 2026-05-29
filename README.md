# PM2.5 Patient Database & Dashboard

โครงการนี้เป็นระบบ Dashboard สำหรับติดตามผลกระทบของ PM2.5 ต่อผู้ป่วยโรคระบบทางเดินหายใจและระบบไหลเวียนโลหิต โครงสร้างระบบประกอบด้วย Next.js (Web), Apache Airflow (ETL), PostgreSQL (Database) และ Nginx (Gateway) โดยทำงานประสานกันผ่าน Docker

ระบบนี้ถูกออกแบบมาเพื่อรองรับข้อจำกัดด้านเครือข่ายของเซิร์ฟเวอร์องค์กร (No Inbound) โดยใช้แนวทางการนำส่งแอปพลิเคชันแบบ **Pull-based Deployment ผ่าน GitHub Container Registry (GHCR)**

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

*   **Web (Next.js)**: Frontend และ API ฝั่งผู้ใช้
*   **Airflow**: จัดการ Pipeline สำหรับดึงข้อมูลและประมวลผล (ETL)
*   **Postgres & DuckDB**: ฐานข้อมูลสำหรับเก็บข้อมูลผู้ใช้ (OLTP) และข้อมูลเชิงวิเคราะห์ (OLAP)
*   **Nginx**: Reverse Proxy กลาง ทำหน้าที่จัดการ SSL/HTTPS, Security Headers และแบ่ง Route
*   **CI/CD (GitHub Actions)**: รับหน้าที่ Build Docker Images และเก็บไว้ที่ GHCR

---

## 💻 โหมดพัฒนา (Local Development)

สำหรับการพัฒนาโปรแกรมบนเครื่องส่วนตัว (Hot-reload):

1. สร้างไฟล์รหัสผ่านสำหรับรันในเครื่อง (ใช้ค่าตั้งต้นได้เลย)
2. สั่งรันระบบด้วยไฟล์ Dev Compose:
```bash
docker compose -f docker-compose.dev.yml up -d --build
```
3. เข้าใช้งานผ่าน `http://localhost:3000` (Web) หรือ `http://localhost:8080` (Airflow)

---

## 🚀 โหมดใช้งานจริง (Production CI/CD)

ระบบ Production จะใช้การอัปเดตอัตโนมัติผ่าน GitHub Actions เมื่อมีการ Push โค้ดขึ้น Branch `main` ระบบจะทำการ Build Image ใหม่และส่งไปเก็บที่ GHCR ทันที

### 1. การตั้งค่าเซิร์ฟเวอร์ครั้งแรก (Server Setup)
เซิร์ฟเวอร์มีหน้าที่เพียงแค่ดาวน์โหลด (Pull) Image ที่ Build เสร็จแล้วมารัน ไม่ต้องมีการติดตั้ง Node.js หรือ Python ในเครื่อง:

1. **เตรียมไฟล์ใบรับรอง SSL**
   สร้างโฟลเดอร์ `nginx/ssl/` และนำไฟล์ SSL จากองค์กรมาวาง:
   *   `nginx/ssl/star_ddc_moph_go_th.crt`
   *   `nginx/ssl/star_ddc_moph_go_th.key`

2. **ตั้งค่าตัวแปร (Environment Variables)**
   คัดลอกไฟล์ `.env.template` เป็น `.env` และกรอกข้อมูลรหัสผ่านจริง:
   ```bash
   cp .env.template .env
   nano .env
   ```
   ค่า Airflow ที่ต้องตั้งอย่างน้อยคือ `AIRFLOW__CORE__FERNET_KEY`, `AIRFLOW__API__SECRET_KEY`, `AIRFLOW__API_AUTH__JWT_SECRET` และ `_AIRFLOW_WWW_USER_PASSWORD`

3. **เตรียมไฟล์ Docker Compose**
   นำไฟล์ `docker-compose.yml` วางไว้ในโฟลเดอร์เดียวกันกับ `.env`

### 2. การอัปเดตระบบและเปิดใช้งาน (Deploy & Update)
เมื่อ GitHub Actions ทำงานเสร็จ (ไฟเขียว) ให้รันคำสั่งเหล่านี้บนเซิร์ฟเวอร์เพื่อนำโค้ดล่าสุดมาใช้งาน:

```bash
# 1. Login เข้า GitHub Registry (ทำครั้งแรกครั้งเดียว โดยใช้ Personal Access Token)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 2. ดาวน์โหลด Image ตัวล่าสุดที่ Build ผ่าน GitHub Actions
docker compose pull

# 3. อัปเดตและรันระบบ (Docker จะ Restart เฉพาะ Service ที่มีการเปลี่ยนแปลง)
docker compose up -d
```

### 3. การรีสตาร์ทระบบ (Troubleshooting)
หากพบปัญหา Nginx หา IP ของ Airflow หรือ Web ไม่เจอ (502 Bad Gateway) หลังจากการเปิดคอนเทนเนอร์ใหม่ ให้สั่ง Restart Nginx:
```bash
docker compose restart nginx
```

หาก Airflow เข้าไม่ได้หลังแก้ `.env` หรือเปลี่ยนรหัสผ่าน admin ให้รัน init แล้วเปิด service ใหม่:
```bash
docker compose up airflow-init
docker compose up -d airflow-webserver airflow-scheduler airflow-worker nginx
```

ตรวจ log Airflow บน server:
```bash
docker compose logs --tail=100 airflow-init airflow-webserver airflow-scheduler airflow-worker
```

---

## 🔒 การจัดการความปลอดภัย
*   **ไฟล์ความลับ (`.env`)**: ห้ามนำขึ้น GitHub เด็ดขาด (ควบคุมโดย `.gitignore` แล้ว) ให้ใช้ `.env.template` เป็นคู่มือเท่านั้น
*   **SSL & HTTPS**: Nginx ถูกตั้งค่าให้บังคับใช้ HTTPS ทันที และมี Security Headers ที่ได้มาตรฐาน
*   **Next.js Security**: ทำงานด้วยโหมด `standalone` และใช้ User `nextjs` (Non-root) ในคอนเทนเนอร์

---

## 🌐 การเข้าใช้งาน (Production Access)
เมื่อนำขึ้นเซิร์ฟเวอร์เรียบร้อยแล้ว สามารถเข้าใช้งานระบบผ่านโดเมนจริง:
*   **Web App**: [https://pm25-patients.ddc.moph.go.th](https://pm25-patients.ddc.moph.go.th)
*   **Airflow UI**: [https://pm25-patients.ddc.moph.go.th/airflow/](https://pm25-patients.ddc.moph.go.th/airflow/)
