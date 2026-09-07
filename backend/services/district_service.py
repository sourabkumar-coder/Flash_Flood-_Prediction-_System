import json
from pathlib import Path

from shapely.geometry import shape
from pyproj import Transformer

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DISTRICT_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "india_districts.geojson"
)


def load_district_data():
    """
    Load the official district GeoJSON dataset.
    """

    if not DISTRICT_FILE.exists():
        raise FileNotFoundError(
            f"District dataset not found: {DISTRICT_FILE}"
        )

    with open(DISTRICT_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def get_all_districts():
    """
    Return all district features.
    """

    data = load_district_data()

    return data.get("features", [])


def get_states():
    """
    Return unique state names from the dataset.
    """

    features = get_all_districts()

    states = set()

    for feature in features:

        properties = feature.get("properties", {})

        state_name = properties.get("state_name")

        if state_name:
            states.add(state_name.strip())

    return sorted(states)


def get_districts_by_state(state_name):
    """
    Return districts for the requested state.

    Matching is case-insensitive and whitespace-safe.
    """

    if not state_name:
        return []

    requested_state = state_name.strip().casefold()

    features = get_all_districts()

    districts = set()

    for feature in features:

        properties = feature.get("properties", {})

        dataset_state = properties.get("state_name")
        district = properties.get("district")

        if not dataset_state or not district:
            continue

        if dataset_state.strip().casefold() == requested_state:
            districts.add(district.strip())

    return sorted(districts)

def get_district_by_name(state_name, district_name):
    """
    Find a specific district feature from the GeoJSON dataset.
    """

    requested_state = state_name.strip().casefold()
    requested_district = district_name.strip().casefold()

    for feature in get_all_districts():

        properties = feature.get("properties", {})

        dataset_state = properties.get("state_name")
        dataset_district = properties.get("district")

        if not dataset_state or not dataset_district:
            continue

        if (
            dataset_state.strip().casefold() == requested_state
            and
            dataset_district.strip().casefold() == requested_district
        ):
            return feature

    return None

def get_district_coordinates(state_name, district_name):
    """
    Get representative latitude and longitude
    for a selected district.

    The GeoJSON uses EPSG:7755.
    Coordinates are transformed to WGS84 (EPSG:4326).
    """

    feature = get_district_by_name(
        state_name,
        district_name
    )

    if feature is None:
        return None

    geometry = feature.get("geometry")

    if not geometry:
        return None

    # Convert GeoJSON geometry to Shapely geometry
    district_shape = shape(geometry)

    # EPSG:7755 -> EPSG:4326
    transformer = Transformer.from_crs(
        "EPSG:7755",
        "EPSG:4326",
        always_xy=True
    )

    centroid = district_shape.centroid

    longitude, latitude = transformer.transform(
        centroid.x,
        centroid.y
    )

    return {
        "state": feature["properties"].get("state_name"),
        "district": feature["properties"].get("district"),
        "latitude": latitude,
        "longitude": longitude
    }