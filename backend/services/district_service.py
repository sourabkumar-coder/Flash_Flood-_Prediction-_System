import json
import time
import requests
from pathlib import Path
from cachetools import TTLCache

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DISTRICTS_FILE = PROJECT_ROOT / "data" / "districts.json"

# Cache for coordinates (TTL: 1 hour)
_COORDINATE_CACHE = TTLCache(maxsize=1000, ttl=3600)

# District data cache
_DISTRICTS_DATA = None

# ---------------------------------------------------------------------------
# Required by Nominatim ToS:  https://operations.osmfoundation.org/policies/nominatim/
# ---------------------------------------------------------------------------
_NOMINATIM_HEADERS = {
    "User-Agent": "FlashFloodPredictionSystem/1.0 (open-source flood-risk tool)"
}

# ---------------------------------------------------------------------------
# Fallback: approximate state-level coordinates (centre of state)
# Used when Nominatim cannot geocode the district.
# ---------------------------------------------------------------------------
_STATE_COORDS = {
    "Andhra Pradesh":            (15.91, 79.74),
    "Arunachal Pradesh":         (28.21, 94.73),
    "Assam":                     (26.20, 92.93),
    "Bihar":                     (25.09, 85.31),
    "Chhattisgarh":              (21.27, 81.86),
    "Goa":                       (15.29, 74.12),
    "Gujarat":                   (22.25, 71.19),
    "Haryana":                   (29.05, 76.09),
    "Himachal Pradesh":          (31.10, 77.17),
    "Jharkhand":                 (23.61, 85.27),
    "Karnataka":                 (15.31, 75.71),
    "Kerala":                    (10.85, 76.27),
    "Madhya Pradesh":            (22.97, 78.65),
    "Maharashtra":               (19.75, 75.71),
    "Manipur":                   (24.66, 93.90),
    "Meghalaya":                 (25.46, 91.36),
    "Mizoram":                   (23.16, 92.93),
    "Nagaland":                  (26.15, 94.56),
    "Odisha":                    (20.94, 85.09),
    "Punjab":                    (31.14, 75.34),
    "Rajasthan":                 (27.02, 74.21),
    "Sikkim":                    (27.53, 88.51),
    "Tamil Nadu":                (10.93, 78.65),
    "Telangana":                 (17.12, 79.01),
    "Tripura":                   (23.94, 91.98),
    "Uttar Pradesh":             (26.84, 80.94),
    "Uttarakhand":               (30.06, 79.54),
    "West Bengal":               (22.98, 87.85),
    "Andaman and Nicobar Islands": (11.74, 92.65),
    "Chandigarh":                (30.73, 76.78),
    "Dadra and Nagar Haveli and Daman and Diu": (20.39, 72.83),
    "Delhi":                     (28.70, 77.10),
    "Jammu and Kashmir":         (33.73, 76.67),
    "Ladakh":                    (34.15, 77.57),
    "Lakshadweep":               (10.56, 72.64),
    "Puducherry":                (11.94, 79.83),
}

