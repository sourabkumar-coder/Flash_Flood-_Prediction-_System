from services.district_service import get_district_by_name
from services.elevation_service import get_elevations

from shapely.geometry import shape, Point
from pyproj import Transformer

import math


# District GeoJSON → WGS84
TRANSFORMER = Transformer.from_crs(
    "EPSG:7755",
    "EPSG:4326",
    always_xy=True
)


def get_district_geometry(state_name, district_name):
    """
    Get actual district geometry from GeoJSON.
    """

    feature = get_district_by_name(
        state_name,
        district_name
    )

    if feature is None:
        raise ValueError(
            f"District not found: "
            f"{district_name}, {state_name}"
        )

    geometry = feature.get("geometry")

    if not geometry:
        raise ValueError(
            "District geometry not available"
        )

    return shape(geometry)


def generate_sample_points(
    state_name,
    district_name,
    grid_size=5
):
    """
    Generate sample points inside the actual
    district polygon.
    """

    district_shape = get_district_geometry(
        state_name,
        district_name
    )

    from shapely.ops import transform

    district_wgs84 = transform(
        TRANSFORMER.transform,
        district_shape
    )

    min_lon, min_lat, max_lon, max_lat = (
        district_wgs84.bounds
    )

    points = []

    if grid_size < 2:
        raise ValueError(
            "grid_size must be at least 2"
        )

    for row in range(grid_size):

        lat = (
            min_lat
            + row
            * (max_lat - min_lat)
            / (grid_size - 1)
        )

        for col in range(grid_size):

            lon = (
                min_lon
                + col
                * (max_lon - min_lon)
                / (grid_size - 1)
            )

            point = Point(
                lon,
                lat
            )

            if district_wgs84.contains(point):
                points.append(
                    (lat, lon)
                )

    if not points:

        centroid = district_wgs84.centroid

        points.append(
            (
                centroid.y,
                centroid.x
            )
        )

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
    grid_size=5
):
    """
    Calculate elevation and slope statistics
    for the selected district.
    """

    points = generate_sample_points(
        state_name,
        district_name,
        grid_size
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