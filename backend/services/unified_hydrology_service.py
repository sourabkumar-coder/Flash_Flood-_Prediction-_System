from services.hydrology_service import find_nearest_discharge_station
from services.water_level_service import find_nearest_water_level_station


def get_hydrology_features(
    latitude,
    longitude,
    state_name=None
):
    """
    Collect available hydrology information for a location.

    Discharge and water level are treated as independent sources.
    Missing sources are represented as None, not zero.
    """

    result = {
        "discharge": None,
        "discharge_station": None,
        "discharge_distance_km": None,
        "discharge_timestamp": None,
        "discharge_data_age_hours": None,
        "discharge_data_status": None,

        "water_level": None,
        "water_level_station": None,
        "water_level_distance_km": None,
        "water_level_timestamp": None,

        "water_level_data_age_hours": None,
        "water_level_data_status": None,    
    }

    # -------------------------------------------------
    # 1. River discharge
    # -------------------------------------------------

    try:
        discharge_result = find_nearest_discharge_station(
            latitude,
            longitude,
            state_name
        )

        discharge_station = discharge_result["nearest_station"]
        discharge_record = discharge_result["latest_record"]

        result["discharge"] = discharge_record["discharge"]

        result["discharge_station"] = (
            discharge_station["station"]
        )

        result["discharge_distance_km"] = round(
            discharge_result["distance_km"],
            2
        )

        result["discharge_timestamp"] = (
            discharge_record["timestamp"]
        )

        result["discharge_data_age_hours"] = (
             discharge_record["data_age_hours"]
        )

        result["discharge_data_status"] = (
            discharge_record["data_status"]
        )
     

    except (FileNotFoundError, RuntimeError):
        pass

    # -------------------------------------------------
    # 2. River water level
    # -------------------------------------------------

    try:
        water_level_result = (
            find_nearest_water_level_station(
                latitude,
                longitude,
                state_name
            )
        )

        water_level_station = (
            water_level_result["nearest_station"]
        )

        water_level_record = (
            water_level_result["latest_record"]
        )

        result["water_level"] = (
            water_level_record["water_level"]
        )

        result["water_level_station"] = (
            water_level_station["station"]
        )

        result["water_level_distance_km"] = round(
            water_level_result["distance_km"],
            2
        )

        result["water_level_timestamp"] = (
            water_level_record["timestamp"]
        )

        result["water_level_data_age_hours"] = (
             water_level_record["data_age_hours"]
        )

        result["water_level_data_status"] = (
             water_level_record["data_status"]
        )

    except (FileNotFoundError, RuntimeError):
        pass

    return result