import cv2
import pytesseract
import re
import os
import shutil
import time
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

# --------------------------------------------------
# Tesseract path
# --------------------------------------------------
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
WINDOWS_TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
elif os.path.exists(WINDOWS_TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = WINDOWS_TESSERACT_CMD
elif shutil.which("tesseract"):
    pytesseract.pytesseract.tesseract_cmd = "tesseract"

# --------------------------------------------------
# SCORING: pick best OCR result
# --------------------------------------------------
GOOD_TEXT_SCORE = 0.62
ERROR_TEXT_SCORE = 0.58
MIN_USEFUL_CHARS = 12
OCR_TIMEOUT_SECONDS = int(os.getenv("OCR_TIMEOUT_SECONDS", "8"))
OCR_TOTAL_BUDGET_SECONDS = float(os.getenv("OCR_TOTAL_BUDGET_SECONDS", "15"))
ERROR_SIGNAL_RE = re.compile(
    r"\b(error|exception|failed|failure|warning|denied|invalid|cannot|0x[0-9a-f]{6,8})\b",
    re.IGNORECASE,
)


def _score_text(text: str) -> float:
    """
    Score an OCR result by readability heuristics.
    Higher = better.
    """
    if not text or not text.strip():
        return 0.0

    words = text.split()
    if not words:
        return 0.0

    # Reward: longer output
    length_score = min(len(text) / 200, 1.0)

    # Reward: words that look like real English (>=3 chars, mostly letters)
    real_words = sum(1 for w in words if len(w) >= 3 and re.search(r"[a-zA-Z]{2,}", w))
    word_ratio = real_words / max(len(words), 1)

    # Penalize: too many single characters (noise)
    single_chars = sum(1 for w in words if len(w) == 1)
    noise_penalty = single_chars / max(len(words), 1)

    # Reward: common Windows/error keywords
    keyword_bonus = 0.0
    keywords = ["error", "exception", "warning", "value", "invalid",
                 "argument", "failed", "not", "the", "an", "in", "at"]
    for kw in keywords:
        if re.search(r"\b" + kw + r"\b", text, re.IGNORECASE):
            keyword_bonus += 0.05

    score = (length_score * 0.3) + (word_ratio * 0.5) - (noise_penalty * 0.3) + keyword_bonus
    return round(score, 4)


def _has_useful_text(text: str, score: float) -> bool:
    text = (text or "").strip()
    if len(text) < MIN_USEFUL_CHARS:
        return False
    return score >= GOOD_TEXT_SCORE or (
        score >= ERROR_TEXT_SCORE and ERROR_SIGNAL_RE.search(text) is not None
    )


# --------------------------------------------------
# OCR CORE - multi-PSM + multi-config voting
# --------------------------------------------------
def _ocr_multi_psm(image, lang="eng", fast: bool = False, deadline: float | None = None) -> str:
    """
    Run Tesseract with multiple PSM modes and configs.
    Return the highest-scoring result.
    """
    configs = []

    whitelist = (
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789"
        " ._:-()/\\@#!?,"
    )

    psms = [6, 11] if fast else [6, 4, 11, 3]
    for psm in psms:
        configs.append(f"--oem 3 --psm {psm}")
        configs.append(f'--oem 3 --psm {psm} -c tessedit_char_whitelist="{whitelist}"')

    best_text = ""
    best_score = -1.0

    for config in configs:
        timeout = OCR_TIMEOUT_SECONDS
        if deadline is not None:
            remaining = deadline - time.perf_counter()
            if remaining <= 0:
                break
            timeout = max(1, min(OCR_TIMEOUT_SECONDS, int(remaining)))

        try:
            text = pytesseract.image_to_string(
                image,
                lang=lang,
                config=config,
                timeout=timeout,
            )
            text = text.strip()
            score = _score_text(text)
            if score > best_score:
                best_score = score
                best_text = text
                if _has_useful_text(best_text, best_score):
                    break
        except Exception:
            continue

    return best_text


# --------------------------------------------------
# IMAGE PREPROCESSING PIPELINE
# --------------------------------------------------

def _read_gray(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Unable to read image: {image_path}")
    return img


def _upscale_for_ocr(gray: np.ndarray, factor: float = 2.0) -> np.ndarray:
    height, width = gray.shape[:2]
    longest = max(height, width)
    if longest >= 2600:
        return gray
    if longest < 700:
        factor = max(factor, 2.5)
    return cv2.resize(gray, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC)


def preprocess_raw(image_path: str) -> np.ndarray:
    """Return the original image as-is (RGB numpy)."""
    img = Image.open(image_path).convert("RGB")
    return np.array(img)


def preprocess_light(image_path: str) -> np.ndarray:
    """Upscale only - good for small/crisp screenshots."""
    gray = _read_gray(image_path)
    return _upscale_for_ocr(gray, factor=2.0)


def preprocess_denoise(image_path: str) -> np.ndarray:
    """
    For blurry / noisy / compressed images.
    Applies denoising, CLAHE, and adaptive threshold.
    """
    gray = _read_gray(image_path)
    gray = _upscale_for_ocr(gray, factor=2.0)

    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=20, templateWindowSize=7, searchWindowSize=21)

    # CLAHE local contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Adaptive threshold handles uneven lighting
    gray = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10
    )

    return gray


