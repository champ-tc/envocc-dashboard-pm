import os
import sys
import pendulum
from datetime import timedelta

from airflow.decorators import dag, task

# ทำให้ import โฟลเดอร์ dags/ ได้
DAGS_DIR = os.path.dirname(os.path.abspath(__file__))
if DAGS_DIR not in sys.path:
    sys.path.insert(0, DAGS_DIR)

from check_db.check_db import check_db
from notify.discord_notify import discord_failure_callback, send_custom_discord_message
from stations.stations import run as run_station_job

# Key ของ Airflow Variable ที่ใช้เก็บ Discord Webhook URL
AIRFLOW_VAR_DISCORD_WEBHOOK = "air4thai_station"
DISCORD_MESSAGE_LIMIT = 1900
FIELD_LABELS = {
    "station_id": "รหัสสถานี",
    "station_id_new": "รหัสสถานีใหม่",
    "station_name": "ชื่อสถานี",
    "station_type": "ประเภทสถานี",
    "latitude": "ละติจูด",
    "longitude": "ลองจิจูด",
    "province": "จังหวัด",
    "district": "อำเภอ/เขต",
    "subdistrict": "ตำบล/แขวง",
    "health_region": "เขตสุขภาพ",
}

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
    "on_failure_callback": discord_failure_callback(AIRFLOW_VAR_DISCORD_WEBHOOK),
}

@dag(
    dag_id="air4thai_station",
    default_args=default_args,
    description="Sync Air4Thai Stations Master Data (TaskFlow API)",
    schedule="20 6 * * *",
    start_date=pendulum.datetime(2024, 12, 1, tz="Asia/Bangkok"),
    catchup=False,
    max_active_runs=1,
    tags=["air4thai", "station", "senior_style"],
)
def air4thai_station_sync_dag():
    """
    DAG สำหรับซิงค์ข้อมูลสถานีตรวจวัดคุณภาพอากาศจาก Air4Thai
    ใช้ TaskFlow API เพื่อความสะอาดและทันสมัยของโค้ด
    """

    @task(task_id="check_db")
    def check_db_status():
        """ตรวจสอบความพร้อมของฐานข้อมูล"""
        check_db()

    @task(task_id="sync_stations")
    def sync_stations_job():
        """ดึงข้อมูลสถานีและอัปเดตลงฐานข้อมูล พร้อมคืนค่าสรุปผล"""
        return run_station_job()

    @task(task_id="notify_station_changes")
    def notify_changes(sync_summary: dict):
        """แจ้งการเปลี่ยนแปลงสถานีและสถานีที่ไม่มีข้อมูลตำบลผ่าน Discord"""
        if not sync_summary:
            print("No summary received")
            return

        new_count = int(sync_summary.get("inserted") or 0)
        updated_count = int(sync_summary.get("updated") or 0)
        changes = sync_summary.get("changes") or []
        missing_subdistrict = sync_summary.get("missing_subdistrict") or []

        if new_count == 0 and updated_count == 0 and not missing_subdistrict:
            print("No station changes and no missing subdistrict -> skip notify")
            return

        lines = [
            "**Air4Thai Station Sync**",
            f"เพิ่มใหม่: {new_count} | อัปเดต: {updated_count} | ไม่มีตำบล: {len(missing_subdistrict)}",
        ]

        if changes:
            lines.append("\n**รายละเอียดการเปลี่ยนแปลง**")
            for change in changes:
                fields = change.get("fields") or {}
                location = change.get("location") or {}
                detail = ", ".join(
                    f"{FIELD_LABELS.get(key, key)}: {value.get('old')} -> {value.get('new')}"
                    for key, value in fields.items()
                ) or ", ".join(
                    f"{FIELD_LABELS.get(key, key)}: {value}"
                    for key, value in location.items()
                )
                lines.append(f"- {change.get('type')}: {change.get('station')} | {detail}")

        if missing_subdistrict:
            lines.append("\n**สถานีที่ไม่มีข้อมูลตำบล**")
            for station in missing_subdistrict:
                lines.append(
                    f"- {station.get('station')} | จังหวัด: {station.get('province')} "
                    f"| อำเภอ/เขต: {station.get('district')}"
                )

        messages = []
        current = ""
        for line in lines:
            candidate = f"{current}\n{line}".strip()
            if current and len(candidate) > DISCORD_MESSAGE_LIMIT:
                messages.append(current)
                current = line
            else:
                current = candidate
        if current:
            messages.append(current)

        for message in messages:
            send_custom_discord_message(AIRFLOW_VAR_DISCORD_WEBHOOK, message)
        print(
            f"Discord notified: {new_count} new, {updated_count} updated, "
            f"{len(missing_subdistrict)} missing subdistrict"
        )

    # กำหนดลำดับการทำงาน (Dependency)
    # ใช้การผ่านค่าตัวแปรแทน xcom_pull
    db_check = check_db_status()
    summary = sync_stations_job()
    notification = notify_changes(summary)

    # กำหนดว่าต้องเช็ค DB ให้ผ่านก่อนเริ่มซิงค์
    db_check >> summary

# เรียกใช้งานฟังก์ชันเพื่อลงทะเบียน DAG เข้าสู่ระบบ Airflow
air4thai_station_sync_dag()
