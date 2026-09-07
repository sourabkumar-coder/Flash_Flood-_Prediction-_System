import geopandas as gpd
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

FLOOD_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "flood_events"
    / "Global_Flood_Records.gpkg"
)

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
    / "flood_events"
    / "india_district_flood_events.gpkg"
)


def main():
    print("Loading DFO flood data...")
    floods = gpd.read_file(
        FLOOD_FILE,
        layer="combined_floods"
    )

    print("Loading India district boundaries...")
    districts = gpd.read_file(DISTRICT_FILE)

    # Keep only India flood events
    floods = floods[
        floods["Country"]
        .astype(str)
        .str.strip()
        .str.casefold()
        == "india"
    ].copy()

    print(f"India flood events: {len(floods)}")
    print(f"Districts: {len(districts)}")

    # Convert both datasets to the same CRS
    floods = floods.to_crs(districts.crs)

    print(f"Common CRS: {districts.crs}")

    # Keep only required district information
    district_columns = [
        "state_name",
        "district",
        "stcode",
        "dtcode",
        "geometry",
    ]

    districts = districts[district_columns].copy()

    # Spatial intersection
    print("Performing spatial intersection...")

    joined = gpd.sjoin(
        floods,
        districts,
        how="inner",
        predicate="intersects",
    )

    print(f"Flood-district intersections: {len(joined)}")

    # Remove spatial join helper column
    if "index_right" in joined.columns:
        joined = joined.drop(columns=["index_right"])

    # Save result
    print("Saving result...")

    joined.to_file(
        OUTPUT_FILE,
        layer="district_flood_events",
        driver="GPKG",
    )

    print()
    print("=" * 70)
    print("DONE")
    print("=" * 70)
    print(f"Output: {OUTPUT_FILE}")
    print(f"Rows: {len(joined)}")

    print()
    print("Sample:")
    print(
        joined[
            [
                "state_name",
                "district",
                "BeginDate",
                "EndDate",
                "MainCause",
                "Severity",
                "FloodImpactIndex",
            ]
        ]
        .head(10)
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()