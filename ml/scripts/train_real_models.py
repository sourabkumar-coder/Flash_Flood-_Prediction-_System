"""Train the AegisHydro classifier on the real-data retrospective dataset.

This deliberately trains ONLY on `real_master_flood_dataset.csv` created by
build_real_dataset.py. No synthetic target or synthetic risk score is used.
The historical daily target is: a flood-inventory event starts within the next
3 days and is associated with the village by district text or <=75 km point
proximity.
"""
from __future__ import annotations
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import (
    average_precision_score, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score, accuracy_score
)
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "ml" / "data" / "real_master_flood_dataset.csv"
MODEL_DIR = ROOT / "backend" / "app" / "models"
ML_MODEL_DIR = ROOT / "ml" / "models"

FEATURES = [
    "rainfall_1d", "rainfall_3d", "rainfall_7d", "rainfall_intensity_proxy",
    "soil_moisture_proxy", "elevation", "slope", "aspect",
    "flow_accumulation", "distance_to_river", "historical_flood_frequency",
    "forecast_rainfall_proxy", "land_use_code"
]
TARGET = "flood_target_next_3d"


def metrics(y, prob, threshold=0.50):
    pred = (prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y, prob)), 4) if len(np.unique(y)) > 1 else None,
        "pr_auc": round(float(average_precision_score(y, prob)), 4) if len(np.unique(y)) > 1 else None,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "false_negative_rate": round(float(fn / max(1, fn + tp)), 4),
        "threshold": threshold,
    }


def main():
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA}. Run build_real_dataset.py first.")
    df = pd.read_csv(DATA, parse_dates=["date"]).sort_values("date").reset_index(drop=True)
    if df[TARGET].nunique() < 2:
        raise SystemExit("Target has fewer than two classes. Expand the historical period or check event matching.")

    # Strict temporal holdout: final 20% of dates are never used for training.
    unique_dates = np.sort(df["date"].dropna().unique())
    cut = unique_dates[int(len(unique_dates) * 0.80)]
    train = df[df["date"] < cut].copy()
    test = df[df["date"] >= cut].copy()
    X_train, y_train = train[FEATURES], train[TARGET].astype(int)
    X_test, y_test = test[FEATURES], test[TARGET].astype(int)

    pos = int(y_train.sum())
    neg = int(len(y_train) - pos)
    scale = neg / max(pos, 1)
    models = {
        "RandomForest": RandomForestClassifier(
            n_estimators=250, max_depth=10, min_samples_leaf=3,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=250, max_depth=4, learning_rate=0.05,
            subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
            reg_lambda=2.0, scale_pos_weight=min(scale, 10.0),
            eval_metric="logloss", random_state=42, n_jobs=-1
        ),
        "LightGBM": lgb.LGBMClassifier(
            n_estimators=250, max_depth=6, learning_rate=0.04,
            num_leaves=31, min_child_samples=20,
            subsample=0.85, colsample_bytree=0.85,
            reg_lambda=2.0, scale_pos_weight=min(scale, 10.0),
            random_state=42, verbosity=-1, n_jobs=-1
        ),
    }

    results = {}
    trained = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        prob = model.predict_proba(X_test)[:, 1]
        results[name] = metrics(y_test, prob, threshold=0.50)
        trained[name] = model
        print(name, results[name])

    # Choose by F2-like priority: recall first, then PR-AUC, then F1.
    best_name = max(
        results,
        key=lambda k: (
            results[k]["recall"],
            results[k]["pr_auc"] if results[k]["pr_auc"] is not None else -1,
            results[k]["f1"],
        ),
    )
    best = trained[best_name]

    importances = dict(zip(FEATURES, map(float, best.feature_importances_)))
    importances = dict(sorted(importances.items(), key=lambda kv: kv[1], reverse=True))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    ML_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best, MODEL_DIR / "best_flood_classifier.joblib")
    joblib.dump(best, ML_MODEL_DIR / "best_flood_classifier.joblib")

    # The previous project trained synthetic regressors. Remove them so the
    # API cannot accidentally advertise synthetic risk/lead-time models.
    for p in [MODEL_DIR / "risk_score_regressor.joblib", MODEL_DIR / "lead_time_regressor.joblib"]:
        if p.exists(): p.unlink()

    metadata = {
        "model_type": "real_retrospective_classifier",
        "primary_model": best_name,
        "features": FEATURES,
        "target": TARGET,
        "target_definition": "IFI flood event starts within next 3 days and matches village district or <=75 km point proximity",
        "validation": "strict chronological 80/20 date holdout",
        "data_file": "ml/data/real_master_flood_dataset.csv",
        "risk_score_definition": "100 * predicted flood probability",
        "land_use_encoding": "numeric code from pilot_locations.csv",
        "importances": importances,
        "benchmarks": results,
    }
    with open(MODEL_DIR / "feature_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    with open(MODEL_DIR / "benchmark_metrics.json", "w", encoding="utf-8") as f:
        json.dump({"primary_model": best_name, "validation": metadata["validation"], "models": results}, f, indent=2)

    print(f"\nBEST MODEL: {best_name}")
    print(f"Train: {len(train):,} rows through {train.date.max().date()}")
    print(f"Test : {len(test):,} rows from {test.date.min().date()} onward")
    print("Artifacts written to backend/app/models/")


if __name__ == "__main__":
    main()