# ---------------------------------------------------------------------------
# Pre-built approximate district headquarters coordinates.
# Source: well-known district HQ cities of India.
# Keyed as  "state_casefold|district_casefold"
# ---------------------------------------------------------------------------
_DISTRICT_COORDS = {
    # Andhra Pradesh
    "andhra pradesh|anantapur":        (14.68, 77.60),
    "andhra pradesh|chittoor":         (13.21, 79.09),
    "andhra pradesh|east godavari":    (17.00, 82.23),
    "andhra pradesh|guntur":           (16.30, 80.43),
    "andhra pradesh|krishna":          (16.51, 80.61),
    "andhra pradesh|kurnool":          (15.82, 78.04),
    "andhra pradesh|nellore":          (14.44, 79.98),
    "andhra pradesh|prakasam":         (15.34, 79.60),
    "andhra pradesh|srikakulam":       (18.29, 83.89),
    "andhra pradesh|visakhapatnam":    (17.68, 83.21),
    "andhra pradesh|vizianagaram":     (18.10, 83.39),
    "andhra pradesh|west godavari":    (16.92, 81.33),
    "andhra pradesh|ysr kadapa":       (14.47, 78.82),
    "andhra pradesh|tirupati":         (13.62, 79.41),
    "andhra pradesh|kakinada":         (16.98, 82.24),
    "andhra pradesh|eluru":            (16.70, 81.09),
    "andhra pradesh|nandyal":          (15.47, 78.48),
    "andhra pradesh|bapatla":          (15.90, 80.46),
    # Arunachal Pradesh
    "arunachal pradesh|tawang":        (27.58, 91.86),
    "arunachal pradesh|west kameng":   (27.09, 92.51),
    "arunachal pradesh|east kameng":   (27.25, 93.00),
    "arunachal pradesh|papum pare":    (27.10, 93.60),
    "arunachal pradesh|lower subansiri": (27.50, 93.80),
    "arunachal pradesh|upper subansiri": (27.90, 93.90),
    "arunachal pradesh|west siang":    (28.10, 94.70),
    "arunachal pradesh|east siang":    (27.97, 95.32),
    "arunachal pradesh|upper siang":   (28.50, 95.00),
    "arunachal pradesh|lohit":         (27.93, 96.20),
    "arunachal pradesh|changlang":     (27.12, 95.77),
    "arunachal pradesh|tirap":         (26.70, 95.50),
    # Assam
    "assam|baksa":         (26.68, 91.17),
    "assam|barpeta":       (26.32, 91.00),
    "assam|bongaigaon":    (26.47, 90.55),
    "assam|cachar":        (24.82, 92.76),
    "assam|darrang":       (26.46, 92.05),
    "assam|dhemaji":       (27.47, 94.58),
    "assam|dhubri":        (26.02, 89.97),
    "assam|dibrugarh":     (27.48, 94.90),
    "assam|goalpara":      (26.17, 90.62),
    "assam|golaghat":      (26.52, 93.97),
    "assam|hailakandi":    (24.68, 92.56),
    "assam|jorhat":        (26.75, 94.21),
    "assam|kamrup":        (26.26, 91.53),
    "assam|kamrup metropolitan": (26.14, 91.73),
    "assam|karimganj":     (24.86, 92.35),
    "assam|kokrajhar":     (26.40, 90.27),
    "assam|lakhimpur":     (27.23, 94.10),
    "assam|morigaon":      (26.24, 92.33),
    "assam|nagaon":        (26.34, 92.69),
    "assam|nalbari":       (26.44, 91.44),
    "assam|sivasagar":     (26.98, 94.64),
    "assam|sonitpur":      (26.63, 92.79),
    "assam|tinsukia":      (27.49, 95.36),
    "assam|udalguri":      (26.75, 92.10),
    # Bihar
    "bihar|patna":         (25.59, 85.13),
    "bihar|gaya":          (24.75, 84.99),
    "bihar|muzaffarpur":   (26.12, 85.38),
    "bihar|bhagalpur":     (25.25, 87.01),
    "bihar|darbhanga":     (26.15, 85.89),
    "bihar|araria":        (26.14, 87.47),
    "bihar|begusarai":     (25.42, 86.13),
    "bihar|purnia":        (25.77, 87.47),
    "bihar|madhubani":     (26.35, 86.07),
    "bihar|samastipur":    (25.87, 85.77),
    "bihar|sitamarhi":     (26.59, 85.49),
    "bihar|vaishali":      (25.68, 85.22),
    "bihar|east champaran": (26.65, 84.91),
    "bihar|west champaran": (27.03, 84.32),
    "bihar|nalanda":       (25.00, 85.44),
    "bihar|nawada":        (24.88, 85.54),
    "bihar|rohtas":        (24.99, 83.80),
    "bihar|aurangabad":    (24.75, 84.37),
    "bihar|kaimur":        (25.04, 83.60),
    "bihar|buxar":         (25.56, 83.98),
    "bihar|bhojpur":       (25.57, 84.43),
    "bihar|saran":         (25.92, 84.73),
    "bihar|siwan":         (26.22, 84.36),
    "bihar|gopalganj":     (26.46, 84.44),
    "bihar|madhepura":     (25.91, 86.78),
    "bihar|supaul":        (26.12, 86.60),
    "bihar|saharsa":       (25.88, 86.59),
    "bihar|khagaria":      (25.50, 86.46),
    "bihar|katihar":       (25.57, 87.57),
    "bihar|kishanganj":    (26.10, 87.94),
    "bihar|sheohar":       (26.51, 85.30),
    "bihar|munger":        (25.37, 86.47),
    "bihar|banka":         (24.88, 86.92),
    "bihar|lakhisarai":    (25.16, 86.09),
    "bihar|sheikhpura":    (25.14, 85.84),
    "bihar|jamui":         (24.92, 86.22),
    "bihar|jehanabad":     (25.21, 84.99),
    "bihar|arwal":         (25.25, 84.68),
    # Chhattisgarh
    "chhattisgarh|raipur":       (21.25, 81.62),
    "chhattisgarh|bilaspur":     (22.08, 82.14),
    "chhattisgarh|durg":         (21.19, 81.28),
    "chhattisgarh|korba":        (22.34, 82.69),
    "chhattisgarh|raigarh":      (21.89, 83.39),
    "chhattisgarh|bastar":       (19.13, 81.95),
    "chhattisgarh|rajnandgaon":  (21.09, 81.03),
    "chhattisgarh|janjgir champa": (22.00, 82.57),
    "chhattisgarh|kabirdham":    (22.08, 81.27),
    "chhattisgarh|kanker":       (20.27, 81.49),
    "chhattisgarh|dhamtari":     (20.71, 81.54),
    "chhattisgarh|mahasamund":   (21.10, 82.10),
    "chhattisgarh|surguja":      (23.12, 83.20),
    # Goa
    "goa|north goa":    (15.61, 73.82),
    "goa|south goa":    (15.18, 74.07),
    # Gujarat
    "gujarat|ahmedabad":    (23.02, 72.57),
    "gujarat|surat":        (21.17, 72.83),
    "gujarat|vadodara":     (22.30, 73.19),
    "gujarat|rajkot":       (22.30, 70.78),
    "gujarat|gandhinagar":  (23.21, 72.68),
    "gujarat|kutch":        (23.73, 69.86),
    "gujarat|banaskantha":  (24.17, 72.42),
    "gujarat|mehsana":      (23.59, 72.38),
    "gujarat|jamnagar":     (22.47, 70.06),
    "gujarat|junagadh":     (21.52, 70.46),
    "gujarat|amreli":       (21.60, 71.22),
    "gujarat|bhavnagar":    (21.75, 72.15),
    "gujarat|anand":        (22.55, 72.95),
    "gujarat|kheda":        (22.74, 72.69),
    "gujarat|patan":        (23.84, 72.12),
    "gujarat|sabarkantha":  (23.62, 73.00),
    "gujarat|navsari":      (20.95, 72.93),
    "gujarat|valsad":       (20.59, 72.93),
    "gujarat|narmada":      (21.87, 73.49),
    "gujarat|bharuch":      (21.70, 72.99),
    "gujarat|tapi":         (21.13, 73.38),
    "gujarat|dang":         (20.75, 73.68),
    "gujarat|panchmahal":   (22.77, 73.51),
    "gujarat|dahod":        (22.83, 74.25),
    "gujarat|chhota udaipur": (22.30, 74.01),
    # Haryana
    "haryana|gurugram":     (28.46, 77.02),
    "haryana|faridabad":    (28.41, 77.31),
    "haryana|ambala":       (30.37, 76.76),
    "haryana|karnal":       (29.68, 76.98),
    "haryana|hisar":        (29.15, 75.72),
    "haryana|rohtak":       (28.89, 76.60),
    "haryana|sonipat":      (29.00, 77.01),
    "haryana|panipat":      (29.39, 76.97),
    "haryana|sirsa":        (29.53, 75.02),
    "haryana|bhiwani":      (28.79, 76.13),
    "haryana|mahendragarh": (28.27, 76.15),
    "haryana|rewari":       (28.19, 76.62),
    "haryana|jhajjar":      (28.61, 76.65),
    "haryana|fatehabad":    (29.51, 75.45),
    "haryana|kaithal":      (29.80, 76.39),
    "haryana|jind":         (29.32, 76.31),
    "haryana|kurukshetra":  (29.97, 76.87),
    "haryana|panchkula":    (30.69, 76.86),
    "haryana|yamunanagar":  (30.13, 77.28),
    "haryana|palwal":       (28.14, 77.32),
    "haryana|nuh":          (28.10, 77.00),
    # Himachal Pradesh
    "himachal pradesh|shimla":          (31.10, 77.17),
    "himachal pradesh|kangra":          (32.10, 76.27),
    "himachal pradesh|mandi":           (31.71, 76.93),
    "himachal pradesh|kullu":           (31.95, 77.10),
    "himachal pradesh|solan":           (30.90, 77.09),
    "himachal pradesh|una":             (31.46, 76.26),
    "himachal pradesh|hamirpur":        (31.68, 76.52),
    "himachal pradesh|bilaspur":        (31.33, 76.75),
    "himachal pradesh|chamba":          (32.55, 76.12),
    "himachal pradesh|sirmaur":         (30.56, 77.47),
    "himachal pradesh|kinnaur":         (31.58, 78.37),
    "himachal pradesh|lahaul and spiti": (32.52, 77.75),
    # Jharkhand
    "jharkhand|ranchi":             (23.34, 85.30),
    "jharkhand|dhanbad":            (23.79, 86.44),
    "jharkhand|bokaro":             (23.66, 85.99),
    "jharkhand|jamshedpur":         (22.80, 86.18),
    "jharkhand|east singhbhum":     (22.80, 86.18),
    "jharkhand|west singhbhum":     (22.60, 85.79),
    "jharkhand|hazaribagh":         (23.99, 85.36),
    "jharkhand|giridih":            (24.19, 86.31),
    "jharkhand|dumka":              (24.26, 87.25),
    "jharkhand|deoghar":            (24.48, 86.70),
    "jharkhand|godda":              (24.83, 87.21),
    "jharkhand|sahibganj":          (25.24, 87.63),
    "jharkhand|pakur":              (24.64, 87.84),
    "jharkhand|palamu":             (24.03, 84.07),
    "jharkhand|garhwa":             (24.16, 83.80),
    "jharkhand|chatra":             (24.20, 84.87),
    "jharkhand|latehar":            (23.74, 84.50),
    "jharkhand|lohardaga":          (23.43, 84.68),
    "jharkhand|gumla":              (23.05, 84.54),
    "jharkhand|simdega":            (22.61, 84.51),
    "jharkhand|koderma":            (24.46, 85.59),
    "jharkhand|jamtara":            (23.96, 86.80),
    "jharkhand|khunti":             (23.07, 85.27),
    "jharkhand|ramgarh":            (23.63, 85.51),
    # Karnataka
    "karnataka|bengaluru urban":    (12.97, 77.59),
    "karnataka|bengaluru rural":    (13.21, 77.50),
    "karnataka|mysuru":             (12.30, 76.65),
    "karnataka|belagavi":           (15.84, 74.49),
    "karnataka|dakshina kannada":   (12.86, 74.84),
    "karnataka|shivamogga":         (13.93, 75.57),
    "karnataka|tumakuru":           (13.33, 77.10),
    "karnataka|dharwad":            (15.45, 75.01),
    "karnataka|ballari":            (15.15, 76.92),
    "karnataka|kalaburagi":         (17.33, 76.82),
    "karnataka|mandya":             (12.52, 76.89),
    "karnataka|hassan":             (13.00, 76.09),
    "karnataka|udupi":              (13.34, 74.75),
    "karnataka|uttara kannada":     (14.78, 74.68),
    "karnataka|kodagu":             (12.33, 75.75),
    "karnataka|chikkamagaluru":     (13.32, 75.77),
    "karnataka|vijayapura":         (16.83, 75.71),
    "karnataka|raichur":            (16.20, 77.36),
    "karnataka|koppal":             (15.34, 76.15),
    "karnataka|gadag":              (15.43, 75.62),
    "karnataka|haveri":             (14.79, 75.40),
    "karnataka|chitradurga":        (14.23, 76.40),
    "karnataka|davanagere":         (14.46, 75.92),
    "karnataka|bidar":              (17.91, 77.53),
    "karnataka|yadgir":             (16.76, 77.14),
    "karnataka|kolar":              (13.13, 78.13),
    "karnataka|chikkaballapura":    (13.44, 77.72),
    "karnataka|ramanagara":         (12.72, 77.28),
    "karnataka|chamarajanagar":     (11.92, 76.94),
    "karnataka|bagalkot":           (16.18, 75.69),
    # Kerala
    "kerala|thiruvananthapuram":    (8.52, 76.93),
    "kerala|kollam":                (8.88, 76.59),
    "kerala|pathanamthitta":        (9.26, 76.78),
    "kerala|alappuzha":             (9.49, 76.32),
    "kerala|kottayam":              (9.59, 76.52),
    "kerala|idukki":                (9.91, 77.10),
    "kerala|ernakulam":             (9.98, 76.28),
    "kerala|thrissur":              (10.52, 76.21),
    "kerala|palakkad":              (10.78, 76.65),
    "kerala|malappuram":            (11.07, 76.07),
    "kerala|kozhikode":             (11.25, 75.77),
    "kerala|wayanad":               (11.61, 76.08),
    "kerala|kannur":                (11.87, 75.37),
    "kerala|kasaragod":             (12.49, 74.98),
    # Madhya Pradesh
    "madhya pradesh|bhopal":        (23.25, 77.40),
    "madhya pradesh|indore":        (22.71, 75.86),
    "madhya pradesh|jabalpur":      (23.18, 79.94),
    "madhya pradesh|gwalior":       (26.21, 78.18),
    "madhya pradesh|ujjain":        (23.17, 75.77),
    "madhya pradesh|sagar":         (23.83, 78.73),
    "madhya pradesh|rewa":          (24.53, 81.30),
    "madhya pradesh|satna":         (24.60, 80.83),
    "madhya pradesh|chhindwara":    (22.05, 78.93),
    "madhya pradesh|hoshangabad":   (22.75, 77.72),
    "madhya pradesh|balaghat":      (21.81, 80.18),
    "madhya pradesh|morena":        (26.50, 77.99),
    "madhya pradesh|bhind":         (26.56, 78.78),
    "madhya pradesh|datia":         (25.66, 78.45),
    "madhya pradesh|shivpuri":      (25.42, 77.66),
    "madhya pradesh|vidisha":       (23.52, 77.81),
    "madhya pradesh|raisen":        (23.33, 77.79),
    "madhya pradesh|rajgarh":       (23.83, 76.72),
    "madhya pradesh|shajapur":      (23.42, 76.27),
    "madhya pradesh|dewas":         (22.96, 76.05),
    "madhya pradesh|dhar":          (22.59, 75.29),
    "madhya pradesh|jhabua":        (22.77, 74.59),
    "madhya pradesh|ratlam":        (23.33, 75.04),
    "madhya pradesh|mandsaur":      (24.07, 75.06),
    "madhya pradesh|neemuch":       (24.47, 74.86),
    "madhya pradesh|khandwa":       (21.83, 76.35),
    "madhya pradesh|khargone":      (21.82, 75.62),
    "madhya pradesh|barwani":       (22.03, 74.90),
    "madhya pradesh|burhanpur":     (21.30, 76.23),
    "madhya pradesh|harda":         (22.34, 77.09),
    "madhya pradesh|betul":         (21.91, 77.89),
    "madhya pradesh|narmadapuram":  (22.75, 77.72),
    "madhya pradesh|seoni":         (22.08, 79.54),
    "madhya pradesh|narsinghpur":   (22.94, 79.19),
    "madhya pradesh|katni":         (23.83, 80.39),
    "madhya pradesh|panna":         (24.71, 80.18),
    "madhya pradesh|chhatarpur":    (24.91, 79.59),
    "madhya pradesh|tikamgarh":     (24.74, 78.83),
    "madhya pradesh|damoh":         (23.83, 79.44),
    "madhya pradesh|mandla":        (22.59, 80.38),
    "madhya pradesh|dindori":       (22.94, 81.07),
    "madhya pradesh|shahdol":       (23.29, 81.36),
    "madhya pradesh|umaria":        (23.52, 80.83),
    "madhya pradesh|anuppur":       (23.09, 81.68),
    "madhya pradesh|sidhi":         (24.41, 81.88),
    "madhya pradesh|singrauli":     (24.19, 82.67),
    "madhya pradesh|guna":          (24.65, 77.31),
    "madhya pradesh|ashoknagar":    (24.58, 77.73),
    "madhya pradesh|sheopur":       (25.66, 76.69),
    # Maharashtra
    "maharashtra|pune":             (18.52, 73.85),
    "maharashtra|mumbai city":      (18.97, 72.82),
    "maharashtra|mumbai suburban":  (19.17, 72.95),
    "maharashtra|thane":            (19.21, 72.97),
    "maharashtra|nagpur":           (21.14, 79.08),
    "maharashtra|nashik":           (19.99, 73.79),
    "maharashtra|aurangabad":       (19.87, 75.34),
    "maharashtra|kolhapur":         (16.70, 74.24),
    "maharashtra|solapur":          (17.68, 75.90),
    "maharashtra|amravati":         (20.93, 77.75),
    "maharashtra|ahmednagar":       (19.09, 74.73),
    "maharashtra|jalgaon":          (21.00, 75.56),
    "maharashtra|akola":            (20.70, 77.00),
    "maharashtra|latur":            (18.40, 76.56),
    "maharashtra|nanded":           (19.15, 77.31),
    "maharashtra|palghar":          (19.69, 72.76),
    "maharashtra|raigad":           (18.52, 73.18),
    "maharashtra|ratnagiri":        (17.00, 73.30),
    "maharashtra|sindhudurg":       (16.35, 73.72),
    "maharashtra|sangli":           (16.86, 74.56),
    "maharashtra|satara":           (17.68, 74.00),
    "maharashtra|beed":             (18.98, 75.76),
    "maharashtra|osmanabad":        (18.17, 76.04),
    "maharashtra|jalna":            (19.84, 75.88),
    "maharashtra|parbhani":         (19.27, 76.78),
    "maharashtra|hingoli":          (19.72, 77.15),
    "maharashtra|wardha":           (20.74, 78.60),
    "maharashtra|yavatmal":         (20.39, 78.12),
    "maharashtra|buldhana":         (20.53, 76.18),
    "maharashtra|washim":           (20.11, 77.14),
    "maharashtra|chandrapur":       (19.96, 79.30),
    "maharashtra|gadchiroli":       (20.18, 80.00),
    "maharashtra|gondia":           (21.46, 80.20),
    "maharashtra|bhandara":         (21.17, 79.65),
    "maharashtra|dhule":            (20.90, 74.77),
    "maharashtra|nandurbar":        (21.37, 74.24),
    # Manipur
    "manipur|imphal east":          (24.82, 93.95),
    "manipur|imphal west":          (24.80, 93.94),
    "manipur|bishnupur":            (24.62, 93.77),
    "manipur|thoubal":              (24.64, 93.99),
    "manipur|churachandpur":        (24.33, 93.68),
    "manipur|senapati":             (25.27, 94.01),
    "manipur|ukhrul":               (25.10, 94.36),
    "manipur|tamenglong":           (24.98, 93.50),
    "manipur|chandel":              (24.32, 94.02),
    # Meghalaya
    "meghalaya|east khasi hills":   (25.46, 91.38),
    "meghalaya|west khasi hills":   (25.51, 91.08),
    "meghalaya|ri bhoi":            (25.88, 91.88),
    "meghalaya|east garo hills":    (25.52, 90.62),
    "meghalaya|west garo hills":    (25.59, 90.00),
    "meghalaya|south garo hills":   (25.16, 90.00),
    "meghalaya|east jaintia hills": (25.38, 92.10),
    "meghalaya|west jaintia hills": (25.43, 92.16),
    # Mizoram
    "mizoram|aizawl":    (23.74, 92.71),
    "mizoram|lunglei":   (22.88, 92.73),
    "mizoram|champhai":  (23.45, 93.32),
    "mizoram|kolasib":   (24.22, 92.68),
    "mizoram|serchhip":  (23.31, 92.85),
    "mizoram|mamit":     (23.92, 92.48),
    "mizoram|saiha":     (22.49, 92.97),
    "mizoram|lawngtlai": (22.52, 92.90),
    # Nagaland
    "nagaland|kohima":      (25.67, 94.11),
    "nagaland|dimapur":     (25.90, 93.72),
    "nagaland|mokokchung":  (26.32, 94.52),
    "nagaland|wokha":       (26.10, 94.26),
    "nagaland|phek":        (25.86, 94.47),
    "nagaland|tuensang":    (26.27, 94.81),
    "nagaland|mon":         (26.72, 95.04),
    "nagaland|zunheboto":   (25.94, 94.52),
    "nagaland|longleng":    (26.60, 94.72),
    "nagaland|kiphire":     (25.96, 94.98),
    "nagaland|peren":       (25.53, 93.73),
    # Odisha
    "odisha|khordha":           (20.18, 85.71),
    "odisha|cuttack":           (20.46, 85.88),
    "odisha|ganjam":            (19.39, 84.98),
    "odisha|sundargarh":        (22.12, 84.03),
    "odisha|keonjhar":          (21.63, 85.58),
    "odisha|balasore":          (21.49, 86.93),
    "odisha|sambalpur":         (21.47, 83.97),
    "odisha|mayurbhanj":        (21.94, 86.73),
    "odisha|jajpur":            (20.84, 86.34),
    "odisha|bhadrak":           (21.05, 86.50),
    "odisha|kendrapara":        (20.49, 86.42),
    "odisha|jagatsinghpur":     (20.26, 86.17),
    "odisha|puri":              (19.81, 85.83),
    "odisha|nayagarh":          (20.13, 85.10),
    "odisha|angul":             (20.84, 85.10),
    "odisha|dhenkanal":         (20.66, 85.60),
    "odisha|kandhamal":         (20.11, 84.22),
    "odisha|gajapati":          (19.35, 84.17),
    "odisha|rayagada":          (19.17, 83.42),
    "odisha|koraput":           (18.81, 82.71),
    "odisha|malkangiri":        (18.35, 81.89),
    "odisha|nabarangpur":       (19.23, 82.55),
    "odisha|kalahandi":         (19.91, 83.17),
    "odisha|nuapada":           (20.79, 82.54),
    "odisha|bargarh":           (21.33, 83.62),
    "odisha|jharsuguda":        (21.85, 84.01),
    "odisha|deogarh":           (21.53, 84.74),
    "odisha|balangir":          (20.71, 83.49),
    "odisha|subarnapur":        (20.83, 83.91),
    "odisha|kendujhar":         (21.63, 85.58),
    # Punjab
    "punjab|ludhiana":          (30.90, 75.85),
    "punjab|amritsar":          (31.63, 74.87),
    "punjab|jalandhar":         (31.32, 75.58),
    "punjab|patiala":           (30.34, 76.39),
    "punjab|bathinda":          (30.21, 74.94),
    "punjab|hoshiarpur":        (31.53, 75.91),
    "punjab|mohali":            (30.70, 76.72),
    "punjab|gurdaspur":         (32.03, 75.40),
    "punjab|ferozepur":         (30.93, 74.62),
    "punjab|kapurthala":        (31.38, 75.38),
    "punjab|faridkot":          (30.67, 74.76),
    "punjab|moga":              (30.82, 75.17),
    "punjab|muktsar":           (30.48, 74.52),
    "punjab|barnala":           (30.37, 75.55),
    "punjab|mansa":             (29.98, 75.40),
    "punjab|sangrur":           (30.24, 75.84),
    "punjab|rupnagar":          (30.97, 76.52),
    "punjab|pathankot":         (32.27, 75.65),
    "punjab|tarn taran":        (31.45, 74.92),
    "punjab|fatehgarh sahib":   (30.64, 76.39),
    # Rajasthan
    "rajasthan|jaipur":         (26.91, 75.79),
    "rajasthan|jodhpur":        (26.29, 73.02),
    "rajasthan|kota":           (25.18, 75.83),
    "rajasthan|bikaner":        (28.02, 73.31),
    "rajasthan|udaipur":        (24.57, 73.69),
    "rajasthan|ajmer":          (26.45, 74.63),
    "rajasthan|alwar":          (27.56, 76.61),
    "rajasthan|bharatpur":      (27.21, 77.49),
    "rajasthan|sikar":          (27.61, 75.14),
    "rajasthan|jhunjhunu":      (28.13, 75.40),
    "rajasthan|churu":          (28.30, 74.96),
    "rajasthan|sri ganganagar": (29.91, 73.88),
    "rajasthan|hanumangarh":    (29.58, 74.33),
    "rajasthan|nagaur":         (27.20, 73.73),
    "rajasthan|barmer":         (25.75, 71.39),
    "rajasthan|jalore":         (25.35, 72.61),
    "rajasthan|sirohi":         (24.89, 72.86),
    "rajasthan|pali":           (25.77, 73.32),
    "rajasthan|rajsamand":      (25.08, 73.88),
    "rajasthan|bhilwara":       (25.35, 74.64),
    "rajasthan|chittorgarh":    (24.88, 74.62),
    "rajasthan|dungarpur":      (23.84, 73.72),
    "rajasthan|banswara":       (23.54, 74.44),
    "rajasthan|pratapgarh":     (24.03, 74.78),
    "rajasthan|baran":          (25.10, 76.52),
    "rajasthan|jhalawar":       (24.59, 76.16),
    "rajasthan|sawai madhopur": (26.01, 76.35),
    "rajasthan|tonk":           (26.16, 75.78),
    "rajasthan|dausa":          (26.89, 76.33),
    "rajasthan|jaisalmer":      (26.92, 70.90),
    "rajasthan|dholpur":        (26.70, 77.89),
    "rajasthan|karauli":        (26.50, 77.02),
    # Sikkim
    "sikkim|gangtok":   (27.33, 88.61),
    "sikkim|mangan":    (27.50, 88.53),
    "sikkim|namchi":    (27.16, 88.36),
    "sikkim|geyzing":   (27.25, 88.26),
    # Tamil Nadu
    "tamil nadu|chennai":           (13.08, 80.27),
    "tamil nadu|coimbatore":        (11.01, 76.97),
    "tamil nadu|madurai":           (9.92,  78.11),
    "tamil nadu|tiruchirappalli":   (10.79, 78.70),
    "tamil nadu|tirunelveli":       (8.72,  77.70),
    "tamil nadu|salem":             (11.65, 78.15),
    "tamil nadu|vellore":           (12.92, 79.13),
    "tamil nadu|erode":             (11.34, 77.72),
    "tamil nadu|tiruppur":          (11.10, 77.34),
    "tamil nadu|thoothukudi":       (8.78,  78.14),
    "tamil nadu|kanchipuram":       (12.83, 79.70),
    "tamil nadu|thanjavur":         (10.79, 79.14),
    "tamil nadu|dharmapuri":        (12.13, 78.15),
    "tamil nadu|dindigul":          (10.36, 77.97),
    "tamil nadu|nagapattinam":      (10.76, 79.84),
    "tamil nadu|nilgiris":          (11.41, 76.69),
    "tamil nadu|pudukkottai":       (10.37, 78.82),
    "tamil nadu|ramanathapuram":    (9.37,  78.86),
    "tamil nadu|sivaganga":         (9.84,  78.48),
    "tamil nadu|theni":             (10.01, 77.48),
    "tamil nadu|virudhunagar":      (9.57,  77.96),
    "tamil nadu|namakkal":          (11.22, 78.17),
    "tamil nadu|karur":             (10.96, 78.08),
    "tamil nadu|perambalur":        (11.23, 78.88),
    "tamil nadu|tiruvarur":         (10.77, 79.64),
    "tamil nadu|ariyalur":          (11.14, 79.07),
    "tamil nadu|kanyakumari":       (8.08,  77.54),
    "tamil nadu|krishnagiri":       (12.52, 78.21),
    "tamil nadu|cuddalore":         (11.75, 79.76),
    "tamil nadu|kallakurichi":      (11.74, 78.96),
    "tamil nadu|villupuram":        (11.93, 79.49),
    "tamil nadu|tenkasi":           (8.96,  77.32),
    "tamil nadu|tiruvannamalai":    (12.22, 79.07),
    "tamil nadu|tiruvallur":        (13.14, 79.91),
    "tamil nadu|ranipet":           (12.93, 79.33),
    "tamil nadu|chengalpattu":      (12.69, 80.01),
    "tamil nadu|mayiladuthurai":    (11.10, 79.65),
    "tamil nadu|tirupathur":        (12.49, 78.57),
    # Telangana
    "telangana|hyderabad":          (17.38, 78.48),
    "telangana|rangareddy":         (17.15, 78.25),
    "telangana|medchal malkajgiri": (17.62, 78.55),
    "telangana|warangal":           (17.97, 79.59),
    "telangana|karimnagar":         (18.44, 79.12),
    "telangana|nalgonda":           (17.06, 79.27),
    "telangana|khammam":            (17.24, 80.15),
    "telangana|nizamabad":          (18.67, 78.10),
    "telangana|mahabubnagar":       (16.74, 77.99),
    "telangana|adilabad":           (19.66, 78.53),
    "telangana|medak":              (18.05, 78.26),
    "telangana|sangareddy":         (17.62, 78.09),
    "telangana|siddipet":           (18.10, 78.85),
    "telangana|mancherial":         (18.87, 79.46),
    "telangana|jagtial":            (18.79, 78.91),
    "telangana|peddapalli":         (18.61, 79.38),
    "telangana|kamareddy":          (18.32, 78.33),
    "telangana|rajanna sircilla":   (18.38, 78.84),
    "telangana|bhadradri kothagudem": (17.55, 80.62),
    "telangana|suryapet":           (17.14, 79.62),
    "telangana|yadadri bhuvanagiri": (17.60, 78.91),
    "telangana|jangaon":            (17.72, 79.15),
    "telangana|nagarkurnool":       (16.49, 78.32),
    "telangana|wanaparthy":         (16.36, 78.06),
    "telangana|jogulamba gadwal":   (16.24, 77.80),
    "telangana|narayanpet":         (16.74, 77.50),
    "telangana|vikarabad":          (17.34, 77.89),
    "telangana|nirmal":             (19.10, 78.34),
    "telangana|kumuram bheem asifabad": (19.37, 79.30),
    "telangana|jayashankar bhupalpally": (18.45, 79.89),
    "telangana|mulugu":             (18.19, 80.22),
    "telangana|mahabubabad":        (17.60, 80.01),
    # Tripura
    "tripura|west tripura":     (23.75, 91.27),
    "tripura|south tripura":    (23.17, 91.45),
    "tripura|north tripura":    (24.41, 92.01),
    "tripura|dhalai":           (24.00, 91.87),
    "tripura|gomati":           (23.40, 91.76),
    "tripura|sepahijala":       (23.63, 91.29),
    "tripura|khowai":           (24.07, 91.60),
    "tripura|unakoti":          (24.31, 92.04),
    # Uttar Pradesh
    "uttar pradesh|lucknow":            (26.84, 80.94),
    "uttar pradesh|kanpur nagar":       (26.46, 80.33),
    "uttar pradesh|agra":               (27.17, 78.01),
    "uttar pradesh|varanasi":           (25.31, 83.00),
    "uttar pradesh|prayagraj":          (25.44, 81.84),
    "uttar pradesh|meerut":             (28.98, 77.70),
    "uttar pradesh|ghaziabad":          (28.66, 77.43),
    "uttar pradesh|gorakhpur":          (26.75, 83.37),
    "uttar pradesh|bareilly":           (28.35, 79.42),
    "uttar pradesh|aligarh":            (27.88, 78.08),
    "uttar pradesh|moradabad":          (28.84, 78.77),
    "uttar pradesh|saharanpur":         (29.96, 77.55),
    "uttar pradesh|gautam buddha nagar": (28.57, 77.32),
    "uttar pradesh|muzaffarnagar":      (29.47, 77.70),
    "uttar pradesh|bulandshahr":        (28.40, 77.85),
    "uttar pradesh|azamgarh":           (26.07, 83.18),
    "uttar pradesh|jhansi":             (25.44, 78.58),
    "uttar pradesh|ayodhya":            (26.79, 82.19),
    "uttar pradesh|mathura":            (27.49, 77.67),
    "uttar pradesh|firozabad":          (27.15, 78.39),
    "uttar pradesh|gonda":              (27.13, 81.96),
    "uttar pradesh|bahraich":           (27.57, 81.60),
    "uttar pradesh|balrampur":          (27.43, 82.17),
    "uttar pradesh|sitapur":            (27.56, 80.68),
    "uttar pradesh|hardoi":             (27.39, 80.12),
    "uttar pradesh|unnao":              (26.53, 80.49),
    "uttar pradesh|rae bareli":         (26.22, 81.23),
    "uttar pradesh|raebareli":          (26.22, 81.23),
    "uttar pradesh|fatehpur":           (25.93, 80.82),
    "uttar pradesh|etawah":             (26.78, 79.02),
    "uttar pradesh|mainpuri":           (27.23, 79.02),
    "uttar pradesh|farrukhabad":        (27.39, 79.57),
    "uttar pradesh|kannauj":            (27.05, 79.91),
    "uttar pradesh|etah":               (27.64, 78.67),
    "uttar pradesh|banda":              (25.47, 80.33),
    "uttar pradesh|chitrakoot":         (25.20, 80.89),
    "uttar pradesh|hamirpur":           (25.95, 80.14),
    "uttar pradesh|mahoba":             (25.29, 79.87),
    "uttar pradesh|lalitpur":           (24.69, 78.41),
    "uttar pradesh|jalaun":             (26.14, 79.33),
    "uttar pradesh|mirzapur":           (25.14, 82.58),
    "uttar pradesh|sonbhadra":          (24.68, 83.07),
    "uttar pradesh|sant ravidas nagar": (25.36, 82.66),
    "uttar pradesh|bhadohi":            (25.39, 82.57),
    "uttar pradesh|ghazipur":           (25.58, 83.58),
    "uttar pradesh|ballia":             (25.76, 84.15),
    "uttar pradesh|deoria":             (26.50, 83.78),
    "uttar pradesh|basti":              (26.80, 82.73),
    "uttar pradesh|siddharthnagar":     (27.30, 83.06),
    "uttar pradesh|sant kabir nagar":   (26.80, 83.05),
    "uttar pradesh|ambedkar nagar":     (26.43, 82.70),
    "uttar pradesh|sultanpur":          (26.26, 82.07),
    "uttar pradesh|amethi":             (26.16, 81.88),
    "uttar pradesh|jaunpur":            (25.73, 82.69),
    "uttar pradesh|mau":                (25.94, 83.56),
    "uttar pradesh|lakhimpur kheri":    (27.95, 80.78),
    "uttar pradesh|kheri":              (27.95, 80.78),
    "uttar pradesh|pilibhit":           (28.63, 79.80),
    "uttar pradesh|shahjahanpur":       (27.88, 79.90),
    "uttar pradesh|rampur":             (28.79, 79.00),
    "uttar pradesh|amroha":             (28.90, 78.47),
    "uttar pradesh|sambhal":            (28.59, 78.57),
    "uttar pradesh|budaun":             (28.03, 79.12),
    "uttar pradesh|bijnor":             (29.37, 78.13),
    "uttar pradesh|hapur":              (28.72, 77.77),
    "uttar pradesh|baghpat":            (28.94, 77.22),
    "uttar pradesh|shamli":             (29.44, 77.31),
    "uttar pradesh|auraiya":            (26.47, 79.52),
    "uttar pradesh|kanpur dehat":       (26.41, 79.93),
    "uttar pradesh|hathras":            (27.60, 78.06),
    "uttar pradesh|kasganj":            (27.80, 78.64),
    "uttar pradesh|kushinagar":         (26.74, 83.89),
    "uttar pradesh|pratapgarh":         (25.89, 81.98),
    "uttar pradesh|kaushambi":          (25.52, 81.38),
    "uttar pradesh|shravasti":          (27.69, 81.81),
    "uttar pradesh|barabanki":          (26.93, 81.18),
    "uttar pradesh|chandauli":          (25.27, 83.27),
    # Uttarakhand
    "uttarakhand|dehradun":         (30.31, 78.03),
    "uttarakhand|haridwar":         (29.94, 78.15),
    "uttarakhand|nainital":         (29.39, 79.46),
    "uttarakhand|udham singh nagar": (28.99, 79.51),
    "uttarakhand|pauri garhwal":    (29.80, 78.80),
    "uttarakhand|tehri garhwal":    (30.38, 78.43),
    "uttarakhand|chamoli":          (30.41, 79.33),
    "uttarakhand|rudraprayag":      (30.28, 78.98),
    "uttarakhand|uttarkashi":       (30.72, 78.44),
    "uttarakhand|almora":           (29.59, 79.65),
    "uttarakhand|bageshwar":        (29.83, 79.77),
    "uttarakhand|pithoragarh":      (29.58, 80.21),
    "uttarakhand|champawat":        (29.33, 80.09),
    # West Bengal
    "west bengal|kolkata":                  (22.56, 88.36),
    "west bengal|howrah":                   (22.58, 88.31),
    "west bengal|north 24 parganas":        (22.78, 88.39),
    "west bengal|south 24 parganas":        (22.15, 88.47),
    "west bengal|hooghly":                  (22.89, 88.39),
    "west bengal|bardhaman":                (23.23, 87.85),
    "west bengal|paschim bardhaman":        (23.23, 87.85),
    "west bengal|purba bardhaman":          (23.25, 87.87),
    "west bengal|nadia":                    (23.46, 88.55),
    "west bengal|murshidabad":              (24.18, 88.28),
    "west bengal|birbhum":                  (23.90, 87.53),
    "west bengal|malda":                    (25.01, 88.14),
    "west bengal|uttar dinajpur":           (25.62, 88.12),
    "west bengal|dakshin dinajpur":         (25.37, 88.74),
    "west bengal|darjeeling":               (27.04, 88.26),
    "west bengal|jalpaiguri":               (26.54, 88.72),
    "west bengal|alipurduar":               (26.49, 89.52),
    "west bengal|cooch behar":              (26.33, 89.44),
    "west bengal|bankura":                  (23.23, 87.07),
    "west bengal|purulia":                  (23.33, 86.36),
    "west bengal|jhargram":                 (22.45, 86.99),
    "west bengal|paschim medinipur":        (22.42, 87.32),
    "west bengal|purba medinipur":          (22.43, 87.74),
    "west bengal|kalimpong":                (27.06, 88.47),
    # UTs
    "delhi|new delhi":              (28.61, 77.21),
    "delhi|central delhi":          (28.65, 77.23),
    "delhi|east delhi":             (28.66, 77.30),
    "delhi|north delhi":            (28.72, 77.20),
    "delhi|north east delhi":       (28.70, 77.27),
    "delhi|north west delhi":       (28.73, 77.12),
    "delhi|shahdara":               (28.68, 77.29),
    "delhi|south delhi":            (28.53, 77.23),
    "delhi|south east delhi":       (28.59, 77.29),
    "delhi|south west delhi":       (28.57, 77.10),
    "delhi|west delhi":             (28.65, 77.10),
    "jammu and kashmir|srinagar":   (34.08, 74.79),
    "jammu and kashmir|jammu":      (32.73, 74.87),
    "jammu and kashmir|anantnag":   (33.73, 75.15),
    "jammu and kashmir|baramulla":  (34.20, 74.34),
    "jammu and kashmir|budgam":     (33.95, 74.72),
    "jammu and kashmir|kupwara":    (34.52, 74.26),
    "jammu and kashmir|pulwama":    (33.88, 74.90),
    "jammu and kashmir|kulgam":     (33.64, 75.02),
    "jammu and kashmir|shopian":    (33.71, 74.83),
    "jammu and kashmir|kathua":     (32.38, 75.52),
    "jammu and kashmir|udhampur":   (32.91, 75.14),
    "jammu and kashmir|rajouri":    (33.37, 74.31),
    "jammu and kashmir|poonch":     (33.77, 74.09),
    "jammu and kashmir|ramban":     (33.24, 75.24),
    "jammu and kashmir|reasi":      (33.08, 74.83),
    "jammu and kashmir|samba":      (32.57, 75.12),
    "jammu and kashmir|doda":       (33.14, 75.54),
    "jammu and kashmir|kishtwar":   (33.31, 75.77),
    "jammu and kashmir|ganderbal":  (34.22, 74.78),
    "ladakh|leh":    (34.16, 77.58),
    "ladakh|kargil": (34.55, 76.13),
    "chandigarh|chandigarh": (30.73, 76.78),
    "goa|north goa":  (15.61, 73.82),
    "goa|south goa":  (15.18, 74.07),
    "sikkim|gangtok": (27.33, 88.61),
    "andaman and nicobar islands|south andaman":            (11.66, 92.74),
    "andaman and nicobar islands|north and middle andaman": (12.69, 92.85),
    "andaman and nicobar islands|nicobar":                  (7.03,  93.79),
}


