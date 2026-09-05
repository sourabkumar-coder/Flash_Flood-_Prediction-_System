"""
Data Generator for Beas River Basin Flash Flood ML Modeling
Grounded in real-world topographical and hydro-meteorological ranges
for Kullu and Mandi Districts, Himachal Pradesh.
"""

import numpy as np
import pandas as pd
import json
import os

np.random.seed(42)

# 10 Real Villages / Wards in Upper & Middle Beas Basin
VILLAGES = [
    {
        "id": "VIL_001",
        "name": "Manali Urban (Old Manali)",
        "district": "Kullu",
        "lat": 32.2432,
        "lon": 77.1892,
        "elevation_m": 2050,
        "slope_deg": 28.5,
        "twi": 7.2,
        "dist_to_river_m": 45,
        "catchment_area_km2": 380.0,
        "drainage_density_km_km2": 2.8,
        "scs_curve_number": 82,
        "population": 8096,
        "danger_stage_m": 4.8,
        "warning_stage_m": 3.8
    },
    {
        "id": "VIL_002",
        "name": "Bhuntar Confluence (Jia)",
        "district": "Kullu",
        "lat": 31.8786,
        "lon": 77.1542,
        "elevation_m": 1089,
        "slope_deg": 18.2,
        "twi": 9.8,
        "dist_to_river_m": 25,
        "catchment_area_km2": 1150.0,
        "drainage_density_km_km2": 3.4,
        "scs_curve_number": 86,
        "population": 6400,
        "danger_stage_m": 5.2,
        "warning_stage_m": 4.2
    },
    {
        "id": "VIL_003",
        "name": "Kullu Town (Akhara Bazar)",
        "district": "Kullu",
        "lat": 31.9579,
        "lon": 77.1095,
        "elevation_m": 1220,
        "slope_deg": 22.1,
        "twi": 8.5,
        "dist_to_river_m": 35,
        "catchment_area_km2": 820.0,
        "drainage_density_km_km2": 3.1,
        "scs_curve_number": 84,
        "population": 18536,
        "danger_stage_m": 5.0,
        "warning_stage_m": 4.0
    },
    {
        "id": "VIL_004",
        "name": "Aut Gorge (Thalout)",
        "district": "Mandi",
        "lat": 31.7456,
        "lon": 77.2064,
        "elevation_m": 960,
        "slope_deg": 34.0,
        "twi": 10.4,
        "dist_to_river_m": 20,
        "catchment_area_km2": 2400.0,
        "drainage_density_km_km2": 3.9,
        "scs_curve_number": 88,
        "population": 4120,
        "danger_stage_m": 6.5,
        "warning_stage_m": 5.2
    },
    {
        "id": "VIL_005",
        "name": "Pandoh Dam Catchment",
        "district": "Mandi",
        "lat": 31.6702,
        "lon": 77.0019,
        "elevation_m": 880,
        "slope_deg": 30.5,
        "twi": 11.2,
        "dist_to_river_m": 15,
        "catchment_area_km2": 3100.0,
        "drainage_density_km_km2": 4.1,
        "scs_curve_number": 90,
        "population": 5250,
        "danger_stage_m": 7.0,
        "warning_stage_m": 5.8
    },
    {
        "id": "VIL_006",
        "name": "Mandi Urban (Purani Mandi)",
        "district": "Mandi",
        "lat": 31.7082,
        "lon": 76.9320,
        "elevation_m": 760,
        "slope_deg": 19.4,
        "twi": 10.8,
        "dist_to_river_m": 30,
        "catchment_area_km2": 3600.0,
        "drainage_density_km_km2": 3.7,
        "scs_curve_number": 87,
        "population": 26422,
        "danger_stage_m": 6.0,
        "warning_stage_m": 4.8
    },
    {
        "id": "VIL_007",
        "name": "Bali Chowki (Tirthan Valley)",
        "district": "Mandi",
        "lat": 31.6420,
        "lon": 77.3410,
        "elevation_m": 1350,
        "slope_deg": 32.0,
        "twi": 7.9,
        "dist_to_river_m": 40,
        "catchment_area_km2": 450.0,
        "drainage_density_km_km2": 3.0,
        "scs_curve_number": 80,
        "population": 3890,
        "danger_stage_m": 4.2,
        "warning_stage_m": 3.4
    },
    {
        "id": "VIL_008",
        "name": "Larji Hydro Outfall",
        "district": "Kullu",
        "lat": 31.7214,
        "lon": 77.2145,
        "elevation_m": 930,
        "slope_deg": 36.2,
        "twi": 11.5,
        "dist_to_river_m": 18,
        "catchment_area_km2": 2650.0,
        "drainage_density_km_km2": 4.0,
        "scs_curve_number": 89,
        "population": 2950,
        "danger_stage_m": 5.8,
        "warning_stage_m": 4.6
    },
    {
        "id": "VIL_009",
        "name": "Naggar Heritage Ward",
        "district": "Kullu",
        "lat": 32.1158,
        "lon": 77.1643,
        "elevation_m": 1760,
        "slope_deg": 26.0,
        "twi": 6.8,
        "dist_to_river_m": 120,
        "catchment_area_km2": 210.0,
        "drainage_density_km_km2": 2.4,
        "scs_curve_number": 75,
        "population": 4500,
        "danger_stage_m": 8.5,
        "warning_stage_m": 7.0
    },
    {
        "id": "VIL_010",
        "name": "Sainj Valley (Neuli)",
        "district": "Kullu",
        "lat": 31.7760,
        "lon": 77.3080,
        "elevation_m": 1420,
        "slope_deg": 35.0,
        "twi": 8.9,
        "dist_to_river_m": 28,
        "catchment_area_km2": 520.0,
        "drainage_density_km_km2": 3.3,
        "scs_curve_number": 83,
        "population": 3100,
        "danger_stage_m": 4.5,
        "warning_stage_m": 3.5
    }
]

