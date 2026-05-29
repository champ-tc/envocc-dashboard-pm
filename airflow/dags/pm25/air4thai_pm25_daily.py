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

def compute_daily_summary() -> None:
    print("--- Start Daily Summary ETL (No Truncate) ---")
    
    # ===== 1) กำหนดช่วงเวลาของ "วันนี้" (00:00:00 ถึงปัจจุบัน) =====
    # ใช้การตัดเวลาให้เหลือแค่วันที่ แล้วเริ่มที่ 00:00:00
    today_th = pd.Timestamp.now(tz="Asia/Bangkok").normalize() 
    next_day_th = today_th + pd.Timedelta(days=1)
    
    print(f"Target Date: {today_th.date()}")

    # ===== 2) Extract (ดึงเฉพาะของวันนี้) =====
    sql = """
        SELECT station_id_new, air4_time, pm25, pm10, o3, co, no2, so2
        FROM pm25_hourly
        WHERE air4_time >= :start_dt AND air4_time < :end_dt
          AND station_id_new IS NOT NULL
          AND btrim(station_id_new) <> ''
        """

    with ENGINE.connect() as cx:
        hourly = pd.read_sql(sql, cx, params={"start_dt": today_th, "end_dt": next_day_th})

    if hourly.empty:
        print("[info] No data found for today yet.")
        return

    # ===== 3) Transform =====
    hourly["station_id_new"] = hourly["station_id_new"].astype("string").str.strip()
    for col in POLS:
        hourly[col] = pd.to_numeric(hourly[col], errors="coerce")

    # Groupby หา Max, Min, Mean
    agg_funcs = {col: ['max', 'min', 'mean'] for col in POLS}
    daily_agg = hourly.groupby("station_id_new", as_index=False).agg(agg_funcs)

    # จัดระเบียบชื่อ Column
    new_cols = ["station_id_new"]
    for col in POLS:
        new_cols.extend([f"{col}_max", f"{col}_min", f"{col}_avg"])
    daily_agg.columns = new_cols
    
    daily_agg["air4_date"] = today_th.date()
    daily_result = daily_agg.where(pd.notnull(daily_agg), None)
    rows = daily_result.to_dict(orient="records")

    # ===== 4) Load (Upsert Only) =====
    upsert_sql = text(
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
        ON CONFLICT (station_id_new, air4_date) DO UPDATE SET
          pm25_max = EXCLUDED.pm25_max, pm25_min = EXCLUDED.pm25_min, pm25_avg = EXCLUDED.pm25_avg,
          pm10_max = EXCLUDED.pm10_max, pm10_min = EXCLUDED.pm10_min, pm10_avg = EXCLUDED.pm10_avg,
          o3_max = EXCLUDED.o3_max, o3_min = EXCLUDED.o3_min, o3_avg = EXCLUDED.o3_avg,
          co_max = EXCLUDED.co_max, co_min = EXCLUDED.co_min, co_avg = EXCLUDED.co_avg,
          no2_max = EXCLUDED.no2_max, no2_min = EXCLUDED.no2_min, no2_avg = EXCLUDED.no2_avg,
          so2_max = EXCLUDED.so2_max, so2_min = EXCLUDED.so2_min, so2_avg = EXCLUDED.so2_avg
        """
    )

    try:
        with ENGINE.begin() as cx:
            cx.execute(upsert_sql, rows)
            print(f"[success] Updated pm25_daily for {today_th.date()}. Hourly data remains intact.")
    except Exception as e:
        print(f"[error] Failed to update daily table: {e}")

if __name__ == "__main__":
    compute_daily_summary()
