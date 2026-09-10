"""
Open-Meteo Flood API Service (GloFAS v4 Seamless)
=================================================
Fetches real-time, historical, and forecast river discharge (m³/s)
from the GloFAS v4 Seamless model via Open-Meteo Flood API.

API endpoint: https://flood-api.open-meteo.com/v1/flood
- 5 km resolution globally
- GloFAS v4 Seamless model
- Past days (30 days historical) + Forecast days (30 days forecast)
- Daily variables: river_discharge, mean, max, min, p25 (25th percentile), p75 (75th percentile)
"""

import requests
from datetime import datetime, timezone


FLOOD_API_URL = "https://flood-api.open-meteo.com/v1/flood"

PAST_DAYS = 30
FORECAST_DAYS = 30


def safe_float(value, default=None):
    """Safely convert a value to float."""
    if value is None:
        return default
    try:
        f = float(value)
        return round(f, 3)
    except (TypeError, ValueError):
        return default


def get_river_discharge(latitude, longitude):
    """
    Fetch GloFAS v4 Seamless river discharge including:
    - Current discharge
    - Historical (past 30 days) and forecast (next 30 days)
    - Mean, Max, Min, 25th percentile (p25), 75th percentile (p75)
    - Full time-series arrays for interactive charting
    """

    result = {
        "discharge": None,
        "discharge_mean": None,
        "discharge_max": None,
        "discharge_min": None,
        "discharge_p25": None,
        "discharge_p75": None,
        "discharge_max_7d": None,
        "discharge_avg_7d": None,
        "discharge_forecast_7d": None,
        "discharge_timestamp": None,
        "discharge_data_status": "UNAVAILABLE",
        "data_source": "Open-Meteo GloFAS v4 Seamless Flood API",
        "model_name": "GloFAS v4 Seamless",
        "station": f"GloFAS v4 Grid ({latitude:.4f}°N, {longitude:.4f}°E)",
        "distance_km": None,
        "time_series": {
            "dates": [],
            "discharge": [],
            "mean": [],
            "max": [],
            "min": [],
            "p25": [],
            "p75": [],
        },
    }

    try:
        # Primary call: GloFAS v4 with full ensemble stats
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": [
                "river_discharge",
                "river_discharge_mean",
                "river_discharge_max",
                "river_discharge_min",
                "river_discharge_p25",
                "river_discharge_p75",
            ],
            "models": "glofas_v4_seamless",
            "past_days": PAST_DAYS,
            "forecast_days": FORECAST_DAYS,
            "timezone": "UTC",
        }

        response = requests.get(
            FLOOD_API_URL,
            params=params,
            timeout=15,
        )

        # Fallback without explicit models param if endpoint prefers default
        if response.status_code != 200:
            params.pop("models", None)
            response = requests.get(
                FLOOD_API_URL,
                params=params,
                timeout=15,
            )

        response.raise_for_status()
        data = response.json()

        daily = data.get("daily", {})
        times = daily.get("time", [])

        if not times:
            return result

        raw_discharge = daily.get("river_discharge") or []
        raw_mean = daily.get("river_discharge_mean") or raw_discharge
        raw_max = daily.get("river_discharge_max") or raw_discharge
        raw_min = daily.get("river_discharge_min") or raw_discharge
        raw_p25 = daily.get("river_discharge_p25") or raw_discharge
        raw_p75 = daily.get("river_discharge_p75") or raw_discharge

        dates = []
        series_discharge = []
        series_mean = []
        series_max = []
        series_min = []
        series_p25 = []
        series_p75 = []

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        past_values = []
        forecast_values = []

        for idx, t in enumerate(times):
            d_val = safe_float(raw_discharge[idx]) if idx < len(raw_discharge) else None
            m_val = safe_float(raw_mean[idx]) if idx < len(raw_mean) else d_val
            mx_val = safe_float(raw_max[idx]) if idx < len(raw_max) else d_val
            mn_val = safe_float(raw_min[idx]) if idx < len(raw_min) else d_val
            p25_val = safe_float(raw_p25[idx]) if idx < len(raw_p25) else d_val
            p75_val = safe_float(raw_p75[idx]) if idx < len(raw_p75) else d_val

            # Fallback if specific discharge is None but mean exists
            final_d = d_val if d_val is not None else m_val

            dates.append(t)
            series_discharge.append(final_d)
            series_mean.append(m_val)
            series_max.append(mx_val)
            series_min.append(mn_val)
            series_p25.append(p25_val)
            series_p75.append(p75_val)

            if t <= today_str:
                if final_d is not None:
                    past_values.append((t, final_d))
            else:
                forecast_values.append(final_d)

        result["time_series"] = {
            "dates": dates,
            "discharge": series_discharge,
            "mean": series_mean,
            "max": series_max,
            "min": series_min,
            "p25": series_p25,
            "p75": series_p75,
        }

        # Latest current reading = most recent past value or first forecast
        if past_values:
            latest_time, latest_discharge = past_values[-1]
            result["discharge"] = latest_discharge
            result["discharge_timestamp"] = latest_time
            result["discharge_data_status"] = "LIVE"
            idx_latest = times.index(latest_time) if latest_time in times else -1
            if idx_latest != -1:
                result["discharge_mean"] = series_mean[idx_latest]
                result["discharge_max"] = series_max[idx_latest]
                result["discharge_min"] = series_min[idx_latest]
                result["discharge_p25"] = series_p25[idx_latest]
                result["discharge_p75"] = series_p75[idx_latest]
        elif series_discharge and series_discharge[0] is not None:
            result["discharge"] = series_discharge[0]
            result["discharge_timestamp"] = dates[0]
            result["discharge_data_status"] = "LIVE"
            result["discharge_mean"] = series_mean[0]
            result["discharge_max"] = series_max[0]
            result["discharge_min"] = series_min[0]
            result["discharge_p25"] = series_p25[0]
            result["discharge_p75"] = series_p75[0]

        # Statistics over recent past 7 days
        recent_7d = [v for _, v in past_values[-7:]] if past_values else []
        if recent_7d:
            result["discharge_max_7d"] = round(max(recent_7d), 2)
            result["discharge_avg_7d"] = round(sum(recent_7d) / len(recent_7d), 2)

        # Next 7-day forecast
        result["discharge_forecast_7d"] = [
            round(v, 2) if v is not None else None
            for v in forecast_values[:7]
        ]

    except Exception:
        # Gracefully handle API timeout / errors
        pass

    return result

