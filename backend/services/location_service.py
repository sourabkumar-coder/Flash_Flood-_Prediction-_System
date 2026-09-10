import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"


def search_location(
    district: str,
    state: str | None = None
):
    """
    Search an Indian district/location.

    Example:
        search_location("Patna", "Bihar")
    """

    if state:
        query = f"{district}, {state}, India"
    else:
        query = f"{district}, India"

    params = {
        "name": query,
        "count": 10,
        "language": "en",
        "format": "json",
        "countryCode": "IN",
    }

    response = requests.get(
        GEOCODING_URL,
        params=params,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    results = data.get("results", [])

    # --------------------------------------------------------
    # Keep only Indian results
    # --------------------------------------------------------

    results = [
        result
        for result in results
        if result.get("country_code") == "IN"
    ]

    # --------------------------------------------------------
    # If state supplied, prefer matching state
    # --------------------------------------------------------

    if state:

        state_lower = state.lower()

        state_results = [
            result
            for result in results
            if result.get("admin1", "").lower() == state_lower
        ]

        if state_results:
            results = state_results

    return results