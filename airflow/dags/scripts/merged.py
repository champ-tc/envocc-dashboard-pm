#!/usr/bin/env python
# coding: utf-8

import datetime as dt
import os
import re
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
START_YEAR_THAI = int(os.getenv("HDC_START_YEAR_THAI", "2569"))
END_YEAR_THAI = int(os.getenv("HDC_END_YEAR_THAI", str(START_YEAR_THAI)))


PROVINCE_TO_COUNTY = {
    "เชียงใหม่": 1, "แม่ฮ่องสอน": 1, "ลำปาง": 1, "ลำพูน": 1,
    "เชียงราย": 1, "น่าน": 1, "พะเยา": 1, "แพร่": 1,
    "ตาก": 2, "พิษณุโลก": 2, "เพชรบูรณ์": 2, "สุโขทัย": 2, "อุตรดิตถ์": 2,
    "กำแพงเพชร": 3, "ชัยนาท": 3, "นครสวรรค์": 3, "พิจิตร": 3, "อุทัยธานี": 3,
    "นนทบุรี": 4, "ปทุมธานี": 4, "พระนครศรีอยุธยา": 4, "ลพบุรี": 4,
    "สระบุรี": 4, "สิงห์บุรี": 4, "อ่างทอง": 4, "นครนายก": 4,
    "กาญจนบุรี": 5, "นครปฐม": 5, "ประจวบคีรีขันธ์": 5, "เพชรบุรี": 5,
    "ราชบุรี": 5, "สมุทรสงคราม": 5, "สมุทรสาคร": 5, "สุพรรณบุรี": 5,
    "จันทบุรี": 6, "ฉะเชิงเทรา": 6, "ชลบุรี": 6, "ตราด": 6,
    "ปราจีนบุรี": 6, "ระยอง": 6, "สมุทรปราการ": 6, "สระแก้ว": 6,
    "กาฬสินธุ์": 7, "ขอนแก่น": 7, "มหาสารคาม": 7, "ร้อยเอ็ด": 7,
    "บึงกาฬ": 8, "เลย": 8, "นครพนม": 8, "หนองคาย": 8,
    "หนองบัวลำภู": 8, "อุดรธานี": 8, "สกลนคร": 8,
    "บุรีรัมย์": 9, "ชัยภูมิ": 9, "นครราชสีมา": 9, "สุรินทร์": 9,
    "อำนาจเจริญ": 10, "อุบลราชธานี": 10, "ศรีสะเกษ": 10,
    "ยโสธร": 10, "มุกดาหาร": 10,
    "กระบี่": 11, "ชุมพร": 11, "นครศรีธรรมราช": 11, "พังงา": 11,
    "ภูเก็ต": 11, "ระนอง": 11, "สุราษฎร์ธานี": 11,
    "ตรัง": 12, "นราธิวาส": 12, "ปัตตานี": 12, "พัทลุง": 12,
    "ยะลา": 12, "สงขลา": 12, "สตูล": 12,
    "กรุงเทพมหานคร": 13,
}

TYPE_NAME_MAP = {
    "J442": "Acute asthma",
    "J45": "Acute asthma",
    "I21": "Acute ischemic heart diseases",
    "I24": "Acute ischemic heart diseases",
    "I22": "Acute ischemic heart diseases",
    "J44": "Chronic obstructive pulmonary disease",
    "H10": "กลุ่มโรคตาอักเสบ",
    "L309": "กลุ่มโรคผิวหนังอักเสบ",
    "L50": "กลุ่มโรคผิวหนังอักเสบ",
}

# diag_main follows the OpenData MOPH API schema for s_pm25_1_in_week.
DIAG_MAIN_MAPPING = [
    (2, 1, "Chronic obstructive pulmonary disease (J44)", "J44"),
    (4, 2, "Acute asthma (J45)", "J45"),
    (2048, 3, "Acute asthma (J44.2)", "J442"),
    (8, 4, "Acute ischemic heart diseases (I21)", "I21"),
    (4096, 5, "Acute ischemic heart diseases (I24)", "I24"),
    (16, 6, "Subsequent ST elevation (STEMI) and non-ST elevation (NSTEMI) myocardial infarction (I22)", "I22"),
    (32, 7, "Conjunctivitis (H10)", "H10"),
    (64, 8, "Eczema (L30.9)", "L309"),
    (128, 9, "Urticaria (L50)", "L50"),
]

MEASURE_SUFFIX_MAPPING = [
    ("m", "การวินิจฉัยโรคทั้งหมด"),
    ("z", "การวินิจฉัยโรคหลัก ร่วมกับ Z58.1"),
    ("y", "การวินิจฉัยโรคหลัก ร่วมกับ Y97"),
    ("zy", "การวินิจฉัยโรคหลัก ร่วมกับ Z58.1+Y97"),
]

FINAL_COLUMNS = [
    "no",
    "province_code",
    "province_name",
    "county",
    "year",
    "week",
    "month",
    "typediag_id",
    "typediag",
    "icd10",
    "Typediag_name",
    "diagnosis",
    "case",
]


def get_target_years():
    return [str(year) for year in range(START_YEAR_THAI, END_YEAR_THAI + 1)]


def get_year_label(target_years):
    return f"{target_years[0]}_{target_years[-1]}" if len(target_years) > 1 else target_years[0]