def _load_districts_data():
    global _DISTRICTS_DATA
    if _DISTRICTS_DATA is not None:
        return _DISTRICTS_DATA
    if not DISTRICTS_FILE.exists():
        raise FileNotFoundError(f"Districts data file not found: {DISTRICTS_FILE}")
    with open(DISTRICTS_FILE, "r", encoding="utf-8") as file:
        _DISTRICTS_DATA = json.load(file)
    return _DISTRICTS_DATA


def get_states():
    data = _load_districts_data()
    return sorted(data.keys())


def get_districts_by_state(state_name):
    if not state_name:
        return []
    data = _load_districts_data()
    requested_state = state_name.strip().casefold()
    for state, districts in data.items():
        if state.strip().casefold() == requested_state:
            return sorted(districts)
    return []


def _lookup_local(state_name, district_name):
    """Check the pre-built coordinate dictionary first (instant, no network)."""
    key = f"{state_name.strip().casefold()}|{district_name.strip().casefold()}"
    if key in _DISTRICT_COORDS:
        lat, lon = _DISTRICT_COORDS[key]
        return {
            "state": state_name.strip(),
            "district": district_name.strip(),
            "latitude": lat,
            "longitude": lon,
        }
    return None


def _nominatim_geocode(query):
    """Call Nominatim with required User-Agent; return (lat, lon) or None."""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
            headers=_NOMINATIM_HEADERS,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None


