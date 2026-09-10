import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_FILE = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "master_district_features.csv"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed"
)

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "flood_training_dataset.csv"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("CREATING FLOOD ML TRAINING DATASET")
print("=" * 70)

df = pd.read_csv(INPUT_FILE)

print("\nOriginal shape:", df.shape)

# ---------------------------------------------------------
# Numeric conversion
# ---------------------------------------------------------

numeric_cols = [
    "latitude",
    "longitude",
    "elevation_m",
    "slope_percent",
    "historical_flood_events",
    "historical_flood_years",
    "historical_fatalities",
    "historical_displaced",
    "historical_max_severity",
    "historical_max_impact",
    "historical_data_available"
]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# ---------------------------------------------------------
# Missing historical values
# ---------------------------------------------------------

history_cols = [
    "historical_flood_events",
    "historical_flood_years",
    "historical_fatalities",
    "historical_displaced",
    "historical_max_severity",
    "historical_max_impact"
]

# Missing historical data means "no historical information",
# NOT "no flood".
df[history_cols] = df[history_cols].fillna(0)

# Missing slope: use median slope from available districts.
df["slope_percent"] = df["slope_percent"].fillna(
    df["slope_percent"].median()
)

# ---------------------------------------------------------
# Create susceptibility target
# ---------------------------------------------------------
#
# IMPORTANT:
# This is NOT an observed event label.
# It represents historical flood susceptibility/context.
#
# A district with historical DFO events gets positive weight.
# We deliberately do not claim that absence of DFO records
# means absence of floods.
# ---------------------------------------------------------

score = (
    0.40 * df["historical_flood_events"].rank(pct=True) +
    0.25 * df["historical_flood_years"].rank(pct=True) +
    0.15 * df["historical_max_severity"].rank(pct=True) +
    0.20 * df["historical_max_impact"].rank(pct=True)
)

df["flood_susceptibility_score"] = score

# Top 30% as high historical susceptibility.
threshold = score.quantile(0.70)

df["flood_target"] = (
    score >= threshold
).astype(int)

# ---------------------------------------------------------
# Select ML features
# ---------------------------------------------------------

feature_cols = [
    "latitude",
    "longitude",
    "elevation_m",
    "slope_percent",
    "historical_flood_events",
    "historical_flood_years",
    "historical_fatalities",
    "historical_displaced",
    "historical_max_severity",
    "historical_max_impact",
    "historical_data_available"
]

output_cols = [
    "state_name",
    "district"
] + feature_cols + [
    "flood_susceptibility_score",
    "flood_target"
]

training_df = df[output_cols].copy()

# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

training_df.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)

print("Output:", OUTPUT_FILE)
print("Shape:", training_df.shape)

print("\nTarget distribution:")
print(
    training_df["flood_target"]
    .value_counts()
    .sort_index()
)

print("\nMissing values:")
print(
    training_df.isna().sum()
)

print("\nSample:")
print(
    training_df.head(10).to_string(index=False)
)