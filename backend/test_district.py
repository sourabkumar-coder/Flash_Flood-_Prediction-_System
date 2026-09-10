from services.district_service import get_district_coordinates


print("=" * 60)
print("DISTRICT COORDINATE TEST")
print("=" * 60)


result = get_district_coordinates(
    "Gujrat",
    "Badodra"
)


if result:
    print("\nState:", result["state"])
    print("District:", result["district"])
    print("Latitude:", result["latitude"])
    print("Longitude:", result["longitude"])
else:
    print("\nDistrict not found.")