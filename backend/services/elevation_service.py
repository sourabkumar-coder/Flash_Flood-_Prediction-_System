import requests
import math


ELEVATION_API_URL = "https://api.open-meteo.com/v1/elevation"


def get_elevation(latitude, longitude):
    """
    Get elevation for a single coordinate.
    """

    params = {
        "latitude": latitude,
        "longitude": longitude
    }

    response = requests.get(
        ELEVATION_API_URL,
        params=params,
        timeout=20
    )

    response.raise_for_status()

    data = response.json()

    elevations = data.get("elevation", [])

    if not elevations:
        raise RuntimeError("Elevation data not returned")

    return elevations[0]


def get_elevations(latitudes, longitudes):
    """
    Get elevations for multiple coordinates.
    """

    params = {
        "latitude": ",".join(map(str, latitudes)),
        "longitude": ",".join(map(str, longitudes))
    }

    response = requests.get(
        ELEVATION_API_URL,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    elevations = data.get("elevation", [])

    if len(elevations) != len(latitudes):
        raise RuntimeError(
            "Elevation count does not match coordinate count"
        )

    return elevations


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