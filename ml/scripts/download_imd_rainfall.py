"""Download/extract IMD 0.25-degree daily gridded rainfall for HP.

Uses the community `imdlib` downloader, which retrieves IMD's published
0.25-degree daily gridded rainfall. The historical IMD product covers
1901-2024. Only the HP bounding box and requested years are retained.

Usage:
    pip install imdlib xarray netcdf4 pandas numpy
    python ml/scripts/download_imd_rainfall.py --start 2015 --end 2024
"""
from __future__ import annotations
import argparse
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "imd_gridded_hp_rainfall.csv"

# Broad HP box; keep it intentionally small to reduce disk/RAM use.
LAT_MIN, LAT_MAX = 30.2, 33.4
LON_MIN, LON_MAX = 75.4, 79.1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=2015)
    parser.add_argument("--end", type=int, default=2024)
    args = parser.parse_args()

    try:
        import imdlib as imd
    except ImportError as exc:
        raise SystemExit("Install imdlib first: pip install imdlib") from exc

    work = ROOT / "data" / "raw" / "imd"
    work.mkdir(parents=True, exist_ok=True)
    print(f"Downloading IMD rainfall {args.start}-{args.end} ...")
    raw = imd.get_data("rain", args.start, args.end, fn_format="yearwise", file_dir=str(work))
    ds = raw.get_xarray()

    # IMD xarray dimensions are generally time, lat, lon. Normalize names.
    rain_name = "rain" if "rain" in ds.data_vars else list(ds.data_vars)[0]
    da = ds[rain_name].sel(lat=slice(LAT_MIN, LAT_MAX), lon=slice(LON_MIN, LON_MAX))
    frame = da.to_dataframe(name="rainfall_mm").reset_index()
    frame = frame.rename(columns={"time": "date"})
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce").dt.normalize()
    frame["rainfall_mm"] = pd.to_numeric(frame["rainfall_mm"], errors="coerce")
    frame = frame.dropna(subset=["date", "lat", "lon", "rainfall_mm"])
    frame = frame[frame["rainfall_mm"] >= 0]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(OUT, index=False)
    print(f"Saved {len(frame):,} rows to {OUT}")


if __name__ == "__main__":
    main()