def get_district_coordinates(state_name, district_name):
    """
    Return (state, district, latitude, longitude) for a district.

    Resolution order:
      1. In-memory TTL cache (avoid repeated lookups)
      2. Pre-built local coordinate dictionary (instant, no network)
      3. Nominatim OSM API with User-Agent (network)
      4. State-level fallback coordinates (hardcoded)
    """
    if not state_name or not district_name:
        return None

    cache_key = f"{state_name.strip().casefold()}_{district_name.strip().casefold()}"

    # 1 — cache
    if cache_key in _COORDINATE_CACHE:
        return _COORDINATE_CACHE[cache_key]

    # 2 — local dictionary (no network, instant)
    local = _lookup_local(state_name, district_name)
    if local:
        _COORDINATE_CACHE[cache_key] = local
        return local

    # 3 — Nominatim (network, with proper User-Agent)
    for query in [
        f"{district_name}, {state_name}, India",
        f"{district_name} district, {state_name}, India",
        f"{district_name}, India",
    ]:
        result = _nominatim_geocode(query)
        if result:
            time.sleep(1)  # Nominatim rate-limit: 1 req/s
            coords = {
                "state": state_name.strip(),
                "district": district_name.strip(),
                "latitude": result[0],
                "longitude": result[1],
            }
            _COORDINATE_CACHE[cache_key] = coords
            return coords
        time.sleep(1)

    # 4 — state-level fallback
    state_key = state_name.strip()
    if state_key in _STATE_COORDS:
        lat, lon = _STATE_COORDS[state_key]
        coords = {
            "state": state_name.strip(),
            "district": district_name.strip(),
            "latitude": lat,
            "longitude": lon,
        }
        _COORDINATE_CACHE[cache_key] = coords
        return coords

    return None


