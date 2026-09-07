import os
from dotenv import load_dotenv


load_dotenv()


token = os.getenv("BHUVAN_LULC_TOKEN")


print("=" * 60)
print("BHUVAN TOKEN TEST")
print("=" * 60)

if token:
    print("Bhuvan token loaded: YES")
    print("Token length:", len(token))
else:
    print("Bhuvan token loaded: NO")