def preprocess_sharpen(image_path: str) -> np.ndarray:
    """
    For soft/blurry text - unsharp mask + Otsu threshold.
    """
    gray = _read_gray(image_path)
    gray = _upscale_for_ocr(gray, factor=2.0)

    # Unsharp mask
    blurred = cv2.GaussianBlur(gray, (0, 0), 3)
    sharpened = cv2.addWeighted(gray, 1.8, blurred, -0.8, 0)

    # Otsu binarization
    _, binary = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary


def preprocess_blur_recovery(image_path: str) -> np.ndarray:
    """
    Stronger path for blurred phone photos of screens.
    Keeps grayscale edges until the final adaptive threshold so letters are not over-eroded.
    """
    gray = _read_gray(image_path)
    gray = _upscale_for_ocr(gray, factor=2.5)
    gray = cv2.bilateralFilter(gray, d=5, sigmaColor=45, sigmaSpace=45)

    clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    soft_blur = cv2.GaussianBlur(gray, (0, 0), 2.0)
    gray = cv2.addWeighted(gray, 2.0, soft_blur, -1.0, 0)

    return cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=35,
        C=9,
    )


def preprocess_morphology(image_path: str) -> np.ndarray:
    """
    For low-contrast or faint text - morphological closing to join broken letters.
    """
    gray = _read_gray(image_path)
    gray = _upscale_for_ocr(gray, factor=2.0)

    # CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Morphological close (fills small gaps in characters)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)

    # Adaptive threshold
    gray = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY,
        blockSize=25,
        C=8
    )

    return gray


def preprocess_pil_enhance(image_path: str) -> np.ndarray:
    """
    PIL-based enhancement - boost contrast + sharpness before OCR.
    Best for phone photos of screens.
    """
    img = Image.open(image_path).convert("L")  # Grayscale

    # Resize
    w, h = img.size
    img = img.resize((w * 2, h * 2), Image.LANCZOS)

    # Enhance contrast
    img = ImageEnhance.Contrast(img).enhance(2.5)

    # Enhance sharpness
    img = ImageEnhance.Sharpness(img).enhance(3.0)

    # Edge enhancement
    img = img.filter(ImageFilter.EDGE_ENHANCE_MORE)

    return np.array(img)


def preprocess_deskew(image_path: str) -> np.ndarray:
    """
    Deskew rotated/tilted images before OCR.
    Useful for scanned or photographed dialogs.
    """
    img = _read_gray(image_path)
    img = _upscale_for_ocr(img, factor=2.0)

    # Detect edges
    edges = cv2.Canny(img, 50, 150, apertureSize=3)

    # Hough line detection to find skew angle
    lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
    angle = 0.0

    if lines is not None:
        angles = []
        for rho, theta in lines[:, 0]:
            angle_deg = np.degrees(theta) - 90
            if -45 < angle_deg < 45:
                angles.append(angle_deg)
        if angles:
            angle = float(np.median(angles))

    # Rotate if skewed more than 0.5 degrees
    if abs(angle) > 0.5:
        h, w = img.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)

    # Threshold
    _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary


# --------------------------------------------------
# PUBLIC API - extract_text (MULTI-PIPELINE)
# --------------------------------------------------

FAST_PIPELINES = [
    ("raw",         preprocess_raw),
    ("light",       preprocess_light),
]

BLUR_PIPELINES = [
    ("sharpen",     preprocess_sharpen),
    ("blur_recovery", preprocess_blur_recovery),
    ("denoise",     preprocess_denoise),
    ("morphology",  preprocess_morphology),
    ("pil_enhance", preprocess_pil_enhance),
    ("deskew",      preprocess_deskew),
]

