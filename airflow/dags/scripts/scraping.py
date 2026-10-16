#!/usr/bin/env python
# coding: utf-8

import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pandas as pd


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


API_URL = os.getenv("HDC_API_URL", "https://opendata.moph.go.th/api/report_data")
TABLE_NAME = os.getenv("HDC_TABLE_NAME", "s_pm25_1_in_week")
START_YEAR_THAI = int(os.getenv("HDC_START_YEAR_THAI", "2569"))
END_YEAR_THAI = int(os.getenv("HDC_END_YEAR_THAI", str(START_YEAR_THAI)))
REQUEST_TIMEOUT_SEC = int(os.getenv("HDC_REQUEST_TIMEOUT_SEC", "60"))
RETRY_COUNT = int(os.getenv("HDC_RETRY_COUNT", "2"))
SLEEP_BETWEEN_REQUESTS_SEC = float(os.getenv("HDC_SLEEP_BETWEEN_REQUESTS_SEC", "0.25"))
FAIL_ON_PROVINCE_ERROR = os.getenv("HDC_FAIL_ON_PROVINCE_ERROR", "true").lower() not in {
    "0",
    "false",
    "no",
}
MAX_FAILED_PROVINCES = int(os.getenv("HDC_MAX_FAILED_PROVINCES", "1"))
PAGE_SIZE = int(os.getenv("HDC_PAGE_SIZE", "1000"))
MAX_PAGES_PER_PROVINCE = int(os.getenv("HDC_MAX_PAGES_PER_PROVINCE", "100"))


PROVINCE_ID_MAPPING = {
    "กรุงเทพมหานคร": "10",
    "สมุทรปราการ": "11",
    "นนทบุรี": "12",
    "ปทุมธานี": "13",
    "พระนครศรีอยุธยา": "14",
    "อ่างทอง": "15",
    "ลพบุรี": "16",
    "สิงห์บุรี": "17",
    "ชัยนาท": "18",
    "สระบุรี": "19",
    "ชลบุรี": "20",
    "ระยอง": "21",
    "จันทบุรี": "22",
    "ตราด": "23",
    "ฉะเชิงเทรา": "24",
    "ปราจีนบุรี": "25",
    "นครนายก": "26",
    "สระแก้ว": "27",
    "นครราชสีมา": "30",
    "บุรีรัมย์": "31",
    "สุรินทร์": "32",
    "ศรีสะเกษ": "33",
    "อุบลราชธานี": "34",
    "ยโสธร": "35",
    "ชัยภูมิ": "36",
    "อำนาจเจริญ": "37",
    "บึงกาฬ": "38",
    "หนองบัวลำภู": "39",
    "ขอนแก่น": "40",
    "อุดรธานี": "41",
    "เลย": "42",
    "หนองคาย": "43",
    "มหาสารคาม": "44",
    "ร้อยเอ็ด": "45",
    "กาฬสินธุ์": "46",
    "สกลนคร": "47",
    "นครพนม": "48",
    "มุกดาหาร": "49",
    "เชียงใหม่": "50",
    "ลำพูน": "51",
    "ลำปาง": "52",
    "อุตรดิตถ์": "53",
    "แพร่": "54",
    "น่าน": "55",
    "พะเยา": "56",
    "เชียงราย": "57",
    "แม่ฮ่องสอน": "58",
    "นครสวรรค์": "60",
    "อุทัยธานี": "61",
    "กำแพงเพชร": "62",
    "ตาก": "63",
    "สุโขทัย": "64",
    "พิษณุโลก": "65",
    "พิจิตร": "66",
    "เพชรบูรณ์": "67",
    "ราชบุรี": "70",
    "กาญจนบุรี": "71",
    "สุพรรณบุรี": "72",
    "นครปฐม": "73",
    "สมุทรสาคร": "74",
    "สมุทรสงคราม": "75",
    "เพชรบุรี": "76",
    "ประจวบคีรีขันธ์": "77",
    "นครศรีธรรมราช": "80",
    "กระบี่": "81",
    "พังงา": "82",
    "ภูเก็ต": "83",
    "สุราษฎร์ธานี": "84",
    "ระนอง": "85",
    "ชุมพร": "86",
    "สงขลา": "90",
    "สตูล": "91",
    "ตรัง": "92",
    "พัทลุง": "93",
    "ปัตตานี": "94",
    "ยะลา": "95",
    "นราธิวาส": "96",
}


