import pandas as pd
from pathlib import Path


# Project root
BASE_DIR = Path(__file__).resolve().parent.parent

# Dataset path
DATA_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "flood_risk_dataset_india.csv"
)


# Load dataset
df = pd.read_csv(DATA_PATH)


print("=" * 70)
print("FLOOD DATASET ANALYSIS")
print("=" * 70)


# 1. Average values for Flood / No Flood
print("\nAverage values by flood status:")
print("-" * 70)

numeric_columns = df.select_dtypes(
    include=["int64", "float64"]
).columns

print(
    df.groupby("Flood Occurred")[numeric_columns]
    .mean()
    .T
)


# 2. Correlation with target
print("\nCorrelation with Flood Occurred:")
print("-" * 70)

correlations = (
    df[numeric_columns]
    .corr()["Flood Occurred"]
    .sort_values(ascending=False)
)

print(correlations)


# 3. Flood rate by Land Cover
print("\nFlood rate by Land Cover:")
print("-" * 70)

land_cover_rate = (
    df.groupby("Land Cover")["Flood Occurred"]
    .agg(["count", "mean"])
)

land_cover_rate["flood_percentage"] = (
    land_cover_rate["mean"] * 100
)

print(land_cover_rate)


# 4. Flood rate by Soil Type
print("\nFlood rate by Soil Type:")
print("-" * 70)

soil_rate = (
    df.groupby("Soil Type")["Flood Occurred"]
    .agg(["count", "mean"])
)

soil_rate["flood_percentage"] = (
    soil_rate["mean"] * 100
)

print(soil_rate)


# 5. Target distribution
print("\nTarget distribution:")
print("-" * 70)

print(df["Flood Occurred"].value_counts())

print("\nFlood percentage:")
print(df["Flood Occurred"].mean() * 100)


print("\n" + "=" * 70)
print("DATA ANALYSIS COMPLETE")
print("=" * 70)

print("\nUnique values of each feature:")
print("-" * 70)

for column in df.columns:
    print(
        f"{column:<30} "
        f"unique={df[column].nunique()}"
    )