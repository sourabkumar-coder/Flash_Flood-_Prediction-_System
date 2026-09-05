"""
Static and GeoJSON Data Definitions for Upper & Middle Beas Basin (Kullu & Mandi, HP)
"""

import json

BEAS_BASIN_REGION = {
    "id": "REG_HP_BEAS_01",
    "name": "Upper & Middle Beas River Basin",
    "state": "Himachal Pradesh",
    "districts": ["Kullu", "Mandi"],
    "center": {"lat": 31.85, "lon": 77.15},
    "zoom": 10,
    "bounds": {
        "north": 32.35,
        "south": 31.55,
        "west": 76.80,
        "east": 77.50
    },
    "river_system": "Beas River & Tributaries (Parbati, Tirthan, Sainj, Suketi Khad)",
    "elevation_range_m": "760m - 4,200m",
    "total_pilot_population": 83464,
    "last_major_disaster": "July 9-11, 2023 Beas Flash Flood & Cloudburst Disaster"
}

# Real Coordinates & Realistic Spatial Polygons for Pilot Wards
VILLAGE_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "VIL_001",
            "properties": {
                "id": "VIL_001",
                "name": "Manali Urban (Old Manali)",
                "district": "Kullu",
                "elevation": 2050,
                "elevation_m": 2050,
                "slope": 28.5,
                "slope_deg": 28.5,
                "aspect": 145.0,
                "flow_accumulation": 380.0,
                "distance_to_river": 45,
                "dist_to_river_m": 45,
                "historical_flood_frequency": 5,
                "land_use": "Urban Settlement",
                "twi": 7.2,
                "catchment_area_km2": 380.0,
                "drainage_density_km_km2": 2.8,
                "scs_curve_number": 82,
                "scs_cn": 84,
                "population": 8096,
                "danger_stage_m": 4.8,
                "warning_stage_m": 3.8
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.175, 32.235], [77.202, 32.255], [77.210, 32.240], [77.185, 32.228], [77.175, 32.235]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_002",
            "properties": {
                "id": "VIL_002",
                "name": "Bhuntar Confluence (Jia)",
                "district": "Kullu",
                "elevation": 1089,
                "elevation_m": 1089,
                "slope": 18.2,
                "slope_deg": 18.2,
                "aspect": 190.0,
                "flow_accumulation": 1150.0,
                "distance_to_river": 25,
                "dist_to_river_m": 25,
                "historical_flood_frequency": 7,
                "land_use": "Riverbed Floodplain",
                "twi": 9.8,
                "catchment_area_km2": 1150.0,
                "drainage_density_km_km2": 3.4,
                "scs_curve_number": 86,
                "scs_cn": 88,
                "population": 6400,
                "danger_stage_m": 5.2,
                "warning_stage_m": 4.2
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.140, 31.868], [77.168, 31.890], [77.172, 31.872], [77.148, 31.860], [77.140, 31.868]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_003",
            "properties": {
                "id": "VIL_003",
                "name": "Kullu Town (Akhara Bazar)",
                "district": "Kullu",
                "elevation": 1220,
                "elevation_m": 1220,
                "slope": 22.1,
                "slope_deg": 22.1,
                "aspect": 120.0,
                "flow_accumulation": 820.0,
                "distance_to_river": 35,
                "dist_to_river_m": 35,
                "historical_flood_frequency": 6,
                "land_use": "Urban Settlement",
                "twi": 8.5,
                "catchment_area_km2": 820.0,
                "drainage_density_km_km2": 3.1,
                "scs_curve_number": 84,
                "scs_cn": 85,
                "population": 18536,
                "danger_stage_m": 5.0,
                "warning_stage_m": 4.0
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.095, 31.945], [77.125, 31.970], [77.130, 31.950], [77.105, 31.938], [77.095, 31.945]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_004",
            "properties": {
                "id": "VIL_004",
                "name": "Aut Gorge (Thalout)",
                "district": "Mandi",
                "elevation": 960,
                "elevation_m": 960,
                "slope": 34.0,
                "slope_deg": 34.0,
                "aspect": 210.0,
                "flow_accumulation": 2400.0,
                "distance_to_river": 20,
                "dist_to_river_m": 20,
                "historical_flood_frequency": 8,
                "land_use": "Steepland Scrub",
                "twi": 10.4,
                "catchment_area_km2": 2400.0,
                "drainage_density_km_km2": 3.9,
                "scs_curve_number": 88,
                "scs_cn": 89,
                "population": 4120,
                "danger_stage_m": 6.5,
                "warning_stage_m": 5.2
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.190, 31.735], [77.225, 31.758], [77.230, 31.740], [77.200, 31.728], [77.190, 31.735]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_005",
            "properties": {
                "id": "VIL_005",
                "name": "Pandoh Dam Catchment",
                "district": "Mandi",
                "elevation": 880,
                "elevation_m": 880,
                "slope": 30.5,
                "slope_deg": 30.5,
                "aspect": 230.0,
                "flow_accumulation": 3100.0,
                "distance_to_river": 15,
                "dist_to_river_m": 15,
                "historical_flood_frequency": 9,
                "land_use": "Steepland Scrub",
                "twi": 11.2,
                "catchment_area_km2": 3100.0,
                "drainage_density_km_km2": 4.1,
                "scs_curve_number": 90,
                "scs_cn": 91,
                "population": 5250,
                "danger_stage_m": 7.0,
                "warning_stage_m": 5.8
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [76.985, 31.658], [77.020, 31.685], [77.025, 31.665], [76.995, 31.650], [76.985, 31.658]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_006",
            "properties": {
                "id": "VIL_006",
                "name": "Mandi Urban (Purani Mandi)",
                "district": "Mandi",
                "elevation": 760,
                "elevation_m": 760,
                "slope": 19.4,
                "slope_deg": 19.4,
                "aspect": 160.0,
                "flow_accumulation": 3600.0,
                "distance_to_river": 30,
                "dist_to_river_m": 30,
                "historical_flood_frequency": 6,
                "land_use": "Urban Settlement",
                "twi": 10.8,
                "catchment_area_km2": 3600.0,
                "drainage_density_km_km2": 3.7,
                "scs_curve_number": 87,
                "scs_cn": 87,
                "population": 26422,
                "danger_stage_m": 6.0,
                "warning_stage_m": 4.8
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [76.915, 31.695], [76.950, 31.725], [76.955, 31.705], [76.925, 31.688], [76.915, 31.695]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_007",
            "properties": {
                "id": "VIL_007",
                "name": "Bali Chowki (Tirthan Valley)",
                "district": "Mandi",
                "elevation": 1350,
                "elevation_m": 1350,
                "slope": 32.0,
                "slope_deg": 32.0,
                "aspect": 95.0,
                "flow_accumulation": 450.0,
                "distance_to_river": 40,
                "dist_to_river_m": 40,
                "historical_flood_frequency": 4,
                "land_use": "Terraced Agriculture",
                "twi": 7.9,
                "catchment_area_km2": 450.0,
                "drainage_density_km_km2": 3.0,
                "scs_curve_number": 80,
                "scs_cn": 79,
                "population": 3890,
                "danger_stage_m": 4.2,
                "warning_stage_m": 3.4
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.320, 31.625], [77.360, 31.655], [77.365, 31.635], [77.330, 31.618], [77.320, 31.625]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_008",
            "properties": {
                "id": "VIL_008",
                "name": "Larji Hydro Outfall",
                "district": "Kullu",
                "elevation": 930,
                "elevation_m": 930,
                "slope": 36.2,
                "slope_deg": 36.2,
                "aspect": 200.0,
                "flow_accumulation": 2650.0,
                "distance_to_river": 18,
                "dist_to_river_m": 18,
                "historical_flood_frequency": 8,
                "land_use": "Steepland Scrub",
                "twi": 11.5,
                "catchment_area_km2": 2650.0,
                "drainage_density_km_km2": 4.0,
                "scs_curve_number": 89,
                "scs_cn": 90,
                "population": 2950,
                "danger_stage_m": 5.8,
                "warning_stage_m": 4.6
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.200, 31.710], [77.235, 31.732], [77.238, 31.718], [77.210, 31.705], [77.200, 31.710]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_009",
            "properties": {
                "id": "VIL_009",
                "name": "Naggar Heritage Ward",
                "district": "Kullu",
                "elevation": 1760,
                "elevation_m": 1760,
                "slope": 26.0,
                "slope_deg": 26.0,
                "aspect": 110.0,
                "flow_accumulation": 210.0,
                "distance_to_river": 120,
                "dist_to_river_m": 120,
                "historical_flood_frequency": 2,
                "land_use": "Dense Forest",
                "twi": 6.8,
                "catchment_area_km2": 210.0,
                "drainage_density_km_km2": 2.4,
                "scs_curve_number": 75,
                "scs_cn": 74,
                "population": 4500,
                "danger_stage_m": 8.5,
                "warning_stage_m": 7.0
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.150, 32.100], [77.185, 32.128], [77.190, 32.110], [77.160, 32.095], [77.150, 32.100]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "VIL_010",
            "properties": {
                "id": "VIL_010",
                "name": "Sainj Valley (Neuli)",
                "district": "Kullu",
                "elevation": 1420,
                "elevation_m": 1420,
                "slope": 35.0,
                "slope_deg": 35.0,
                "aspect": 130.0,
                "flow_accumulation": 520.0,
                "distance_to_river": 28,
                "dist_to_river_m": 28,
                "historical_flood_frequency": 5,
                "land_use": "Terraced Agriculture",
                "twi": 8.9,
                "catchment_area_km2": 520.0,
                "drainage_density_km_km2": 3.3,
                "scs_curve_number": 83,
                "scs_cn": 82,
                "population": 3100,
                "danger_stage_m": 4.5,
                "warning_stage_m": 3.5
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.290, 31.760], [77.330, 31.790], [77.335, 31.770], [77.300, 31.752], [77.290, 31.760]
                ]]
            }
        }
    ]
}

