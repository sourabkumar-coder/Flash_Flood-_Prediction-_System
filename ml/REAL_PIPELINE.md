# AegisHydro real-data ML pipeline

The previous project trained on generated storm/risk formulas. This pipeline keeps synthetic data only for the UI demo and trains the ML model on a retrospective dataset built from published data.

## Data sources

- IMD 0.25° daily gridded rainfall, 1901–2024. Download with `ml/scripts/download_imd_rainfall.py`.
- India Flood Inventory (IFI), already in `data/IndianFloodInventroy(IFI).csv`.
- `data/pilot_locations.csv` contains the 10 pilot points used to map rainfall grids to the demo villages. Elevation/slope values are provisional static values and must be replaced by DEM-derived values before making scientific claims.

## Run

```bash
pip install -r requirements-ml.txt
python ml/scripts/download_imd_rainfall.py --start 2015 --end 2024
python ml/scripts/build_real_dataset.py
python ml/scripts/train_real_models.py
```

The model target is `flood_target_next_3d`: an IFI event starting within the next 3 days and matched to the pilot village by district text or <=75 km point proximity.

### Why 3 days?

The currently available IMD historical product is daily. A 3–6 hour historical target requires an hourly rainfall/event source such as IMERG or ERA5-Land. Do not claim an hourly lead-time model until that data is integrated and validated.

## Validation

The training script uses a strict chronological 80/20 holdout by date. It reports precision, recall, F1, ROC-AUC, PR-AUC and false-negative rate. It chooses the primary classifier recall-first, then PR-AUC/F1.

## Risk score

`risk_score = 100 * predicted flood probability`.

Lead time is currently a conservative, clearly labelled heuristic. The old synthetic lead-time regressor is intentionally removed.