PIPELINES = FAST_PIPELINES + BLUR_PIPELINES


def extract_text(image_path: str, debug: bool = False) -> str:
    """
    Runs ALL preprocessing pipelines + multi-PSM OCR.
    Returns the highest-quality result based on scoring.
    Handles blurry, dark, rotated, compressed, and phone-captured images.
    """
    image_path = str(image_path)
    results = []  # list of (score, pipeline_name, text)
    deadline = time.perf_counter() + OCR_TOTAL_BUDGET_SECONDS

    for name, pipeline_fn in FAST_PIPELINES:
        if time.perf_counter() >= deadline:
            break

        try:
            processed = pipeline_fn(image_path)
            text = _ocr_multi_psm(processed, fast=True, deadline=deadline)
            score = _score_text(text)
            results.append((score, name, text))

            if debug:
                print(f"[{name:12s}] score={score:.4f}  chars={len(text)}")

            if _has_useful_text(text, score):
                return text

        except Exception as e:
            if debug:
                print(f"[{name:12s}] FAILED: {e}")
            continue

    for name, pipeline_fn in BLUR_PIPELINES:
        if time.perf_counter() >= deadline:
            if debug:
                print("[ocr         ] time budget reached")
            break

        try:
            processed = pipeline_fn(image_path)
            text = _ocr_multi_psm(processed, fast=False, deadline=deadline)
            score = _score_text(text)
            results.append((score, name, text))

            if debug:
                print(f"[{name:12s}] score={score:.4f}  chars={len(text)}")

            if _has_useful_text(text, score):
                break

        except Exception as e:
            if debug:
                print(f"[{name:12s}] FAILED: {e}")
            continue

    if not results:
        return ""

    # Pick the best scoring result
    results.sort(key=lambda x: x[0], reverse=True)
    best_score, best_name, best_text = results[0]

    if debug:
        print(f"\nBest pipeline: [{best_name}] score={best_score:.4f}")

    return best_text


# --------------------------------------------------
# TEXT CLEANING
# --------------------------------------------------