# IoT Sensor Stations
IOT_STATIONS = [
    {
        "id": "SEN_01",
        "name": "Manali Old Bridge Hydro-Radar",
        "type": "Ultrasonic River Stage + Tipping Rain Gauge",
        "lat": 32.2415,
        "lon": 77.1870,
        "elevation_m": 2045,
        "village_id": "VIL_001",
        "status": "ONLINE",
        "battery_pct": 94,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 1,
        "sensors_active": ["river_stage", "rain_rate", "air_temp"]
    },
    {
        "id": "SEN_02",
        "name": "Bhuntar Beas-Parbati Confluence Acoustic Node",
        "type": "Acoustic Doppler Stage + TDR Soil Saturation",
        "lat": 31.8760,
        "lon": 77.1520,
        "elevation_m": 1085,
        "village_id": "VIL_002",
        "status": "ONLINE",
        "battery_pct": 89,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 1,
        "sensors_active": ["river_stage", "soil_moisture", "flow_velocity"]
    },
    {
        "id": "SEN_03",
        "name": "Kullu Akhara Bridge Telemetry Node",
        "type": "Dual Radar Level Gauge + Piezo Rain Sensor",
        "lat": 31.9560,
        "lon": 77.1080,
        "elevation_m": 1215,
        "village_id": "VIL_003",
        "status": "ONLINE",
        "battery_pct": 98,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 2,
        "sensors_active": ["river_stage", "rain_rate"]
    },
    {
        "id": "SEN_04",
        "name": "Aut Thalout Gorge Early Warning Tripmeter",
        "type": "High-velocity Ultrasonic River Radar + Geophone",
        "lat": 31.7440,
        "lon": 77.2050,
        "elevation_m": 955,
        "village_id": "VIL_004",
        "status": "ONLINE",
        "battery_pct": 82,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 1,
        "sensors_active": ["river_stage", "debris_flow_vibration"]
    },
    {
        "id": "SEN_05",
        "name": "Pandoh Dam Inflow Supervisory Node",
        "type": "CWC Dam Stage + Inflow Telemetry Probe",
        "lat": 31.6685,
        "lon": 77.0005,
        "elevation_m": 875,
        "village_id": "VIL_005",
        "status": "ONLINE",
        "battery_pct": 100,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 1,
        "sensors_active": ["river_stage", "dam_inflow_discharge", "soil_moisture"]
    },
    {
        "id": "SEN_06",
        "name": "Mandi Victoria Bridge Acoustic Sensor",
        "type": "Submerged Hydrostatic Pressure Stage Sensor",
        "lat": 31.7070,
        "lon": 76.9310,
        "elevation_m": 755,
        "village_id": "VIL_006",
        "status": "DEGRADED",
        "battery_pct": 46,
        "solar_charging": False,
        "sampling_rate_sec": 5,
        "last_ping_seconds_ago": 4,
        "sensors_active": ["river_stage"]
    },
    {
        "id": "SEN_07",
        "name": "Tirthan Valley Tripwire & Soil Saturation Station",
        "type": "TDR Soil Moisture Saturation + Optical Rain Gauge",
        "lat": 31.6410,
        "lon": 77.3395,
        "elevation_m": 1345,
        "village_id": "VIL_007",
        "status": "ONLINE",
        "battery_pct": 91,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 2,
        "sensors_active": ["soil_moisture", "rain_rate"]
    },
    {
        "id": "SEN_08",
        "name": "Larji Barrage Outfall Hydrometric Post",
        "type": "Differential Stage Laser Sensor + Surge Velocity",
        "lat": 31.7200,
        "lon": 77.2130,
        "elevation_m": 925,
        "village_id": "VIL_008",
        "status": "ONLINE",
        "battery_pct": 87,
        "solar_charging": True,
        "sampling_rate_sec": 2,
        "last_ping_seconds_ago": 1,
        "sensors_active": ["river_stage", "surge_velocity"]
    }
]

