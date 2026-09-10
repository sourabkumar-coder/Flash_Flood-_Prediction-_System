import pandas as pd

TERRAIN = "../data/raw/hilly_regions_final.csv"
HISTORY = "../data/raw/flood_events/district_historical_features.csv"
OUTPUT = "../data/raw/master_district_features.csv"

terrain = pd.read_csv(TERRAIN)
history = pd.read_csv(HISTORY)

print("Terrain columns:")
print(terrain.columns.tolist())

print("\nHistory columns:")
print(history.columns.tolist())

# ---------------------------------------------------------
# Keep actual terrain data
# ---------------------------------------------------------

terrain_cols = [
    "state_name",
    "district",
    "latitude",
    "longitude",
    "elevation_m",
    "slope_percent",
    "terrain_class",
    "terrain_data_source"
]

terrain = terrain[terrain_cols].copy()

# ---------------------------------------------------------
# Historical features
# ---------------------------------------------------------

history_cols = [
    "state_name",
    "district",
    "stcode",
    "dtcode",
    "historical_flood_events",
    "historical_flood_years",
    "historical_fatalities",
    "historical_displaced",
    "historical_max_severity",
    "historical_max_impact"
]

history = history[history_cols].copy()

# ---------------------------------------------------------
# Normalize names before merging
# ---------------------------------------------------------

for df in [terrain, history]:

    df["state_name"] = (
        df["state_name"]
        .astype(str)
        .str.strip()
    )

    df["district"] = (
        df["district"]
        .astype(str)
        .str.strip()
    )

# ---------------------------------------------------------
# Merge using actual state + district names
# ---------------------------------------------------------

master = terrain.merge(
    history,
    on=["state_name", "district"],
    how="left",
    validate="one_to_one"
)

# ---------------------------------------------------------
# Historical availability
# ---------------------------------------------------------

master["historical_data_available"] = (
    master["historical_flood_events"].notna()
).astype(int)

# ---------------------------------------------------------
# Convert numeric historical fields
# ---------------------------------------------------------

numeric_cols = [
    "historical_flood_events",
    "historical_flood_years",
    "historical_fatalities",
    "historical_displaced",
    "historical_max_severity",
    "historical_max_impact"
]

for col in numeric_cols:

    master[col] = pd.to_numeric(
        master[col],
        errors="coerce"
    )

# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

master.to_csv(
    OUTPUT,
    index=False
)

print("\n==============================")
print("MASTER DISTRICT DATASET")
print("==============================")

print("Rows:", len(master))
print("Columns:", len(master.columns))

print("\nTerrain:")
print(
    master["terrain_class"]
    .value_counts(dropna=False)
)

print("\nHistorical data availability:")
print(
    master["historical_data_available"]
    .value_counts()
)

print("\nHistorical districts matched:",
      master["historical_data_available"].sum())

print("\nMissing values:")
print(
    master.isna()
    .sum()
    .sort_values(ascending=False)
    .head(15)
)

print("\nSample:")
print(
    master[
        [
            "state_name",
            "district",
            "latitude",
            "longitude",
            "elevation_m",
            "slope_percent",
            "terrain_class",
            "historical_flood_events",
            "historical_flood_years"
        ]
    ]
    .head(10)
    .to_string(index=False)
)

print("\nSaved:")
print(OUTPUT)