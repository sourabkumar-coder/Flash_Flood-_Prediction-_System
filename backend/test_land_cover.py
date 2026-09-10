import os
import requests

from dotenv import load_dotenv


load_dotenv()

TOKEN = os.getenv("BHUVAN_LULC_TOKEN")

URL = (
    "https://bhuvan-app1.nrsc.gov.in/"
    "api/lulc250k/curl_lulc250k.php"
)

# Kullu district centroid
latitude = 31.902051755645207
longitude = 77.39915375718923

# Small real geographic polygon around Kullu centroid
delta = 0.01

polygon = (
    f"POLYGON (("
    f"{longitude-delta} {latitude-delta}, "
    f"{longitude+delta} {latitude-delta}, "
    f"{longitude+delta} {latitude+delta}, "
    f"{longitude-delta} {latitude+delta}, "
    f"{longitude-delta} {latitude-delta}"
    f"))"
)

params = {
    "polygon": polygon,
    "year": "2024_25",
    "option": "json",
    "token": TOKEN
}

print("=" * 60)
print("BHUVAN LULC 250K SMALL AOI TEST")
print("=" * 60)

print()
print("Token loaded:", bool(TOKEN))
print("Polygon length:", len(polygon))
print("Year:", params["year"])

try:

    response = requests.post(
        URL,
        params=params,
        headers={
            "Content-Type": "application/json"
        },
        timeout=60
    )

    print()
    print("Status Code:", response.status_code)
    print("Content Type:", response.headers.get("Content-Type"))
    print("Response Size:", len(response.content), "bytes")

    print()
    print("Response:")
    print("-" * 60)
    print(response.text[:5000])

except Exception as error:

    print()
    print("REQUEST FAILED")
    print(type(error).__name__)
    print(error)