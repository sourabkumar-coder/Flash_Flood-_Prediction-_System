import geopandas as gpd
import pandas as pd
import numpy as np

INPUT = "../data/raw/flood_events/india_district_flood_events.gpkg"
OUTPUT = "../data/raw/flood_events/district_historical_flood_labels.csv"

gdf = gpd.read_file(INPUT)

# Dates
gdf["BeginDate"] = pd.to_datetime(gdf["BeginDate"], errors="coerce")
gdf["EndDate"] = pd.to_datetime(gdf["EndDate"], errors="coerce")

gdf = gdf.dropna(subset=["BeginDate"])

# Historical year
gdf["year"] = gdf["BeginDate"].dt.year

# Numeric fields
numeric_cols = [
    "Area",
    "NumberOfFatalities",
    "NumberOfDisplaced",
    "Severity",
    "FloodImpactIndex"
]

for col in numeric_cols:
    gdf[col] = pd.to_numeric(gdf[col], errors="coerce").fillna(0)

# ---------------------------------------------------------
# Aggregate by district + year
# ---------------------------------------------------------

labels = (
    gdf.groupby(
        ["state_name", "district", "stcode", "dtcode", "year"],
        as_index=False
    )
    .agg(
        flood_events=("ReportNumber", "nunique"),
        affected_area=("Area", "sum"),
        fatalities=("NumberOfFatalities", "sum"),
        displaced=("NumberOfDisplaced", "sum"),
        max_severity=("Severity", "max"),
        max_flood_impact_index=("FloodImpactIndex", "max")
    )
)

# This is an observed historical flood occurrence.
labels["flood_occurred"] = 1

# ---------------------------------------------------------
# Remove duplicate spatial-overlap inflation
# ---------------------------------------------------------

# Same DFO event can intersect multiple districts legitimately.
# But within a district-year, count unique DFO reports only.
# Therefore flood_events uses ReportNumber.nunique above.

# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

labels = labels.sort_values(
    ["state_name", "district", "year"]
)

labels.to_csv(OUTPUT, index=False)

print("\n================================")
print("HISTORICAL FLOOD LABELS")
print("================================")

print("Rows:", len(labels))

print("\nColumns:")
print(labels.columns.tolist())

print("\nDistricts represented:",
      labels[["state_name", "district"]]
      .drop_duplicates()
      .shape[0])

print("\nYear range:",
      labels["year"].min(),
      "-",
      labels["year"].max())

print("\nTotal observed flood-events:",
      labels["flood_events"].sum())

print("\nTop districts:")
print(
    labels.sort_values(
        "flood_events",
        ascending=False
    )
    .head(15)
    [["state_name", "district", "year", "flood_events",
      "max_severity", "max_flood_impact_index"]]
    .to_string(index=False)
)

print("\nSaved:")
print(OUTPUT)