def get_target_years():
    return [str(year) for year in range(START_YEAR_THAI, END_YEAR_THAI + 1)]


def normalize_api_response(payload):
    if isinstance(payload, list):
        return payload

    if isinstance(payload, dict):
        for key in ("data", "result", "rows", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return [payload]

    return []


def post_json(url, body):
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
        ),
        "Origin": "https://opendata.moph.go.th",
        "Referer": "https://opendata.moph.go.th/",
    }
    request = urllib.request.Request(url, data=payload, headers=headers, method="POST")

    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SEC) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw)


def fetch_page(body):
    """Fetch a single page payload with retries."""
    last_error = None
    for attempt in range(1, RETRY_COUNT + 2):
        try:
            payload = post_json(API_URL, body)
            return payload, None
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            last_error = f"HTTPError {exc.code}: {detail}"
        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"

        if attempt <= RETRY_COUNT:
            sleep_sec = min(30, attempt * 2)
            logger.warning(
                "API retry %s/%s | offset=%s limit=%s | %s",
                attempt,
                RETRY_COUNT,
                body.get("offset"),
                body.get("limit"),
                last_error,
            )
            time.sleep(sleep_sec)

    return None, last_error


def fetch_province(province_name, province_id, year):
    all_records = []
    offset = 0
    total_expected = None
    page_num = 1

    while True:
        body = {
            "tableName": TABLE_NAME,
            "year": str(year),
            "province": str(province_id),
            "type": "json",
            "limit": PAGE_SIZE,
            "offset": offset,
        }

        payload, error = fetch_page(body)
        if error is not None:
            logger.error(
                "API FAIL | year=%s province=%s(%s) page=%s offset=%s | %s",
                year,
                province_name,
                province_id,
                page_num,
                offset,
                error,
            )
            return pd.DataFrame(), error

        records = normalize_api_response(payload)

        # Parse total count from response if available
        if total_expected is None and isinstance(payload, dict) and "total" in payload:
            try:
                total_expected = int(str(payload["total"]).strip())
            except (ValueError, TypeError):
                total_expected = None

        if records:
            all_records.extend(records)
            offset += len(records)

        logger.info(
            "API page %s | year=%s province=%s(%s) page_rows=%s total_fetched=%s total_expected=%s",
            page_num,
            year,
            province_name,
            province_id,
            len(records),
            len(all_records),
            total_expected if total_expected is not None else "unknown",
        )

        # Stop conditions:
        # 1. No records returned on this page
        if not records:
            break

        # 2. Reached or exceeded total expected records reported by API
        if total_expected is not None and len(all_records) >= total_expected:
            break

        # 3. Fetched fewer records than requested page size (last page reached)
        if len(records) < PAGE_SIZE:
            break

        # 4. Safety guard against unexpected infinite loops
        if page_num >= MAX_PAGES_PER_PROVINCE:
            logger.warning(
                "Reached max pages limit (%s) | year=%s province=%s(%s) fetched=%s expected=%s",
                MAX_PAGES_PER_PROVINCE,
                year,
                province_name,
                province_id,
                len(all_records),
                total_expected,
            )
            break

        page_num += 1
        time.sleep(SLEEP_BETWEEN_REQUESTS_SEC)

    if total_expected is not None and len(all_records) < total_expected:
        logger.warning(
            "API returned fewer rows than expected | year=%s province=%s(%s) fetched=%s expected=%s",
            year,
            province_name,
            province_id,
            len(all_records),
            total_expected,
        )

    df = pd.DataFrame(all_records)
    logger.info(
        "API OK | year=%s province=%s(%s) rows=%s columns=%s (expected=%s)",
        year,
        province_name,
        province_id,
        len(df),
        len(df.columns),
        total_expected if total_expected is not None else "unknown",
    )
    return df, None



def add_metadata_columns(df, province_name, province_id, year):
    if df.empty:
        df = pd.DataFrame([{"diag_main": pd.NA}])
    else:
        df = df.copy()

    df.insert(0, "provinceName", province_name)
    df.insert(1, "provinceId", str(province_id))
    df.insert(2, "yearThai", str(year))
    return df


