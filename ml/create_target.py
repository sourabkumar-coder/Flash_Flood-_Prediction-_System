import pandas as pd
import numpy as np
from pathlib import Path


# ============================================================
# 1. PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "flood_risk_dataset_india.csv"
)

OUTPUT_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "flood_risk_dataset_india_v2.csv"
)


# ============================================================
# 2. LOAD DATA
# ============================================================

df = pd.read_csv(INPUT_PATH)

print("=" * 70)
print("CREATING PHYSICS-INFORMED FLOOD TARGET")
print("=" * 70)

print(f"\nOriginal dataset: {df.shape}")


# ============================================================
# 3. NORMALIZE IMPORTANT FEATURES
# ============================================================

# Convert each continuous variable to a 0-1 scale.
# Higher value = higher flood risk.

def normalize(series):
    minimum = series.min()
    maximum = series.max()

    if maximum == minimum:
        return pd.Series(0.0, index=series.index)

    return (series - minimum) / (maximum - minimum)


rainfall_score = normalize(
    df["Rainfall (mm)"]
)

river_score = normalize(
    df["River Discharge (m³/s)"]
)

water_level_score = normalize(
    df["Water Level (m)"]
)

humidity_score = normalize(
    df["Humidity (%)"]
)

# Lower elevation generally means greater flood susceptibility.
elevation_score = 1 - normalize(
    df["Elevation (m)"]
)


# ============================================================
# 4. CATEGORICAL RISK SCORES
# ============================================================

# These are domain-inspired prototype weights.
# They are NOT observed flood probabilities.

land_cover_risk = {
    "Water Body": 1.00,
    "Urban": 0.85,
    "Agricultural": 0.70,
    "Forest": 0.45,
    "Desert": 0.25
}

soil_risk = {
    "Clay": 0.90,
    "Silt": 0.80,
    "Loam": 0.60,
    "Peat": 0.50,
    "Sandy": 0.30
}


land_score = (
    df["Land Cover"]
    .map(land_cover_risk)
    .fillna(0.5)
)

soil_score = (
    df["Soil Type"]
    .map(soil_risk)
    .fillna(0.5)
)


# ============================================================
# 5. HISTORICAL FLOOD SCORE
# ============================================================

historical_score = normalize(
    df["Historical Floods"]
)


# ============================================================
# 6. COMBINE RISK FACTORS
# ============================================================

risk_score = (
    0.25 * rainfall_score
    + 0.20 * river_score
    + 0.20 * water_level_score
    + 0.10 * humidity_score
    + 0.10 * elevation_score
    + 0.05 * land_score
    + 0.05 * soil_score
    + 0.05 * historical_score
)


# ============================================================
# 7. ADD SMALL NONLINEAR INTERACTION
# ============================================================

# Simulates the fact that simultaneous heavy rainfall
# and high river discharge can increase flood risk.

interaction = (
    rainfall_score * river_score
)

risk_score = (
    risk_score
    + 0.10 * interaction
)


# ============================================================
# 8. CONVERT RISK SCORE INTO BINARY TARGET
# ============================================================

# Use the 70th percentile as the initial flood threshold.
# This avoids making the target dependent on an arbitrary
# absolute value because the original dataset is synthetic.

threshold = risk_score.quantile(0.70)

df["Flood Risk Score"] = risk_score

df["Flood Occurred"] = (
    risk_score >= threshold
).astype(int)


# ============================================================
# 9. RISK LEVEL
# ============================================================

df["Risk Level"] = pd.cut(
    risk_score,
    bins=[
        -np.inf,
        0.30,
        0.50,
        0.70,
        np.inf
    ],
    labels=[
        "Low",
        "Moderate",
        "High",
        "Critical"
    ]
)


# ============================================================
# 10. SAVE DATASET
# ============================================================

df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# 11. DISPLAY RESULTS
# ============================================================

print("\nRisk score statistics:")
print(df["Flood Risk Score"].describe())

print("\nFlood threshold:")
print(threshold)

print("\nNew target distribution:")
print(df["Flood Occurred"].value_counts())

print("\nNew target percentage:")
print(
    df["Flood Occurred"]
    .value_counts(normalize=True)
    * 100
)

print("\nRisk level distribution:")
print(df["Risk Level"].value_counts())

print("\nNew dataset shape:")
print(df.shape)

print("\nSaved to:")
print(OUTPUT_PATH)

print("\n" + "=" * 70)
print("TARGET CREATION COMPLETE")
print("=" * 70)