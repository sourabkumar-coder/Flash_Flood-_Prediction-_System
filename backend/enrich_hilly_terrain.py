import time
import requests
import pandas as pd
import numpy as np

INPUT = "../data/raw/hilly_regions.csv"
OUTPUT = "../data/raw/hilly_regions_enriched.csv"

API = "https://api.opentopodata.org/v1/srtm30m"

df = pd.read_csv(INPUT)

print("Columns:", df.columns.tolist())
print("Rows:", len(df))

# Automatically detect columns — no hardcoded district/state values
def find_col(candidates):
    lower = {c.lower().strip(): c for c in df.columns}

    for candidate in candidates:
        if candidate.lower() in lower:
            return lower[candidate.lower()]

    for c in df.columns:
        cl = c.lower().strip()
        for candidate in candidates:
            if candidate.lower() in cl:
                return c

    return None


lat_col = find_col(["latitude", "lat"])
lon_col = find_col(["longitude", "lon", "lng"])
elev_col = find_col(["elevation"])
status_col = find_col(["status"])

print("Latitude column :", lat_col)
print("Longitude column:", lon_col)
print("Elevation column:", elev_col)
print("Status column   :", status_col)

if lat_col is None or lon_col is None:
    raise RuntimeError("Latitude/Longitude columns not found.")

if elev_col is None:
    df["elevation"] = np.nan
    elev_col = "elevation"

if status_col is None:
    df["status"] = "unknown"
    status_col = "status"


# ---------------------------------------------------------
# 1. Fill missing elevation using real SRTM30m API
# ---------------------------------------------------------

missing = df[
    df[elev_col].isna()
    | (df[status_col].astype(str).str.lower() != "success")
].copy()

print("\nMissing/failed elevation records:", len(missing))

locations = []

for idx, row in missing.iterrows():
    try:
        lat = float(row[lat_col])
        lon = float(row[lon_col])

        if -90 <= lat <= 90 and -180 <= lon <= 180:
            locations.append((idx, lat, lon))
    except:
        pass

print("Valid locations to query:", len(locations))


for start in range(0, len(locations), 100):

    batch = locations[start:start + 100]

    query = "|".join(
        f"{lat},{lon}"
        for _, lat, lon in batch
    )

    print(
        f"Querying SRTM: "
        f"{start + 1}-{start + len(batch)} / {len(locations)}"
    )

    try:
        response = requests.get(
            API,
            params={"locations": query},
            timeout=60
        )

        response.raise_for_status()
        data = response.json()

        results = data.get("results", [])

        for item, result in zip(batch, results):

            idx, _, _ = item

            elevation = result.get("elevation")

            if elevation is not None:
                df.loc[idx, elev_col] = float(elevation)
                df.loc[idx, status_col] = "success_srtm30m"

    except Exception as e:
        print("Batch failed:", e)

    # OpenTopoData public API limit = 1 request/sec
    time.sleep(1.2)


# ---------------------------------------------------------
# 2. Data-driven terrain classification
# ---------------------------------------------------------

df[elev_col] = pd.to_numeric(df[elev_col], errors="coerce")

valid = df[elev_col].notna()

print("\nElevation available:", valid.sum())
print("Elevation missing  :", (~valid).sum())

if valid.sum() < 10:
    raise RuntimeError("Not enough elevation data for classification.")


# Use the distribution of actual Indian district elevations.
# No manually chosen state list or elevation threshold.
q25 = df.loc[valid, elev_col].quantile(0.25)
q50 = df.loc[valid, elev_col].quantile(0.50)
q75 = df.loc[valid, elev_col].quantile(0.75)

print("\nElevation distribution:")
print("Q25:", round(q25, 2))
print("Q50:", round(q50, 2))
print("Q75:", round(q75, 2))


def classify(elevation):

    if pd.isna(elevation):
        return "unknown"

    # Data-driven classification:
    # upper quartile of actual district elevation
    if elevation >= q75:
        return "hilly"

    return "non_hilly"


df["terrain_class"] = df[elev_col].apply(classify)

df["terrain_data_source"] = np.where(
    df[elev_col].notna(),
    "SRTM30m",
    "unavailable"
)

df.to_csv(OUTPUT, index=False)

print("\nSaved:")
print(OUTPUT)

print("\nTerrain classification:")
print(df["terrain_class"].value_counts(dropna=False))

print("\nSource:")
print(df["terrain_data_source"].value_counts(dropna=False))