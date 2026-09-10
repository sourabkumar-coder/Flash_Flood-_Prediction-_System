import os
import cdsapi

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "historical_weather"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "era5_test_2023_12.nc"
)

client = cdsapi.Client()

request = {
    "variable": [
        "total_precipitation"
    ],
    "year": "2023",
    "month": "12",
    "day": [
        "01", "02", "03", "04", "05",
        "06", "07", "08", "09", "10",
        "11", "12", "13"
    ],
    "time": [
        "00:00", "01:00", "02:00", "03:00",
        "04:00", "05:00", "06:00", "07:00",
        "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00",
        "16:00", "17:00", "18:00", "19:00",
        "20:00", "21:00", "22:00", "23:00"
    ],
    "area": [
        37, 68, 6, 98
    ],
    "data_format": "netcdf",
    "download_format": "unarchived"
}

print("Downloading small ERA5-Land test...")
print("Period: 2023-12-01 to 2023-12-13")
print("Region: India")

client.retrieve(
    "reanalysis-era5-land",
    request,
    OUTPUT_FILE
)

print("\nDONE")
print("Saved:", OUTPUT_FILE)