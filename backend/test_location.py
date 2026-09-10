from services.location_service import search_location


results = search_location(
    "Patna",
    "Bihar"
)


print("=" * 60)
print("LOCATION SEARCH")
print("=" * 60)


for location in results[:5]:

    print("\nName:", location.get("name"))
    print("Country:", location.get("country"))
    print("State:", location.get("admin1"))
    print("District:", location.get("admin2"))
    print("Latitude:", location.get("latitude"))
    print("Longitude:", location.get("longitude"))
    print("Elevation:", location.get("elevation"))