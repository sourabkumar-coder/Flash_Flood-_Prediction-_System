from services.district_service import get_district_coordinates
from services.water_level_service import (
    find_nearest_water_level_station
)


print("=" * 60)
print("WATER LEVEL STATION TEST")
print("=" * 60)


# Test location: Manipur
location = get_district_coordinates(
    "Manipur",
    "Thoubal"
)

if location is None:
    raise RuntimeError("District not found")


latitude = location["latitude"]
longitude = location["longitude"]


result = find_nearest_water_level_station(
    latitude,
    longitude
)


station = result["nearest_station"]
latest = result["latest_record"]


print("\nSelected Location:")
print("State:", location["state"])
print("District:", location["district"])


print("\nNearest Water-Level Station:")
print("Station:", station["station"])
print("State:", station["state"])
print("District:", station["district"])
print("River:", station["river"])
print("Station Latitude:", station["latitude"])
print("Station Longitude:", station["longitude"])
print("Distance:", round(result["distance_km"], 2), "km")


print("\nLatest Record:")
print("Timestamp:", latest["timestamp"])
print(
    "Water Level:",
    latest["water_level"],
    "meter"
)
print(
    "Zero Gauge RL:",
    latest["zero_gauge_rl"]
)
print(
    "Mean Sea Level:",
    latest["mean_sea_level"]
)
print(
    "Discharge Available:",
    latest["discharge_available"]
)