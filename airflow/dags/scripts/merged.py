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
HEALTH_OFFICE_PATH = Path(
    os.getenv(
        "HDC_HEALTH_OFFICE_PATH",
        str(BASE_DIR.parent / "dds" / "health_office.xlsx"),
    )
)


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
    "hospcode",
    "hospcode_name",
    "province_code",
    "province_name",
    "county",
    "district_name",
    "subdistrict_name",
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
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value or "")).strip()


def clean_code(value):
    if pd.isna(value):
        return pd.NA

    value = str(value).strip()
    if value.endswith(".0"):
        value = value[:-2]
    return value or pd.NA


def load_health_office(path=HEALTH_OFFICE_PATH):
    if not path.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์ health_office: {path.resolve()}")

    health_office = pd.read_excel(path, dtype=str)
    required = [
        "hospcode",
        "hospcode_name",
        "county",
        "province_id",
        "province_name",
        "district_name",
        "subdistrict_name",
    ]
    missing = [column for column in required if column not in health_office.columns]
    if missing:
        raise KeyError(f"health_office schema ไม่ถูกต้อง: ไม่พบคอลัมน์ {missing}")

    for column in ("hospcode9", "hospcode9old", "hospcode"):
        if column in health_office.columns:
            health_office[column] = health_office[column].map(clean_code)
    return health_office