def generate_hydro_dataset(n_days=150, samples_per_day=8):
    records = []
    total_timesteps = n_days * samples_per_day
    
    time_index = pd.date_range("2024-05-01 00:00:00", periods=total_timesteps, freq="3h")
    
    storm_episodes = [
        {"start": 320, "peak": 335, "end": 360, "intensity": 115.0},
        {"start": 780, "peak": 795, "end": 815, "intensity": 90.0},
        {"start": 1080, "peak": 1095, "end": 1115, "intensity": 80.0}
    ]

    for v in VILLAGES:
        base_soil = 25.0 + np.random.uniform(0, 10)
        curr_soil = base_soil
        base_stage = 1.2 + (v["catchment_area_km2"] / 3000.0) * 1.5
        curr_stage = base_stage

        for t_idx, dt in enumerate(time_index):
            monsoon_weight = 1.0 if (dt.month in [6, 7, 8, 9]) else 0.15
            
            rain_1h = np.random.exponential(scale=1.8 * monsoon_weight)
            if np.random.rand() < 0.15 * monsoon_weight:
                rain_1h += np.random.uniform(5.0, 22.0)

            for ep in storm_episodes:
                if ep["start"] <= t_idx <= ep["end"]:
                    dist_to_peak = abs(t_idx - ep["peak"])
                    storm_scale = max(0.0, 1.0 - (dist_to_peak / (ep["end"] - ep["start"])))
                    orographic_factor = 1.0 + (v["slope_deg"] / 40.0) * 0.4
                    rain_1h += ep["intensity"] * storm_scale * orographic_factor * (0.8 + np.random.uniform(0, 0.4))

            rain_3h = rain_1h * 2.6 + np.random.uniform(0, 3)
            rain_6h = rain_3h * 1.8 + np.random.uniform(0, 5)
            rain_24h = rain_6h * 2.2 + np.random.uniform(0, 12)
            rain_intensity_max_1h = max(rain_1h, rain_3h / 3.0) * (1.0 + np.random.uniform(0, 0.2))
            rain_rate_of_change = np.random.normal(loc=0.5 if rain_1h > 15 else -0.2, scale=1.0)
            forecast_rain_next_6h = rain_6h * (0.8 + np.random.uniform(0, 0.5)) if rain_1h > 10 else np.random.uniform(0, 8)

            soil_gain = (rain_6h * 0.35) * (v["scs_curve_number"] / 100.0)
            soil_drain = 0.8
            curr_soil = np.clip(curr_soil + soil_gain - soil_drain, 15.0, 98.5)
            soil_saturation_ratio = curr_soil / 100.0

            runoff_coeff = (v["scs_curve_number"] / 100.0) * (0.4 + 0.6 * soil_saturation_ratio)
            stage_surge = (rain_3h * runoff_coeff * (v["catchment_area_km2"] / 2000.0) * (v["slope_deg"] / 30.0)) * 0.045
            stage_recession = (curr_stage - base_stage) * 0.12
            curr_stage = max(base_stage, curr_stage + stage_surge - stage_recession)
            
            river_level_rise_rate_1h = max(-0.5, stage_surge - stage_recession)
            upstream_gauge_delta_2h = stage_surge * 1.35 + np.random.normal(0, 0.05)

            flood_hydraulic_risk = (curr_stage / v["danger_stage_m"])
            rainfall_flash_hazard = (rain_3h / 45.0) * (soil_saturation_ratio ** 1.5)
            
            true_risk_score = min(100.0, max(0.0, (
                0.40 * (flood_hydraulic_risk * 75.0) +
                0.35 * (rainfall_flash_hazard * 65.0) +
                0.15 * (v["twi"] / 12.0 * 20.0) +
                0.10 * (v["drainage_density_km_km2"] / 4.5 * 15.0)
            )))

            is_flash_flood = 1 if (true_risk_score >= 58.0 or curr_stage >= v["danger_stage_m"] * 0.90) else 0

            if true_risk_score > 75.0:
                lead_time_hrs = max(0.5, 3.8 - (river_level_rise_rate_1h * 1.5))
            elif true_risk_score > 50.0:
                lead_time_hrs = max(1.5, 5.5 - (river_level_rise_rate_1h * 1.2))
            else:
                lead_time_hrs = 12.0

            records.append({
                "timestamp": dt.isoformat(),
                "village_id": v["id"],
                "village_name": v["name"],
                "district": v["district"],
                "rain_accum_1h": round(rain_1h, 2),
                "rain_accum_3h": round(rain_3h, 2),
                "rain_accum_6h": round(rain_6h, 2),
                "rain_accum_24h": round(rain_24h, 2),
                "rain_intensity_max_1h": round(rain_intensity_max_1h, 2),
                "rain_rate_of_change": round(rain_rate_of_change, 2),
                "forecast_rain_next_6h": round(forecast_rain_next_6h, 2),
                "soil_moisture_pct": round(curr_soil, 2),
                "soil_saturation_ratio": round(soil_saturation_ratio, 3),
                "river_water_level_m": round(curr_stage, 2),
                "river_level_rise_rate_1h": round(river_level_rise_rate_1h, 3),
                "upstream_gauge_delta_2h": round(upstream_gauge_delta_2h, 3),
                "elevation_m": v["elevation_m"],
                "slope_deg": v["slope_deg"],
                "twi": v["twi"],
                "dist_to_river_m": v["dist_to_river_m"],
                "catchment_area_km2": v["catchment_area_km2"],
                "drainage_density_km_km2": v["drainage_density_km_km2"],
                "scs_curve_number": v["scs_curve_number"],
                "danger_stage_m": v["danger_stage_m"],
                "risk_score": round(true_risk_score, 1),
                "lead_time_hrs": round(lead_time_hrs, 1),
                "flash_flood_3_6h": is_flash_flood
            })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    os.makedirs("ml/data", exist_ok=True)
    os.makedirs("backend/app/data", exist_ok=True)
    
    print("Generating hydro-meteorological dataset for Upper & Middle Beas Basin...")
    df = generate_hydro_dataset(n_days=150, samples_per_day=8)
    
    csv_path = "ml/data/beas_basin_hydro_dataset.csv"
    df.to_csv(csv_path, index=False)
    print(f"Dataset generated with {len(df)} samples across 10 villages.")
    print(f"Flood event prevalence: {df['flash_flood_3_6h'].mean() * 100:.2f}%")
    print(f"Saved to {csv_path}")

    villages_meta_path = "backend/app/data/villages.json"
    with open(villages_meta_path, "w") as f:
        json.dump(VILLAGES, f, indent=2)
    print(f"Saved village metadata to {villages_meta_path}")
