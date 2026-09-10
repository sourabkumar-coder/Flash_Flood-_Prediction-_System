from services.district_service import get_district_coordinates
from services.elevation_service import (
    get_elevation,
    calculate_slope
)


print("=" * 60)
print("HILLY TERRAIN TEST")
print("=" * 60)


location = get_district_coordinates(
    "Himachal Pradesh",
    "Kullu"
)

if location is None:
    raise RuntimeError("District not found")


latitude = location["latitude"]
longitude = location["longitude"]


elevation = get_elevation(
    latitude,
    longitude
)


terrain = calculate_slope(
    latitude,
    longitude,
    elevation
)


print("\nLocation:")
print("State:", location["state"])
print("District:", location["district"])


print("\nCoordinates:")
print("Latitude:", latitude)
print("Longitude:", longitude)


print("\nElevation:")
print("Center:", terrain["center_elevation"], "m")
print("North :", terrain["north_elevation"], "m")
print("South :", terrain["south_elevation"], "m")
print("East  :", terrain["east_elevation"], "m")
print("West  :", terrain["west_elevation"], "m")


print("\nTerrain Slope:")
print(
    "Slope:",
    round(terrain["slope_percent"], 2),
    "%"
)

print(
    "Slope:",
    round(terrain["slope_degrees"], 2),
    "degrees"
)