def clean_text(text: str) -> str:
    """
    Restore spaces and normalize OCR output.
    """
    if not text:
        return ""

    # Normalize line breaks
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")

    # Space before capital letters (camelCase / PascalCase split)
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", text)

    # Space after punctuation if missing
    text = re.sub(r"([.,:;])([A-Za-z])", r"\1 \2", text)

    # Fix underscores
    text = text.replace("_", " ")

    # Common Windows / .NET error phrase normalization
    replacements = {
        r"datagridview":         "data grid view",
        r"comboboxcell":         "combo box cell",
        r"argumentexception":    "argument exception",
        r"invalidoperationexception": "invalid operation exception",
        r"nullreferenceexception": "null reference exception",
        r"indexoutofrangeexception": "index out of range exception",
        r"formatexception":      "format exception",
        r"overflowexception":    "overflow exception",
        r"notvalid":             "not valid",
        r"dataerror":            "data error",
        r"errordialog":          "error dialog",
        r"thefollowing":         "the following",
        r"occurredinthe":        "occurred in the",
        r"toreplace":            "to replace",
        r"pleashandle":          "please handle",
        r"doesnotcontain":       "does not contain",
        r"cannotbe":             "cannot be",
        r"isnot":                "is not",

        # =========================
    # WINDOWS CORE ERRORS
    # =========================
    r"accessdenied": "access denied",
    r"accessisdenied": "access is denied",
    r"theparameterisincorrect": "the parameter is incorrect",
    r"systemcannotfind": "the system cannot find",
    r"cannotfindthefile": "cannot find the file",
    r"cannotfindthepath": "cannot find the path",
    r"filealreadyexists": "file already exists",
    r"devicenotready": "device not ready",
    r"disknotformatted": "disk not formatted",
    r"diskfull": "disk full",
    r"writeprotected": "write protected",

    # =========================
    # WINDOWS ERROR CODES
    # =========================
    r"\box([0-9a-f]{8})\b": r"0x\1",
    r"error0x80070005": "error 0x80070005 access denied",
    r"0x80070005": "0x80070005 access denied",
    r"0x80070002": "0x80070002 file not found",
    r"0x80070003": "0x80070003 path not found",
    r"0x80070057": "0x80070057 invalid parameter",
    r"0x80004005": "0x80004005 unspecified error",
    r"0xc0000005": "0xc0000005 access violation",
    r"0xc0000135": "0xc0000135 missing dll",
    r"0xc0000142": "0xc0000142 application failed to start",
    r"0xc000007b": "0xc000007b invalid image format",

    # OCR variants of hex
    r"0x8oo7oo05": "0x80070005",
    r"0x8oo7oo02": "0x80070002",
    r"0xc00000o5": "0xc0000005",

    # =========================
    # WINDOWS UPDATE ERRORS
    # =========================
    r"windowsupdatefailed": "windows update failed",
    r"updateerror": "update error",
    r"failedtoinstallupdate": "failed to install update",
    r"updateserviceisnotrunning": "update service is not running",
    r"windowscouldnotsearchforupdates": "windows could not search for updates",

    # =========================
    # DLL / SYSTEM FILE ERRORS
    # =========================
    r"missingdll": "missing dll",
    r"dllnotfound": "dll not found",
    r"failedtoloaddll": "failed to load dll",
    r"kernel32dll": "kernel32.dll",
    r"user32dll": "user32.dll",
    r"ntdlldll": "ntdll.dll",
    r"msvcp140dll": "msvcp140.dll",
    r"vcruntime140dll": "vcruntime140.dll",

    # =========================
    # APPLICATION ERRORS
    # =========================
    r"applicationfailedtostart": "application failed to start",
    r"applicationerror": "application error",
    r"programstoppedworking": "program stopped working",
    r"hasstoppedworking": "has stopped working",
    r"applicationcrash": "application crash",

    # =========================
    # BSOD (BLUE SCREEN)
    # =========================
    r"irqlnotlessorequal": "irql not less or equal",
    r"criticalprocessdied": "critical process died",
    r"systemservicexception": "system service exception",
    r"memorymanagement": "memory management",
    r"pagefaultinnonpagedarea": "page fault in nonpaged area",
    r"driverirqlnotlessorequal": "driver irql not less or equal",
    r"unexpectedkernelmodetrap": "unexpected kernel mode trap",
    r"kernel_security_check_failure": "kernel security check failure",

    # =========================
    # DRIVER ERRORS
    # =========================
    r"driverfailedtoload": "driver failed to load",
    r"drivernotfound": "driver not found",
    r"incompatibledriver": "incompatible driver",
    r"devicedrivererror": "device driver error",

    # =========================
    # NETWORK ERRORS
    # =========================
    r"connectiontimedout": "connection timed out",
    r"connectionrefused": "connection refused",
    r"networkisunreachable": "network is unreachable",
    r"hostnotfound": "host not found",
    r"dnsfailed": "dns failed",
    r"internetnotworking": "internet not working",

    # =========================
    # PERMISSION / SECURITY
    # =========================
    r"permissiondenied": "permission denied",
    r"unauthorizedaccess": "unauthorized access",
    r"securityerror": "security error",
    r"blockedbyantivirus": "blocked by antivirus",
    r"blockedbyfirewall": "blocked by firewall",

    # =========================
    # FILE SYSTEM
    # =========================
    r"filenotfound": "file not found",
    r"pathnotfound": "path not found",
    r"invalidfilepath": "invalid file path",
    r"corruptedfile": "corrupted file",
    r"cannotreadfile": "cannot read file",
    r"cannotwritefile": "cannot write file",

    # =========================
    # MEMORY / PERFORMANCE
    # =========================
    r"outofmemory": "out of memory",
    r"memoryoverflow": "memory overflow",
    r"stackoverflow": "stack overflow",
    r"highcpuusage": "high cpu usage",

    # =========================
    # SERVICE ERRORS
    # =========================
    r"servicenotrunning": "service not running",
    r"servicefailedtostart": "service failed to start",
    r"windowsserviceerror": "windows service error",

    # =========================
    # INSTALLATION ERRORS
    # =========================
    r"installationfailed": "installation failed",
    r"setupfailed": "setup failed",
    r"installererror": "installer error",
    r"failedtoinstall": "failed to install",

    # =========================
    # REGISTRY ERRORS
    # =========================
    r"registryerror": "registry error",
    r"invalidregistrykey": "invalid registry key",
    r"registrycorrupted": "registry corrupted",

    # =========================
    # OCR DISTORTIONS (VERY IMPORTANT)
    # =========================
    r"err0r": "error",
    r"fa11ed": "failed",
    r"va1id": "valid",
    r"nu11": "null",
    r"fi1e": "file",
    r"0ut": "out",
    r"1oad": "load",

    # =========================
    # UI / COMPONENTS
    # =========================
    r"datagridview": "data grid view",
    r"comboboxcell": "combo box cell",
    r"listviewitem": "list view item",
    r"treeviewnode": "tree view node",
    r"checkboxlist": "checkbox list",
    r"radiobutton": "radio button",
    r"picturebox": "picture box",
    r"textbox": "text box",
    r"labelcontrol": "label control",
    r"panelcontrol": "panel control",

    # =========================
    # EXCEPTIONS (.NET / JAVA)
    # =========================
    r"argumentexception": "argument exception",
    r"invalidoperationexception": "invalid operation exception",
    r"nullreferenceexception": "null reference exception",
    r"indexoutofrangeexception": "index out of range exception",
    r"formatexception": "format exception",
    r"overflowexception": "overflow exception",
    r"dividebyzeroexception": "divide by zero exception",
    r"filenotfoundexception": "file not found exception",
    r"ioexception": "io exception",
    r"timeout exception": "timeout exception",

    # =========================
    # COMMON ERROR TERMS
    # =========================
    r"notvalid": "not valid",
    r"dataerror": "data error",
    r"errordialog": "error dialog",
    r"erroroccurred": "error occurred",
    r"operationfailed": "operation failed",
    r"accessdenied": "access denied",
    r"permissiondenied": "permission denied",
    r"filenotfound": "file not found",
    r"cannotfind": "cannot find",
    r"failedtoload": "failed to load",

    # =========================
    # OCR WORD MERGE FIXES
    # =========================
    r"thefollowing": "the following",
    r"occurredinthe": "occurred in the",
    r"toreplace": "to replace",
    r"pleashandle": "please handle",
    r"doesnotcontain": "does not contain",
    r"cannotbe": "cannot be",
    r"isnot": "is not",
    r"wasnot": "was not",
    r"arenot": "are not",
    r"hasnot": "has not",
    r"donot": "do not",

    # =========================
    # NETWORK / SYSTEM
    # =========================
    r"connectionlost": "connection lost",
    r"networkerror": "network error",
    r"connectionfailed": "connection failed",
    r"dnslookupfailed": "dns lookup failed",
    r"servernotfound": "server not found",

    # =========================
    # DATABASE / SQL
    # =========================
    r"sqlerror": "sql error",
    r"databaseerror": "database error",
    r"connectiontimeout": "connection timeout",
    r"queryfailed": "query failed",
    r"invalidquery": "invalid query",

    # =========================
    # FILE SYSTEM
    # =========================
    r"pathnotfound": "path not found",
    r"accessviolation": "access violation",
    r"readonlyfile": "read only file",
    r"diskfull": "disk full",

    # =========================
    # EXTRA OCR COMMON FIXES
    # =========================
    r"l0ad": "load",
    r"err0r": "error",
    r"fai1ed": "failed",
    r"va1ue": "value",
    r"nu11": "null",
    r"0bj": "obj",



    }

    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    # Lowercase + remove junk characters
    text = text.lower()
    text = re.sub(r"[^a-z0-9_.:\s()/\\@#!?,\-]", " ", text)

    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# --------------------------------------------------