def find_nearest_district(latitude, longitude):
    """
    Find the closest known Indian district by calculating distance to district centroids.
    Used for instant offline reverse-geocoding.
    """
    best_dist = float("inf")
    best_match = None

    for key, (lat, lon) in _DISTRICT_COORDS.items():
        # Euclidean approximation squared
        d = (latitude - lat) ** 2 + (longitude - lon) ** 2
        if d < best_dist:
            best_dist = d
            best_match = key

    if best_match:
        state_part, dist_part = best_match.split("|")
        return {
            "state": state_part.title(),
            "district": dist_part.title(),
            "latitude": latitude,
            "longitude": longitude,
        }

    return None


def reverse_geocode_coordinates(latitude, longitude):
    """
    Resolve (latitude, longitude) coordinates to State and District.
    1. First tries Nominatim reverse geocoding (live place name).
    2. Falls back to nearest centroid in local district database (instant, offline).
    """
    state = None
    district = None
    village = None
    display_name = None

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": latitude,
                "lon": longitude,
                "format": "json",
                "zoom": 12,
            },
            headers=_NOMINATIM_HEADERS,
            timeout=5,
        )
        if response.status_code == 200:
            data = response.json()
            addr = data.get("address", {})
            raw_state = addr.get("state") or addr.get("province") or addr.get("region")
            raw_district = (
                addr.get("state_district")
                or addr.get("county")
                or addr.get("district")
                or addr.get("city")
                or addr.get("municipality")
            )
            village = (
                addr.get("suburb")
                or addr.get("neighbourhood")
                or addr.get("village")
                or addr.get("town")
                or addr.get("city_district")
            )
            display_name = data.get("display_name")

            if raw_state:
                state_clean = raw_state.replace("State of ", "").replace("State", "").strip()
                for known_state in get_states():
                    if known_state.casefold() == state_clean.casefold():
                        state = known_state
                        break
                if not state:
                    state = state_clean

            if raw_district:
                district_clean = raw_district.replace(" District", "").replace(" district", "").strip()
                if state:
                    districts_in_state = get_districts_by_state(state)
                    for known_dist in districts_in_state:
                        if known_dist.casefold() == district_clean.casefold() or known_dist.casefold() in district_clean.casefold() or district_clean.casefold() in known_dist.casefold():
                            district = known_dist
                            break
                if not district:
                    district = district_clean

    except Exception:
        pass

    # If state or district still missing, use nearest known district centroid
    if not state or not district:
        nearest = find_nearest_district(latitude, longitude)
        if nearest:
            state = state or nearest.get("state")
            district = district or nearest.get("district")

    return {
        "state": state or "India",
        "district": district or f"GPS ({latitude:.4f}, {longitude:.4f})",
        "village": village,
        "latitude": latitude,
        "longitude": longitude,
        "display_name": display_name,
    }



def get_district_by_name(state_name, district_name):
    """Kept for compatibility with terrain_service. Returns None (no GeoJSON)."""
    return None

