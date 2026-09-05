# Model status

The repository no longer ships the synthetic-trained model as the default inference artifact.

## Real training

Run:

```bash
pip install -r requirements-ml.txt
python ml/scripts/download_imd_rainfall.py --start 2015 --end 2024
python ml/scripts/build_real_dataset.py
python ml/scripts/train_real_models.py
```

After training, these files are generated automatically under `backend/app/models/`:

- `best_flood_classifier.joblib`
- `feature_metadata.json`
- `benchmark_metrics.json`

## Synthetic demo model

The old generated model artifacts are retained under `ml/models/demo_synthetic/` only for provenance/debugging. They must not be presented as real-world validation.
