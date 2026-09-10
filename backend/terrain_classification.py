import time
import math
import requests
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

INPUT = "../data/raw/hilly_regions_enriched.csv"
OUTPUT = "../data/raw/hilly_regions_final.csv"

API = "https://api.opentopodata.org/v1/srtm30m"

df = pd.read_csv(INPUT)

LAT = "latitude"
LON = "longitude"
ELEV = "elevation_m"

# ---------------------------------------------------------
# Generate 4 nearby points for slope estimation
# ---------------------------------------------------------

offset = 0.01

locations = []

for idx, row in df.iterrows():

    lat = float(row[LAT])
    lon = float(row[LON])

    points = [
        ("north", lat + offset, lon),
        ("south", lat - offset, lon),
        ("east", lat, lon + offset),
        ("west", lat, lon - offset),
    ]

    for direction, plat, plon in points:
        locations.append((idx, direction, plat, plon))


print("Total slope points:", len(locations))


# ---------------------------------------------------------
# Query SRTM30m in batches of 100
# ---------------------------------------------------------

elevation_points = {}

for start in range(0, len(locations), 100):

    batch = locations[start:start + 100]

    query = "|".join(
        f"{lat},{lon}"
        for _, _, lat, lon in batch
    )

    print(
        f"Querying {start + 1}-{start + len(batch)} "
        f"/ {len(locations)}"
    )

    try:

        response = requests.get(
            API,
            params={"locations": query},
            timeout=60
        )

        response.raise_for_status()

        results = response.json()["results"]

        for item, result in zip(batch, results):

            idx, direction, _, _ = item
            elevation = result.get("elevation")

            if elevation is not None:
                elevation_points[(idx, direction)] = float(elevation)

    except Exception as e:
        print("Batch failed:", e)

    time.sleep(1.2)


# ---------------------------------------------------------
# Calculate slope
# ---------------------------------------------------------

slopes = []

for idx, row in df.iterrows():

    center = float(row[ELEV])

    north = elevation_points.get((idx, "north"))
    south = elevation_points.get((idx, "south"))
    east = elevation_points.get((idx, "east"))
    west = elevation_points.get((idx, "west"))

    if None in [north, south, east, west]:

        slopes.append(np.nan)
        continue

    # Approximate distance for 0.01 degree
    lat_distance = 111000 * offset
    lon_distance = 111000 * offset * math.cos(
        math.radians(float(row[LAT]))
    )

    north_south_gradient = abs(north - south) / (2 * lat_distance)
    east_west_gradient = abs(east - west) / (2 * lon_distance)

    gradient = math.sqrt(
        north_south_gradient ** 2
        + east_west_gradient ** 2
    )

    slope_percent = gradient * 100

    slopes.append(slope_percent)


df["slope_percent"] = slopes


# ---------------------------------------------------------
# Data-driven terrain classification
# ---------------------------------------------------------

valid = df[
    df[ELEV].notna()
    & df["slope_percent"].notna()
].copy()

print("\nValid terrain records:", len(valid))

if len(valid) < 20:
    raise RuntimeError("Not enough terrain data.")


features = valid[[ELEV, "slope_percent"]].values

scaler = StandardScaler()
X = scaler.fit_transform(features)

# Unsupervised clustering — no state/district rules
kmeans = KMeans(
    n_clusters=3,
    random_state=42,
    n_init=20
)

clusters = kmeans.fit_predict(X)

valid["terrain_cluster"] = clusters


# Identify the cluster representing strongest terrain
cluster_score = {}

for cluster in sorted(valid["terrain_cluster"].unique()):

    subset = valid[
        valid["terrain_cluster"] == cluster
    ]

    elevation_score = subset[ELEV].mean()
    slope_score = subset["slope_percent"].mean()

    cluster_score[cluster] = (
        scaler.transform(
            [[elevation_score, slope_score]]
        )[0].mean()
    )


hilly_cluster = max(
    cluster_score,
    key=cluster_score.get
)


# ---------------------------------------------------------
# Write classification back
# ---------------------------------------------------------

df["terrain_cluster"] = np.nan
df.loc[valid.index, "terrain_cluster"] = (
    valid["terrain_cluster"]
)

df["terrain_class"] = "unknown"

df.loc[
    df["terrain_cluster"] == hilly_cluster,
    "terrain_class"
] = "hilly"

df.loc[
    df["terrain_cluster"].notna()
    & (df["terrain_cluster"] != hilly_cluster),
    "terrain_class"
] = "non_hilly"


# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

df.to_csv(OUTPUT, index=False)

print("\n==============================")
print("FINAL TERRAIN DATA")
print("==============================")

print(
    df[
        [
            "state_name",
            "district",
            ELEV,
            "slope_percent",
            "terrain_class"
        ]
    ].head(10)
)

print("\nClassification:")
print(
    df["terrain_class"]
    .value_counts(dropna=False)
)

print("\nSaved:")
print(OUTPUT)