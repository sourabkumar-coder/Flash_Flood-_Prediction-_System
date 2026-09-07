"""
Unified Hydrology Service
==========================
Collects discharge and water level from multiple sources with fallback.

Priority:
  1. Open-Meteo GloFAS Flood API  — global, always-available, real-time
  2. CWC/NWIC telemetry CSV       — state-specific fallback (HP, Manipur)

Water level:
  Derived from GloFAS discharge using a simple power-law rating curve
  when no physical gauge station is available.
"""

from services.flood_api_service import get_river_discharge
from services.hydrology_service import find_nearest_discharge_station
from services.water_level_service import find_nearest_water_level_station


# ---------------------------------------------------------------------------
# Simple power-law rating curve: h = a * Q^b
# Coefficients are generic estimates for medium Indian rivers.
# Q in m3/s -> h in metres above arbitrary datum.
# ---------------------------------------------------------------------------
_RATING_A = 0.5
_RATING_B = 0.4


def _discharge_to_water_level(discharge_m3s):
    """Estimate water level (m) from discharge using a power-law rating curve."""
    if discharge_m3s is None or discharge_m3s <= 0:
        return None
    try:
        return round(_RATING_A * (discharge_m3s ** _RATING_B), 2)
    except (TypeError, ValueError):
        return None


def get_hydrology_features(
    latitude,
    longitude,
    state_name=None
):
    """
    Collect available hydrology information for a location.

    Discharge and water level are treated as independent sources.
    Missing sources are represented as None, not zero.

    Returns
    -------
    dict with all discharge and water_level fields populated
    from the best available source.
    """

    result = {
        "discharge": None,
        "discharge_mean": None,
        "discharge_max": None,
        "discharge_min": None,
        "discharge_p25": None,
        "discharge_p75": None,
        "discharge_station": None,
        "discharge_distance_km": None,
        "discharge_timestamp": None,
        "discharge_data_age_hours": None,
        "discharge_data_status": None,
        "discharge_max_7d": None,
        "discharge_avg_7d": None,
        "discharge_forecast_7d": None,
        "discharge_source": None,
        "model_name": None,
        "time_series": None,

        "water_level": None,
        "water_level_station": None,
        "water_level_distance_km": None,
        "water_level_timestamp": None,
        "water_level_data_age_hours": None,
        "water_level_data_status": None,
    }

    # ==================================================================
    # 1. RIVER DISCHARGE — Open-Meteo GloFAS v4 (primary, global)
    # ==================================================================
    try:
        glofas = get_river_discharge(latitude, longitude)

        if glofas.get("discharge_data_status") == "LIVE":
            result["discharge"] = glofas["discharge"]
            result["discharge_mean"] = glofas.get("discharge_mean")
            result["discharge_max"] = glofas.get("discharge_max")
            result["discharge_min"] = glofas.get("discharge_min")
            result["discharge_p25"] = glofas.get("discharge_p25")
            result["discharge_p75"] = glofas.get("discharge_p75")
            result["discharge_station"] = glofas["station"]
            result["discharge_distance_km"] = None   # grid-based
            result["discharge_timestamp"] = glofas["discharge_timestamp"]
            result["discharge_data_age_hours"] = None  # daily model, always fresh
            result["discharge_data_status"] = "LIVE"
            result["discharge_max_7d"] = glofas.get("discharge_max_7d")
            result["discharge_avg_7d"] = glofas.get("discharge_avg_7d")
            result["discharge_forecast_7d"] = glofas.get("discharge_forecast_7d")
            result["discharge_source"] = glofas.get("data_source", "Open-Meteo GloFAS v4 Seamless Flood API")
            result["model_name"] = glofas.get("model_name", "GloFAS v4 Seamless")
            result["time_series"] = glofas.get("time_series")

    except Exception:
        pass  # fall through to CSV fallback

    # ==================================================================
    # 2. RIVER DISCHARGE — CWC/NWIC CSV (fallback for HP / Manipur)
    # ==================================================================
    if result["discharge"] is None:
        try:
            discharge_result = find_nearest_discharge_station(
                latitude,
                longitude,
                state_name
            )

            discharge_station = discharge_result["nearest_station"]
            discharge_record = discharge_result["latest_record"]

            result["discharge"] = discharge_record["discharge"]
            result["discharge_station"] = discharge_station["station"]
            result["discharge_distance_km"] = round(
                discharge_result["distance_km"], 2
            )
            result["discharge_timestamp"] = discharge_record["timestamp"]
            result["discharge_data_age_hours"] = discharge_record["data_age_hours"]
            result["discharge_data_status"] = discharge_record["data_status"]
            result["discharge_source"] = discharge_result["source_name"]

        except (FileNotFoundError, RuntimeError):
            pass

    # ==================================================================
    # 3. WATER LEVEL — CWC/NWIC gauge (primary for states with data)
    # ==================================================================
    try:
        water_level_result = find_nearest_water_level_station(
            latitude,
            longitude,
            state_name
        )

        water_level_station = water_level_result["nearest_station"]
        water_level_record = water_level_result["latest_record"]

        result["water_level"] = water_level_record["water_level"]
        result["water_level_station"] = water_level_station["station"]
        result["water_level_distance_km"] = round(
            water_level_result["distance_km"], 2
        )
        result["water_level_timestamp"] = water_level_record["timestamp"]
        result["water_level_data_age_hours"] = water_level_record["data_age_hours"]
        result["water_level_data_status"] = water_level_record["data_status"]

    except (FileNotFoundError, RuntimeError):
        pass

    # ==================================================================
    # 4. WATER LEVEL — Derived from GloFAS discharge (fallback)
    #    When no physical gauge data available, estimate using
    #    power-law rating curve: h = 0.5 * Q^0.4
    # ==================================================================
    if result["water_level"] is None and result["discharge"] is not None:
        estimated_wl = _discharge_to_water_level(result["discharge"])
        if estimated_wl is not None:
            result["water_level"] = estimated_wl
            result["water_level_station"] = "Estimated from GloFAS discharge"
            result["water_level_distance_km"] = None
            result["water_level_timestamp"] = result["discharge_timestamp"]
            result["water_level_data_age_hours"] = None
            result["water_level_data_status"] = "ESTIMATED"

    return result
