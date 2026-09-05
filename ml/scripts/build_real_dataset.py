"""Build a leakage-safe, real-data flood training dataset.

Inputs
------
1) IMD gridded daily rainfall extracted to CSV by download_imd_rainfall.py
   with columns: date, lat, lon, rainfall_mm
2) Indian Flood Inventory CSV already shipped in data/
3) pilot_locations.csv with village coordinates/static terrain attributes.

The shipped district-wise IMD CSV is current/short-window data and is NOT used
for historical training. It remains useful for live/reference display.

This builder creates a daily, village-level retrospective dataset. Because the
historical IMD product is daily, the defensible historical target here is
"flood event begins within next 3 days". An hourly source (ERA5-Land/IMERG)
can later be substituted without changing the model interface.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
ML_DATA = ROOT / "ml" / "data"

PILOT = DATA / "pilot_locations.csv"
RAINFALL = DATA / "imd_gridded_hp_rainfall.csv"
FLOODS = DATA / "IndianFloodInventroy(IFI).csv"
OUT = ML_DATA / "real_master_flood_dataset.csv"

FEATURES = [
    "rainfall_1d", "rainfall_3d", "rainfall_7d", "rainfall_intensity_proxy",
    "soil_moisture_proxy", "elevation", "slope", "aspect",
    "flow_accumulation", "distance_to_river", "historical_flood_frequency",
    "forecast_rainfall_proxy", "land_use_code"
]


def _norm_text(x: object) -> str:
    return re.sub(r"[^a-z0-9]", "", str(x).lower())


def load_pilot() -> pd.DataFrame:
    if not PILOT.exists():
        raise FileNotFoundError(f"Missing {PILOT}")
    p = pd.read_csv(PILOT)
    p["village_id"] = p["village_id"].astype(str)
    return p


def load_rainfall() -> pd.DataFrame:
    if not RAINFALL.exists():
        raise FileNotFoundError(
            f"Missing {RAINFALL}. Run download_imd_rainfall.py first. "
            "Do not train on the short-window district CSV."
        )
    r = pd.read_csv(RAINFALL)
    required = {"date", "lat", "lon", "rainfall_mm"}
    missing = required - set(r.columns)
    if missing:
        raise ValueError(f"Rainfall CSV missing columns: {sorted(missing)}")
    r["date"] = pd.to_datetime(r["date"], errors="coerce").dt.normalize()
    r["rainfall_mm"] = pd.to_numeric(r["rainfall_mm"], errors="coerce")
    r = r.dropna(subset=["date", "lat", "lon", "rainfall_mm"])
    return r


def load_flood_inventory() -> pd.DataFrame:
    f = pd.read_csv(FLOODS)
    f["start"] = pd.to_datetime(f["Start Date"], errors="coerce").dt.normalize()
    f["end"] = pd.to_datetime(f["End Date"], errors="coerce").dt.normalize()
    f["lat"] = pd.to_numeric(f["Latitude"], errors="coerce")
    f["lon"] = pd.to_numeric(f["Longitude"], errors="coerce")
    f["district_text"] = f["Districts"].fillna("").astype(str).map(_norm_text)
    f = f.dropna(subset=["start"])
    return f


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * np.arcsin(np.sqrt(a))


def nearest_grid_series(rain: pd.DataFrame, lat: float, lon: float) -> pd.DataFrame:
    # Pick nearest spatial grid cell, then keep its complete time series.
    grid = rain[["lat", "lon"]].drop_duplicates().copy()
    grid["dist"] = haversine_km(lat, lon, grid["lat"].values, grid["lon"].values)
    nearest = grid.loc[grid["dist"].idxmin()]
    x = rain[(rain["lat"] == nearest["lat"]) & (rain["lon"] == nearest["lon"])].copy()
    return x[["date", "rainfall_mm"]].sort_values("date").reset_index(drop=True)


def historical_event_count(events: pd.DataFrame, village: pd.Series, as_of: pd.Timestamp) -> int:
    past = events[events["start"] < as_of]
    if past.empty:
        return 0
    dtoken = _norm_text(village["district"])
    district_match = past["district_text"].str.contains(dtoken, na=False) if dtoken else pd.Series(False, index=past.index)
    geo = past.dropna(subset=["lat", "lon"])
    if not geo.empty:
        dist = haversine_km(village["lat"], village["lon"], geo["lat"].values, geo["lon"].values)
        geo_match_idx = geo.index[dist <= 75.0]
    else:
        geo_match_idx = []
    return int(district_match.sum() + len(set(geo_match_idx) - set(past.index[district_match])))


def future_event_label(events: pd.DataFrame, village: pd.Series, date: pd.Timestamp, horizon_days: int = 3) -> int:
    window_end = date + pd.Timedelta(days=horizon_days)
    e = events[(events["start"] > date) & (events["start"] <= window_end)].copy()
    if e.empty:
        return 0
    dtoken = _norm_text(village["district"])
    district_match = e["district_text"].str.contains(dtoken, na=False) if dtoken else pd.Series(False, index=e.index)
    if district_match.any():
        return 1
    geo = e.dropna(subset=["lat", "lon"])
    if geo.empty:
        return 0
    dist = haversine_km(village["lat"], village["lon"], geo["lat"].values, geo["lon"].values)
    return int(np.any(dist <= 75.0))


def build():
    pilot = load_pilot()
    rain = load_rainfall()
    events = load_flood_inventory()

    records = []
    for _, v in pilot.iterrows():
        series = nearest_grid_series(rain, float(v["lat"]), float(v["lon"]))
        if series.empty:
            continue
        series = series.set_index("date").asfreq("D")
        series["rainfall_mm"] = series["rainfall_mm"].interpolate(limit=2).fillna(0.0).clip(lower=0)
        r = series["rainfall_mm"]
        # Proxy soil wetness is explicitly labelled a rainfall-derived proxy,
        # not a sensor/SMAP observation.
        soil = (r.rolling(7, min_periods=1).sum() / max(1.0, r.rolling(30, min_periods=1).sum().median())) * 100
        soil = soil.clip(0, 100)
        for dt, row in series.iterrows():
            if dt < series.index.min() + pd.Timedelta(days=7):
                continue
            hist = historical_event_count(events, v, dt)
            target = future_event_label(events, v, dt, horizon_days=3)
            rain1 = float(r.loc[dt])
            rain3 = float(r.loc[:dt].tail(3).sum())
            rain7 = float(r.loc[:dt].tail(7).sum())
            # Daily IMD cannot provide true hourly intensity. Use daily amount
            # as an intensity proxy and keep the field name explicit.
            records.append({
                "village_id": v["village_id"],
                "village_name": v["village_name"],
                "district": v["district"],
                "date": dt,
                "rainfall_1d": rain1,
                "rainfall_3d": rain3,
                "rainfall_7d": rain7,
                "rainfall_intensity_proxy": rain1,
                "soil_moisture_proxy": float(soil.loc[dt]),
                "elevation": float(v["elevation_m"]),
                "slope": float(v["slope_deg"]),
                "aspect": float(v["aspect_deg"]),
                "flow_accumulation": float(v["catchment_area_km2"]),
                "distance_to_river": float(v["dist_to_river_m"]),
                "historical_flood_frequency": hist,
                "forecast_rainfall_proxy": float(r.loc[dt:].head(3).sum()),
                "land_use_code": int(v["land_use_code"]),
                "flood_target_next_3d": target,
            })

    out = pd.DataFrame(records).sort_values(["date", "village_id"]).reset_index(drop=True)
    if out.empty:
        raise RuntimeError("No training rows were produced.")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT, index=False)
    print(f"Wrote {len(out):,} rows to {OUT}")
    print(f"Positive rate: {out['flood_target_next_3d'].mean():.3%}")
    print(f"Date range: {out.date.min().date()} -> {out.date.max().date()}")


if __name__ == "__main__":
    build()