# Designated Evacuation Centers & High-Ground Shelters
EVACUATION_SHELTERS = [
    {
        "id": "SHL_001",
        "name": "Govt Higher Secondary School High-Ground Campus",
        "village_id": "VIL_001",
        "lat": 32.2475,
        "lon": 77.1950,
        "elevation_m": 2130,
        "capacity_people": 1200,
        "current_occupancy": 0,
        "medical_post": True,
        "helipad_nearby": True,
        "water_food_days": 7,
        "status": "READY"
    },
    {
        "id": "SHL_002",
        "name": "Bhuntar Airport Elevated Ridge Camp",
        "village_id": "VIL_002",
        "lat": 31.8840,
        "lon": 77.1610,
        "elevation_m": 1160,
        "capacity_people": 2500,
        "current_occupancy": 0,
        "medical_post": True,
        "helipad_nearby": True,
        "water_food_days": 10,
        "status": "READY"
    },
    {
        "id": "SHL_003",
        "name": "Dhalpur Ground Disaster Relief Center",
        "village_id": "VIL_003",
        "lat": 31.9520,
        "lon": 77.1180,
        "elevation_m": 1270,
        "capacity_people": 4500,
        "current_occupancy": 0,
        "medical_post": True,
        "helipad_nearby": True,
        "water_food_days": 12,
        "status": "READY"
    },
    {
        "id": "SHL_004",
        "name": "Thalout Hillside Community Hall",
        "village_id": "VIL_004",
        "lat": 31.7510,
        "lon": 77.2120,
        "elevation_m": 1080,
        "capacity_people": 900,
        "current_occupancy": 0,
        "medical_post": False,
        "helipad_nearby": False,
        "water_food_days": 5,
        "status": "READY"
    },
    {
        "id": "SHL_005",
        "name": "Pandoh Colony Elevated Sports Complex",
        "village_id": "VIL_005",
        "lat": 31.6750,
        "lon": 77.0120,
        "elevation_m": 990,
        "capacity_people": 1600,
        "current_occupancy": 0,
        "medical_post": True,
        "helipad_nearby": False,
        "water_food_days": 8,
        "status": "READY"
    },
    {
        "id": "SHL_006",
        "name": "Mandi ITI Khalyar Relief Complex",
        "village_id": "VIL_006",
        "lat": 31.7140,
        "lon": 76.9450,
        "elevation_m": 860,
        "capacity_people": 6000,
        "current_occupancy": 0,
        "medical_post": True,
        "helipad_nearby": True,
        "water_food_days": 14,
        "status": "READY"
    },
    {
        "id": "SHL_007",
        "name": "Bali Chowki Forest Rest House Ground",
        "village_id": "VIL_007",
        "lat": 31.6480,
        "lon": 77.3480,
        "elevation_m": 1460,
        "capacity_people": 850,
        "current_occupancy": 0,
        "medical_post": False,
        "helipad_nearby": False,
        "water_food_days": 6,
        "status": "READY"
    },
    {
        "id": "SHL_008",
        "name": "Larji Powerhouse Staff Colony Safe Enclave",
        "village_id": "VIL_008",
        "lat": 31.7280,
        "lon": 77.2210,
        "elevation_m": 1040,
        "capacity_people": 700,
        "current_occupancy": 0,
        "medical_post": True,
        "helipad_nearby": False,
        "water_food_days": 7,
        "status": "READY"
    }
]

