import os
import pandas as pd
import cdsapi

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_FILE = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "flood_events",
    "historical_flood_events.csv"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "historical_weather"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("HISTORICAL ERA5-LAND RAINFALL EXTRACTION")
print("=" * 70)

# ---------------------------------------------------------
# 1. Read historical flood events
# ---------------------------------------------------------

df = pd.read_csv(INPUT_FILE)

df["BeginDate"] = pd.to_datetime(df["BeginDate"])
df["EndDate"] = pd.to_datetime(df["EndDate"])

print("\nFlood-district records:", len(df))
print("Unique flood events:", df["ReportNumber"].nunique())

# ---------------------------------------------------------
# 2. Determine required years
# ---------------------------------------------------------

years = sorted(df["BeginDate"].dt.year.unique())

print("\nRequired years:")
print(years)

# ---------------------------------------------------------
# 3. ERA5-Land CDS client
# ---------------------------------------------------------

client = cdsapi.Client()

# ---------------------------------------------------------
# 4. Download yearly files
# ---------------------------------------------------------

for year in years:

    output_file = os.path.join(
        OUTPUT_DIR,
        f"era5_land_{year}.nc"
    )

    if os.path.exists(output_file):
        print(f"\nSkipping {year} - already downloaded")
        continue

    print("\n" + "-" * 70)
    print(f"Downloading ERA5-Land: {year}")
    print("-" * 70)

    request = {
        "variable": [
            "total_precipitation"
        ],
        "year": str(year),
        "month": [
            "01", "02", "03", "04",
            "05", "06", "07", "08",
            "09", "10", "11", "12"
        ],
        "day": [
            "01", "02", "03", "04", "05",
            "06", "07", "08", "09", "10",
            "11", "12", "13", "14", "15",
            "16", "17", "18", "19", "20",
            "21", "22", "23", "24", "25",
            "26", "27", "28", "29", "30",
            "31"
        ],
        "time": [
            "00:00", "01:00", "02:00", "03:00",
            "04:00", "05:00", "06:00", "07:00",
            "08:00", "09:00", "10:00", "11:00",
            "12:00", "13:00", "14:00", "15:00",
            "16:00", "17:00", "18:00", "19:00",
            "20:00", "21:00", "22:00", "23:00"
        ],
        "data_format": "netcdf",
        "download_format": "unarchived",
    }

    try:
        client.retrieve(
            "reanalysis-era5-land",
            request,
            output_file
        )

        print(f"Saved: {output_file}")

    except Exception as e:
        print(f"ERROR downloading {year}: {e}")

print("\n" + "=" * 70)
print("DOWNLOAD PROCESS FINISHED")
print("=" * 70)