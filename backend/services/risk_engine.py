from __future__ import annotations

from typing import Any, Dict, Optional

RISK_THRESHOLDS = {
    "LOW": 30,
    "MODERATE": 55,
    "HIGH": 75,
    "CRITICAL": 90,
}


def safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def classify_risk(score: float) -> str:
    if score >= RISK_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    if score >= RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    if score >= RISK_THRESHOLDS["MODERATE"]:
        return "MODERATE"
    return "LOW"


def calculate_risk_score(
    rainfall_1h: float,
    rainfall_3h: float,
    rainfall_6h: float,
    rainfall_24h: float,
    slope_percent: Optional[float],
    elevation_m: Optional[float],
    relief_m: Optional[float],
    river_discharge: Optional[float],
    hydrology_status: Optional[str],
    historical_susceptibility: float,
    hilly_region: bool,
) -> float:
    rainfall_1h = safe_float(rainfall_1h, 0.0)
    rainfall_3h = safe_float(rainfall_3h, 0.0)
    rainfall_6h = safe_float(rainfall_6h, 0.0)
    rainfall_24h = safe_float(rainfall_24h, 0.0)
    slope_percent = safe_float(slope_percent, 0.0)
    elevation_m = safe_float(elevation_m, 0.0)
    relief_m = safe_float(relief_m, 0.0)
    river_discharge = safe_float(river_discharge, 0.0)
    historical_susceptibility = safe_float(historical_susceptibility, 0.0)

    weather_score = min(
        100,
        rainfall_1h * 8 + rainfall_3h * 4 + rainfall_6h * 2 + rainfall_24h,
    )

    terrain_score = min(100, slope_percent * 2.0)
    if hilly_region and elevation_m >= 1000:
        terrain_score += 10
    if relief_m and relief_m > 2000:
        terrain_score += 5

    river_score = min(100, river_discharge / 5.0) if river_discharge else 0.0
    if hydrology_status and str(hydrology_status).upper() == "STALE":
        river_score *= 0.25

    score = (
        0.45 * weather_score
        + 0.20 * min(100, terrain_score)
        + 0.15 * river_score
        + 0.20 * historical_susceptibility
    )
    return round(max(0.0, min(100.0, score)), 2)


def generate_risk_explanation(
    risk_level: str,
    hilly_region: bool,
    slope_percent: Optional[float],
    rainfall_24h: float,
    historical_susceptibility: float,
    hydrology_status: Optional[str],
    discharge_value: Optional[float],
) -> str:
    reasons = []
    slope_percent = safe_float(slope_percent, 0.0)
    rainfall_24h = safe_float(rainfall_24h, 0.0)
    historical_susceptibility = safe_float(historical_susceptibility, 0.0)
    discharge_value = safe_float(discharge_value, 0.0)

    if hilly_region and slope_percent >= 20:
        reasons.append("steep terrain")
    if rainfall_24h >= 10:
        reasons.append("recent rainfall accumulation")
    if historical_susceptibility >= 40:
        reasons.append("significant historical flood exposure")
    if hydrology_status and str(hydrology_status).upper() == "STALE":
        reasons.append("stale hydrology telemetry")
    elif discharge_value and discharge_value > 300:
        reasons.append("elevated river discharge")

    if not reasons:
        return (
            f"Risk is {risk_level.lower()} because the selected location is within a comparatively stable environment "
            "with no strong indicators of acute flash-flood escalation."
        )

    reason_clause = ", ".join(reasons[:-1]) + (" and " + reasons[-1] if len(reasons) > 1 else reasons[0])
    return (
        f"Risk is {risk_level.lower()} because the selected region has {reason_clause}."
    )