# River Segments / Channels for Animated Vector Flow
RIVER_CHANNELS = [
    {
        "name": "Upper Beas Main Channel (Manali - Kullu)",
        "coordinates": [
            [77.188, 32.250], [77.184, 32.220], [77.165, 32.140],
            [77.140, 32.060], [77.110, 31.980], [77.108, 31.950]
        ]
    },
    {
        "name": "Middle Beas Channel (Kullu - Bhuntar - Aut)",
        "coordinates": [
            [77.108, 31.950], [77.125, 31.910], [77.152, 31.875],
            [77.170, 31.820], [77.205, 31.745]
        ]
    },
    {
        "name": "Lower Gorge Channel (Aut - Pandoh - Mandi)",
        "coordinates": [
            [77.205, 31.745], [77.150, 31.710], [77.080, 31.680],
            [77.001, 31.670], [76.960, 31.690], [76.932, 31.708]
        ]
    },
    {
        "name": "Parbati River Tributary (Kasol - Bhuntar)",
        "coordinates": [
            [77.310, 32.010], [77.250, 31.950], [77.190, 31.900], [77.152, 31.875]
        ]
    },
    {
        "name": "Tirthan & Sainj Tributaries (Banjar - Larji)",
        "coordinates": [
            [77.345, 31.640], [77.280, 31.690], [77.220, 31.720], [77.205, 31.745]
        ]
    }
]

# Historical Flood Disaster Benchmark for Replay
HISTORICAL_EVENTS = [
    {
        "id": "EVT_2023_BEAS",
        "name": "July 9-11, 2023 Beas Cloudburst & Flash Flood Surge",
        "description": "Historic monsoon cloudburst triggering extreme peak discharge >150,000 cusecs through Kullu, Pandoh, and Mandi.",
        "peak_rainfall_mm_h": 115.4,
        "peak_stage_surge_m": 7.4,
        "duration_hours": 36,
        "damage_notes": "NH-21 highway washed out at Thalout; Aut tunnel inundated; historic Panchvaktra temple submerged in Mandi.",
        "timeline_frames": 12
    },
    {
        "id": "EVT_2018_KULLU",
        "name": "September 23-24, 2018 Kullu-Manali Cloudburst Flood",
        "description": "Late monsoon flash flood causing sudden Beas river swelling near Manali and Bhuntar.",
        "peak_rainfall_mm_h": 82.0,
        "peak_stage_surge_m": 5.1,
        "duration_hours": 24,
        "damage_notes": "Volvo bus stand inundated in Manali; 14 footbridges damaged across Parbati valley.",
        "timeline_frames": 8
    }
]
