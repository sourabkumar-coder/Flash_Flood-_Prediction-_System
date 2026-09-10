from services.terrain_service import (
    get_terrain_features
)


print("=" * 60)
print("TERRAIN ANALYSIS TEST")
print("=" * 60)


state = "Himachal Pradesh"
district = "Kullu"


result = get_terrain_features(
    state,
    district,
    grid_size=5
)


print("\nSelected Location:")
print("State:", state)
print("District:", district)


print("\nTerrain Features:")

print(
    "Sample Count:",
    result["sample_count"]
)

print(
    "Minimum Elevation:",
    result["min_elevation_m"],
    "m"
)

print(
    "Maximum Elevation:",
    result["max_elevation_m"],
    "m"
)

print(
    "Mean Elevation:",
    result["mean_elevation_m"],
    "m"
)

print(
    "Relief:",
    result["relief_m"],
    "m"
)


print("\nSample Points:")

for i, point in enumerate(
    result["sample_points"],
    start=1
):

    print(
        i,
        "Latitude:",
        point[0],
        "Longitude:",
        point[1]
    )

    print(
    "Slope Sample Count:",
    result["slope_sample_count"]
)

print(
    "Mean Slope:",
    result["mean_slope_percent"],
    "%"
)

print(
    "Maximum Slope:",
    result["max_slope_percent"],
    "%"
)

print(
    "Mean Slope Angle:",
    result["mean_slope_degrees"],
    "degrees"
)

print(
    "Maximum Slope Angle:",
    result["max_slope_degrees"],
    "degrees"
)

print(
    "Slope Variability:",
    result["slope_variability_percent"],
    "%"
)