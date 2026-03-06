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

# 6) Run CLI app
cd ..
python app.py


cd src\web
python app_web.py

http://127.0.0.1:5000/.