# ERROR KEYWORD EXTRACTION
# --------------------------------------------------

ERROR_PATTERN_GROUPS = {

    # =========================
    # GENERAL ERRORS
    # =========================
    "GENERAL": [
        r"\berror\b",
        r"\bfailure\b",
        r"\bfailed\b",
        r"\bfatal\b",
        r"\bcritical\b",
        r"\bwarning\b",
        r"\bnot\s*working\b",
        r"\bcrash(ed)?\b",
    ],

    # =========================
    # EXCEPTIONS (.NET / JAVA)
    # =========================
    "EXCEPTION": [
        r"\bexception\b",
        r"\bargument\s*exception\b",
        r"\binvalid\s*operation\b",
        r"\bnull\s*reference\b",
        r"\bindex\s*out\s*of\s*range\b",
        r"\bformat\s*exception\b",
        r"\boverflow\s*exception\b",
        r"\bdivide\s*by\s*zero\b",
        r"\bio\s*exception\b",
        r"\btimeout\s*exception\b",
        r"\b[A-Za-z]+Exception\b",
    ],

    # =========================
    # WINDOWS ERRORS
    # =========================
    "WINDOWS": [
        r"\baccess\s*denied\b",
        r"\baccess\s*is\s*denied\b",
        r"\bthe\s*system\s*cannot\s*find\b",
        r"\bfile\s*not\s*found\b",
        r"\bpath\s*not\s*found\b",
        r"\bdevice\s*not\s*ready\b",
        r"\bdisk\s*full\b",
        r"\bwrite\s*protected\b",
        r"\binvalid\s*parameter\b",
        r"\boperation\s*failed\b",
    ],

    # =========================
    # WINDOWS ERROR CODES
    # =========================
    "WIN_CODES": [
        r"0x[0-9a-fA-F]{8}",
        r"\berror\s*\d+\b",
    ],

    # =========================
    # BSOD (BLUE SCREEN)
    # =========================
    "BSOD": [
        r"\birql\s*not\s*less\s*or\s*equal\b",
        r"\bcritical\s*process\s*died\b",
        r"\bmemory\s*management\b",
        r"\bpage\s*fault\b",
        r"\bkernel\s*error\b",
        r"\bdriver\s*error\b",
        r"\bsystem\s*service\s*exception\b",
        r"\bkernel\s*security\s*check\s*failure\b",
        r"\bunexpected\s*kernel\s*mode\s*trap\b",
    ],

    # =========================
    # NETWORK ERRORS
    # =========================
    "NETWORK": [
        r"\bconnection\s*(failed|refused|lost|timed\s*out)\b",
        r"\bnetwork\s*(error|unreachable)\b",
        r"\bdns\s*(failed|error)\b",
        r"\bhost\s*not\s*found\b",
        r"\bserver\s*not\s*found\b",
    ],

    # =========================
    # DATABASE / SQL
    # =========================
    "DATABASE": [
        r"\bsql\s*error\b",
        r"\bdatabase\s*error\b",
        r"\bconnection\s*timeout\b",
        r"\bquery\s*failed\b",
        r"\binvalid\s*query\b",
    ],

    # =========================
    # FILE SYSTEM
    # =========================
    "FILE": [
        r"\bfile\s*not\s*found\b",
        r"\bpath\s*not\s*found\b",
        r"\bcannot\s*read\s*file\b",
        r"\bcannot\s*write\s*file\b",
        r"\bcorrupted\s*file\b",
    ],

    # =========================
    # MEMORY / PERFORMANCE
    # =========================
    "MEMORY": [
        r"\bout\s*of\s*memory\b",
        r"\bstack\s*overflow\b",
        r"\bmemory\s*overflow\b",
        r"\bhigh\s*cpu\s*usage\b",
    ],

    # =========================
    # SECURITY / PERMISSION
    # =========================
    "SECURITY": [
        r"\bpermission\s*denied\b",
        r"\bunauthorized\s*access\b",
        r"\bsecurity\s*error\b",
        r"\baccess\s*denied\b",
        r"\baccess\s*is\s*denied\b",
    ],

    # =========================
    # INSTALLATION / UPDATE
    # =========================
    "INSTALL": [
        r"\binstallation\s*failed\b",
        r"\bsetup\s*failed\b",
        r"\bupdate\s*failed\b",
        r"\bwindows\s*update\s*error\b",
    ],

    # =========================
    # UI COMPONENT ERRORS
    # =========================
    "UI": [
        r"\bdatagridview\b",
        r"\bcombobox\b",
        r"\btextbox\b",
        r"\bbutton\b",
        r"\bform\b",
        r"\bcontrol\b",
    ],
}


