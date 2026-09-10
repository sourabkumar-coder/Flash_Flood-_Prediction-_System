import geopandas as gpd
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_FILE = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "flood_events",
    "india_district_flood_events.gpkg"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "flood_events"
)

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "historical_flood_events.csv"
)

print("=" * 70)
print("BUILDING HISTORICAL FLOOD EVENT MASTER TABLE")
print("=" * 70)

print("\n[1/4] Reading DFO flood-district data...")

df = gpd.read_file(
    INPUT_FILE,
    layer="district_flood_events"
)

print("Rows:", len(df))
print("Unique events:", df["ReportNumber"].nunique())

# ---------------------------------------------------------
# [2] Keep one record per flood event + district
# ---------------------------------------------------------

print("\n[2/4] Preparing event records...")

columns = [
    "ReportNumber",
    "state_name",
    "district",
    "BeginDate",
    "EndDate",
    "Duration",
    "Area",
    "Source",
    "NumberOfFatalities",
    "NumberOfDisplaced",
    "MainCause",
    "Severity",
    "FloodImpactIndex"
]

available = [c for c in columns if c in df.columns]

events = df[available].copy()

events["BeginDate"] = pd.to_datetime(
    events["BeginDate"],
    errors="coerce"
)

events["EndDate"] = pd.to_datetime(
    events["EndDate"],
    errors="coerce"
)

events["event_year"] = events["BeginDate"].dt.year

# ---------------------------------------------------------
# [3] Calculate duration if necessary
# ---------------------------------------------------------

print("\n[3/4] Calculating event information...")

if "Duration" not in events.columns:
    events["Duration"] = (
        events["EndDate"] - events["BeginDate"]
    ).dt.days + 1

# Remove records without valid dates
events = events.dropna(
    subset=["BeginDate", "EndDate"]
)

# Sort
events = events.sort_values(
    ["BeginDate", "ReportNumber", "state_name", "district"]
)

# ---------------------------------------------------------
# [4] Save
# ---------------------------------------------------------

print("\n[4/4] Saving...")

os.makedirs(
    OUTPUT_DIR,
    exist_ok=True
)

events.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)

print("Output:", OUTPUT_FILE)
print("Rows:", len(events))
print("Unique events:", events["ReportNumber"].nunique())
print(
    "Date range:",
    events["BeginDate"].min().date(),
    "to",
    events["EndDate"].max().date()
)

print("\nColumns:")
print(events.columns.tolist())

print("\nSample:")
print(
    events.head(10).to_string(index=False)
)