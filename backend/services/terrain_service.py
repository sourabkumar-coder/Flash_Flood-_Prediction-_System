import math

from services.elevation_service import get_elevations


def generate_sample_points_from_centroid(
    latitude,
    longitude,
    grid_size=5,
    radius_deg=0.25,
):
    """
    Generate a grid of sample points around a centre coordinate.

    Used when no district GeoJSON polygon is available.
    A grid_size x grid_size grid spanning ±radius_deg
    (~25 km at Indian latitudes) gives good elevation coverage.

    Parameters
    ----------
    latitude   : float  – district centroid latitude
    longitude  : float  – district centroid longitude
    grid_size  : int    – number of points per axis (default 5 → 25 pts)
    radius_deg : float  – half-span in degrees (default 0.25° ≈ 28 km)
    """

    if grid_size < 2:
        grid_size = 2

    points = []

    min_lat = latitude  - radius_deg
    max_lat = latitude  + radius_deg
    min_lon = longitude - radius_deg
    max_lon = longitude + radius_deg

    for row in range(grid_size):
        lat = min_lat + row * (max_lat - min_lat) / (grid_size - 1)
        for col in range(grid_size):
            lon = min_lon + col * (max_lon - min_lon) / (grid_size - 1)
            points.append((lat, lon))

    return points


def calculate_local_slope(
    latitude,
    longitude,
    elevation,
    offset=0.01
):
    """
    Estimate local slope around one sample point
    using four surrounding elevation points.

    Returns slope in percent and degrees.
    """

    points = [
        (
            latitude + offset,
            longitude
        ),
        (
            latitude - offset,
            longitude
        ),
        (
            latitude,
            longitude + offset
        ),
        (
            latitude,
            longitude - offset
        )
    ]

    latitudes = [
        point[0]
        for point in points
    ]

    longitudes = [
        point[1]
        for point in points
    ]

    surrounding_elevations = get_elevations(
        latitudes,
        longitudes
    )

    north = surrounding_elevations[0]
    south = surrounding_elevations[1]
    east = surrounding_elevations[2]
    west = surrounding_elevations[3]

    # Approximate distance in metres
    latitude_distance = 111_000

    longitude_distance = (
        111_000
        * math.cos(
            math.radians(latitude)
        )
    )

    north_south_distance = (
        2
        * offset
        * latitude_distance
    )

    east_west_distance = (
        2
        * offset
        * longitude_distance
    )

    dz_dy = (
        north - south
    ) / north_south_distance

    dz_dx = (
        east - west
    ) / east_west_distance

    slope_ratio = math.sqrt(
        dz_dx ** 2
        + dz_dy ** 2
    )

    slope_percent = (
        slope_ratio * 100
    )

    slope_degrees = math.degrees(
        math.atan(
            slope_ratio
        )
    )

    return {
        "slope_percent": slope_percent,
        "slope_degrees": slope_degrees
    }


def get_terrain_features(
    state_name,
    district_name,
    grid_size=5,
    latitude=None,
    longitude=None,
):
    """
    Calculate elevation and slope statistics for the selected district.

    Uses a coordinate-based sample grid (no GeoJSON polygon required).
    Provide latitude + longitude (district centroid) for best results.
    Falls back to [0, 0] if neither is given (avoid this).
    """

    if latitude is None or longitude is None:
        raise ValueError(
            f"latitude and longitude are required for terrain analysis "
            f"({district_name}, {state_name})"
        )

    points = generate_sample_points_from_centroid(
        latitude,
        longitude,
        grid_size=grid_size,
    )


    latitudes = [
        point[0]
        for point in points
    ]

    longitudes = [
        point[1]
        for point in points
    ]

    # ---------------------------------------------
    # Elevation
    # ---------------------------------------------

    elevations = get_elevations(
        latitudes,
        longitudes
    )

    if not elevations:
        raise RuntimeError(
            "No elevation data returned"
        )

    min_elevation = min(elevations)

    max_elevation = max(elevations)

    mean_elevation = (
        sum(elevations)
        / len(elevations)
    )

    relief = (
        max_elevation
        - min_elevation
    )

    # ---------------------------------------------
    # Slope
    # ---------------------------------------------

    slopes_percent = []

    slopes_degrees = []

    for latitude, longitude, elevation in zip(
        latitudes,
        longitudes,
        elevations
    ):

        try:
            slope = calculate_local_slope(
                latitude,
                longitude,
                elevation
            )

            slopes_percent.append(
                slope["slope_percent"]
            )

            slopes_degrees.append(
                slope["slope_degrees"]
            )

        except Exception:
            # If one sample cannot calculate slope,
            # continue with the remaining samples.
            continue

    if slopes_percent:

        mean_slope_percent = (
            sum(slopes_percent)
            / len(slopes_percent)
        )

        max_slope_percent = max(
            slopes_percent
        )

        mean_slope_degrees = (
            sum(slopes_degrees)
            / len(slopes_degrees)
        )

        max_slope_degrees = max(
            slopes_degrees
        )

        slope_variability = (
            max_slope_percent
            - min(slopes_percent)
        )

    else:

        mean_slope_percent = None
        max_slope_percent = None
        mean_slope_degrees = None
        max_slope_degrees = None
        slope_variability = None

    return {
        "sample_count": len(points),

        "min_elevation_m": round(
            min_elevation,
            2
        ),

        "max_elevation_m": round(
            max_elevation,
            2
        ),

        "mean_elevation_m": round(
            mean_elevation,
            2
        ),

        "relief_m": round(
            relief,
            2
        ),

        "slope_sample_count": len(
            slopes_percent
        ),

        "mean_slope_percent": (
            round(
                mean_slope_percent,
                2
            )
            if mean_slope_percent is not None
            else None
        ),

        "max_slope_percent": (
            round(
                max_slope_percent,
                2
            )
            if max_slope_percent is not None
            else None
        ),

        "mean_slope_degrees": (
            round(
                mean_slope_degrees,
                2
            )
            if mean_slope_degrees is not None
            else None
        ),

        "max_slope_degrees": (
            round(
                max_slope_degrees,
                2
            )
            if max_slope_degrees is not None
            else None
        ),

        "slope_variability_percent": (
            round(
                slope_variability,
                2
            )
            if slope_variability is not None
            else None
        ),

        "sample_points": points,

        "elevations_m": elevations
    }