def extract_error_keywords(text: str) -> list:
    found = []
    for patterns in ERROR_PATTERN_GROUPS.values():
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                found.append(match.group(0).upper())
    return sorted(set(found))


# --------------------------------------------------
# FULL PIPELINE HELPER
# --------------------------------------------------

def process_image(image_path: str, debug: bool = False) -> dict:
    """
    Run the full pipeline and return a dict with all results.
    """
    raw = extract_text(image_path, debug=debug)
    clean = clean_text(raw)
    errors = extract_error_keywords(clean)

    return {
        "raw_text":     raw,
        "clean_text":   clean,
        "error_keywords": errors,
    }


# --------------------------------------------------
# CLI TEST
# --------------------------------------------------
if __name__ == "__main__":
    import sys

    test_image = (
        sys.argv[1]
        if len(sys.argv) > 1
        else r"D:\Reserch SLIIT SASINDU\Auto Fixer V5\data\images\dialog_test.png"
    )

    print(f"\nProcessing: {test_image}\n")
    result = process_image(test_image, debug=True)

    print("\n===== RAW OCR TEXT =====\n", result["raw_text"])
    print("\n===== CLEAN TEXT =====\n",  result["clean_text"])
    print("\n===== ERROR KEYWORDS =====\n", result["error_keywords"])
