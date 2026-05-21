#!/usr/bin/env python
# coding: utf-8

# In[ ]:


# -*- coding: utf-8 -*-

from pathlib import Path
import pandas as pd
import re
import datetime as dt

BASE_DIR = Path(__file__).resolve().parent
# กำหนดที่เก็บไฟล์ output
output_dir = Path(os.getenv("DUCKDB_DATA_DIR", str(BASE_DIR)))
output_dir.mkdir(parents=True, exist_ok=True)

INPUT_FILE = BASE_DIR / "hdc_report_raw_2569.csv"
OUTPUT_FILE = output_dir / "hdc_merged_long_2569.csv"

# =========================
# จังหวัด -> เขตสุขภาพ
# =========================
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

# =========================
# icd10 -> Typediag_name
# =========================
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


def norm_text(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def parse_measure_column(col_name: str):
    """
    รองรับหลายรูปแบบ เช่น:
    - จำนวนผู้ป่วย (รายคน) (J44) / wk1
    - จำนวนผู้ป่วย(รายคน)(J44)/wk1
    - จำนวนผู้ป่วย (รายคน) / (J44) / wk1
    - จำนวนผู้ป่วย (รายคน) (J44) / รวมทั้งหมด
    """
    col_name = norm_text(col_name)

    patterns = [
        r"^จำนวนผู้ป่วย\s*\(รายคน\)\s*\((.*?)\)\s*/\s*(wk\d+|รวมทั้งหมด)$",
        r"^จำนวนผู้ป่วย\s*\(รายคน\)\s*/\s*\((.*?)\)\s*/\s*(wk\d+|รวมทั้งหมด)$",
        r"^จำนวนผู้ป่วย\s*\(รายคน\)\s*(.*?)\s*/\s*(wk\d+|รวมทั้งหมด)$",
    ]

    for pattern in patterns:
        m = re.match(pattern, col_name, flags=re.IGNORECASE)
        if m:
            diagnosis = norm_text(m.group(1))
            week = norm_text(m.group(2))
            return diagnosis, week

    return None, None


def clean_number(val):
    if pd.isna(val):
        return pd.NA

    s = str(val).strip().replace(",", "")
    if s == "":
        return pd.NA

    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return pd.NA


def thai_year_to_ad(val):
    if pd.isna(val):
        return pd.NA

    s = str(val).strip()
    if s == "":
        return pd.NA

    try:
        y = int(float(s))
        return y - 543 if y > 2400 else y
    except ValueError:
        return pd.NA


def clean_week_value(val):
    """
    wk1 -> 1
    wk12 -> 12
    รวมทั้งหมด -> NA
    """
    if pd.isna(val):
        return pd.NA

    s = str(val).strip()

    if s == "รวมทั้งหมด":
        return pd.NA

    m = re.search(r"wk\s*(\d+)", s.lower())
    if m:
        return int(m.group(1))

    return pd.NA


def extract_icd10(text):
    """
    ดึง icd10 จากวงเล็บท้ายที่เป็นรหัสจริง
    เช่น:
    Asthma (J45) -> J45
    Chronic obstructive pulmonary disease (J44.2) -> J442
    Subsequent ST elevation (STEMI) and non-ST elevation (NSTEMI) myocardial infarction (I22) -> I22
    """
    if pd.isna(text):
        return pd.NA

    matches = re.findall(r"\(([^()]+)\)", str(text))
    if not matches:
        return pd.NA

    for val in reversed(matches):
        code = val.strip().upper()

        # รองรับรหัสแบบมีจุด เช่น J44.2, L30.9
        if re.fullmatch(r"[A-Z]\d{2}(?:\.\d+)?[A-Z0-9]*", code):
            return code.replace(".", "")

    return pd.NA


def week_to_month(year, week):
    """
    แปลง ISO week -> month
    week ต้องเป็นตัวเลข เช่น 1, 2, 52, 53
    """
    try:
        if pd.isna(year) or pd.isna(week):
            return pd.NA

        d = dt.date.fromisocalendar(int(year), int(week), 4)
        return d.month
    except Exception:
        return pd.NA


def merged():
    print(f"[LOAD] {INPUT_FILE}")

    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์: {INPUT_FILE.resolve()}")

    df = pd.read_csv(INPUT_FILE, encoding="utf-8-sig", dtype=str)
    df.columns = [norm_text(c) for c in df.columns]

    print("\n[DEBUG] columns:")
    for c in df.columns:
        print("-", c)

    base_cols = [
        "provinceName",
        "provinceId",
        "yearThai",
        "ลำดับที่",
        "กลุ่มโรค/โรค",
    ]

    missing = [c for c in base_cols if c not in df.columns]
    if missing:
        raise KeyError(f"ไม่พบคอลัมน์หลัก: {missing}")

    measure_cols = []
    parsed_map = {}

    for c in df.columns:
        diagnosis, week = parse_measure_column(c)
        if diagnosis is not None and week is not None:
            measure_cols.append(c)
            parsed_map[c] = (diagnosis, week)

    if not measure_cols:
        raise RuntimeError("ไม่พบคอลัมน์ประเภท week ที่ใช้แปลง")

    print(f"\n[FOUND] measure columns = {len(measure_cols)}")
    print("[DEBUG] parsed measure columns:")
    for c in measure_cols[:20]:
        print(f"  {c} -> diagnosis={parsed_map[c][0]} | week={parsed_map[c][1]}")

    long_df = df.melt(
        id_vars=base_cols,
        value_vars=measure_cols,
        var_name="measure_col",
        value_name="จำนวนผู้ป่วย"
    )

    long_df["การวินิจฉัยโรค"] = long_df["measure_col"].map(lambda x: parsed_map[x][0])
    long_df["week"] = long_df["measure_col"].map(lambda x: parsed_map[x][1])

    long_df["provinceName"] = long_df["provinceName"].astype(str).map(norm_text)
    long_df["provinceId"] = long_df["provinceId"].astype(str).map(norm_text)
    long_df["yearThai"] = long_df["yearThai"].astype(str).map(norm_text)
    long_df["ลำดับที่"] = long_df["ลำดับที่"].astype(str).map(norm_text)
    long_df["กลุ่มโรค/โรค"] = long_df["กลุ่มโรค/โรค"].astype(str).map(norm_text)
    long_df["การวินิจฉัยโรค"] = long_df["การวินิจฉัยโรค"].astype(str).map(norm_text)

    long_df["จำนวนผู้ป่วย"] = long_df["จำนวนผู้ป่วย"].map(clean_number)

    # แปลง week: wk1 -> 1, รวมทั้งหมด -> NA
    long_df["week"] = long_df["week"].apply(clean_week_value)

    # ลบแถวที่ week เป็น "รวมทั้งหมด" หรือแปลงไม่ได้
    long_df = long_df[long_df["week"].notna()].copy()

    # ตัดแถวที่ไม่มีจำนวนผู้ป่วยออก
    long_df = long_df[long_df["จำนวนผู้ป่วย"].notna()].copy()

    # ตัดแถวที่ typediag ว่าง
    long_df = long_df[long_df["กลุ่มโรค/โรค"].astype(str).str.strip() != ""].copy()

    # year ค.ศ.
    long_df["year"] = long_df["yearThai"].map(thai_year_to_ad)

    # month จาก week
    long_df["month"] = long_df.apply(
        lambda r: week_to_month(r["year"], r["week"]),
        axis=1
    )

    # ถ้า month ว่าง และ week = 53 ให้ใส่เดือน 12
    long_df.loc[
        long_df["month"].isna() & (long_df["week"] == 53),
        "month"
    ] = 12

    # helper columns สำหรับ sort
    long_df["provinceId_num"] = pd.to_numeric(long_df["provinceId"], errors="coerce")
    long_df["year_num"] = pd.to_numeric(long_df["year"], errors="coerce")
    long_df["typediag_id_num"] = pd.to_numeric(long_df["ลำดับที่"], errors="coerce")

    long_df = long_df.sort_values(
        by=[
            "provinceId_num",
            "year_num",
            "typediag_id_num",
            "กลุ่มโรค/โรค",
            "การวินิจฉัยโรค",
            "week",
        ],
        ascending=[True, True, True, True, True, True]
    ).reset_index(drop=True)

    # running no
    long_df.insert(0, "no", range(1, len(long_df) + 1))

    # rename columns
    final_df = long_df.rename(columns={
        "provinceId": "province_code",
        "provinceName": "province_name",
        "ลำดับที่": "typediag_id",
        "กลุ่มโรค/โรค": "typediag",
        "การวินิจฉัยโรค": "diagnosis",
        "จำนวนผู้ป่วย": "case",
    }).copy()

    # เพิ่ม county
    final_df["county"] = final_df["province_name"].map(PROVINCE_TO_COUNTY)

    # ดึง icd10 จาก typediag
    final_df["icd10"] = final_df["typediag"].apply(extract_icd10)

    # เพิ่ม Typediag_name
    final_df["Typediag_name"] = final_df["icd10"].map(TYPE_NAME_MAP)

    # จัดลำดับคอลัมน์สุดท้าย
    final_df = final_df[
        [
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
    ].copy()

    final_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print("\n========== DONE ==========")
    print(final_df.head(20))
    print(f"\nrows = {final_df.shape[0]}")
    print(f"[SAVE] {OUTPUT_FILE}")


if __name__ == "__main__":
    merged()


# In[ ]:





# In[ ]:




