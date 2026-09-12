import os
import pandas as pd

from services.district_service import (
    get_district_coordinates,
    reverse_geocode_coordinates
)

from services.weather_service import get_weather
from services.terrain_service import get_terrain_features
from services.unified_hydrology_service import get_hydrology_features
from services.soil_service import get_district_soil


# ============================================================
# HISTORICAL FLOOD DATA
# ============================================================

HISTORICAL_FEATURES_FILE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../../data/raw/flood_events/district_historical_features.csv"
    )
)


# ============================================================
# HELPER
# ============================================================

def first_value(data, *keys):
    """
    Return the first available value from a dictionary.
    """

    if not isinstance(data, dict):
        return None

    for key in keys:
        if key in data:
            return data[key]

    return None


def normalize_python_value(value):
    """Convert numpy/pandas scalar values to plain Python types."""
    if value is None:
        return None
    if hasattr(value, "item") and not isinstance(value, (str, bytes)):
        try:
            return value.item()
        except Exception:
            pass
    return value


def get_historical_features(state_name, district_name):
    """
    Retrieve historical flood risk indicators for a district.
    """
    if not os.path.exists(HISTORICAL_FEATURES_FILE):
        return {
            "historical_data_available": 0,
            "historical_flood_events": 0,
            "historical_flood_years": 0,
            "historical_fatalities": 0,
            "historical_displaced": 0,
            "historical_max_severity": 0.0,
            "historical_max_impact": 0.0,
        }

    try:
        df = pd.read_csv(HISTORICAL_FEATURES_FILE)

        req_state = state_name.strip().casefold() if state_name else ""
        req_district = district_name.strip().casefold() if district_name else ""

        match = df[
            (df["state_name"].astype(str).str.strip().str.casefold() == req_state)
            & (
                (df["district"].astype(str).str.strip().str.casefold() == req_district)
                | (df.get("district_name", df["district"]).astype(str).str.strip().str.casefold() == req_district)
            )
        ]

        if not match.empty:
            row = match.iloc[0]
            return {
                "historical_data_available": 1,
                "historical_flood_events": int(row.get("total_events", row.get("historical_flood_events", 0)) or 0),
                "historical_flood_years": int(row.get("flood_years_count", row.get("historical_flood_years", 0)) or 0),
                "historical_fatalities": int(row.get("total_fatalities", row.get("historical_fatalities", 0)) or 0),
                "historical_displaced": int(row.get("total_displaced", row.get("historical_displaced", 0)) or 0),
                "historical_max_severity": float(row.get("max_severity", row.get("historical_max_severity", 0)) or 0.0),
                "historical_max_impact": float(row.get("max_impact_score", row.get("historical_max_impact", 0)) or 0.0),
            }

        return {
            "historical_data_available": 0,
            "historical_flood_events": 0,
            "historical_flood_years": 0,
            "historical_fatalities": 0,
            "historical_displaced": 0,
            "historical_max_severity": 0.0,
            "historical_max_impact": 0.0,
        }

    except Exception:
        return {
            "historical_data_available": 0,
            "historical_flood_events": 0,
            "historical_flood_years": 0,
            "historical_fatalities": 0,
            "historical_displaced": 0,
            "historical_max_severity": 0.0,
            "historical_max_impact": 0.0,
        }



