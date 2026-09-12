import os
import json
import time
import requests
from pathlib import Path
from cachetools import TTLCache

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = PROJECT_ROOT / "data" / "cache" / "villages"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Memory Cache for villages (TTL: 24 hours)
_VILLAGE_MEMORY_CACHE = TTLCache(maxsize=2000, ttl=86400)

_HEADERS = {
    "User-Agent": "FlashFloodPredictionSystem/1.0 (contact: admin@sih.gov.in)",
    "Accept": "application/json"
}

_OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter"
]

def _sanitize_filename(name: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in name).lower()

def _get_cache_filepath(state: str, district: str) -> Path:
    s = _sanitize_filename(state)
    d = _sanitize_filename(district)
    return CACHE_DIR / f"villages_{s}_{d}.json"

def fetch_villages_from_overpass(state: str, district: str):
    """
    Fetches real-world villages for a specific State & District from OpenStreetMap Overpass API.
    Returns a list of dicts with real names, codes, lat/lon, and metadata.
    """
    cache_file = _get_cache_filepath(state, district)
    
    # 1. Check disk cache first
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            print(f"[VillageService] Disk cache read error for {state}/{district}: {e}")

    # 2. Query Overpass API
    query = f"""[out:json][timeout:25];
area["name"="{state}"]["admin_level"="4"]->.state;
area["name"="{district}"]->.district;
(
  node["place"="village"](area.district);
  node["place"="hamlet"](area.district);
  node["place"="town"](area.district);
);
out center 150;
"""
    
    # Fallback query if district area fails
    fallback_query = f"""[out:json][timeout:25];
(
  node["place"="village"]["is_in:state"="{state}"]["is_in:district"="{district}"];
  node["place"="hamlet"]["is_in:state"="{state}"]["is_in:district"="{district}"];
);
out center 150;
"""

    elements = []
    for ep in _OVERPASS_ENDPOINTS:
        try:
            r = requests.post(ep, data={"data": query}, headers=_HEADERS, timeout=20)
            if r.status_code == 200:
                elements = r.json().get("elements", [])
                if elements:
                    break
        except Exception as e:
            print(f"[VillageService] Overpass endpoint {ep} error: {e}")

    if not elements:
        # Try fallback query
        for ep in _OVERPASS_ENDPOINTS:
            try:
                r = requests.post(ep, data={"data": fallback_query}, headers=_HEADERS, timeout=20)
                if r.status_code == 200:
                    elements = r.json().get("elements", [])
                    if elements:
                        break
            except Exception as e:
                pass

    villages = []
    seen_keys = set()
    
    for elem in elements:
        tags = elem.get("tags", {})
        name = tags.get("name") or tags.get("name:en") or tags.get("name:hi")
        if not name or len(name.strip()) < 2:
            continue
        name = name.strip()

        lat = elem.get("lat") or elem.get("center", {}).get("lat")
        lon = elem.get("lon") or elem.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue

        lgd_code = tags.get("ref:lgd") or tags.get("lgd:code") or tags.get("census:code") or f"osm_{elem.get('id')}"
        place_type = tags.get("place", "village")

        unique_key = f"{name.casefold()}_{lgd_code}"
        if unique_key in seen_keys:
            continue
        seen_keys.add(unique_key)

        village_obj = {
            "village_code": str(lgd_code),
            "village_name": name,
            "state": state,
            "district": district,
            "latitude": float(lat),
            "longitude": float(lon),
            "place_type": place_type,
            "has_polygon": False,
            "data_source": "OpenStreetMap Overpass API / LGD",
            "precision_label": "Village-location based risk assessment"
        }
        villages.append(village_obj)

    # Sort alphabetically by village name
    villages.sort(key=lambda x: x["village_name"])

    # If Overpass returned villages, persist to local disk cache
    if villages:
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(villages, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[VillageService] Failed to write disk cache: {e}")

    return villages

def get_villages_by_district(state: str, district: str):
    """
    Returns the list of villages for a state and district.
    Uses memory cache -> disk cache -> Overpass API.
    """
    cache_key = f"{state.casefold()}|{district.casefold()}"
    if cache_key in _VILLAGE_MEMORY_CACHE:
        return _VILLAGE_MEMORY_CACHE[cache_key]

    villages = fetch_villages_from_overpass(state, district)
    
    if villages:
        _VILLAGE_MEMORY_CACHE[cache_key] = villages
    
    return villages

def get_village(state: str, district: str, village_identifier: str):
    """
    Retrieves a specific village by code or name.
    """
    villages = get_villages_by_district(state, district)
    if not villages:
        return None

    ident_lower = village_identifier.strip().casefold()
    # 1. Match by exact village_code
    for v in villages:
        if v["village_code"].casefold() == ident_lower:
            return v
            
    # 2. Match by exact village_name
    for v in villages:
        if v["village_name"].casefold() == ident_lower:
            return v

    # 3. Partial match
    for v in villages:
        if ident_lower in v["village_name"].casefold():
            return v

    return None

def get_village_coordinates(state: str, district: str, village_identifier: str):
    """
    Returns (latitude, longitude) for a village.
    """
    v = get_village(state, district, village_identifier)
    if v:
        return v["latitude"], v["longitude"]
    return None
