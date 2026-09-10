import os
import time
import requests
import pandas as pd
import numpy as np

EVENT_FILE = "data/raw/flood_events/historical_flood_events.csv"
MASTER_FILE = "data/raw/master_district_features.csv"
OUTPUT_FILE = "data/processed/event_weather_dataset.csv"
CACHE_DIR = "data/raw/historical_weather/cache"

API_URL = "https://archive-api.open-meteo.com/v1/archive"

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs("data/processed", exist_ok=True)


def download_weather(lat, lon, start_date, end_date, cache_file):

    if os.path.exists(cache_file):
        try:
            return pd.read_csv(cache_file)
        except Exception:
            pass

    params = {
        "latitude": float(lat),
        "longitude": float(lon),
        "start_date": start_date,
        "end_date": end_date,
        "hourly": (
            "precipitation,"
            "temperature_2m,"
            "relative_humidity_2m,"
            "soil_moisture_0_to_7cm,"
            "soil_moisture_7_to_28cm"
        ),
        "timezone": "GMT",
        "models": "era5_land"
    }

    try:
        response = requests.get(
            API_URL,
            params=params,
            timeout=60
        )

        if response.status_code == 429:
            print("Rate limit. Waiting 10 seconds...")
            time.sleep(10)
            response = requests.get(
                API_URL,
                params=params,
                timeout=60
            )

        response.raise_for_status()

        data = response.json()

        if "hourly" not in data:
            return None

        hourly = data["hourly"]

        weather = pd.DataFrame({
            "time": hourly["time"],
            "precipitation": hourly.get("precipitation"),
            "temperature_2m": hourly.get("temperature_2m"),
            "relative_humidity_2m":
                hourly.get("relative_humidity_2m"),
            "soil_moisture_0_to_7cm":
                hourly.get("soil_moisture_0_to_7cm"),
            "soil_moisture_7_to_28cm":
                hourly.get("soil_moisture_7_to_28cm")
        })

        weather.to_csv(cache_file, index=False)

        return weather

    except Exception as e:
        print("ERROR:", e)
        return None


def extract_features(weather, event_date):

    result = {
        "rainfall_1h": np.nan,
        "rainfall_3h": np.nan,
        "rainfall_6h": np.nan,
        "rainfall_12h": np.nan,
        "rainfall_24h": np.nan,
        "rainfall_48h": np.nan,
        "temperature": np.nan,
        "humidity": np.nan,
        "soil_moisture_0_7": np.nan,
        "soil_moisture_7_28": np.nan
    }

    if weather is None or weather.empty:
        return result

    weather["time"] = pd.to_datetime(
        weather["time"],
        errors="coerce"
    )

    event_date = pd.to_datetime(event_date)

    weather = weather[
        weather["time"] <= event_date
    ].copy()

    if weather.empty:
        return result

    rain = pd.to_numeric(
        weather["precipitation"],
        errors="coerce"
    ).fillna(0)

    latest = weather.iloc[-1]

    result["rainfall_1h"] = rain.tail(1).sum()
    result["rainfall_3h"] = rain.tail(3).sum()
    result["rainfall_6h"] = rain.tail(6).sum()
    result["rainfall_12h"] = rain.tail(12).sum()
    result["rainfall_24h"] = rain.tail(24).sum()
    result["rainfall_48h"] = rain.tail(48).sum()

    result["temperature"] = latest["temperature_2m"]
    result["humidity"] = latest["relative_humidity_2m"]
    result["soil_moisture_0_7"] = (
        latest["soil_moisture_0_to_7cm"]
    )
    result["soil_moisture_7_28"] = (
        latest["soil_moisture_7_to_28cm"]
    )

    return result


def main():

    print("=" * 60)
    print("FAST HISTORICAL WEATHER BUILDER")
    print("=" * 60)

    print("\nLoading flood events...")
    events = pd.read_csv(EVENT_FILE)

    print("Flood records:", len(events))

    print("\nLoading district data...")
    master = pd.read_csv(MASTER_FILE)

    master_cols = [
        "state_name",
        "district",
        "latitude",
        "longitude",
        "elevation_m",
        "slope_percent",
        "terrain_class",
        "historical_flood_events",
        "historical_flood_years",
        "historical_fatalities",
        "historical_displaced",
        "historical_max_severity",
        "historical_max_impact"
    ]

    master = master[master_cols]

    df = events.merge(
        master,
        on=["state_name", "district"],
        how="left"
    )

    df["BeginDate"] = pd.to_datetime(
        df["BeginDate"],
        errors="coerce"
    )

    df = df.dropna(
        subset=[
            "BeginDate",
            "latitude",
            "longitude"
        ]
    ).copy()

    # ========================================================
    # KEY OPTIMIZATION
    #
    # One weather request per DISTRICT + YEAR
    #
    # Instead of 12,779 event requests.
    # ========================================================

    df["event_year"] = df["BeginDate"].dt.year

    groups = (
        df[
            [
                "state_name",
                "district",
                "latitude",
                "longitude",
                "event_year"
            ]
        ]
        .drop_duplicates()
        .reset_index(drop=True)
    )

    print("\nUnique district-year requests:", len(groups))

    print("\nDownloading weather...")

    weather_cache = {}

    for i, row in groups.iterrows():

        state = str(row["state_name"])
        district = str(row["district"])
        year = int(row["event_year"])

        lat = row["latitude"]
        lon = row["longitude"]

        key = (
            state,
            district,
            year
        )

        safe_state = (
            state
            .replace("/", "_")
            .replace(" ", "_")
        )

        safe_district = (
            district
            .replace("/", "_")
            .replace(" ", "_")
        )

        cache_file = os.path.join(
            CACHE_DIR,
            f"{safe_state}_{safe_district}_{year}.csv"
        )

        print(
            f"[{i + 1}/{len(groups)}] "
            f"{state} | {district} | {year}"
        )

        weather = download_weather(
            lat,
            lon,
            f"{year}-01-01",
            f"{year}-12-31",
            cache_file
        )

        weather_cache[key] = weather

        time.sleep(0.3)

    # ========================================================
    # Extract event-time weather from cached yearly data
    # ========================================================

    print("\nExtracting event-time weather...")

    feature_rows = []

    for _, row in df.iterrows():

        key = (
            row["state_name"],
            row["district"],
            int(row["event_year"])
        )

        weather = weather_cache.get(key)

        features = extract_features(
            weather,
            row["BeginDate"]
        )

        feature_rows.append(features)

    weather_features = pd.DataFrame(
        feature_rows
    )

    final_df = pd.concat(
        [
            df.reset_index(drop=True),
            weather_features.reset_index(drop=True)
        ],
        axis=1
    )

    final_df["flood_occurred"] = 1

    final_df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)

    print("Output:")
    print(OUTPUT_FILE)

    print("Rows:", len(final_df))
    print("Columns:", len(final_df.columns))

    print("\nWeather coverage:")

    print(
        final_df[
            [
                "rainfall_1h",
                "rainfall_3h",
                "rainfall_6h",
                "rainfall_24h",
                "temperature",
                "humidity"
            ]
        ].notna().sum()
    )


if __name__ == "__main__":
    main()