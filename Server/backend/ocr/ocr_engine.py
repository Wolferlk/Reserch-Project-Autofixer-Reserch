import cv2
import pytesseract
import re
from PIL import Image
import numpy as np

# --------------------------------------------------
# Tesseract path (Windows)
# --------------------------------------------------
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# --------------------------------------------------
# OCR CORE (RAW-FIRST, MULTI-PSM)
# --------------------------------------------------
def _ocr_multi_psm(image, lang="eng"):
    psms = [6, 4, 11]  # best for UI dialogs
    texts = []

    whitelist = (
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789"
        "._:-()"
    )

    for psm in psms:
        config = (
            f"--oem 3 --psm {psm} "
            f"-c tessedit_char_whitelist={whitelist}"
        )

        text = pytesseract.image_to_string(
            image,
            lang=lang,
            config=config
        )

        if text and len(text.strip()) > 10:
            texts.append(text.strip())

    # Return the longest & cleanest result
    if texts:
        return max(texts, key=len)

    return ""


# --------------------------------------------------
# LIGHT FALLBACK PREPROCESSING (ONLY IF NEEDED)
# --------------------------------------------------
def light_preprocess(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Only upscale – NO threshold, NO blur
    gray = cv2.resize(
        gray,
        None,
        fx=1.5,
        fy=1.5,
        interpolation=cv2.INTER_CUBIC
    )

    return gray


# --------------------------------------------------
# PUBLIC API (USED BY app.py)
# --------------------------------------------------
def extract_text(image_path: str) -> str:
    """
    Smart OCR for Windows dialog boxes.
    RAW image first, preprocessing only if needed.
    """

    image_path = str(image_path)

    # --- 1️⃣ RAW IMAGE FIRST (MOST IMPORTANT) ---
    try:
        img = Image.open(image_path).convert("RGB")
        img_np = np.array(img)

        text = _ocr_multi_psm(img_np)
        if len(text.strip()) > 20:
            return text
    except Exception:
        pass

    # --- 2️⃣ LIGHT PREPROCESS FALLBACK ---
    try:
        img = cv2.imread(image_path)
        pre = light_preprocess(img)

        text = _ocr_multi_psm(pre)
        return text
    except Exception:
        return ""


def clean_text(text: str) -> str:
    """
    Restore spaces and normalize OCR text
    """

    # Normalize line breaks
    text = text.replace("\n", " ")

    # Space before capital letters (camelCase fix)
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

    # Space after punctuation
    text = re.sub(r"([.:])([A-Za-z])", r"\1 \2", text)

    # Fix underscores
    text = text.replace("_", " ")

    # Common Windows error phrases
    replacements = {
        "datagridview": "data grid view",
        "comboboxcell": "combo box cell",
        "argumentexception": "argument exception",
        "notvalid": "not valid",
        "dataerror": "data error",
        "errordialog": "error dialog",
        "thefollowing": "the following",
        "occurredinthe": "occurred in the",
        "toreplace": "to replace",
        "pleashandle": "please handle",
    }

    for k, v in replacements.items():
        text = re.sub(k, v, text, flags=re.IGNORECASE)

    # Final cleanup
    text = text.lower()
    text = re.sub(r"[^a-z0-9_.:\s()-]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# --------------------------------------------------
# OPTIONAL: ERROR KEYWORDS
# --------------------------------------------------
def extract_error_keywords(text: str):
    patterns = [
        r"exception",
        r"argumentexception",
        r"datagridview",
        r"comboboxcell",
        r"not valid",
        r"dataerror",
    ]

    found = []
    for p in patterns:
        if re.search(p, text):
            found.append(p.upper())

    return list(set(found))


# --------------------------------------------------
# TEST
# --------------------------------------------------
if __name__ == "__main__":
    test_image = r"D:\Reserch SLIIT SASINDU\Auto Fixer V5\data\images\dialog_test.png"

    raw = extract_text(test_image)
    clean = clean_text(raw)
    errors = extract_error_keywords(clean)

    print("\n===== OCR TEXT =====\n", raw)
    print("\n===== CLEAN TEXT =====\n", clean)
    print("\n===== ERROR KEYWORDS =====\n", errors)