def build_features(state_name=None, district_name=None, village_name=None, latitude=None, longitude=None):
    """
    Build a unified multi-source feature vector.
    Accepts (state_name, district_name, village_name) OR direct (latitude, longitude).
    """

    print("=" * 70)
    print("BUILDING MULTI-SOURCE FEATURES")
    print("=" * 70)

    # ========================================================
    # 1. RESOLVE LOCATION & COORDINATES
    # ========================================================

    print("\n[1/6] Resolving coordinates & location metadata...")

    if latitude is not None and longitude is not None:
        # Direct GPS coordinates provided
        latitude = float(latitude)
        longitude = float(longitude)
        
        # If state or district missing, reverse geocode to get name & historical match
        if not state_name or not district_name:
            resolved = reverse_geocode_coordinates(latitude, longitude)
            state_name = state_name or resolved.get("state")
            district_name = district_name or resolved.get("district")
            village_name = village_name or resolved.get("village")

        coordinates = {
            "state": state_name,
            "district": district_name,
            "village": village_name,
            "latitude": latitude,
            "longitude": longitude,
        }
    else:
        # Check if village is specified and resolve exact village coordinates
        v_coords = None
        if village_name:
            try:
                from services.village_service import get_village_coordinates
                v_coords = get_village_coordinates(state_name, district_name, village_name)
            except Exception as e:
                print(f"Village coordinate lookup error: {e}")

        if v_coords:
            coordinates = {
                "state": state_name or v_coords.get("state"),
                "district": district_name or v_coords.get("district"),
                "village": v_coords.get("village", village_name),
                "latitude": v_coords["latitude"],
                "longitude": v_coords["longitude"],
            }
            latitude = v_coords["latitude"]
            longitude = v_coords["longitude"]
            state_name = coordinates["state"]
            district_name = coordinates["district"]
        else:
            # State and district provided -> resolve centroid coordinates
            coordinates = get_district_coordinates(
                state_name,
                district_name
            )

            if coordinates is None:
                raise ValueError(
                    f"District not found: "
                    f"{district_name}, {state_name}"
                )

            if village_name:
                coordinates["village"] = village_name

            latitude = coordinates["latitude"]
            longitude = coordinates["longitude"]

    print(f"State    : {state_name}")
    print(f"District : {district_name}")
    print(f"Latitude : {latitude}")
    print(f"Longitude: {longitude}")


    # ========================================================
    # 2. WEATHER
    # ========================================================

    print("\n[2/6] Getting weather data...")
    try:
        weather = get_weather(
            latitude,
            longitude
        )
    except Exception as e:
        print(f"Weather API failed: {e}")
        weather = {}

    temperature = first_value(
        weather,
        "temperature",
        "temperature_2m"
    )

    humidity = first_value(
        weather,
        "humidity",
        "relative_humidity_2m"
    )

    rainfall = first_value(
        weather,
        "rainfall",
        "precipitation"
    )

    rain = first_value(
        weather,
        "rain"
    )

    print(f"Temperature : {temperature}")
    print(f"Humidity    : {humidity}")
    print(f"Rainfall    : {rainfall}")
    print(f"Rain        : {rain}")

    # ========================================================
    # 3. TERRAIN
    # ========================================================

    print("\n[3/6] Getting terrain data...")

    try:
        terrain = get_terrain_features(
            state_name,
            district_name,
            latitude=latitude,
            longitude=longitude,
        )
    except Exception as e:
        print(f"Terrain API failed: {e}")
        terrain = {}

    mean_elevation = first_value(
        terrain,
        "mean_elevation",
        "mean_elevation_m",
        "elevation_mean"
    )

    min_elevation = first_value(
        terrain,
        "min_elevation",
        "min_elevation_m",
        "elevation_min"
    )

    max_elevation = first_value(
        terrain,
        "max_elevation",
        "max_elevation_m",
        "elevation_max"
    )

    relief = first_value(
        terrain,
        "relief",
        "relief_m",
        "elevation_relief"
    )

    mean_slope = first_value(
        terrain,
        "mean_slope_percent",
        "mean_slope",
        "slope_mean_percent"
    )

    max_slope = first_value(
        terrain,
        "max_slope_percent",
        "max_slope",
        "slope_max_percent"
    )

    slope_variability = first_value(
        terrain,
        "slope_variability_percent",
        "slope_variability",
        "slope_variability_pct"
    )

    print(f"Mean Elevation    : {mean_elevation}")
    print(f"Min Elevation     : {min_elevation}")
    print(f"Max Elevation     : {max_elevation}")
    print(f"Relief            : {relief}")
    print(f"Mean Slope        : {mean_slope}")
    print(f"Max Slope         : {max_slope}")
    print(f"Slope Variability : {slope_variability}")

    # ========================================================
    # 4. HYDROLOGY
    # ========================================================

    print("\n[4/6] Getting hydrology data...")

    try:
        hydrology = get_hydrology_features(
            latitude,
            longitude,
            state_name
        )
    except Exception as e:
        print(f"Hydrology API failed: {e}")
        hydrology = {}

    discharge = hydrology.get(
        "discharge"
    )

    water_level = hydrology.get(
        "water_level"
    )

    print(
        f"River Discharge : {discharge}"
    )

    print(
        f"Water Level     : {water_level}"
    )

    print(
        f"Discharge Station: "
        f"{hydrology.get('discharge_station')}"
    )

    print(
        f"Discharge Distance: "
        f"{hydrology.get('discharge_distance_km')} km"
    )

    print(
        f"Discharge Status: "
        f"{hydrology.get('discharge_data_status')}"
    )

    print(
        f"Water Level Station: "
        f"{hydrology.get('water_level_station')}"
    )

    print(
        f"Water Level Distance: "
        f"{hydrology.get('water_level_distance_km')} km"
    )

    print(
        f"Water Level Status: "
        f"{hydrology.get('water_level_data_status')}"
    )

    # ========================================================
    # 5. SOIL
    # ========================================================

    print("\n[5/6] Getting SoilGrids data...")

    try:
        soil = get_district_soil(
            state_name,
            district_name,
            latitude=latitude,
            longitude=longitude,
        )
    except Exception as e:
        print(f"Soil API failed: {e}")
        soil = {}

    properties = soil.get(
        "properties",
        {}
    )

    clay_data = properties.get(
        "clay",
        {}
    )

    sand_data = properties.get(
        "sand",
        {}
    )

    silt_data = properties.get(
        "silt",
        {}
    )

    clay = first_value(
        clay_data,
        "mean_percent",
        "mean"
    )

    sand = first_value(
        sand_data,
        "mean_percent",
        "mean"
    )

    silt = first_value(
        silt_data,
        "mean_percent",
        "mean"
    )

    print(f"Clay : {clay}%")
    print(f"Sand : {sand}%")
    print(f"Silt : {silt}%")

    # ========================================================
    # 6. HISTORICAL FLOOD DATA
    # ========================================================

    print("\n[6/6] Getting historical flood data...")

    historical = get_historical_features(
        state_name,
        district_name
    )

    print(
        "Historical data available:",
        historical["historical_data_available"]
    )

    print(
        "Historical flood events:",
        historical["historical_flood_events"]
    )

    print(
        "Historical flood years:",
        historical["historical_flood_years"]
    )

    print(
        "Historical max severity:",
        historical["historical_max_severity"]
    )

    # ========================================================
    # FINAL FEATURE VECTOR
    # ========================================================

    features = {

        # ----------------------------------------------------
        # LOCATION
        # ----------------------------------------------------

        "Latitude": latitude,
        "Longitude": longitude,

        # ----------------------------------------------------
        # WEATHER
        # ----------------------------------------------------

        "Rainfall (mm)": rainfall,

        "Rainfall 1h (mm)": weather.get(
            "rainfall_1h"
        ),

        "Rainfall 3h (mm)": weather.get(
            "rainfall_3h"
        ),

        "Rainfall 6h (mm)": weather.get(
            "rainfall_6h"
        ),

        "Rainfall 24h (mm)": weather.get(
            "rainfall_24h"
        ),

        "Temperature (°C)": temperature,

        "Humidity (%)": humidity,

        # ----------------------------------------------------
        # TERRAIN
        # ----------------------------------------------------

        "Elevation (m)": mean_elevation,

        "Minimum Elevation (m)": min_elevation,

        "Maximum Elevation (m)": max_elevation,

        "Relief (m)": relief,

        "Mean Slope (%)": mean_slope,

        "Max Slope (%)": max_slope,

        "Slope Variability (%)": slope_variability,

        # ----------------------------------------------------
        # HYDROLOGY
        # ----------------------------------------------------

        "River Discharge (m³/s)": discharge,

        "Water Level (m)": water_level,

        # ----------------------------------------------------
        # SOIL
        # ----------------------------------------------------

        "Clay (%)": clay,

        "Sand (%)": sand,

        "Silt (%)": silt,

        # ----------------------------------------------------
        # HISTORICAL FLOOD CONTEXT
        # ----------------------------------------------------

        "Historical Flood Events": historical[
            "historical_flood_events"
        ],

        "Historical Flood Years": historical[
            "historical_flood_years"
        ],

        "Historical Fatalities": historical[
            "historical_fatalities"
        ],

        "Historical Displaced": historical[
            "historical_displaced"
        ],

        "Historical Max Severity": historical[
            "historical_max_severity"
        ],

        "Historical Max Impact": historical[
            "historical_max_impact"
        ],

        "Historical Data Available": historical[
            "historical_data_available"
        ],
    }

    # ========================================================
    # RETURN COMPLETE RESULT
    # ========================================================

    return {
        "state": state_name,
        "district": district_name,
        "village": village_name if 'village_name' in locals() else None,
        "coordinates": {
            "latitude": latitude,
            "longitude": longitude,
            "state": state_name,
            "district": district_name,
            "village": village_name if 'village_name' in locals() else None,
        },
        "features": features,


        "weather": weather,

        "terrain": terrain,

        "hydrology": hydrology,

        "soil": soil,

        "historical": historical
    }