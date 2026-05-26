import requests
from airflow.sdk import Variable  # Airflow 3+ (Task SDK)


def _post_discord(webhook_url: str, content: str):
    if not webhook_url:
        print("❌ Discord notify failed: webhook_url is empty")
        return
    try:
        r = requests.post(webhook_url, json={"content": content}, timeout=10)
        if r.status_code >= 400:
            print(f"❌ Discord notify failed: status={r.status_code}, body={r.text[:200]}")
    except Exception as e:
        print(f"❌ Discord notify failed: {type(e).__name__}: {e}")


def _get_webhook(variable_key: str):
    # ห้ามให้ callback ล้มเพราะ Variable
    try:
        return Variable.get(variable_key)
    except Exception as e:
        print(f"❌ Missing/Unreadable Airflow Variable '{variable_key}': {type(e).__name__}: {e}")
        return None


def _get_ts(context):
    # Airflow 3 จะเน้น logical_date มากกว่า execution_date
    dt = context.get("logical_date") or context.get("execution_date")
    if not dt:
        return "-"
    try:
        return dt.astimezone().strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt)


def discord_failure_callback(variable_key: str):
    def _callback(context):
        try:
            webhook_url = _get_webhook(variable_key)
            if not webhook_url:
                return

            ti = context.get("task_instance")
            dag = context.get("dag")
            exception = context.get("exception")

            dag_id = getattr(dag, "dag_id", "-")
            task_id = getattr(ti, "task_id", "-")
            log_url = getattr(ti, "log_url", "-")
            ts = _get_ts(context)

            msg = (
                f"Job Failed: `{dag_id}`\n"
                f"Task: `{task_id}`\n"
                f"Time: {ts}\n"
                f"Error: `{exception}`\n"
            )

            _post_discord(webhook_url, msg)

        except Exception as e:
            # สำคัญ: callback ต้องไม่ทำให้ task fail
            print(f"❌ failure callback crashed: {type(e).__name__}: {e}")

    return _callback


def send_custom_discord_message(variable_key: str, message: str):
    """ส่งข้อความแจ้งเตือนแบบกำหนดเองไปยัง Discord"""
    try:
        webhook_url = _get_webhook(variable_key)
        if not webhook_url:
            return
        _post_discord(webhook_url, message)
    except Exception as e:
        print(f"❌ send_custom_discord_message failed: {type(e).__name__}: {e}")

def discord_success_callback(variable_key: str):
    def _callback(context):
        return  # ปิดแจ้งเตือนสำเร็จทั้งหมด
    return _callback