def enrich_hospital_details(df, health_office):
    """Match API hospcode and make health_office the location source of truth."""
    if "hospcode" not in df.columns:
        raise KeyError("raw API schema ไม่ถูกต้อง: ไม่พบคอลัมน์ hospcode")

    result = df.copy()
    result["hospcode"] = result["hospcode"].map(clean_code)
    result["api_province_name"] = result["provinceName"].map(norm_text)

    detail_columns = [
        "hospcode_name",
        "county",
        "province_id",
        "province_name",
        "district_name",
        "subdistrict_name",
    ]
    lookup_parts = []
    # HDC's hospcode field is normally the current 5-digit code. Prefer an
    # exact match in the same health_office column before legacy alternatives;
    # otherwise values such as 10000 can collide with hospcode9old.
    for priority, code_column in enumerate(("hospcode", "hospcode9old", "hospcode9")):
        if code_column not in health_office.columns:
            continue
        part = health_office[[code_column, *detail_columns]].dropna(subset=[code_column]).copy()
        part[code_column] = part[code_column].map(clean_code)
        part = part.rename(columns={code_column: "hospcode_key"})
        part["match_priority"] = priority
        lookup_parts.append(part)

    lookup = pd.concat(lookup_parts, ignore_index=True)
    lookup = (
        lookup.sort_values("match_priority")
        .drop_duplicates(subset=["hospcode_key"], keep="first")
        .drop(columns="match_priority")
    )
    result = result.merge(
        lookup,
        left_on="hospcode",
        right_on="hospcode_key",
        how="left",
        validate="many_to_one",
    ).drop(columns="hospcode_key")

    matched = result["province_name"].notna()
    mismatch = matched & (
        result["api_province_name"].map(norm_text)
        != result["province_name"].map(norm_text)
    )

    # A matched health_office row is authoritative, especially when the API
    # province conflicts with the hospital's registered province.
    result["provinceName"] = result["province_name"].where(
        matched, result["api_province_name"]
    )
    result["provinceId"] = result["province_id"].where(
        matched, result["provinceId"]
    )
    result["county"] = result["county"].where(matched, pd.NA)
    for column in ("hospcode_name", "district_name", "subdistrict_name"):
        result[column] = result[column].fillna("ไม่พบ")

    print(
        "Hospital lookup: "
        f"matched={int(matched.sum())} unmatched={int((~matched).sum())} "
        f"province_mismatch_corrected={int(mismatch.sum())}"
    )
    return result.drop(columns=["province_id", "province_name"])


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
    required = ["provinceName", "provinceId", "yearThai", "hospcode", "diag_main"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise KeyError(
            "raw API schema ไม่ถูกต้อง: ไม่พบคอลัมน์ "
            f"{missing}. ให้รัน scraping.py รุ่น API ก่อน แล้วค่อยรัน merged.py"
        )


def transform_raw_api_to_long(df, health_office=None):
    validate_raw_api_columns(df)
    df = df.copy()
    df.columns = [norm_text(column) for column in df.columns]
    if health_office is None:
        health_office = load_health_office()
    df = enrich_hospital_details(df, health_office)

    group_columns = [
        "hospcode",
        "hospcode_name",
        "provinceName",
        "provinceId",
        "county",
        "district_name",
        "subdistrict_name",
        "yearThai",
    ]
    diagnosis_lookup = pd.DataFrame(
        DIAG_MAIN_MAPPING,
        columns=["diag_main", "typediag_id", "typediag", "icd10"],
    )
    diagnosis_lookup["Typediag_name"] = diagnosis_lookup["icd10"].map(
        TYPE_NAME_MAP
    )
    measure_name_lookup = dict(MEASURE_SUFFIX_MAPPING)
    measure_pattern = re.compile(r"^w_(\d{2})_(m|z|y|zy)$")
    measure_frames = []

    df["diag_main"] = pd.to_numeric(df["diag_main"], errors="coerce")
    for api_column in df.columns:
        match = measure_pattern.fullmatch(api_column)
        if not match:
            continue

        values = pd.to_numeric(df[api_column], errors="coerce").fillna(0)
        nonzero = values.ne(0)
        if not nonzero.any():
            continue

        measure_df = df.loc[nonzero, [*group_columns, "diag_main"]].copy()
        measure_df["case"] = values.loc[nonzero].astype("int64")
        measure_df = (
            measure_df.groupby(
                [*group_columns, "diag_main"],
                dropna=False,
                sort=False,
                as_index=False,
            )["case"]
            .sum()
        )
        measure_df["week"] = int(match.group(1))
        measure_df["diagnosis"] = measure_name_lookup[match.group(2)]
        measure_frames.append(measure_df)

    if not measure_frames:
        return pd.DataFrame(columns=FINAL_COLUMNS)

    final_df = pd.concat(measure_frames, ignore_index=True)
    final_df = final_df.merge(
        diagnosis_lookup,
        on="diag_main",
        how="inner",
        validate="many_to_one",
    ).drop(columns="diag_main")
    final_df = final_df.rename(
        columns={"provinceName": "province_name"}
    )
    final_df["hospcode"] = final_df["hospcode"].map(clean_code)
    final_df["hospcode_name"] = final_df["hospcode_name"].map(norm_text)
    final_df["province_code"] = pd.to_numeric(
        final_df["provinceId"], errors="raise"
    ).astype(int)
    final_df["province_name"] = final_df["province_name"].map(norm_text)
    final_df["county"] = pd.to_numeric(final_df["county"], errors="coerce")
    fallback_county = final_df["province_name"].map(PROVINCE_TO_COUNTY)
    final_df["county"] = final_df["county"].fillna(fallback_county).astype("Int64")
    final_df["district_name"] = final_df["district_name"].map(norm_text)
    final_df["subdistrict_name"] = final_df["subdistrict_name"].map(norm_text)
    final_df["year"] = final_df["yearThai"].map(thai_year_to_ad).astype("Int64")
    final_df["month"] = [
        week_to_month(year, week)
        for year, week in zip(final_df["year"], final_df["week"])
    ]
    final_df["typediag"] = final_df["typediag"].astype(str).map(norm_text)
    final_df["diagnosis"] = final_df["diagnosis"].astype(str).map(norm_text)
    final_df = final_df.drop(columns=["provinceId", "yearThai"])

    final_df = final_df.sort_values(
        by=["province_code", "hospcode", "year", "typediag_id", "typediag", "diagnosis", "week"],
        ascending=[True, True, True, True, True, True, True],
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

    raw_df = read_raw_api(input_file)

    final_df = transform_raw_api_to_long(raw_df)
    write_csv_atomic(final_df, output_file)

    print(f"HDC merge completed: {final_df.shape[0]} rows -> {output_file}")


if __name__ == "__main__":
    merged()
