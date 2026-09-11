import os
import requests

try:
    from env_loader import load_env
    load_env()
except ImportError:
    try:
        from ..env_loader import load_env
        load_env()
    except Exception:
        pass



BHUVAN_LULC_API = (
    "https://bhuvan-app1.nrsc.gov.in/"
    "api/lulc250k/curl_lulc250k.php"
)

BHUVAN_LULC_TOKEN = os.getenv("BHUVAN_LULC_TOKEN")


SOURCE_CRS = "EPSG:7755"
TARGET_CRS = "EPSG:4326"

TRANSFORMER = Transformer.from_crs(
    SOURCE_CRS,
    TARGET_CRS,
    always_xy=True
)


def get_district_polygon_wkt(
    state_name: str,
    district_name: str
):
    """
    Get the actual district polygon from the
    government district GeoJSON and convert it
    to WGS84 WKT.
    
    Note: GeoJSON file has been removed. This function
    now returns None as polygon data is not available
    via the current geocoding API.
    """

    feature = get_district_by_name(
        state_name,
        district_name
    )

    if feature is None:
        # GeoJSON is no longer available
        return None

    geometry = feature.get("geometry")

    if not geometry:
        return None

    district_shape = shape(geometry)

    district_wgs84 = transform(
        TRANSFORMER.transform,
        district_shape
    )

    return district_wgs84.wkt


def get_lulc_aoi_statistics(
    state_name: str,
    district_name: str,
    year: str = "2024_25"
):
    """
    Get actual LULC 250K statistics for a
    district AOI from Bhuvan.
    
    Note: GeoJSON file has been removed, so polygon
    data is not available. This function now returns
    None as the Bhuvan API requires polygon boundaries.
    """

    if not BHUVAN_LULC_TOKEN:
        raise RuntimeError(
            "BHUVAN_LULC_TOKEN not found in .env"
        )

    polygon = get_district_polygon_wkt(
        state_name,
        district_name
    )

    if polygon is None:
        # GeoJSON is no longer available, cannot get polygon
        return None

    params = {
        "polygon": polygon,
        "year": year,
        "option": "json",
        "token": BHUVAN_LULC_TOKEN
    }

    response = requests.post(
        BHUVAN_LULC_API,
        params=params,
        headers={
            "Content-Type": "application/json"
        },
        timeout=60
    )

    response.raise_for_status()

    return {
        "status_code": response.status_code,
        "content_type": response.headers.get(
            "Content-Type"
        ),
        "text": response.text
    }