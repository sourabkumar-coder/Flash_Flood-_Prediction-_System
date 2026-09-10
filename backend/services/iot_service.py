import random
import hashlib

def get_villages_for_district(district_name):
    """
    Simulates a database of vulnerable villages/wards for a district.
    Uses hashing to return a consistent list of mock villages.
    """
    if not district_name:
        return []
    
    # Generate a seed based on district name to ensure deterministic output
    seed_str = district_name.strip().casefold()
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    random.seed(seed)
    
    # Realistic culturally accurate base names for hilly regions
    himalayan_bases = ["Kasol", "Manikaran", "Naggar", "Vashisht", "Malana", "Tosh", "Jibhi", "Kalpa", "Chitkul", "Rakcham", "Sangla", "Nako", "Tabo", "Kaza", "Keylong", "Jispa", "Sissu", "Koksar", "Tirthan", "Shoja"]
    uttarakhand_bases = ["Kedarnath", "Gaurikund", "Guptkashi", "Munsiyari", "Chopta", "Auli", "Joshimath", "Badrinath", "Gangotri", "Yamunotri", "Harsil", "Dhanaulti", "Chakrata", "Lansdowne", "Mukteshwar", "Kausani"]
    northeast_bases = ["Ziro", "Tawang", "Dirang", "Bomdila", "Mechuka", "Daporijo", "Aalo", "Pasighat", "Roing", "Tezu", "Namsai", "Changlang", "Khonsa", "Longding", "Anini", "Tuting", "Yingkiong", "Dhemaji"]
    
    all_bases = himalayan_bases + uttarakhand_bases + northeast_bases
    suffixes = [" Gaon", " Village", " Ward 1", " Ward 2", " Ward 3", " Lower", " Upper", " Khas"]
    
    num_villages = random.randint(6, 15)
    villages = set()
    
    while len(villages) < num_villages:
        # Mix base names with realistic suffixes
        name = random.choice(all_bases)
        if random.random() > 0.4:
            name += random.choice(suffixes)
        villages.add(name)
        
    return sorted(list(villages))

def get_iot_sensor_data(state_name, district_name, village_name):
    """
    Simulates live IoT sensor readings for a specific village.
    """
    # Create a dynamic seed based on location and current hour so it changes slightly but is stable for short periods
    import time
    current_hour = int(time.time() / 3600)
    seed_str = f"{state_name}_{district_name}_{village_name}_{current_hour}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    
    # We use a separate random instance so we don't mess up global random state
    rng = random.Random(seed)
    
    # Soil Moisture (%)
    # In hilly regions during rain, soil moisture goes up. 
    # High soil moisture (> 60%) increases landslide risk significantly.
    soil_moisture = round(rng.uniform(20.0, 85.0), 2)
    
    # Localized Rainfall (mm/hr)
    # Often different from general weather station
    localized_rainfall = round(rng.uniform(0.0, 45.0), 2)
    
    # Slope Inclinometer / Tilt (mm)
    # Measures how much the slope has shifted. > 5mm is dangerous.
    tilt_mm = round(rng.uniform(0.1, 8.5), 2)
    
    return {
        "status": "LIVE",
        "soil_moisture_percent": soil_moisture,
        "localized_rainfall_mm_hr": localized_rainfall,
        "slope_tilt_mm": tilt_mm,
        "last_updated": "Just now"
    }
