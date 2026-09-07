import csv
import math
from datetime import datetime

from services.hydrology_sources import get_available_sources


# ============================================================
# HELPER
# ============================================================

def to_float(value):
    """
    Safely convert CSV/API values to float.
    Returns None when conversion is not possible.
    """

    if value is None:
        return None

    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return None


# ============================================================
# SETTINGS
# ============================================================

DISCHARGE_COLUMN = (
    "Telemetry Hourly River Water Discharge (m3/sec)"
)

# Maximum distance from selected district location
# to nearest telemetry station.
MAX_STATION_DISTANCE_KM = 100.0

# Data older than this is marked STALE.
MAX_DATA_AGE_HOURS = 24.0


# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance_km(
    lat1,
    lon1,
    lat2,
    lon2
):
    """
    Calculate distance between two coordinates
    using the Haversine formula.
    """

    # Convert everything to numeric values.
    lat1 = to_float(lat1)
    lon1 = to_float(lon1)
    lat2 = to_float(lat2)
    lon2 = to_float(lon2)

    if None in (
        lat1,
        lon1,
        lat2,
        lon2
    ):
        return None

    earth_radius = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(
        lat2 - lat1
    )

    delta_lon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        +
        math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius * c


# ============================================================
# DATETIME
# ============================================================

def parse_datetime(value):
    """
    Convert telemetry timestamp into datetime.
    """

    if not value:
        return None

    try:
        return datetime.strptime(
            str(value).strip(),
            "%d-%m-%Y %H:%M"
        )

    except ValueError:
        return None


# ============================================================
# FIND NEAREST DISCHARGE STATION
# ============================================================

def find_nearest_discharge_station(
    latitude,
    longitude,
    state_name=None
):
    """
    Find the nearest actual river discharge
    telemetry station for the selected location.
    """

    # --------------------------------------------------------
    # Convert selected location to float
    # --------------------------------------------------------

    latitude = to_float(latitude)
    longitude = to_float(longitude)

    if latitude is None or longitude is None:
        raise ValueError(
            "Invalid latitude/longitude provided."
        )

    # ========================================================
    # 1. GET DISCHARGE SOURCE
    # ========================================================

    sources = get_available_sources(
        "discharge",
        state_name
    )

    if not sources:
        raise RuntimeError(
            f"No discharge data source available "
            f"for state: {state_name}"
        )

    # Currently use first compatible source.
    source = sources[0]

    hydrology_file = source["file"]

    if not hydrology_file.exists():
        raise FileNotFoundError(
            f"Discharge dataset not found: "
            f"{hydrology_file}"
        )

    nearest_station = None
    nearest_distance = float("inf")

    # ========================================================
    # 2. FIND NEAREST STATION
    # ========================================================

    with open(
        hydrology_file,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            station = row.get(
                "Station",
                ""
            ).strip()

            station_state = row.get(
                "State",
                ""
            ).strip()

            if not station:
                continue

            # ------------------------------------------------
            # State safety check
            # ------------------------------------------------

            if state_name:

                if (
                    station_state.casefold()
                    != state_name.strip().casefold()
                ):
                    continue

            # ------------------------------------------------
            # Station coordinates
            # ------------------------------------------------

            station_lat = to_float(
                row.get("Latitude")
            )

            station_lon = to_float(
                row.get("Longitude")
            )

            if (
                station_lat is None
                or station_lon is None
            ):
                continue

            # ------------------------------------------------
            # Calculate distance
            # ------------------------------------------------

            distance = calculate_distance_km(
                latitude,
                longitude,
                station_lat,
                station_lon
            )

            if distance is None:
                continue

            # ------------------------------------------------
            # Keep nearest station
            # ------------------------------------------------

            if distance < nearest_distance:

                nearest_distance = distance

                nearest_station = {
                    "station": station,

                    "state": station_state,

                    "district": row.get(
                        "District",
                        ""
                    ).strip(),

                    "river": row.get(
                        "River",
                        ""
                    ).strip(),

                    "latitude": station_lat,

                    "longitude": station_lon
                }

    # ========================================================
    # VALIDATION
    # ========================================================

    if nearest_station is None:
        raise RuntimeError(
            "No compatible discharge station found."
        )

    if nearest_distance > MAX_STATION_DISTANCE_KM:
        raise RuntimeError(
            f"Nearest discharge station is too far: "
            f"{nearest_distance:.2f} km"
        )

    # ========================================================
    # 3. FIND LATEST RECORD
    # ========================================================

    latest_record = None
    latest_time = None

    with open(
        hydrology_file,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            station = row.get(
                "Station",
                ""
            ).strip()

            if station != nearest_station["station"]:
                continue

            # ------------------------------------------------
            # Parse timestamp
            # ------------------------------------------------

            timestamp = parse_datetime(
                row.get(
                    "Data Acquisition Time"
                )
            )

            if timestamp is None:
                continue

            # ------------------------------------------------
            # Keep latest record
            # ------------------------------------------------

            if (
                latest_time is None
                or timestamp > latest_time
            ):

                latest_time = timestamp

                discharge = to_float(
                    row.get(
                        DISCHARGE_COLUMN
                    )
                )

                # ------------------------------------------------
                # Data freshness
                # ------------------------------------------------

                now = datetime.now()

                data_age_hours = (
                    now - timestamp
                ).total_seconds() / 3600.0

                data_status = (
                    "FRESH"
                    if data_age_hours
                    <= MAX_DATA_AGE_HOURS
                    else "STALE"
                )

                latest_record = {

                    "station": station,

                    "state": row.get(
                        "State",
                        ""
                    ).strip(),

                    "district": row.get(
                        "District",
                        ""
                    ).strip(),

                    "river": row.get(
                        "River",
                        ""
                    ).strip(),

                    "latitude": nearest_station[
                        "latitude"
                    ],

                    "longitude": nearest_station[
                        "longitude"
                    ],

                    "timestamp": timestamp,

                    "discharge": discharge,

                    "data_age_hours": round(
                        data_age_hours,
                        2
                    ),

                    "data_status": data_status
                }

    # ========================================================
    # VALIDATE LATEST RECORD
    # ========================================================

    if latest_record is None:
        raise RuntimeError(
            "No discharge record found "
            "for nearest station."
        )

    # ========================================================
    # 4. RETURN RESULT
    # ========================================================

    return {

        "source_name": source["name"],

        "source_state": source["state"],

        "nearest_station": nearest_station,

        "distance_km": round(
            nearest_distance,
            2
        ),

        "latest_record": latest_record
    }