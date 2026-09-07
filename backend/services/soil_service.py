import json
from pathlib import Path
from io import BytesIO

import requests
import numpy as np
import rasterio
from shapely.geometry import shape, Point
from pyproj import Transformer


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DISTRICT_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "india_districts.geojson"
)


# ============================================================
# SOILGRIDS WCS ENDPOINTS
# ============================================================

SOIL_WCS = {
    "clay": (
        "https://maps.isric.org/mapserv"
        "?map=/map/clay.map"
    ),
    "sand": (
        "https://maps.isric.org/mapserv"
        "?map=/map/sand.map"
    ),
    "silt": (
        "https://maps.isric.org/mapserv"
        "?map=/map/silt.map"
    ),
}


# ============================================================
# SOILGRIDS COVERAGES
# ============================================================

SOIL_COVERAGES = {
    "clay": "clay_0-5cm_mean",
    "sand": "sand_0-5cm_mean",
    "silt": "silt_0-5cm_mean",
}


# SoilGrids percentage properties use a scale factor of 10.
SCALE_FACTOR = 10.0


# ============================================================
# SETTINGS
# ============================================================

MAX_POINTS = 8

# Approximately 0.03 degree area around each point
POINT_BUFFER = 0.03


# ============================================================
# LOAD DISTRICT DATA
# ============================================================