def write_csv_atomic(df, path):
    tmp_path = path.with_name(f".{path.name}.tmp")
    try:
        df.to_csv(tmp_path, index=False, encoding="utf-8-sig")
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def export_year(year, output_dir):
    all_frames = []
    summary_rows = []
    total_jobs = len(PROVINCE_ID_MAPPING)

    for job_no, (province_name, province_id) in enumerate(PROVINCE_ID_MAPPING.items(), start=1):
        logger.info("[%s/%s] Fetch API | year=%s province=%s", job_no, total_jobs, year, province_name)
        api_df, error = fetch_province(province_name, province_id, year)

        if error is None:
            export_df = add_metadata_columns(api_df, province_name, province_id, year)
            all_frames.append(export_df)
            status = "SUCCESS"
            detail = "OK"
        else:
            export_df = pd.DataFrame()
            status = "FAILED"
            detail = error

        summary_rows.append(
            {
                "year": year,
                "province": province_name,
                "provinceId": province_id,
                "status": status,
                "api_rows": len(api_df),
                "export_rows": len(export_df),
                "export_columns": len(export_df.columns),
                "detail": detail,
            }
        )

        time.sleep(SLEEP_BETWEEN_REQUESTS_SEC)

    summary_df = pd.DataFrame(summary_rows)
    failed_df = summary_df[summary_df["status"] == "FAILED"]
    raw_df = pd.concat(all_frames, ignore_index=True) if all_frames else pd.DataFrame()

    raw_csv = output_dir / f"hdc_report_raw_{year}.csv"
    summary_csv = output_dir / f"hdc_report_summary_{year}.csv"

    write_csv_atomic(raw_df, raw_csv)
    write_csv_atomic(summary_df, summary_csv)

    logger.info("=" * 80)
    logger.info("HDC API RAW EXPORT SUMMARY | year=%s", year)
    logger.info("provinces total=%s success=%s failed=%s", len(summary_df), len(summary_df) - len(failed_df), len(failed_df))
    logger.info("api rows=%s raw shape=%s", int(summary_df["api_rows"].sum()), raw_df.shape)
    logger.info("raw csv=%s", raw_csv)
    logger.info("summary csv=%s", summary_csv)
    logger.info("=" * 80)

    if not failed_df.empty:
        failed_items = "; ".join(
            f"{row.province}({row.provinceId}): {row.detail}" for row in failed_df.itertuples()
        )
        logger.warning(
            "HDC API partial failure | year=%s failed=%s allowed=%s | %s",
            year,
            len(failed_df),
            MAX_FAILED_PROVINCES,
            failed_items,
        )

        if FAIL_ON_PROVINCE_ERROR and len(failed_df) > MAX_FAILED_PROVINCES:
            raise RuntimeError(
                "HDC API failed for "
                f"{len(failed_df)} province(s), exceeding allowed "
                f"{MAX_FAILED_PROVINCES}: {failed_items}"
            )

    return raw_df, summary_df


def main():
    target_years = get_target_years()
    year_label = f"{target_years[0]}_{target_years[-1]}" if len(target_years) > 1 else target_years[0]

    base_dir = Path(__file__).resolve().parent
    output_dir = Path(os.getenv("DUCKDB_DATA_DIR", str(base_dir)))
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("START HDC API raw export")
    logger.info(
        "API_URL=%s TABLE_NAME=%s YEARS=%s PAGE_SIZE=%s OUTPUT_DIR=%s",
        API_URL,
        TABLE_NAME,
        ",".join(target_years),
        PAGE_SIZE,
        output_dir,
    )

    all_year_frames = []
    all_summary_frames = []
    for year in target_years:
        year_df, summary_df = export_year(year, output_dir)
        all_year_frames.append(year_df)
        all_summary_frames.append(summary_df)

    if len(target_years) > 1:
        combined_raw = pd.concat(all_year_frames, ignore_index=True) if all_year_frames else pd.DataFrame()
        combined_summary = pd.concat(all_summary_frames, ignore_index=True) if all_summary_frames else pd.DataFrame()
        write_csv_atomic(combined_raw, output_dir / f"hdc_report_raw_{year_label}.csv")
        write_csv_atomic(combined_summary, output_dir / f"hdc_report_summary_{year_label}.csv")
        logger.info("combined raw csv=%s", output_dir / f"hdc_report_raw_{year_label}.csv")
        logger.info("combined summary csv=%s", output_dir / f"hdc_report_summary_{year_label}.csv")


if __name__ == "__main__":
    main()
