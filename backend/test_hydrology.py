from services.district_service import get_district_coordinates
from services.hydrology_service import (
    find_nearest_discharge_station
)


print("=" * 60)
print("HYDROLOGY STATION TEST")
print("=" * 60)


# Location comes from actual district GeoJSON
location = get_district_coordinates(
    "Himachal Pradesh",
    "Kullu"
)

if location is None:
    raise RuntimeError("District not found")


latitude = location["latitude"]
longitude = location["longitude"]


result = find_nearest_discharge_station(
    latitude,
    longitude
)


station = result["nearest_station"]


print("\nSelected Location:")
print("State:", location["state"])
print("District:", location["district"])


print("\nNearest Hydrology Station:")
print("Station:", station["station"])
print("State:", station["state"])
print("District:", station["district"])
print("River:", station["river"])

print(
    "Station Latitude:",
    station["latitude"]
)

print(
    "Station Longitude:",
    station["longitude"]
)

print(
    "Distance:",
    round(result["distance_km"], 2),
    "km"
)


print("\nLatest Record:")
print(
    "Timestamp:",
    result["latest_record"]["timestamp"]
)

print(
    "Discharge:",
    result["latest_record"]["discharge"],
    "m³/s"
)