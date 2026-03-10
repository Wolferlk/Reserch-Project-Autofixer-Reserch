# 1) Create and activate venv
python -m venv venv
.\venv\Scripts\Activate.ps1
# If blocked by policy:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2) Install deps
pip install -r requirements.txt
pip install flask


# 3) PDF preprocessing
cd src\pdf_processing
python preprosdata1.py
python extract_text_with_metadata.py
python extract_images_and_ocr.py

# 4) Build dataset
cd ..\preprocessing
python build_dataset.py

# 5) Train model
cd ..\models
python train_classifier.py

# Reports generated
# data/reports/ml_dataset_report.json
# data/reports/ml_dataset_report.txt
# data/reports/model_accuracy_report.json
# data/reports/model_accuracy_report.txt

# 6) Run CLI app
cd ..
python app.py


cd src\web
python app_web.py

http://127.0.0.1:5000/.

## Retrain Notes

- Preprocessed input is retained in `data/extracted_text` and `data/ocr_text`.
- Re-running `build_dataset.py` updates train/test CSV and dataset reports.
- Re-running `train_classifier.py` replaces model + accuracy reports with latest metrics.
- Response generation now returns more user-friendly, step-by-step software fixing/tutorial guidance with verification checks.