def load_district_data():
    """
    Load actual India district boundary GeoJSON.
    """

    if not DISTRICT_FILE.exists():
        raise FileNotFoundError(
            f"District dataset not found: {DISTRICT_FILE}"
        )

    with open(
        DISTRICT_FILE,
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


# ============================================================
# FIND DISTRICT
# ============================================================

def get_district_feature(
    state_name,
    district_name
):
    """
    Find a district using actual GeoJSON attributes.
    """

    data = load_district_data()

    requested_state = (
        state_name.strip().casefold()
    )

    requested_district = (
        district_name.strip().casefold()
    )

    for feature in data.get("features", []):

        properties = feature.get(
            "properties",
            {}
        )

        dataset_state = properties.get(
            "state_name"
        )

        dataset_district = properties.get(
            "district"
        )

        if not dataset_state or not dataset_district:
            continue

        if (
            dataset_state.strip().casefold()
            == requested_state
            and
            dataset_district.strip().casefold()
            == requested_district
        ):
            return feature

    return None


# ============================================================
# GENERATE ACTUAL SAMPLE POINTS
# ============================================================

def generate_sample_points(
    state_name,
    district_name,
    max_points=MAX_POINTS
):
    """
    Generate sample points inside the actual
    district polygon.

    No location is hardcoded.
    """

    feature = get_district_feature(
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
            "District geometry not available."
        )

    district_shape = shape(geometry)

    # --------------------------------------------------------
    # District GeoJSON CRS:
    # EPSG:7755
    #
    # SoilGrids requires WGS84:
    # EPSG:4326
    # --------------------------------------------------------

    transformer = Transformer.from_crs(
        "EPSG:7755",
        "EPSG:4326",
        always_xy=True
    )

    # Representative point is guaranteed
    # to lie inside the polygon.
    representative = (
        district_shape.representative_point()
    )

    rep_lon, rep_lat = transformer.transform(
        representative.x,
        representative.y
    )

    points = [
        (rep_lat, rep_lon)
    ]

    # --------------------------------------------------------
    # Generate additional points from
    # district bounding box.
    # --------------------------------------------------------

    minx, miny, maxx, maxy = (
        district_shape.bounds
    )

    xs = np.linspace(
        minx,
        maxx,
        5
    )

    ys = np.linspace(
        miny,
        maxy,
        5
    )

    for x in xs:

        for y in ys:

            point = Point(x, y)

            if district_shape.contains(point):

                lon, lat = transformer.transform(
                    x,
                    y
                )

                candidate = (
                    round(lat, 7),
                    round(lon, 7)
                )

                if candidate not in points:

                    points.append(candidate)

                if len(points) >= max_points:
                    return points

    return points


# ============================================================
# DOWNLOAD SOILGRIDS RASTER
# ============================================================

def get_soil_raster(
    latitude,
    longitude,
    coverage,
    property_name
):
    """
    Download a small actual SoilGrids GeoTIFF
    around a latitude/longitude point.
    """

    if property_name not in SOIL_WCS:
        raise ValueError(
            f"Unsupported soil property: "
            f"{property_name}"
        )

    wcs_url = SOIL_WCS[property_name]

    delta = POINT_BUFFER

    params = [
        (
            "SERVICE",
            "WCS"
        ),
        (
            "VERSION",
            "2.0.1"
        ),
        (
            "REQUEST",
            "GetCoverage"
        ),
        (
            "COVERAGEID",
            coverage
        ),
        (
            "FORMAT",
            "GEOTIFF_INT16"
        ),
        (
            "SUBSET",
            f"X({longitude - delta},"
            f"{longitude + delta})"
        ),
        (
            "SUBSET",
            f"Y({latitude - delta},"
            f"{latitude + delta})"
        ),
        (
            "SUBSETTINGCRS",
            "http://www.opengis.net/"
            "def/crs/EPSG/0/4326"
        ),
        (
            "OUTPUTCRS",
            "http://www.opengis.net/"
            "def/crs/EPSG/0/4326"
        ),
    ]

    response = requests.get(
        wcs_url,
        params=params,
        timeout=60
    )

    response.raise_for_status()

    if not response.content:
        raise RuntimeError(
            "SoilGrids returned empty response."
        )

    # Make sure server actually returned
    # a TIFF and not an error page.
    content_type = (
        response.headers
        .get("Content-Type", "")
        .lower()
    )

    if (
        "tiff" not in content_type
        and "geotiff" not in content_type
    ):
        raise RuntimeError(
            "SoilGrids did not return a GeoTIFF. "
            f"Content-Type: {content_type}"
        )

    return response.content


# ============================================================
# READ RASTER
# ============================================================

def extract_mean_value(
    raster_bytes
):
    """
    Read GeoTIFF and calculate mean
    valid raw SoilGrids value.
    """

    with rasterio.MemoryFile(
        raster_bytes
    ) as memfile:

        with memfile.open() as dataset:

            data = dataset.read(
                1
            ).astype(float)

            nodata = dataset.nodata

            if nodata is not None:
                data[
                    data == nodata
                ] = np.nan

            # Remove invalid values
            data[
                data <= 0
            ] = np.nan

            if np.all(
                np.isnan(data)
            ):
                return None

            return float(
                np.nanmean(data)
            )


# ============================================================
# GET SOIL FOR ONE LOCATION
# ============================================================

def get_soil_for_location(
    latitude,
    longitude
):
    """
    Get actual SoilGrids clay, sand and silt
    for one location.
    """

    result = {}

    for (
        property_name,
        coverage
    ) in SOIL_COVERAGES.items():

        try:

            raster_bytes = (
                get_soil_raster(
                    latitude,
                    longitude,
                    coverage,
                    property_name
                )
            )

            raw_mean = (
                extract_mean_value(
                    raster_bytes
                )
            )

            if raw_mean is None:

                result[property_name] = None

            else:

                # SoilGrids scale conversion
                converted_value = (
                    raw_mean / SCALE_FACTOR
                )

                result[property_name] = round(
                    converted_value,
                    2
                )

        except Exception as error:

            print(
                f"SoilGrids error for "
                f"{property_name}: {error}"
            )

            result[property_name] = None

    return result


# ============================================================
# GET SOIL FOR COMPLETE DISTRICT
# ============================================================

def get_district_soil(
    state_name,
    district_name
):
    """
    Calculate district-level soil statistics
    from actual SoilGrids data.
    """

    # --------------------------------------------------------
    # Generate points dynamically from
    # actual district geometry.
    # --------------------------------------------------------

    points = generate_sample_points(
        state_name,
        district_name
    )

    collected = {
        "clay": [],
        "sand": [],
        "silt": []
    }

    successful_points = 0

    # --------------------------------------------------------
    # Query SoilGrids at each point
    # --------------------------------------------------------

    for index, (
        latitude,
        longitude
    ) in enumerate(
        points,
        start=1
    ):

        print(
            f"Sampling soil point "
            f"{index}/{len(points)}: "
            f"{latitude:.5f}, "
            f"{longitude:.5f}"
        )

        soil = get_soil_for_location(
            latitude,
            longitude
        )

        point_success = False

        for property_name in collected:

            value = soil.get(
                property_name
            )

            if value is not None:

                collected[
                    property_name
                ].append(value)

                point_success = True

        if point_success:
            successful_points += 1

    # --------------------------------------------------------
    # Calculate statistics
    # --------------------------------------------------------

    summary = {}

    for (
        property_name,
        values
    ) in collected.items():

        if values:

            summary[property_name] = {

                "mean_percent": round(
                    float(
                        np.mean(values)
                    ),
                    2
                ),

                "median_percent": round(
                    float(
                        np.median(values)
                    ),
                    2
                ),

                "min_percent": round(
                    float(
                        np.min(values)
                    ),
                    2
                ),

                "max_percent": round(
                    float(
                        np.max(values)
                    ),
                    2
                ),

                "sample_count": len(
                    values
                )
            }

        else:

            summary[property_name] = {

                "mean_percent": None,

                "median_percent": None,

                "min_percent": None,

                "max_percent": None,

                "sample_count": 0
            }

    # --------------------------------------------------------
    # Final result
    # --------------------------------------------------------

    return {

        "state": state_name,

        "district": district_name,

        "sample_points": len(points),

        "successful_points": (
            successful_points
        ),

        "properties": summary
    }