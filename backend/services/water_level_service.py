import csv
import math
from datetime import datetime

from services.hydrology_sources import get_available_sources


WATER_LEVEL_COLUMN = (
    "River Water Level Telemetry Hourly (meter)"
)

# Maximum distance from selected location to station
MAX_STATION_DISTANCE_KM = 100.0

# Data older than this is marked STALE
MAX_DATA_AGE_HOURS = 24.0


def calculate_distance_km(lat1, lon1, lat2, lon2):
    earth_radius = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius * c


def parse_datetime(value):
    if not value:
        return None

    try:
        return datetime.strptime(
            value.strip(),
            "%d-%m-%Y %H:%M"
        )
    except ValueError:
        return None


def find_nearest_water_level_station(
    latitude,
    longitude,
    state_name=None
):
    # =================================================
    # 1. Get water-level source from registry
    # =================================================

    sources = get_available_sources(
        "water_level",
        state_name
    )

    if not sources:
        raise RuntimeError(
            f"No water-level data source available "
            f"for state: {state_name}"
        )

    # First compatible real source
    source = sources[0]

    water_level_file = source["file"]

    if not water_level_file.exists():
        raise FileNotFoundError(
            f"Water-level dataset not found: "
            f"{water_level_file}"
        )

    nearest_station = None
    nearest_distance = float("inf")

    # =================================================
    # 2. Find nearest compatible station
    # =================================================

    with open(
        water_level_file,
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

            # Additional state safety check
            if state_name:
                if (
                    station_state.casefold()
                    != state_name.strip().casefold()
                ):
                    continue

            try:
                station_lat = float(
                    row["Latitude"]
                )

                station_lon = float(
                    row["Longitude"]
                )

            except (ValueError, TypeError):
                continue

            distance = calculate_distance_km(
                latitude,
                longitude,
                station_lat,
                station_lon
            )

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

    if nearest_station is None:
        raise RuntimeError(
            "No compatible water-level station found"
        )

    # =================================================
    # 3. Distance validation
    # =================================================

    if nearest_distance > MAX_STATION_DISTANCE_KM:
        raise RuntimeError(
            f"Nearest water-level station is too far: "
            f"{nearest_distance:.2f} km"
        )

    # =================================================
    # 4. Find latest record
    # =================================================

    latest_record = None
    latest_time = None

    with open(
        water_level_file,
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

            timestamp = parse_datetime(
                row.get("Data Acquisition Time")
            )

            if timestamp is None:
                continue

            if (
                latest_time is None
                or timestamp > latest_time
            ):

                latest_time = timestamp

                water_level_value = row.get(
                    WATER_LEVEL_COLUMN
                )

                try:
                    water_level = float(
                        water_level_value
                    )
                except (ValueError, TypeError):
                    water_level = None

                # -------------------------------------
                # Data freshness
                # -------------------------------------

                now = datetime.now()

                data_age_hours = (
                    now - timestamp
                ).total_seconds() / 3600.0

                data_status = (
                    "FRESH"
                    if data_age_hours <= MAX_DATA_AGE_HOURS
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
                    "water_level": water_level,
                    "zero_gauge_rl": row.get(
                        "RL_of_zeroGauge"
                    ),
                    "mean_sea_level": row.get(
                        "MeanSeaLevel"
                    ),
                    "discharge_available": row.get(
                        "Is_DischargeDataAvailable"
                    ),
                    "data_age_hours": round(
                        data_age_hours,
                        2
                    ),
                    "data_status": data_status
                }

    if latest_record is None:
        raise RuntimeError(
            "No water-level record found "
            "for nearest station"
        )

    return {
        "source_name": source["name"],
        "source_state": source["state"],
        "nearest_station": nearest_station,
        "distance_km": nearest_distance,
        "latest_record": latest_record
    }