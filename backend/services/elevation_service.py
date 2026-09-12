import requests
import math
import time
from cachetools import TTLCache

ELEVATION_API_URL = "https://api.open-meteo.com/v1/elevation"

# Cache elevations for 1 hour by rounded coordinate (precision ~1.1km)
_ELEVATION_CACHE = TTLCache(maxsize=2000, ttl=3600)


def get_elevation(latitude, longitude):
    """
    Get elevation for a single coordinate.
    """
    key = (round(float(latitude), 3), round(float(longitude), 3))
    if key in _ELEVATION_CACHE:
        return _ELEVATION_CACHE[key]

    params = {
        "latitude": latitude,
        "longitude": longitude
    }

    try:
        response = requests.get(
            ELEVATION_API_URL,
            params=params,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        elevations = data.get("elevation", [])
        if elevations:
            val = float(elevations[0])
            _ELEVATION_CACHE[key] = val
            return val
    except Exception as e:
        raise RuntimeError(f"Elevation API error: {e}")

    raise RuntimeError("Elevation data not returned")


def get_elevations(latitudes, longitudes):
    """
    Get elevations for multiple coordinates in a single batched call with caching.
    """
    if not latitudes or not longitudes:
        return []

    results = [None] * len(latitudes)
    missing_indices = []
    missing_lats = []
    missing_lons = []

    for i, (lat, lon) in enumerate(zip(latitudes, longitudes)):
        key = (round(float(lat), 3), round(float(lon), 3))
        if key in _ELEVATION_CACHE:
            results[i] = _ELEVATION_CACHE[key]
        else:
            missing_indices.append(i)
            missing_lats.append(lat)
            missing_lons.append(lon)

    if not missing_indices:
        return results

    params = {
        "latitude": ",".join(map(str, missing_lats)),
        "longitude": ",".join(map(str, missing_lons))
    }

    # Attempt request with 1 quick retry if rate-limited
    last_err = None
    for attempt in range(2):
        try:
            response = requests.get(
                ELEVATION_API_URL,
                params=params,
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            elevations = data.get("elevation", [])

            if len(elevations) == len(missing_indices):
                for idx, elev in zip(missing_indices, elevations):
                    val = float(elev) if elev is not None else 0.0
                    key = (round(float(latitudes[idx]), 3), round(float(longitudes[idx]), 3))
                    _ELEVATION_CACHE[key] = val
                    results[idx] = val
                return results
        except Exception as e:
            last_err = e
            if attempt == 0 and "429" in str(e):
                time.sleep(0.5)

    raise RuntimeError(f"Elevation API batch failed: {last_err}")



def calculate_slope(
    center_latitude,
    center_longitude,
    center_elevation,
    offset=0.01
):
    """
    Estimate terrain slope around a location.

    offset ≈ 0.01 degrees (~1 km).
    """

    points = [
        (center_latitude + offset, center_longitude),
        (center_latitude - offset, center_longitude),
        (center_latitude, center_longitude + offset),
        (center_latitude, center_longitude - offset),
    ]

    latitudes = [point[0] for point in points]
    longitudes = [point[1] for point in points]

    elevations = get_elevations(
        latitudes,
        longitudes
    )

    north = elevations[0]
    south = elevations[1]
    east = elevations[2]
    west = elevations[3]

    # Approximate horizontal distances in meters
    latitude_distance = 111_000
    longitude_distance = (
        111_000 * math.cos(math.radians(center_latitude))
    )

    north_south_distance = 2 * offset * latitude_distance
    east_west_distance = 2 * offset * longitude_distance

    dz_dy = (north - south) / north_south_distance
    dz_dx = (east - west) / east_west_distance

    slope_percent = (
        math.sqrt(
            dz_dx ** 2 +
            dz_dy ** 2
        ) * 100
    )

    slope_degrees = math.degrees(
        math.atan(slope_percent / 100)
    )

    return {
        "center_elevation": center_elevation,
        "north_elevation": north,
        "south_elevation": south,
        "east_elevation": east,
        "west_elevation": west,
        "slope_percent": slope_percent,
        "slope_degrees": slope_degrees
    }