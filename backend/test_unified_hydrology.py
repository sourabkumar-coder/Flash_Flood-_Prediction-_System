from services.district_service import get_district_coordinates
from services.unified_hydrology_service import (
    get_hydrology_features
)


print("=" * 60)
print("UNIFIED HYDROLOGY TEST")
print("=" * 60)


# Current test location
# We are using Kullu because the discharge dataset
# currently available to us is from Himachal Pradesh.

location = get_district_coordinates(
    "Himachal Pradesh",
    "Kullu"
)

if location is None:
    raise RuntimeError("District not found")


latitude = location["latitude"]
longitude = location["longitude"]


result = get_hydrology_features(
    latitude,
    longitude,
    location["state"]
)


print("\nSelected Location:")
print("State:", location["state"])
print("District:", location["district"])


print("\n--- RIVER DISCHARGE ---")

print(
    "Discharge:",
    result["discharge"],
    "m³/s"
)

print(
    "Station:",
    result["discharge_station"]
)

print(
    "Distance:",
    result["discharge_distance_km"],
    "km"
)

print(
    "Timestamp:",
    result["discharge_timestamp"]
)


print("\n--- WATER LEVEL ---")

print(
    "Water Level:",
    result["water_level"],
    "meter"
)

print(
    "Station:",
    result["water_level_station"]
)

print(
    "Distance:",
    result["water_level_distance_km"],
    "km"
)

print(
    "Timestamp:",
    result["water_level_timestamp"]
)

print(
    "Data Age:",
    result["discharge_data_age_hours"],
    "hours"
)

print(
    "Data Status:",
    result["discharge_data_status"]
)