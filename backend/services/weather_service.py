import requests


WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"


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
    from Open-Meteo.

    Rainfall windows:
    - Current
    - 1 hour
    - 3 hours
    - 6 hours
    - 24 hours
    """

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

        # Get enough historical hourly data
        # for rainfall accumulation.
        "past_hours": 24,

        # Small forecast window retained
        # for future use.
        "forecast_hours": 1,

        "timezone": "auto"
    }

    response = requests.get(
        WEATHER_API_URL,
        params=params,
        timeout=20
    )

    response.raise_for_status()

    data = response.json()

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