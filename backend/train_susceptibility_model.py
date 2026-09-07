import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score
)


INPUT_FILE = "data/processed/flood_training_dataset.csv"
MODEL_DIR = "ml/models"
MODEL_FILE = os.path.join(
    MODEL_DIR,
    "flood_susceptibility_model.pkl"
)


def main():

    print("=" * 70)
    print("TRAINING FLOOD SUSCEPTIBILITY MODEL")
    print("=" * 70)

    df = pd.read_csv(INPUT_FILE)

    print("Dataset shape:", df.shape)

    target = "flood_target"

    features = [
        "elevation_m",
        "slope_percent",
        "historical_flood_events",
        "historical_flood_years",
        "historical_fatalities",
        "historical_displaced",
        "historical_max_severity",
        "historical_max_impact",
    ]

    X = df[features]
    y = df[target]

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    preprocessor = ColumnTransformer([
        ("numeric", numeric_pipeline, features)
    ])

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", model)
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print("\nTraining...")
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    probabilities = pipeline.predict_proba(X_test)[:, 1]

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            digits=4
        )
    )

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, predictions))

    print(
        "\nROC-AUC:",
        round(
            roc_auc_score(
                y_test,
                probabilities
            ),
            4
        )
    )

    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(
        pipeline,
        MODEL_FILE
    )

    print("\n" + "=" * 70)
    print("MODEL SAVED")
    print("=" * 70)

    print(MODEL_FILE)


if __name__ == "__main__":
    main()