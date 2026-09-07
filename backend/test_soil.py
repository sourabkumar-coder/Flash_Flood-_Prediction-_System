from services.soil_service import get_district_soil


print("=" * 60)
print("DISTRICT SOILGRIDS TEST")
print("=" * 60)

state = "Himachal Pradesh"
district = "Kullu"

result = get_district_soil(
    state,
    district
)

print("\n" + "=" * 60)
print("RESULT")
print("=" * 60)

print(f"State          : {result['state']}")
print(f"District       : {result['district']}")
print(f"Sample Points  : {result['sample_points']}")
print(f"Successful     : {result['successful_points']}")

for property_name, values in result["properties"].items():

    print(f"\n{property_name.upper()}")

    print(
        f"Mean   : {values['mean_percent']} %"
    )

    print(
        f"Median : {values['median_percent']} %"
    )

    print(
        f"Min    : {values['min_percent']} %"
    )

    print(
        f"Max    : {values['max_percent']} %"
    )

    print(
        f"Samples: {values['sample_count']}"
    )