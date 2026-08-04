# -*- coding: utf-8 -*-
import ast
import os
import re
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = Path(os.getenv("DDS_INPUT_DIR", str(BASE_DIR)))
ORIGINAL_DDS_PATH = INPUT_DIR / "original_dds.xlsx"
HEALTH_OFFICE_PATH = BASE_DIR / "health_office.xlsx"
ICD10_PATH = BASE_DIR / "icd10.xlsx"
CODE_COUNTS_PATH = BASE_DIR / "icd10_code_counts_sorted.csv"
GROUP_SUMMARY_PATH = BASE_DIR / "icd10_group_summary.csv"
DASHBOARD_DDS_PATH = BASE_DIR / "dashboard_dds.parquet"

POLLUTANT_DIAGNOSIS_PREFIXES = {
    "J44",
    "J45",
    "I21",
    "I22",
    "I24",
    "H10",
    "L30",
    "L50",
}
DIAGNOSIS_EXCEPTIONS = {"J442", "L309"}


def clean_icd(value):
    if pd.isna(value):
        return value
    return re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()


def clean_icd_list(value):
    if pd.isna(value):
        return value

    cleaned = []
    for item in str(value).replace("'", "").split(","):
        item = re.sub(r"[^A-Za-z0-9]", "", item).upper()
        if item:
            cleaned.append(item)
    return ",".join(cleaned)


def clean_code(value):
    if pd.isna(value):
        return pd.NA

    value = str(value).strip()
    if value.endswith(".0"):
        value = value[:-2]
    return value


def normalize_diagnosis_list(value):
    if pd.isna(value):
        return value

    cleaned = []
    for item in re.split(r"[,\s]+", str(value).upper()):
        if not item:
            continue

        item = re.sub(r"[^A-Z0-9]", "", item)
        if item in DIAGNOSIS_EXCEPTIONS:
            cleaned.append(item)
            continue

        prefix = item[:3]
        cleaned.append(
            prefix if prefix in POLLUTANT_DIAGNOSIS_PREFIXES else item
        )

    return ",".join(cleaned)


def clean_z581(value):
    if pd.isna(value):
        return pd.NA

    if isinstance(value, str):
        value = value.strip()
        if value in {"", "[]", "['']", '[""]'}:
            return pd.NA

        try:
            codes = ast.literal_eval(value)
        except (SyntaxError, ValueError):
            codes = [
                item.strip().replace("'", "").replace('"', "")
                for item in value.strip("[]").split(",")
                if item.strip()
            ]
    else:
        codes = list(value)

    if isinstance(codes, str):
        codes = [codes]

    codes = [
        str(code).strip().upper()
        for code in codes
        if pd.notna(code) and str(code).strip()
    ]
    if not codes:
        return pd.NA
    if len(codes) == 1 and codes[0] == "Z581":
        return codes

    cleaned = [code for code in codes if code != "Z581"]
    return cleaned or pd.NA


def add_hospital_details(dds: pd.DataFrame, health_office: pd.DataFrame) -> pd.DataFrame:
    dds["hospcode_key"] = dds["hospcode"].apply(clean_code)

    for column in ["hospcode9", "hospcode9old", "hospcode"]:
        if column in health_office.columns:
            health_office[column] = health_office[column].apply(clean_code)

    detail_columns = [
        "hospcode_name",
        "county",
        "province_id",
        "province_name",
        "district_name",
        "subdistrict_name",
    ]

    def build_lookup(column):
        return (
            health_office.dropna(subset=[column])
            .drop_duplicates(subset=[column])
            .set_index(column)[detail_columns]
            .to_dict("index")
        )

    lookups = [
        ("hospcode9", build_lookup("hospcode9")),
        ("hospcode9old", build_lookup("hospcode9old")),
        ("hospcode", build_lookup("hospcode")),
    ]

    def match_hospital(code):
        if pd.notna(code):
            for source, lookup in lookups:
                if code in lookup:
                    data = lookup[code].copy()
                    data["match_from"] = source
                    return pd.Series(data)

        return pd.Series(
            {
                "hospcode_name": "ไม่ทราบ",
                "county": "ไม่ทราบ",
                "province_id": "ไม่ทราบ",
                "province_name": "ไม่ทราบ",
                "district_name": "ไม่พบ",
                "subdistrict_name": "ไม่พบ",
                "match_from": "ไม่พบ",
            }
        )

    matched = dds["hospcode_key"].apply(match_hospital)
    return pd.concat([dds, matched], axis=1).drop(columns=["hospcode_key"])


