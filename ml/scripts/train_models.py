"""
Model Training & Benchmark Comparison Script for AegisHydro
Trains Random Forest, XGBoost, and LightGBM classifiers and regressors on the Master Dataset
with strict False-Negative (F2-score) optimization, and exports TreeSHAP explainers.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    precision_score, recall_score, f1_score, fbeta_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import lightgbm as lgb
import shap

# Numerical feature columns matching Master Dataset Schema
NUMERICAL_FEATURES = [
    "rainfall_1d",
    "rainfall_3d",
    "rainfall_6d",
    "rainfall_24h",
    "rainfall_intensity",
    "soil_moisture",
    "river_level",
    "elevation",
    "slope",
    "aspect",
    "flow_accumulation",
    "distance_to_river",
    "historical_flood_frequency",
    "forecast_rainfall"
]

CATEGORICAL_FEATURES = [
    "land_use"
]

ALL_FEATURE_COLS = NUMERICAL_FEATURES + [f"{c}_encoded" for c in CATEGORICAL_FEATURES]

TARGET_CLASS = "flood_target_N_hours"
TARGET_RISK = "risk_score"
TARGET_LEAD_TIME = "lead_time_hrs"

def train_and_evaluate():
    data_path = "ml/data/master_flood_dataset.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Run build_master_dataset.py first.")

    df = pd.read_csv(data_path)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by="date").reset_index(drop=True)

    print(f"Loaded Master Dataset: {df.shape[0]} rows, {df.shape[1]} columns.")

    # Encode categorical features
    label_encoders = {}
    for cat_col in CATEGORICAL_FEATURES:
        le = LabelEncoder()
        df[f"{cat_col}_encoded"] = le.fit_transform(df[cat_col].astype(str))
        label_encoders[cat_col] = {
            "classes": le.classes_.tolist(),
            "mapping": {str(k): int(v) for k, v in zip(le.classes_, le.transform(le.classes_))}
        }

    # Time-based train / test split (80% train, 20% test)
    split_idx = int(len(df) * 0.80)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    X_train = train_df[ALL_FEATURE_COLS]
    y_train_class = train_df[TARGET_CLASS]
    y_train_risk = train_df[TARGET_RISK]
    y_train_lead = train_df[TARGET_LEAD_TIME]

    X_test = test_df[ALL_FEATURE_COLS]
    y_test_class = test_df[TARGET_CLASS]
    y_test_risk = test_df[TARGET_RISK]
    y_test_lead = test_df[TARGET_LEAD_TIME]

    print(f"Train samples: {len(X_train)} (Positives: {y_train_class.sum()} / {y_train_class.mean()*100:.1f}%)")
    print(f"Test samples:  {len(X_test)} (Positives: {y_test_class.sum()} / {y_test_class.mean()*100:.1f}%)")

    # Positive class weighting for F2 / False Negative penalty
    pos_weight = (len(y_train_class) - y_train_class.sum()) / max(1, y_train_class.sum())
    print(f"Calculated scale_pos_weight: {pos_weight:.2f}")

    models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            class_weight={0: 1.0, 1: 3.5},
            random_state=42,
            n_jobs=-1
        ),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=120,
            max_depth=5,
            learning_rate=0.06,
            scale_pos_weight=3.5,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1
        ),
        "LightGBM": lgb.LGBMClassifier(
            n_estimators=120,
            max_depth=6,
            learning_rate=0.06,
            scale_pos_weight=3.5,
            random_state=42,
            verbose=-1,
            n_jobs=-1
        )
    }

    benchmark_results = {}

    for name, clf in models.items():
        print(f"\n--- Training {name} Classifier ---")
        clf.fit(X_train, y_train_class)

        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)[:, 1]

        # Calculate metrics
        prec = precision_score(y_test_class, y_pred, zero_division=0)
        rec = recall_score(y_test_class, y_pred, zero_division=0)
        f1 = f1_score(y_test_class, y_pred, zero_division=0)
        f2 = fbeta_score(y_test_class, y_pred, beta=2, zero_division=0)
        roc_auc = roc_auc_score(y_test_class, y_prob)
        pr_auc = average_precision_score(y_test_class, y_prob)

        tn, fp, fn, tp = confusion_matrix(y_test_class, y_pred).ravel()

        benchmark_results[name] = {
            "model_name": name,
            "accuracy": round(float((tp + tn) / (tp + tn + fp + fn)), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "f2_score": round(float(f2), 4),
            "roc_auc": round(float(roc_auc), 4),
            "pr_auc": round(float(pr_auc), 4),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp)
            },
            "false_negative_rate": round(float(fn / max(1, (fn + tp))), 4)
        }
        print(f"{name} -> Recall: {rec:.4f}, F2: {f2:.4f}, ROC-AUC: {roc_auc:.4f}, False Negatives: {fn}/{fn+tp}")

    # Select best classifier for real-time inference (LightGBM)
    best_clf = models["LightGBM"]

    # Train continuous regressors for risk score & lead time
    print("\nTraining LightGBM Risk Score Regressor & Lead Time Regressor...")
    risk_regressor = lgb.LGBMRegressor(n_estimators=100, max_depth=6, learning_rate=0.07, random_state=42, verbose=-1)
    risk_regressor.fit(X_train, y_train_risk)
    risk_r2 = r2_score(y_test_risk, risk_regressor.predict(X_test))
    print(f"Risk Score Regressor R2: {risk_r2:.4f}")

    lead_regressor = lgb.LGBMRegressor(n_estimators=80, max_depth=5, learning_rate=0.08, random_state=42, verbose=-1)
    lead_regressor.fit(X_train, y_train_lead)
    lead_r2 = r2_score(y_test_lead, lead_regressor.predict(X_test))
    print(f"Lead Time Regressor R2: {lead_r2:.4f}")

    # Feature Importances
    feature_importances = dict(zip(ALL_FEATURE_COLS, [round(float(v), 2) for v in best_clf.feature_importances_]))
    sorted_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))

    # Initialize TreeSHAP Explainer
    print("\nInitializing SHAP TreeExplainer on LightGBM Classifier...")
    explainer = shap.TreeExplainer(best_clf)

    # Save artifacts
    os.makedirs("ml/models", exist_ok=True)
    os.makedirs("backend/app/models", exist_ok=True)

    joblib.dump(best_clf, "ml/models/best_flood_classifier.joblib")
    joblib.dump(best_clf, "backend/app/models/best_flood_classifier.joblib")

    joblib.dump(risk_regressor, "backend/app/models/risk_score_regressor.joblib")
    joblib.dump(lead_regressor, "backend/app/models/lead_time_regressor.joblib")

    with open("backend/app/models/benchmark_metrics.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)

    with open("backend/app/models/feature_metadata.json", "w") as f:
        json.dump({
            "features": ALL_FEATURE_COLS,
            "numerical_features": NUMERICAL_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "label_encoders": label_encoders,
            "importances": sorted_importances,
            "target_classes": ["No Flood Surge", "Flash Flood Surge (P >= 0.50)"]
        }, f, indent=2)

    print("\n[SUCCESS] Master Dataset training, SHAP initialization, and benchmark evaluation complete.")
    for k, v in benchmark_results.items():
        print(f"  {k:15}: F2={v['f2_score']:.4f}, Recall={v['recall']:.4f}, PR-AUC={v['pr_auc']:.4f}, False Negatives={v['confusion_matrix']['false_negative']}")

if __name__ == "__main__":
    train_and_evaluate()
