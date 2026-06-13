import os
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# ===== 0) CONFIG =====
load_dotenv()
ENGINE = create_engine(
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}",
    pool_pre_ping=True,
)

POLS = ["pm25", "pm10", "o3", "co", "no2", "so2"]


def ensure_pm25_daily_table() -> None:
    with ENGINE.begin() as cx:
        cx.execute(text("""
            CREATE TABLE IF NOT EXISTS pm25_daily (
              air4_date DATE NOT NULL,
              station_id_new TEXT NOT NULL,
              pm25_max NUMERIC(12, 2),
              pm25_min NUMERIC(12, 2),
              pm25_avg NUMERIC(12, 2),
              pm10_max NUMERIC(12, 2),
              pm10_min NUMERIC(12, 2),
              pm10_avg NUMERIC(12, 2),
              o3_max NUMERIC(12, 2),
              o3_min NUMERIC(12, 2),
              o3_avg NUMERIC(12, 2),
              co_max NUMERIC(12, 2),
              co_min NUMERIC(12, 2),
              co_avg NUMERIC(12, 2),
              no2_max NUMERIC(12, 2),
              no2_min NUMERIC(12, 2),
              no2_avg NUMERIC(12, 2),
              so2_max NUMERIC(12, 2),
              so2_min NUMERIC(12, 2),
              so2_avg NUMERIC(12, 2)
            )
        """))
        cx.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_pm25_daily_station_date
            ON pm25_daily (station_id_new, air4_date)
        """))
        numeric_columns = [
            f"{pol}_{stat}"
            for pol in POLS
            for stat in ["max", "min", "avg"]
        ]
        alter_columns = ", ".join(
            f"ALTER COLUMN {column} TYPE NUMERIC(12, 2) USING ROUND({column}::numeric, 2)"
            for column in numeric_columns
        )
        cx.execute(text(f"ALTER TABLE pm25_daily {alter_columns}"))
        cx.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_pm25_daily_air4_date
            ON pm25_daily (air4_date)
        """))
    print("[OK] pm25_daily table/indexes are ready")


def compute_daily_summary() -> None:
    print("--- Start Daily Summary ETL (Full Refresh) ---")
    ensure_pm25_daily_table()

    # ===== 1) Extract (ดึงข้อมูลรายชั่วโมงทั้งหมด แบ่งวันตามเวลาไทย) =====
    sql = """
        SELECT
          (air4_time AT TIME ZONE 'Asia/Bangkok')::date AS air4_date,
          station_id_new,
          pm25,
          pm10,
          o3,
          co,
          no2,
          so2
        FROM pm25_hourly
        WHERE station_id_new IS NOT NULL
          AND btrim(station_id_new) <> ''
        """

    with ENGINE.connect() as cx:
        rows = cx.execute(text(sql)).mappings().all()
        hourly = pd.DataFrame.from_records(
            [dict(row) for row in rows],
            columns=["air4_date", "station_id_new", "pm25", "pm10", "o3", "co", "no2", "so2"],
        )

    if hourly.empty:
        print("[info] No hourly data found.")
        return

    # ===== 2) Transform =====
    hourly["station_id_new"] = hourly["station_id_new"].astype("string").str.strip()
    for col in POLS:
        hourly[col] = pd.to_numeric(hourly[col], errors="coerce")

    # Groupby แยกตามวันที่ไทยและตำแหน่งสถานี
    agg_funcs = {col: ['max', 'min', 'mean'] for col in POLS}
    daily_agg = hourly.groupby(
        ["air4_date", "station_id_new"],
        as_index=False,
    ).agg(agg_funcs)

    # จัดระเบียบชื่อ Column
    new_cols = ["air4_date", "station_id_new"]
    for col in POLS:
        new_cols.extend([f"{col}_max", f"{col}_min", f"{col}_avg"])
    daily_agg.columns = new_cols
    daily_agg[new_cols[2:]] = daily_agg[new_cols[2:]].round(2)

    daily_result = daily_agg.where(pd.notnull(daily_agg), None)
    rows = daily_result.to_dict(orient="records")

    # ===== 3) Load (ล้างข้อมูลเดิมและสร้างใหม่ทั้งหมดใน transaction เดียว) =====
    insert_sql = text(
        """
        INSERT INTO pm25_daily (
          air4_date, station_id_new,
          pm25_max, pm25_min, pm25_avg,
          pm10_max, pm10_min, pm10_avg,
          o3_max, o3_min, o3_avg,
          co_max, co_min, co_avg,
          no2_max, no2_min, no2_avg,
          so2_max, so2_min, so2_avg
        ) VALUES (
          :air4_date, :station_id_new,
          :pm25_max, :pm25_min, :pm25_avg,
          :pm10_max, :pm10_min, :pm10_avg,
          :o3_max, :o3_min, :o3_avg,
          :co_max, :co_min, :co_avg,
          :no2_max, :no2_min, :no2_avg,
          :so2_max, :so2_min, :so2_avg
        )
        """
    )

    try:
        with ENGINE.begin() as cx:
            cx.execute(text("DELETE FROM pm25_daily"))
            cx.execute(insert_sql, rows)
            date_count = daily_result["air4_date"].nunique()
            print(
                f"[success] Rebuilt pm25_daily with {len(rows)} station-day rows "
                f"across {date_count} dates. Hourly data remains intact."
            )
    except Exception as e:
        print(f"[error] Failed to update daily table: {e}")
        raise

if __name__ == "__main__":
    compute_daily_summary()
