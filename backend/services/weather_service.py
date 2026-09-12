import requests
import time
import logging
from cachetools import TTLCache

logger = logging.getLogger(__name__)

WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"

# Cache weather data for 5 minutes by rounded coordinates (precision ~1.1km)
_WEATHER_CACHE = TTLCache(maxsize=1000, ttl=300)


def safe_float(value):
    """
    Safely convert a value to float.
    """
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def calculate_rainfall_accumulation(
    hourly_data,
    hours
):
    """
    Calculate rainfall accumulation for
    the most recent N hours.
    """

    precipitation = hourly_data.get(
        "precipitation",
        []
    )

    if not precipitation:
        return 0.0

    values = []

    for value in precipitation[-hours:]:
        number = safe_float(value)

        if number is not None:
            values.append(number)

    return round(
        sum(values),
        2
    )


def get_weather(
    latitude,
    longitude
):
    """
    Get actual weather and recent rainfall
    from Open-Meteo with caching and retry.
    """
    key = (round(float(latitude), 3), round(float(longitude), 3))
    if key in _WEATHER_CACHE:
        return _WEATHER_CACHE[key]

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "rain"
        ],
        "hourly": [
            "precipitation",
            "rain"
        ],
        "past_hours": 24,
        "forecast_hours": 1,
        "timezone": "auto"
    }

    data = None
    last_err = None
    for attempt in range(2):
        try:
            response = requests.get(
                WEATHER_API_URL,
                params=params,
                timeout=12
            )
            response.raise_for_status()
            data = response.json()
            break
        except Exception as e:
            last_err = e
            if attempt == 0 and "429" in str(e):
                time.sleep(0.5)

    if not data:
        logger.warning(f"Weather API request failed ({last_err}). Using baseline weather parameters.")
        return {
            "temperature": 22.0,
            "humidity": 65.0,
            "rainfall": 0.0,
            "rain": 0.0,
            "rainfall_1h": 0.0,
            "rainfall_3h": 0.0,
            "rainfall_6h": 0.0,
            "rainfall_24h": 0.0,
            "hourly": {}
        }

    current = data.get(
        "current",
        {}
    )

    hourly = data.get(
        "hourly",
        {}
    )

    # ========================================================
    # CURRENT WEATHER
    # ========================================================

    temperature = safe_float(
        current.get("temperature_2m")
    )

    humidity = safe_float(
        current.get(
            "relative_humidity_2m"
        )
    )

    current_rainfall = safe_float(
        current.get("precipitation")
    )

    rain = safe_float(
        current.get("rain")
    )

    # ========================================================
    # RAINFALL ACCUMULATION
    # ========================================================

    rainfall_1h = calculate_rainfall_accumulation(
        hourly,
        1
    )

    rainfall_3h = calculate_rainfall_accumulation(
        hourly,
        3
    )

    rainfall_6h = calculate_rainfall_accumulation(
        hourly,
        6
    )

    rainfall_24h = calculate_rainfall_accumulation(
        hourly,
        24
    )

    # ========================================================
    # RESULT
    # ========================================================

    return {

        # Current conditions
        "temperature": temperature,

        "humidity": humidity,

        "rainfall": current_rainfall,

        "rain": rain,

        # Flash-flood rainfall features
        "rainfall_1h": rainfall_1h,

        "rainfall_3h": rainfall_3h,

        "rainfall_6h": rainfall_6h,

        "rainfall_24h": rainfall_24h,

        # Raw hourly data retained
        "hourly": hourly
    }