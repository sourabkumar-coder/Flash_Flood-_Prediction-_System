import csv
from pathlib import Path

import geopandas as gpd
from services.elevation_service import get_elevations


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DISTRICT_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "india_districts.geojson"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "hilly_regions.csv"
)


def main():

    print("=" * 70)
    print("ALL-INDIA HILLY REGION DATASET")
    print("=" * 70)

    # Load districts
    districts = gpd.read_file(DISTRICT_FILE)

    print(f"Total districts: {len(districts)}")

    # Convert to geographic coordinates
    districts = districts.to_crs("EPSG:4326")

    # Representative point for each district
    representative_points = districts.geometry.representative_point()

    latitudes = representative_points.y.tolist()
    longitudes = representative_points.x.tolist()

    rows = []

    # Open-Meteo supports multiple coordinates.
    # Process in batches to keep requests manageable.
    batch_size = 50

    for start in range(
        0,
        len(districts),
        batch_size
    ):

        end = min(
            start + batch_size,
            len(districts)
        )

        print(
            f"Processing districts "
            f"{start + 1}-{end} / {len(districts)}"
        )

        batch_latitudes = latitudes[start:end]
        batch_longitudes = longitudes[start:end]

        try:

            elevations = get_elevations(
                batch_latitudes,
                batch_longitudes
            )

        except Exception as error:

            print(
                f"  Batch failed: {error}"
            )

            # Keep rows for failed districts
            for i in range(start, end):

                properties = districts.iloc[
                    i
                ]

                rows.append({
                    "state_name": properties[
                        "state_name"
                    ],
                    "district": properties[
                        "district"
                    ],
                    "latitude": latitudes[i],
                    "longitude": longitudes[i],
                    "elevation_m": None,
                    "status": "failed"
                })

            continue

        for offset, elevation in enumerate(
            elevations
        ):

            i = start + offset

            properties = districts.iloc[i]

            rows.append({
                "state_name": properties[
                    "state_name"
                ],
                "district": properties[
                    "district"
                ],
                "latitude": round(
                    latitudes[i],
                    6
                ),
                "longitude": round(
                    longitudes[i],
                    6
                ),
                "elevation_m": round(
                    float(elevation),
                    2
                ),
                "status": "success"
            })

    # Save
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        fieldnames = [
            "state_name",
            "district",
            "latitude",
            "longitude",
            "elevation_m",
            "status"
        ]

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(rows)

    successful = sum(
        row["status"] == "success"
        for row in rows
    )

    failed = sum(
        row["status"] == "failed"
        for row in rows
    )

    print()
    print("=" * 70)
    print("COMPLETE")
    print("=" * 70)

    print(f"Successful : {successful}")
    print(f"Failed     : {failed}")
    print(f"Output     : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()