def export_icd_summaries(dds: pd.DataFrame) -> None:
    all_codes = (
        dds["icd10_list"]
        .dropna()
        .astype(str)
        .str.upper()
        .str.split(",")
        .explode()
        .str.replace(r"[^A-Z0-9]", "", regex=True)
    )
    all_codes = all_codes[all_codes != ""]

    code_counts = all_codes.value_counts().reset_index()
    code_counts.columns = ["icd10_code", "count"]
    code_counts["group"] = code_counts["icd10_code"].str[0]
    code_counts["group"] = pd.Categorical(
        code_counts["group"],
        categories=list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
        ordered=True,
    )
    code_counts = code_counts.sort_values(by=["group", "icd10_code"])

    group_summary = (
        code_counts.groupby("group", observed=True)["count"].sum().reset_index()
    )

    code_counts.to_csv(CODE_COUNTS_PATH, index=False, encoding="utf-8-sig")
    group_summary.to_csv(GROUP_SUMMARY_PATH, index=False, encoding="utf-8-sig")
    print(f"Exported: {CODE_COUNTS_PATH}")
    print(f"Exported: {GROUP_SUMMARY_PATH}")


def build_dashboard_rows(dds: pd.DataFrame, icd: pd.DataFrame) -> pd.DataFrame:
    dds = dds.copy()
    icd = icd.copy()

    dds.insert(0, "person_id", range(1, len(dds) + 1))
    dds["icd10_list"] = dds["icd10_list"].fillna("").astype(str)

    icd["sub_code_clean"] = (
        icd["sub-code"]
        .fillna("")
        .astype(str)
        .str.upper()
        .str.replace(".", "", regex=False)
        .str.strip()
    )
    icd["icd3"] = icd["sub_code_clean"].str[:3]

    icd_type_lookup = (
        icd.dropna(subset=["icd3"])
        .drop_duplicates(subset=["icd3"])[["icd3", "Disease Type"]]
    )
    icd_disease_lookup = (
        icd.dropna(subset=["sub_code_clean"])
        .drop_duplicates(subset=["sub_code_clean"])[
            ["sub_code_clean", "disease"]
        ]
    )

    dds_exploded = (
        dds.assign(
            icd10_code=(
                dds["icd10_list"]
                .str.upper()
                .str.replace(".", "", regex=False)
                .str.split(",")
            )
        )
        .explode("icd10_code")
    )
    dds_exploded["icd10_code"] = dds_exploded["icd10_code"].str.strip()
    dds_exploded["icd3"] = dds_exploded["icd10_code"].str[:3]

    result = dds_exploded.merge(icd_type_lookup, on="icd3", how="left")
    result = result.merge(
        icd_disease_lookup,
        left_on="icd10_code",
        right_on="sub_code_clean",
        how="left",
    )
    result = result.drop(columns=["icd3", "sub_code_clean"], errors="ignore")

    before = len(result)
    result["icd10_code"] = (
        result["icd10_code"]
        .fillna("Z581")
        .astype(str)
        .str.strip()
        .replace("", "Z581")
    )
    code_clean = (
        result["icd10_code"]
        .astype(str)
        .str.upper()
        .str.replace(".", "", regex=False)
        .str.strip()
    )
    result = result[~code_clean.str.fullmatch(r"\d+")]
    print(f"Removed numeric-only ICD rows: {before - len(result)}")

    result["icd10_old"] = result["icd10_code"]
    result["icd10_code"] = (
        result["icd10_code"]
        .astype(str)
        .str.upper()
        .str.strip()
        .str.replace(".", "", regex=False)
        .str.extract(r"([A-Z]\d{2})", expand=False)
    )

    return result.drop(
        columns=[
            "hospcode",
            "hospcode_name",
            "province_id",
            "icd10",
            "icd10_list",
        ]
    )