def norm_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def to_numeric_series(series):
    return pd.to_numeric(series, errors="coerce").fillna(0)


def thai_year_to_ad(value):
    if pd.isna(value):
        return pd.NA

    text = str(value).strip()
    if text == "":
        return pd.NA

    year = int(float(text))
    return year - 543 if year > 2400 else year


def week_to_month(year, week):
    try:
        return dt.date.fromisocalendar(int(year), int(week), 4).month
    except Exception:
        return 12 if int(week) == 53 else pd.NA


def resolve_input_file(output_dir, target_years):
    year_label = get_year_label(target_years)
    preferred = output_dir / f"hdc_report_raw_{year_label}.csv"
    if preferred.exists():
        return preferred

    if len(target_years) == 1:
        return preferred

    year_files = [output_dir / f"hdc_report_raw_{year}.csv" for year in target_years]
    missing = [str(path) for path in year_files if not path.exists()]
    if missing:
        raise FileNotFoundError("ไม่พบไฟล์ raw API:\n" + "\n".join(missing))

    return year_files


def read_raw_api(input_file):
    if isinstance(input_file, list):
        return pd.concat(
            [pd.read_csv(path, encoding="utf-8-sig", dtype=str) for path in input_file],
            ignore_index=True,
        )

    if not input_file.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์ raw API: {input_file.resolve()}")

    return pd.read_csv(input_file, encoding="utf-8-sig", dtype=str)


def validate_raw_api_columns(df):
    required = ["provinceName", "provinceId", "yearThai", "diag_main"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise KeyError(
            "raw API schema ไม่ถูกต้อง: ไม่พบคอลัมน์ "
            f"{missing}. ให้รัน scraping.py รุ่น API ก่อน แล้วค่อยรัน merged.py"
        )


def transform_group_to_long(group_df, province_name, province_id, year_thai):
    province_name = norm_text(province_name)
    province_code = int(float(str(province_id).strip()))
    year = thai_year_to_ad(year_thai)
    county = PROVINCE_TO_COUNTY.get(province_name)
    rows = []

    group_df = group_df.copy()
    group_df["diag_main"] = pd.to_numeric(group_df["diag_main"], errors="coerce")

    for diag_main, typediag_id, typediag, icd10 in DIAG_MAIN_MAPPING:
        diag_df = group_df[group_df["diag_main"] == diag_main]
        typediag_name = TYPE_NAME_MAP.get(icd10)

        for suffix, diagnosis in MEASURE_SUFFIX_MAPPING:
            for week in range(1, 54):
                api_col = f"w_{week:02d}_{suffix}"
                case = int(to_numeric_series(diag_df[api_col]).sum()) if api_col in diag_df.columns else 0
                rows.append(
                    {
                        "province_code": province_code,
                        "province_name": province_name,
                        "county": county,
                        "year": year,
                        "week": week,
                        "month": week_to_month(year, week),
                        "typediag_id": typediag_id,
                        "typediag": typediag,
                        "icd10": icd10,
                        "Typediag_name": typediag_name,
                        "diagnosis": diagnosis,
                        "case": case,
                    }
                )

    return rows


def transform_raw_api_to_long(df):
    validate_raw_api_columns(df)
    df = df.copy()
    df.columns = [norm_text(column) for column in df.columns]

    all_rows = []
    grouped = df.groupby(["provinceName", "provinceId", "yearThai"], dropna=False, sort=False)
    for (province_name, province_id, year_thai), group_df in grouped:
        all_rows.extend(transform_group_to_long(group_df, province_name, province_id, year_thai))

    if not all_rows:
        return pd.DataFrame(columns=FINAL_COLUMNS)

    final_df = pd.DataFrame(all_rows)
    final_df["province_name"] = final_df["province_name"].astype(str).map(norm_text)
    final_df["typediag"] = final_df["typediag"].astype(str).map(norm_text)
    final_df["diagnosis"] = final_df["diagnosis"].astype(str).map(norm_text)

    final_df = final_df.sort_values(
        by=["province_code", "year", "typediag_id", "typediag", "diagnosis", "week"],
        ascending=[True, True, True, True, True, True],
    ).reset_index(drop=True)

    final_df.insert(0, "no", range(1, len(final_df) + 1))
    return final_df[FINAL_COLUMNS].copy()


def write_csv_atomic(df, path):
    tmp_path = path.with_name(f".{path.name}.tmp")
    try:
        df.to_csv(tmp_path, index=False, encoding="utf-8-sig")
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def merged():
    target_years = get_target_years()
    year_label = get_year_label(target_years)

    output_dir = Path(os.getenv("DUCKDB_DATA_DIR", str(BASE_DIR)))
    output_dir.mkdir(parents=True, exist_ok=True)

    input_file = resolve_input_file(output_dir, target_years)
    output_file = output_dir / f"hdc_merged_long_{year_label}.csv"

    print(f"[LOAD] {input_file}")
    raw_df = read_raw_api(input_file)
    print(f"[RAW] shape = {raw_df.shape}")

    final_df = transform_raw_api_to_long(raw_df)
    write_csv_atomic(final_df, output_file)

    print("\n========== DONE ==========")
    print(final_df.head(20))
    print(f"\nrows = {final_df.shape[0]}")
    print(f"columns = {list(final_df.columns)}")
    print(f"[SAVE] {output_file}")


if __name__ == "__main__":
    merged()
