import pandas as pd

INPUT = "../data/raw/flood_events/district_historical_flood_labels.csv"
OUTPUT = "../data/raw/flood_events/district_historical_features.csv"

df = pd.read_csv(INPUT)

features = (
    df.groupby(
        ["state_name", "district", "stcode", "dtcode"],
        as_index=False
    )
    .agg(
        historical_flood_events=("flood_events", "sum"),
        historical_flood_years=("year", "nunique"),
        historical_fatalities=("fatalities", "sum"),
        historical_displaced=("displaced", "sum"),
        historical_max_severity=("max_severity", "max"),
        historical_max_impact=("max_flood_impact_index", "max"),
    )
)

features.to_csv(OUTPUT, index=False)

print("Rows:", len(features))
print("Columns:")
print(features.columns.tolist())

print("\nTop historically affected districts:")
print(
    features.sort_values(
        "historical_flood_events",
        ascending=False
    )
    .head(20)
    .to_string(index=False)
)

print("\nSaved:")
print(OUTPUT)


















# import pandas as pd

# INPUT = "../data/raw/flood_events/district_historical_flood_labels.csv"
# OUTPUT = "../data/raw/flood_events/district_historical_features.csv"

# df = pd.read_csv(INPUT)

# features = (
#     df.groupby(
#         ["state_name", "district", "stcode", "dtcode"],
#         as_index=False
#     )
#     .agg(
#         historical_flood_events=("flood_events", "sum"),
#         historical_flood_years=("year", "nunique"),
#         historical_fatalities=("fatalities", "sum"),
#         historical_displaced=("displaced", "sum"),
#         historical_max_severity=("max_severity", "max"),
#         historical_max_impact=("max_flood_impact_index", "max"),
#     )
# )

# features.to_csv(OUTPUT, index=False)

# print("Rows:", len(features))
# print("Columns:")
# print(features.columns.tolist())

# print("\nTop historically affected districts:")
# print(
#     features.sort_values(
#         "historical_flood_events",
#         ascending=False
#     )
#     .head(20)
#     .to_string(index=False)
# )

# print("\nSaved:")
# print(OUTPUT)