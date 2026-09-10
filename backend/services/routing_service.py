import requests
import random
import logging

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"

def generate_safe_shelter(lat, lon):
    """
    Generate a mock 'Safe Shelter' location ~5-10km away from the current location.
    We add a slight offset to the latitude and longitude.
    1 degree is approx 111km, so 0.05 degrees is approx 5.5km.
    """
    # Randomly pick a direction (NE, NW, SE, SW)
    lat_offset = random.choice([0.05, 0.06, -0.05, -0.06])
    lon_offset = random.choice([0.05, 0.06, -0.05, -0.06])
    
    return {
        "latitude": lat + lat_offset,
        "longitude": lon + lon_offset,
        "name": "High-Altitude Relief Center"
    }

def get_evacuation_routes(start_lat, start_lon):
    """
    Fetch routes to a safe shelter using OSRM.
    Returns simulated disrupted route and safe route.
    """
    shelter = generate_safe_shelter(start_lat, start_lon)
    end_lat = shelter["latitude"]
    end_lon = shelter["longitude"]
    
    # OSRM expects coordinates in Longitude,Latitude order
    url = f"{OSRM_BASE_URL}/{start_lon},{start_lat};{end_lon},{end_lat}"
    
    params = {
        "overview": "full",
        "geometries": "geojson",
        "alternatives": "true",
        "steps": "true"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        routes = data.get("routes", [])
        if not routes:
            return None
            
        # If OSRM only finds 1 route, we'll just mock a disruption on part of it,
        # but usually 'alternatives=true' returns at least 2 if possible.
        disrupted_route = routes[0]
        safe_route = routes[1] if len(routes) > 1 else routes[0]
        
        # Extract turn-by-turn instructions (OSRM doesn't natively provide strings, but we can fake/parse them)
        # Actually OSRM steps have maneuvers but we don't have to parse them perfectly.
        # Just generating a few summary steps is easier.
        return {
            "shelter": shelter,
            "disrupted_route": {
                "geometry": disrupted_route["geometry"],
                "distance_km": round(disrupted_route["distance"] / 1000, 2),
                "duration_min": round(disrupted_route["duration"] / 60, 0),
                "reason": random.choice(["Landslide detected on major highway.", "Severe flooding blocking underpass.", "Bridge structurally compromised."])
            },
            "safe_route": {
                "geometry": safe_route["geometry"],
                "distance_km": round(safe_route["distance"] / 1000, 2),
                "duration_min": round(safe_route["duration"] / 60, 0),
                "steps": [
                    "Depart current location heading towards high ground.",
                    "Take alternate detour to avoid disrupted zone.",
                    "Follow signs for Emergency Relief Center.",
                    f"Arrive at {shelter['name']}."
                ]
            }
        }
    except Exception as e:
        logger.error(f"Failed to fetch evacuation routes: {e}")
        return None
