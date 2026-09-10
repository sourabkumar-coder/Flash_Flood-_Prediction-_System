from services.district_service import get_district_coordinates
from services.weather_service import get_weather


print("=" * 60)
print("DISTRICT WEATHER TEST")
print("=" * 60)

state = "Bihar"
district = "Patna"

# ============================================================
# LOCATION
# ============================================================

coordinates = get_district_coordinates(
    state,
    district
)

if coordinates is None:
    raise ValueError(
        f"District not found: {district}, {state}"
    )

latitude = coordinates["latitude"]
longitude = coordinates["longitude"]

print("\nLocation:")
print(f"State: {state}")
print(f"District: {district}")
print(f"Latitude: {latitude}")
print(f"Longitude: {longitude}")


# ============================================================
# WEATHER
# ============================================================

weather = get_weather(
    latitude,
    longitude
)

print("\nWeather:")

print(
    f"Temperature: "
    f"{weather.get('temperature')} °C"
)

print(
    f"Humidity: "
    f"{weather.get('humidity')} %"
)

print(
    f"Current Rainfall: "
    f"{weather.get('rainfall')} mm"
)

print(
    f"Rain: "
    f"{weather.get('rain')} mm"
)


# ============================================================
# FLASH FLOOD RAINFALL FEATURES
# ============================================================

print("\nRainfall Accumulation:")

print(
    f"Last 1 hour : "
    f"{weather.get('rainfall_1h')} mm"
)

print(
    f"Last 3 hours: "
    f"{weather.get('rainfall_3h')} mm"
)

print(
    f"Last 6 hours: "
    f"{weather.get('rainfall_6h')} mm"
)

print(
    f"Last 24 hours: "
    f"{weather.get('rainfall_24h')} mm"
)


# ============================================================
# RECENT HOURLY DATA
# ============================================================

print("\nRecent hourly rainfall:")

hourly = weather.get(
    "hourly",
    {}
)

times = hourly.get(
    "time",
    []
)

precipitation = hourly.get(
    "precipitation",
    []
)

for time, rainfall in zip(
    times[-10:],
    precipitation[-10:]
):

    print(
        f"{time} → {rainfall} mm"
    )


print("\n" + "=" * 60)
print("WEATHER TEST COMPLETE")
print("=" * 60)