#!/usr/bin/env python
# coding: utf-8

from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent


def main():
    raw_files = [
        BASE_DIR / "hdc_merged_long_2567.csv",
        BASE_DIR / "hdc_merged_long_2568.csv",
        BASE_DIR / "hdc_merged_long_2569.csv",
    ]

    missing_files = [str(file) for file in raw_files if not file.exists()]
    if missing_files:
        raise FileNotFoundError(
            "ไม่พบไฟล์ต่อไปนี้:\n" + "\n".join(missing_files)
        )

    hdc = pd.concat([pd.read_csv(file) for file in raw_files], ignore_index=True)

    hdc.to_csv(BASE_DIR / "hdc.csv", index=False, encoding="utf-8-sig")

    try:
        hdc.to_parquet(
            BASE_DIR / "hdc.parquet",
            index=False,
            engine="pyarrow"
        )
        print("Export completed: hdc.csv, hdc.parquet")
    except ImportError:
        print("Export completed: hdc.csv")
        print("ข้ามการ export parquet เพราะไม่มี pyarrow")

    print("Shape:", hdc.shape)


if __name__ == "__main__":
    main()