def main() -> None:
    pd.options.display.max_columns = None

    dds = pd.read_excel(ORIGINAL_DDS_PATH)
    health_office = pd.read_excel(HEALTH_OFFICE_PATH)
    icd = pd.read_excel(ICD10_PATH)

    before = len(dds)
    dds = dds[
        ~dds["ชื่อ"].astype(str).str.contains("ทดสอบ", case=False, na=False)
    ]
    print(f"Removed test rows: {before - len(dds)}")

    dds = dds.drop(
        columns=[
            "รหัสหน่วยงาน",
            "หน่วยงาน",
            "CID",
            "วันที่ส่งรายงาน",
            "คำนำหน้า",
            "ชื่อ",
            "นามสกุล",
            "เพศ",
            "อายุปี",
            "อายุเดือน",
            "สัญชาติ",
            "อาชีพ",
            "เบอร์โทรศัพท์",
            "จังหวัดขณะป่วย",
            "ที่อยู่ปัจจุบัน",
            "หมู่(ที่อยู่ปัจจุบัน)",
            "ถนน(ที่อยู่ปัจจุบัน)",
            "ที่อยู่ขณะป่วย",
            "หมู่ขณะป่วย",
            "ถนนขณะป่วย",
            "รหัสจังหวัด(ที่อยู่ปัจจุบัน)",
            "รหัสอำเภอ(ที่อยู่ปัจจุบัน)",
            "รหัสตำบล(ที่อยู่ปัจจุบัน)",
            "อำเภอขณะป่วย",
            "ตำบลขณะป่วย",
            "วันที่เริ่มมีอาการ",
            "วันที่วินิจฉัยโรค",
            "organism",
            "ประเภทผู้ป่วย",
            "ความรุนแรง",
            "ใส่เครื่องช่วยหายใจ",
            "รหัสสภาพผู้ป่วย",
            "สภาพผู้ป่วย",
            "รหัสกลุ่มโรค",
            "รหัสวิธีการตรวจ Lab",
            "วิธีการตรวจ Lab",
            "วันที่รายงานผล Lab",
            "ผล Lab",
            "วันที่เก็บตัวอย่าง",
            "รหัส LAB(HIS)",
            "ชื่อรายการ Lab(HIS)",
            "รหัส TMLT",
            "วันที่เสียชีวิต",
            "สาเหตุการเสียชีวิต",
            "status",
            "สถานะ",
            "หมายเหตุ",
            "วันที่อนุมัติรายงาน",
            "วันที่ Update",
            "complication",
            "รหัสจังหวัดที่รับรักษา",
        ]
    )
    dds = dds.rename(
        columns={
            "วันที่เริ่มรักษา": "date",
            "โรงพยาบาลที่กำลังรักษา": "hospcode",
            "Diagnosis ICD10": "icd10",
            "diagnosis_icd10_list": "icd10_list",
        }
    )

    dds = dds[dds["icd10"].astype("string").str.contains("Z581", na=False)]
    print(f"Rows after Z581 filter: {len(dds)}")

    dds["icd10"] = dds["icd10"].apply(clean_icd)
    dds["icd10_list"] = dds["icd10_list"].apply(clean_icd_list)
    dds = add_hospital_details(dds, health_office)

    dds["date"] = pd.to_datetime(dds["date"], errors="coerce")
    dds["year"] = dds["date"].dt.year
    dds["week"] = dds["date"].dt.isocalendar().week
    dds["month"] = dds["date"].dt.month
    dds["icd10_list"] = dds["icd10_list"].apply(normalize_diagnosis_list)
    dds = dds.drop(columns=["match_from", "date"], errors="ignore")
    dds = dds[
        [
            "year",
            "week",
            "month",
            "hospcode",
            "hospcode_name",
            "county",
            "province_id",
            "province_name",
            "district_name",
            "subdistrict_name",
            "icd10",
            "icd10_list",
        ]
    ]

    export_icd_summaries(dds)

    dds["icd10_list"] = dds["icd10_list"].apply(clean_z581)
    dds["icd10_list"] = (
        dds["icd10_list"]
        .astype(str)
        .str.replace(r"[\[\]']", "", regex=True)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    dashboard = build_dashboard_rows(dds, icd)
    dashboard.to_parquet(
        DASHBOARD_DDS_PATH,
        index=False,
        engine="pyarrow",
        compression="snappy",
    )
    print(f"Exported: {DASHBOARD_DDS_PATH} ({len(dashboard)} rows)")


if __name__ == "__main__":
    main()
