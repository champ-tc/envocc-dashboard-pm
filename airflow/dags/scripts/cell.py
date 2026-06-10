#!/usr/bin/env python
# coding: utf-8

import os
from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent


def main():
    output_dir = Path(os.getenv("DUCKDB_DATA_DIR", str(BASE_DIR)))
    output_dir.mkdir(parents=True, exist_ok=True)

    raw_files = [
        output_dir / "hdc_merged_long_2567.csv",
        output_dir / "hdc_merged_long_2568.csv",
        output_dir / "hdc_merged_long_2569.csv",
    ]

    missing_files = [str(file) for file in raw_files if not file.exists()]
    if missing_files:
        raise FileNotFoundError(
            "ไม่พบไฟล์ต่อไปนี้:\n" + "\n".join(missing_files)
        )

    hdc = pd.concat([pd.read_csv(file) for file in raw_files], ignore_index=True)

    csv_path = output_dir / "hdc.csv"
    csv_temp_path = output_dir / ".hdc.csv.tmp"
    parquet_path = output_dir / "hdc.parquet"
    parquet_temp_path = output_dir / ".hdc.parquet.tmp"

    try:
        hdc.to_csv(csv_temp_path, index=False, encoding="utf-8-sig")
        hdc.to_parquet(
            parquet_temp_path,
            index=False,
            engine="pyarrow"
        )

        os.replace(parquet_temp_path, parquet_path)
        os.replace(csv_temp_path, csv_path)
        print(f"Export completed: {output_dir}/hdc.csv, {output_dir}/hdc.parquet")
    except Exception:
        csv_temp_path.unlink(missing_ok=True)
        parquet_temp_path.unlink(missing_ok=True)
        raise

    print("Shape:", hdc.shape)


if __name__ == "__main__":
    main()
