import pandas as pd
import joblib

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

from xgboost import XGBClassifier


# ============================================================
# 1. PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "flood_risk_dataset_india_v2.csv"
)

MODEL_DIR = BASE_DIR / "ml" / "models"

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# 2. LOAD DATASET
# ============================================================

print("=" * 70)
print("FLASH FLOOD PREDICTION - XGBOOST TRAINING")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

print(f"\nDataset shape: {df.shape}")


# ============================================================
# 3. TARGET
# ============================================================

TARGET = "Flood Occurred"


# ------------------------------------------------------------
# IMPORTANT:
# These columns were created from the target-generation
# process and must NOT be used as input features.
# ------------------------------------------------------------

LEAKAGE_COLUMNS = [
    "Flood Risk Score",
    "Risk Level"
]


# Remove target + leakage columns
X = df.drop(
    columns=[
        TARGET,
        *LEAKAGE_COLUMNS
    ]
)

y = df[TARGET]


print("\nFeatures used for training:")
for column in X.columns:
    print(" -", column)


print("\nTarget:")
print(y.value_counts())


# ============================================================
# 4. FEATURE TYPES
# ============================================================

categorical_features = [
    "Land Cover",
    "Soil Type"
]

numeric_features = [
    column
    for column in X.columns
    if column not in categorical_features
]


# ============================================================
# 5. TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print("\nTrain/Test Split:")
print(f"Training: {X_train.shape}")
print(f"Testing : {X_test.shape}")


# ============================================================
# 6. PREPROCESSING
# ============================================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(
                handle_unknown="ignore",
                sparse_output=False
            ),
            categorical_features
        ),

        (
            "numeric",
            "passthrough",
            numeric_features
        )
    ]
)


# ============================================================
# 7. XGBOOST MODEL
# ============================================================

model = XGBClassifier(

    # Number of boosting rounds
    n_estimators=400,

    # Learning speed
    learning_rate=0.05,

    # Maximum tree depth
    max_depth=5,

    # Minimum child weight
    min_child_weight=2,

    # Randomly sample rows
    subsample=0.85,

    # Randomly sample features
    colsample_bytree=0.85,

    # Regularization
    reg_alpha=0.05,
    reg_lambda=1.0,

    # Binary classification
    objective="binary:logistic",

    # Evaluation metric
    eval_metric="logloss",

    # Reproducibility
    random_state=42,

    # Use all CPU cores
    n_jobs=-1
)


# ============================================================
# 8. COMPLETE PIPELINE
# ============================================================

pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),

        (
            "model",
            model
        )
    ]
)


# ============================================================
# 9. TRAIN
# ============================================================

print("\n" + "=" * 70)
print("TRAINING XGBOOST")
print("=" * 70)

pipeline.fit(
    X_train,
    y_train
)

print("\n✓ XGBoost training completed")


# ============================================================
# 10. PREDICTION
# ============================================================

y_pred = pipeline.predict(X_test)

y_probability = pipeline.predict_proba(
    X_test
)[:, 1]


# ============================================================
# 11. EVALUATION
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)

roc_auc = roc_auc_score(
    y_test,
    y_probability
)

cm = confusion_matrix(
    y_test,
    y_pred
)


# ============================================================
# 12. RESULTS
# ============================================================

print("\n" + "=" * 70)
print("XGBOOST RESULTS")
print("=" * 70)

print(f"\nAccuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")


print("\nConfusion Matrix:")
print(cm)


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "No Flood",
            "Flood"
        ],
        zero_division=0
    )
)


# ============================================================
# 13. SAVE MODEL
# ============================================================

MODEL_PATH = (
    MODEL_DIR
    / "xgboost_flood_model.pkl"
)

joblib.dump(
    pipeline,
    MODEL_PATH
)


print("\n" + "=" * 70)
print("MODEL SAVED")
print("=" * 70)

print(f"\nModel path:")
print(MODEL_PATH)

print("\n✓ XGBOOST PIPELINE COMPLETE")