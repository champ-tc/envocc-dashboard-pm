import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine, text


def _must(name: str) -> str:
    v = os.getenv(name)
    if v is None or str(v).strip() == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return v.strip()


def check_db():
    """
    เช็คว่าเชื่อมต่อฐานข้อมูลได้หรือไม่
    - SELECT 1 ผ่าน = OK
    - ต่อไม่ได้ = raise error ให้ Airflow fail
    """

    user = _must("DB_USER")
    password = _must("DB_PASSWORD")
    host = _must("DB_HOST")
    port = _must("DB_PORT")
    dbname = _must("DB_NAME")

    url = f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"
    print("DB =", f"{host}:{port}/{dbname} (user={user})")

    engine = create_engine(url, pool_pre_ping=True)

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    print("[OK] database connection successful")
