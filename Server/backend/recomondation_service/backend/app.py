"""
PC Shop Recommendation Engine API

Main FastAPI application providing endpoints for:
- Repair shop recommendations based on error types
- Product recommendations based on user needs
- Hardware component recommendations for PC issues
- Error type detection using NLP and rule-based systems
- Product category detection

The application uses:
- Machine learning models for error/product classification
- Rule-based patterns for high-confidence matches
- Supabase (optional) or CSV files for data storage
- Hierarchical inference for hardware recommendations
- Spell checking and typo correction for user inputs
"""

# Standard library imports
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple, Dict, Any
import os
import json
import math
import random
import re
from pathlib import Path
import sys
import joblib
import numpy as np
import csv
import datetime
import logging
import time
import pandas as pd
from dotenv import load_dotenv

HERE = Path(__file__).parent.resolve()
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("AUTO_FIXER")
logger.info("🚀 Recommendation backend initializing...")

# Import hierarchical inference system (rule-based + ML)
# This provides high-confidence rule matching and hierarchical component prediction
try:
    from rules import match_rule  # Rule-based pattern matching for hardware components
    from hierarchical_inference import predict_hierarchical  # Two-stage ML prediction (category → component)
    from feedback_storage import save_feedback, LOW_CONFIDENCE_THRESHOLD  # Feedback collection for low-confidence predictions
    HIERARCHICAL_AVAILABLE = True
except ImportError as e:
    logger.info(f"Hierarchical system not available: {e}")
    HIERARCHICAL_AVAILABLE = False
    # Set fallback values if modules are unavailable
    match_rule = None
    predict_hierarchical = None
    save_feedback = None
    LOW_CONFIDENCE_THRESHOLD = 0.5

# Supabase is optional - we fallback to CSV files if not configured
# Supabase provides cloud database storage, CSV files are used as local backup
try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = None

# ─────────────────────────────────────────────────────────
# 0) Paths & Environment Configuration
# ─────────────────────────────────────────────────────────
# Set up directory paths and load environment variables
DATA_DIR = (HERE.parent / "data").resolve()
ENV_PATH = (HERE / ".env").resolve()

MODEL_PATH = HERE / "reco_model.pkl"
FEATURES_PATH = HERE / "reco_features.json"

# NLP Model Paths
ERROR_NLP_MODEL_PATH = HERE / "nlp_error_model_error_type.pkl"
PRODUCT_NLP_MODEL_PATH = HERE / "nlp_error_model_product.pkl"

SHOPS_CSV = DATA_DIR / "shops.csv"
PRODUCTS_CSV = DATA_DIR / "products.csv"
FEEDBACK_CSV = DATA_DIR / "feedback.csv"

# Always load the .env from this backend folder, regardless of process working directory.
load_dotenv(dotenv_path=ENV_PATH)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Debug: Print env status (without exposing keys)
logger.info(f"Environment check:")
logger.info(f"   .env file path: {ENV_PATH}")
logger.info(f"   .env file exists: {'Yes' if ENV_PATH.exists() else 'No'}")
logger.info(f"   SUPABASE_URL: {'Set' if SUPABASE_URL else 'Not set'}")
logger.info(f"   SUPABASE_KEY: {'Set' if SUPABASE_KEY else 'Not set'}")
if SUPABASE_URL:
    logger.info(f"   Supabase URL: {SUPABASE_URL[:30]}...")

# ─────────────────────────────────────────────────────────
# 1) Connect Supabase (optional)
# ─────────────────────────────────────────────────────────
supabase: Optional["Client"] = None
USE_SUPABASE = False
if SUPABASE_URL and SUPABASE_KEY and create_client is not None:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        # quick connectivity check (won't crash if table missing)
        try:
            test_response = supabase.table("shops").select("shop_id").limit(1).execute()
            USE_SUPABASE = True
            logger.info("Connected to Supabase")
            logger.info(f"   URL: {SUPABASE_URL[:50]}...")
            if test_response.data:
                logger.info(f"   Test query successful - found {len(test_response.data)} shop(s)")
            else:
                logger.info("   Test query returned no data (table may be empty)")
        except Exception as test_error:
            error_msg = str(test_error)
            logger.info(f"Supabase connection test failed: {error_msg}")
            if "requested path is invalid" in error_msg.lower() or "relation" in error_msg.lower():
                logger.info(f"   This usually means the 'shops' table doesn't exist in Supabase.")
                logger.info(f"   Please create the table in your Supabase project or check table name.")
            logger.info("Will use CSV files as fallback")
            USE_SUPABASE = False
    except Exception as e:
        logger.info(f"Supabase init failed: {e}")
        logger.info("Falling back to CSV files")
        import traceback
        traceback.print_exc()
else:
    if not SUPABASE_URL:
        logger.info("SUPABASE_URL not set in environment variables")
    if not SUPABASE_KEY:
        logger.info("SUPABASE_KEY not set in environment variables")
    if create_client is None:
        logger.info("Supabase Python client library not installed")
    logger.info("Using CSV files if available.")

# ─────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────
def parse_turnaround_time(value: Any) -> Optional[float]:
    """
    Parse turnaround time from various formats:
    - Numeric: "5", "3.5" -> 5.0, 3.5
    - Text: "Same day" -> 0.5, "1 day" -> 1.0, "2-3 days" -> 2.5, etc.
    - None/empty -> None
    """
    if value is None or value == "" or pd.isna(value):
        return None
    
    # Try direct float conversion first
    try:
        return float(value)
    except (ValueError, TypeError):
        pass
    
    # Parse text values
    if isinstance(value, str):
        value_lower = value.lower().strip()
        
        # Handle common text patterns
        if "same day" in value_lower or "immediate" in value_lower or "instant" in value_lower:
            return 0.5
        elif "next day" in value_lower or "1 day" in value_lower:
            return 1.0
        elif "2 day" in value_lower or "two day" in value_lower:
            return 2.0
        elif "3 day" in value_lower or "three day" in value_lower:
            return 3.0
        elif "week" in value_lower:
            # "1 week" -> 7, "2 weeks" -> 14
            try:
                import re
                match = re.search(r'(\d+)', value_lower)
                if match:
                    weeks = float(match.group(1))
                    return weeks * 7.0
                return 7.0  # Default to 1 week
            except:
                return 7.0
        elif "-" in value_lower:
            # Handle ranges like "2-3 days" -> average (2.5)
            try:
                import re
                numbers = re.findall(r'(\d+)', value_lower)
                if len(numbers) >= 2:
                    return (float(numbers[0]) + float(numbers[1])) / 2.0
                elif len(numbers) == 1:
                    return float(numbers[0])
            except:
                pass
        else:
            # Try to extract any number from the string
            try:
                import re
                match = re.search(r'(\d+\.?\d*)', value_lower)
                if match:
                    return float(match.group(1))
            except:
                pass
    
    # If all parsing fails, return None
    return None

# ─────────────────────────────────────────────────────────
# 2) Load CSV fallback (shops)
# ─────────────────────────────────────────────────────────
shops_df: Optional[pd.DataFrame] = None
if SHOPS_CSV.exists():
    try:
        shops_df = pd.read_csv(SHOPS_CSV, dtype=str, keep_default_na=False).replace({"": None})
        for col in ["average_rating", "reviews_count", "latitude", "longitude"]:
            if col in shops_df.columns:
                shops_df[col] = pd.to_numeric(shops_df[col], errors="coerce")
        # Handle average_turnaround_time separately (can be text like "Same day")
        if "average_turnaround_time" in shops_df.columns:
            shops_df["average_turnaround_time"] = shops_df["average_turnaround_time"].apply(parse_turnaround_time)
        if "verified" in shops_df.columns:
            shops_df["verified"] = shops_df["verified"].astype(str).str.lower().isin(
                ["true", "t", "1", "yes", "y", "maybe"]
            )
        logger.info(f"Loaded shops CSV ({len(shops_df)} rows)")
    except Exception as e:
        logger.info(f"Failed to load shops CSV: {e}")
else:
    logger.info(f"Shops CSV not found at: {SHOPS_CSV}")

# ─────────────────────────────────────────────────────────
# 3) Load model & features
# ─────────────────────────────────────────────────────────
model = None
features_config: Dict[str, Any] = {}
rank_model_error: Optional[str] = None

if MODEL_PATH.exists() and FEATURES_PATH.exists():
    try:
        model = joblib.load(MODEL_PATH)
        with open(FEATURES_PATH, "r", encoding="utf-8") as f:
            features_config = json.load(f)  # kept for parity
        logger.info("Loaded ranking model and features.")
    except Exception as e:
        rank_model_error = f"Failed to load ranking artifacts: {e}"
        logger.info(rank_model_error)
else:
    missing = []
    if not MODEL_PATH.exists():
        missing.append(str(MODEL_PATH))
    if not FEATURES_PATH.exists():
        missing.append(str(FEATURES_PATH))
    rank_model_error = f"Missing ranking artifacts: {', '.join(missing)}"
    logger.info(rank_model_error)

# ─────────────────────────────────────────────────────────
# 3.5) Load NLP Models (optional)
# ─────────────────────────────────────────────────────────
# Load Error Type NLP Model
error_nlp_model: Optional[Dict[str, Any]] = None
if ERROR_NLP_MODEL_PATH.exists():
    try:
        error_nlp_model = joblib.load(ERROR_NLP_MODEL_PATH)
        logger.info(f"Loaded NLP error-type model from {ERROR_NLP_MODEL_PATH}")
    except Exception as e:
        logger.info(f"Failed to load error-type NLP model: {e}")
        error_nlp_model = None
else:
    logger.info(f"Error-type NLP model not found at: {ERROR_NLP_MODEL_PATH}. Will use rules only.")

# Load Product Category NLP Model
product_nlp_model: Optional[Dict[str, Any]] = None
if PRODUCT_NLP_MODEL_PATH.exists():
    try:
        product_nlp_model = joblib.load(PRODUCT_NLP_MODEL_PATH)
        logger.info(f"Loaded NLP product-category model from {PRODUCT_NLP_MODEL_PATH}")
    except Exception as e:
        logger.info(f"Failed to load product-category NLP model: {e}")
        product_nlp_model = None
else:
    logger.info(f"Product-category NLP model not found at: {PRODUCT_NLP_MODEL_PATH}. Will use rules only.")

# Load Product Need Model (for component recommendation)
PRODUCT_NEED_MODEL_PATH = HERE / "product_need_model.pkl"
product_need_model = None
if PRODUCT_NEED_MODEL_PATH.exists():
    try:
        product_need_model = joblib.load(PRODUCT_NEED_MODEL_PATH)
        logger.info("Loaded product need model")
    except Exception as e:
        logger.info(f"Failed to load product need model: {e}")
        product_need_model = None
else:
    logger.info("product_need_model.pkl not found – product need ML disabled")

# Initialize COMPONENT_INFO dictionary
COMPONENT_INFO: dict[str, dict[str, str]] = {}

# Load COMPONENT_INFO from CSV if available
try:
    # Try combined file first, then fallback to individual file
    data_path = HERE.parent / "data" / "hardware_component_dataset_combined.csv"
    if not data_path.exists():
        data_path = HERE.parent / "data" / "hardware_component_dataset_10000.csv"
    if data_path.exists():
        df_info = pd.read_csv(data_path)
        # Build a mapping per label from first occurrence
        tmp = {}
        for _, row in df_info.iterrows():
            label = str(row.get("component_label", "")).strip()
            if not label or label in tmp:
                continue
            tmp[label] = {
                "definition": str(row.get("component_definition", "")).strip() or None,
                "why_useful": str(row.get("why_useful", "")).strip() or None,
                "extra_explanation": str(row.get("extra_explanation", "")).strip() or None,
            }
        COMPONENT_INFO.update(tmp)
        logger.info(f"Loaded component info for {len(COMPONENT_INFO)} labels from CSV")
    else:
        logger.info("hardware_component_dataset_10000.csv not found for COMPONENT_INFO")
except Exception as e:
    logger.info(f"Failed to load COMPONENT_INFO from CSV: {e}")







# Legacy model path (for backward compatibility)
NLP_MODEL_PATH = HERE / "nlp_error_model.pkl"
nlp_model: Optional[Dict[str, Any]] = None
if NLP_MODEL_PATH.exists() and error_nlp_model is None:
    try:
        nlp_model = joblib.load(NLP_MODEL_PATH)
        logger.info(f"Loaded legacy NLP model from {NLP_MODEL_PATH}")
        error_nlp_model = nlp_model  # Use as fallback
    except Exception as e:
        logger.info(f"Failed to load legacy NLP model: {e}")

# ─────────────────────────────────────────────────────────
# 4) FastAPI app & CORS
# ─────────────────────────────────────────────────────────
app = FastAPI(
    title="PC Shop Recommendation Engine API",
    version="2.0.0",
    description="ML-powered recommendations for repair/product shops with explainable reasons.",
)

# CORS configuration - allow all local network origins for development
# For production, restrict to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://192.168.56.1:3000",  # Network IP for frontend
        "http://192.168.1.1:3000",  # Common router IP
        "http://192.168.0.1:3000",  # Another common router IP
        "http://10.0.0.1:3000",  # Another common network IP
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    logger.info("➡️ [recommendation][%s] %s", request.method, request.url.path)
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "⬅️ [recommendation][%s] %s | status=%s | %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


def ensure_rank_model_loaded() -> None:
    if model is None:
        detail = rank_model_error or "Ranking model is not loaded."
        raise HTTPException(status_code=503, detail=detail)


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "healthy",
        "rank_model_loaded": model is not None,
        "rank_model_error": rank_model_error,
        "shops_csv_loaded": shops_df is not None,
        "supabase_enabled": USE_SUPABASE,
    }

# ─────────────────────────────────────────────────────────
# 5) Pydantic Schemas / Data Models
# ─────────────────────────────────────────────────────────
# These models define the request/response structures for the API endpoints

class Query(BaseModel):
    """
    Query model for shop ranking requests.
    Used to specify error type, budget, urgency, and location for recommendations.
    """
    error_type: str
    budget: str = Field(default="medium", description="low | medium | high")
    urgency: str = Field(default="normal", description="normal | high")
    user_district: str
    top_k: int = Field(default=10, ge=5, le=10)

class RankRequest(BaseModel):
    """
    Request model for automatic shop ranking.
    Automatically fetches candidates from database/CSV based on error type.
    """
    error_type: str
    budget: str = "medium"
    urgency: str = "normal"
    user_district: str
    top_k: int = Field(default=10, ge=5, le=10)
    mix_results: bool = True

class Candidate(BaseModel):
    """
    Shop candidate model for ranking.
    Represents a shop with its attributes used for ML model scoring.
    """
    shop_id: str
    shop_type: str
    district: Optional[str] = ""
    average_rating: Optional[float] = None
    reviews_count: Optional[float] = None
    verified: Optional[bool] = None
    average_turnaround_time: Optional[float] = None
    price_range: Optional[str] = ""
    shop_name: Optional[str] = None

class InferenceRequest(BaseModel):
    query: Query
    candidates: List[Candidate]

class ShopRecommendation(BaseModel):
    """
    Recommended shop with ranking score and explanation.
    Includes match factors and reasoning for the recommendation.
    """
    shop_id: str
    shop_name: str
    score: float
    shop_type: str
    district: str
    avg_rating: Optional[float] = None
    reviews: Optional[int] = None
    verified: Optional[bool] = None
    turnaround_days: Optional[float] = None
    district_match: int
    type_match: int
    budget_fit: int
    reason: str
    factors: List[str]

class RecommendationResponse(BaseModel):
    """
    Response model for shop recommendations.
    Includes ranked list of shops, summary text, and counts.
    """
    recommendations: List[ShopRecommendation]
    summary: str
    total_found: int
    suitable_count: int

class FeedbackRequest(BaseModel):
    """
    Request model for user feedback submission.
    Used to collect user ratings and corrections for model improvement.
    """
    shop_id: str
    error_type: str
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = ""
    solved: Optional[bool] = True
    feedback_type: str = Field(default="shop", description="shop | product | tool")

class ExplainShopRequest(BaseModel):
    shop_id: str
    error_type: str
    budget: str = "medium"
    urgency: str = "normal"
    user_district: str

class ExplainShopResponse(BaseModel):
    positive_factors: List[str]
    negative_factors: List[str]
    summary: str

class FullRecommendationRequest(BaseModel):
    error_type: str
    budget: str = "medium"
    urgency: str = "normal"
    user_district: str
    top_k_shops: int = Field(default=3, ge=1, le=10)
    top_k_products: int = Field(default=3, ge=1, le=10)
    top_k_tools: int = Field(default=0, ge=0, le=5)  # Allow 0 to disable tools

class FullRecommendationResponse(BaseModel):
    shops: List[ShopRecommendation]
    products: List[Dict[str, Any]]
    tools: List[Dict[str, Any]]
    summary: str

class DetectErrorRequest(BaseModel):
    text: str

class DetectAlternative(BaseModel):
    label: str
    confidence: float

class DetectErrorResponse(BaseModel):
    label: Optional[str]
    confidence: float
    source: str  # "rules", "ml", "ml_low_conf", or "fallback"
    alternatives: List[DetectAlternative]  # top 3 predictions with confidence
    similar_errors: List[DetectAlternative] = []  # similar/related errors
    explanation: Optional[str] = None  # explanation of the detected error
    multiple_types: List[DetectAlternative] = []  # multiple primary error types if applicable
    fixing_steps: Optional[List[str]] = Field(
        default=None,
        description="Step-by-step troubleshooting steps to fix the detected error"
    )

class DetectProductCategoryResponse(BaseModel):
    label: Optional[str]
    confidence: float
    source: str  # "rule", "ml", "ml_low_conf", or "none"
    alternatives: List[DetectAlternative]  # top 3 predictions with confidence

class ProductNeedRequest(BaseModel):
    """
    Request model for hardware component recommendations.
    Takes free-form text describing PC problems/needs and recommends hardware upgrades.
    """
    text: str = Field(..., description="Free text describing the user's problem or goal")
    budget: str = Field(default="medium", description="Budget (not used for model now, reserved for future)")
    district: str = Field(default="", description="User district, reserved for future integration")
    user_district: Optional[str] = Field(default=None, description="Alias for district, for future use")

class ProductNeedAlternative(BaseModel):
    label: str
    confidence: float
    explanation: Optional[str] = None

class CategoryRecommendations(BaseModel):
    category: str
    components: List[ProductNeedAlternative]

class ProductNeedResponse(BaseModel):
    """
    Response model for hardware component recommendations.
    Includes recommended component, confidence, explanations, fixing tips, and alternatives.
    """
    component: Optional[str]  # Primary recommendation (e.g., "RAM Upgrade", "SSD Upgrade")
    need_label: Optional[str] = None  # Alternative label format (for backward compatibility)
    confidence: float  # Prediction confidence score (0.0 to 1.0)
    definition: Optional[str]  # What the component is
    why_useful: Optional[str]  # Why this component helps solve the problem
    extra_explanation: Optional[str]  # Detailed explanation of the recommendation
    alternatives: List[ProductNeedAlternative]  # Top 5 alternative recommendations
    fixing_tips: Optional[List[str]] = Field(
        default=None,
        description="Step-by-step troubleshooting tips before upgrading"
    )
    is_low_confidence: bool = Field(
        default=False,
        description="True if the model is not very sure about this prediction"
    )
    source: str = Field(
        default="ml",
        description="Prediction source: 'rule', 'ml', 'hierarchical_ml', or 'hybrid'"
    )
    ask_feedback: bool = Field(
        default=False,
        description="True if confidence is low and user feedback is requested"
    )
    grouped_by_category: Optional[List[CategoryRecommendations]] = Field(
        default=None,
        description="Recommendations grouped by category (Performance, Power, Network, etc.)"
    )
    spell_correction_suggestion: Optional[str] = Field(
        default=None,
        description="Suggested spelling correction if typos detected (e.g., 'Did you mean...')"
    )

# ─────────────────────────────────────────────────────────
# 6) Helpers
# ─────────────────────────────────────────────────────────
# Complete error type labels (for shop recommendations)
ERROR_TYPE_LABELS = [
    # Hardware Issues
    "GPU Overheat",
    "CPU Overheat",
    "PSU / Power Issue",
    "Motherboard Issue",
    "CPU Upgrade",
    "GPU Upgrade",
    "RAM Upgrade",
    "SSD Upgrade",
    "HDD Upgrade",
    "Fan / Cooling Issue",
    "Thermal Paste Reapply",
    "Battery Replacement",
    "Charging Port Issue",
    
    # Display Issues
    "Monitor Issue",
    "No Display / No Signal",
    "Laptop Screen Repair",
    "Display Cable Issue",
    
    # System Issues
    "Blue Screen (BSOD)",
    "Windows Boot Failure",
    "OS Reinstall / Corrupted",
    "BIOS Issue",
    "Boot Device Error",
    
    # Performance Issues
    "Slow Performance",
    "System Freeze",
    "Application Crash",
    
    # Software Issues
    "Virus / Malware",
    "Driver Issue",
    "Software Conflict",
    "Windows Update Issue",
    
    # Network Issues
    "Wi-Fi Adapter Upgrade",
    "Ethernet Issue",
    "Network Cable Issue",
    "Bluetooth Issue",
    
    # Peripheral Issues
    "Keyboard Issue",
    "Mouse Issue",
    "USB / Port Issue",
    "Audio Issue",
    "Speaker Issue",
    "Microphone Issue",
    "Webcam Issue",
    "Printer Issue",
    "Touchpad Issue",
    
    # Data & Recovery
    "Data Recovery",
    "File Corruption",
    "Partition Issue",
    
    # Phone/Device Issues
    "Phone Connection Issue",
    "Device Not Recognized",
    
    # General
    "General Repair",
    "Hardware Diagnostic",
    "System Optimization"
]

# Product category labels (for product recommendations)
PRODUCT_CATEGORY_LABELS = [
    "GPU",
    "CPU",
    "SSD",
    "HDD",
    "RAM",
    "Wi-Fi Adapter",
    "PSU",
    "Monitor",
    "Cooling",
    "Motherboard",
    "Case",
    "Keyboard",
    "Mouse"
]

ERR_TO_TYPE = {
    # Hardware Issues
    "GPU Overheat": "repair_shop",
    "CPU Overheat": "repair_shop",
    "PSU / Power Issue": "repair_shop",
    "Motherboard Issue": "repair_shop",
    "CPU Upgrade": "product_shop",
    "GPU Upgrade": "product_shop",
    "RAM Upgrade": "product_shop",
    "SSD Upgrade": "product_shop",
    "HDD Upgrade": "product_shop",
    "Fan / Cooling Issue": "repair_shop",
    "Thermal Paste Reapply": "repair_shop",
    "Battery Replacement": "repair_shop",
    "Charging Port Issue": "repair_shop",
    
    # Display Issues
    "Monitor Issue": "repair_shop",
    "No Display / No Signal": "repair_shop",
    "Laptop Screen Repair": "repair_shop",
    "Display Cable Issue": "repair_shop",
    "Monitor or GPU Check": "repair_shop",
    
    # System Issues
    "Blue Screen (BSOD)": "repair_shop",
    "Windows Boot Failure": "repair_shop",
    "OS Reinstall / Corrupted": "repair_shop",
    "BIOS Issue": "repair_shop",
    "Boot Device Error": "repair_shop",
    "Boot Failure": "repair_shop",
    "OS Installation": "repair_shop",
    
    # Performance Issues
    "Slow Performance": "repair_shop",
    "System Freeze": "repair_shop",
    "Application Crash": "repair_shop",
    
    # Software Issues
    "Virus / Malware": "repair_shop",
    "Driver Issue": "repair_shop",
    "Software Conflict": "repair_shop",
    "Windows Update Issue": "repair_shop",
    
    # Network Issues
    "Wi-Fi Adapter Upgrade": "product_shop",
    "Ethernet Issue": "repair_shop",
    "Network Cable Issue": "repair_shop",
    "Bluetooth Issue": "repair_shop",
    
    # Peripheral Issues
    "Keyboard Issue": "repair_shop",
    "Mouse Issue": "repair_shop",
    "USB / Port Issue": "repair_shop",
    "Audio Issue": "repair_shop",
    "Speaker Issue": "repair_shop",
    "Microphone Issue": "repair_shop",
    "Webcam Issue": "repair_shop",
    "Printer Issue": "repair_shop",
    "Touchpad Issue": "repair_shop",
    
    # Data & Recovery
    "Data Recovery": "repair_shop",
    "File Corruption": "repair_shop",
    "Partition Issue": "repair_shop",
    
    # Phone/Device Issues
    "Phone Connection Issue": "repair_shop",
    "Device Not Recognized": "repair_shop",
    
    # General
    "General Repair": "repair_shop",
    "Hardware Diagnostic": "repair_shop",
    "System Optimization": "repair_shop",
}

def ln1p(x: Any) -> float:
    """
    Safe natural logarithm of (1 + x).
    Returns 0.0 if conversion fails.
    Used for feature engineering (log transform of review counts).
    """
    try:
        return math.log1p(float(x))
    except Exception:
        return 0.0

def build_features(q: Query, c: Candidate) -> Dict[str, Any]:
    """
    Build feature vector for ML model from query and candidate shop.
    
    Features include:
    - Quality metrics (rating, reviews, verified status)
    - Match indicators (district, shop type, budget)
    - Urgency penalty (based on turnaround time)
    
    Returns feature dictionary ready for model prediction.
    """
    avg_rating = c.average_rating if c.average_rating is not None else None
    reviews = c.reviews_count if c.reviews_count is not None else None
    verified = 1 if (c.verified is True) else 0
    turnaround = c.average_turnaround_time if c.average_turnaround_time is not None else None
    reviews_ln = ln1p(reviews) if reviews is not None else 0.0
    quality_score_rule = (avg_rating if avg_rating is not None else 3.5) * reviews_ln * (1.2 if verified == 1 else 1.0)

    district_match = 1 if (q.user_district and c.district and q.user_district.lower() == c.district.lower()) else 0
    expected_type = ERR_TO_TYPE.get(q.error_type, c.shop_type)
    type_match = 1 if expected_type == c.shop_type else 0

    pr = (c.price_range or "").lower()
    if q.budget.lower() == "low":
        budget_fit = 1 if ("low" in pr or "budget" in pr) else 0
    elif q.budget.lower() == "high":
        budget_fit = 1 if ("high" in pr or "premium" in pr) else 0
    else:
        budget_fit = 1

    if q.urgency.lower() == "high" and turnaround is not None:
        try:
            urgency_penalty = -min(1.0, float(turnaround) / 7.0)
        except (ValueError, TypeError):
            urgency_penalty = 0.0
    else:
        urgency_penalty = 0.0

    return {
        # numeric
        "avg_rating": avg_rating,
        "reviews": reviews,
        "reviews_ln": reviews_ln,
        "verified": verified,
        "turnaround_days": turnaround,
        "quality_score_rule": quality_score_rule,
        "district_match": district_match,
        "type_match": type_match,
        "budget_fit": budget_fit,
        "urgency_penalty": urgency_penalty,
        # categorical
        "error_type": q.error_type,
        "budget": q.budget.lower(),
        "urgency": q.urgency.lower(),
        "user_district": q.user_district,
        "shop_type": c.shop_type,
        "district": c.district or "",
        # passthrough
        "shop_id": c.shop_id,
        "shop_name": c.shop_name or "Unknown Shop",
    }

def rank_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Deterministic ranking with stable sort.
    Uses multiple keys to ensure same input always produces same output.
    """
    ensure_rank_model_loaded()
    X = df.drop(columns=["shop_id", "shop_name"])
    proba = model.predict_proba(X)[:, 1]
    df = df.copy()
    df["score"] = proba
    
    # Round score to 6 decimal places for stable sorting
    df["score_rounded"] = df["score"].round(6)
    
    # Fill missing values for sorting (ensure all columns exist)
    df["type_match"] = df["type_match"].fillna(0)
    df["avg_rating"] = df["avg_rating"].fillna(0)
    df["reviews"] = df["reviews"].fillna(0)
    df["verified"] = df["verified"].fillna(0)
    df["shop_id"] = df["shop_id"].fillna("")
    
    # Deterministic sort with multiple keys (stable sort)
    df_sorted = df.sort_values(
        by=["score_rounded", "type_match", "avg_rating", "reviews", "verified", "shop_id"],
        ascending=[False, False, False, False, False, True],  # score desc, type_match desc, rating desc, reviews desc, verified desc, shop_id asc (for tie-breaking)
        kind="mergesort"  # stable sort algorithm
    )
    
    return df_sorted

def explain_recommendation(
    shop_row: Dict[str, Any],
    error_type: str,
    user_district: str,
    budget: str,
    urgency: str,
    rank: int = 0,
    used_reasons: Optional[List[str]] = None
) -> Tuple[str, List[str]]:
    """
    Generate unique explanation for each recommendation.
    Rank helps prioritize different aspects for variety.
    """
    if used_reasons is None:
        used_reasons = []
    
    shop_name = (shop_row.get("shop_name") or "This shop")
    
    # Build all available reasons with priority scores
    reason_options: List[Tuple[str, str, float]] = []  # (text, factor, priority)
    
    # Type match - highest priority for first shops
    if shop_row.get("type_match") == 1:
        priority = 10.0 - rank  # Higher priority for top-ranked shops
        reason_options.append((f"specializes in handling {error_type}", "Specialization match", priority))
    
    # District match - high priority
    if shop_row.get("district_match") == 1:
        priority = 9.0 - (rank * 0.3)
        reason_options.append((f"located in your district ({user_district})", "Location convenience", priority))
    
    # Verified status
    if shop_row.get("verified") == 1 or shop_row.get("verified") is True:
        priority = 8.5 - (rank * 0.2)
        reason_options.append(("verified and trusted", "Verified business", priority))
    
    # Rating-based reasons (vary by rank)
    ar = shop_row.get("avg_rating")
    if ar is not None:
        if ar >= 4.5:
            priority = 9.0 - rank if rank < 3 else 7.0
            reason_options.append((f"excellent {ar:.1f}⭐ rating with proven track record", "Top-rated", priority))
        elif ar >= 4.0:
            priority = 8.0 - (rank * 0.4)
            reason_options.append((f"excellent {ar:.1f}⭐ rating", "High rating", priority))
        elif ar >= 3.5:
            priority = 6.5 - (rank * 0.3)
            reason_options.append((f"solid {ar:.1f}⭐ rating", "Good rating", priority))
        elif rank > 5:  # For lower-ranked shops, mention even moderate ratings
            priority = 5.0
            reason_options.append((f"{ar:.1f}⭐ rating", "Reliable rating", priority))
    
    # Review count (vary emphasis)
    rv = shop_row.get("reviews")
    if rv is not None:
        if rv >= 100:
            priority = 8.0 if rank < 4 else 6.5
            reason_options.append((f"{int(rv)}+ satisfied customers", "Highly popular", priority))
        elif rv >= 50:
            priority = 7.0 - (rank * 0.3)
            reason_options.append((f"{int(rv)}+ customer reviews", "Popular choice", priority))
        elif rv >= 20 and rank > 5:
            priority = 5.5
            reason_options.append((f"{int(rv)}+ reviews from real customers", "Established", priority))
    
    # Turnaround time (adapt based on urgency)
    td = shop_row.get("turnaround_days")
    if td is not None:
        if urgency.lower() == "high":
            if td <= 2:
                priority = 9.5 - rank
                reason_options.append((f"ultra-fast {int(td)}-day service", "Emergency ready", priority))
            elif td <= 3:
                priority = 8.5 - (rank * 0.3)
                reason_options.append((f"quick ~{int(td)}-day turnaround", "Fast service", priority))
        else:
            if td <= 3:
                priority = 7.5 - (rank * 0.4)
                reason_options.append((f"efficient ~{int(td)}-day turnaround", "Quick turnaround", priority))
            elif td <= 5:
                priority = 6.0 - (rank * 0.3) if rank > 3 else 5.0
                reason_options.append((f"reasonable ~{int(td)}-day turnaround", "Reasonable timing", priority))
    
    # Budget match
    if shop_row.get("budget_fit") == 1:
        priority = 7.5 - (rank * 0.3)
        reason_options.append((f"matches your {budget.capitalize()} budget preferences", "Budget match", priority))
    
    # Quality score composite (for variety)
    qs = shop_row.get("quality_score_rule")
    if qs is not None and qs > 10 and rank > 3:
        priority = 6.5
        reason_options.append(("strong overall quality metrics", "Quality assurance", priority))
    
    # Sort by priority and select top 2-3 reasons, avoiding duplicates
    reason_options.sort(key=lambda x: x[2], reverse=True)
    
    parts: List[str] = []
    factors: List[str] = []
    selected_texts = set()
    
    # Select reasons, ensuring uniqueness
    for text, factor, _ in reason_options:
        # Avoid exact duplicates
        if text not in selected_texts and factor not in factors:
            # For lower ranks, try to use different factors than previously used
            if used_reasons and factor in used_reasons and len(factors) < 1:
                continue  # Skip if this factor was already used and we have no factors yet
            parts.append(text)
            factors.append(factor)
            selected_texts.add(text)
            if len(parts) >= 3:  # Limit to top 3 reasons
                break
    
    # Ensure at least one reason
    if not parts:
        # Fallback reasons based on rank
        if rank == 0:
            parts.append("is our top recommendation based on comprehensive analysis")
            factors.append("Best overall match")
        elif rank < 3:
            parts.append("stands out with strong performance metrics")
            factors.append("High performance")
        elif rank < 6:
            parts.append("offers reliable service matching your needs")
            factors.append("Reliable option")
        else:
            parts.append("is a solid choice based on our ML model's prediction")
            factors.append("Recommended")
    
    # Build natural language explanation (vary format by rank)
    if len(parts) == 1:
        if rank == 0:
            reason = f"{shop_name} is our top recommendation because it {parts[0]}."
        else:
            reason = f"We recommend {shop_name} because it {parts[0]}."
    elif len(parts) == 2:
        if rank < 3:
            reason = f"{shop_name} excels because it {parts[0]} and {parts[1]}."
        else:
            reason = f"We recommend {shop_name} as it {parts[0]} and {parts[1]}."
    else:
        if rank < 2:
            reason = f"{shop_name} is an excellent choice because it {parts[0]}, {parts[1]}, and {parts[2]}."
        else:
            reason = f"{shop_name} is recommended because it {parts[0]}, {parts[1]}, and {parts[2]}."
    
    return reason, factors

def generate_recommendation_summary(
    results: List[Dict[str, Any]],
    error_type: str,
    user_district: str,
    budget: str
) -> str:
    """
    Generate a ChatGPT-like summary analysis of the recommendations.
    """
    if not results:
        return f"I couldn't find any suitable repair centers for '{error_type}' in your area. Please try adjusting your search criteria or expanding to nearby districts."
    
    total = len(results)
    district_count = sum(1 for r in results if r.get("district_match") == 1)
    verified_count = sum(1 for r in results if r.get("verified"))
    top_rated = max((r.get("avg_rating") for r in results if r.get("avg_rating")), default=None)
    
    # Build summary
    summary_parts = []
    
    # Opening statement
    summary_parts.append(f"Based on your issue **{error_type}**, I've analyzed our database and found {total} suitable repair center{'s' if total > 1 else ''} for you.")
    
    # District analysis
    if district_count > 0:
        summary_parts.append(f"📍 **Location Advantage**: {district_count} of these {'are' if district_count > 1 else 'is'} located in {user_district}, making them convenient for you.")
    elif user_district:
        summary_parts.append(f"ℹ️ While we couldn't find shops specifically in {user_district}, I've recommended the best options from nearby areas with strong track records.")
    
    # Quality analysis
    if verified_count > 0:
        summary_parts.append(f"✅ **Quality Assurance**: {verified_count} repair center{'s have' if verified_count > 1 else ' has'} been verified by our system, ensuring reliability.")
    
    if top_rated and top_rated >= 4.5:
        summary_parts.append(f"⭐ **Top Ratings**: The highest-rated center{'s' if total > 1 else ''} have an excellent {top_rated:.1f}-star rating, indicating high customer satisfaction.")
    
    # Recommendation strategy
    if total <= 3:
        summary_parts.append(f"These are the **most suitable options** I found - each has been carefully evaluated for specialization, location, ratings, and customer feedback.")
    else:
        summary_parts.append(f"I've filtered the results to show you the **most suitable options** based on specialization match, location convenience, ratings, and verified status.")
    
    # Budget mention
    if budget.lower() != "medium":
        summary_parts.append(f"💰 All recommendations match your **{budget.capitalize()} budget** preferences.")
    
    # Closing
    summary_parts.append("You can click 'View Details' on any recommendation to see contact information, services, and customer reviews.")
    
    return "\n\n".join(summary_parts)

# ─────────────────────────────────────────────────────────
# 7) Root
# ─────────────────────────────────────────────────────────
@app.get("/", tags=["General"])
def root():
    return {
        "message": "PC Shop Recommendation Engine API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "status": "operational",
        "supabase_configured": USE_SUPABASE,
    }

@app.get("/health/supabase", tags=["Health"])
def check_supabase():
    """Check Supabase connection status and provide detailed information."""
    result = {
        "supabase_configured": False,
        "supabase_connected": False,
        "environment_variables": {
            "SUPABASE_URL_set": bool(SUPABASE_URL),
            "SUPABASE_KEY_set": bool(SUPABASE_KEY),
        },
        "supabase_client_available": create_client is not None,
        "status": "not_configured",
        "details": {},
        "tables_checked": {}
    }
    
    # Check if environment variables are set
    if not SUPABASE_URL or not SUPABASE_KEY:
        result["status"] = "missing_env_vars"
        result["details"] = {
            "message": "Supabase environment variables not set",
            "required": ["SUPABASE_URL", "SUPABASE_KEY"],
            "help": "Create a .env file in the backend directory with SUPABASE_URL and SUPABASE_KEY"
        }
        return result
    
    # Check if supabase client library is available
    if create_client is None:
        result["status"] = "library_not_installed"
        result["details"] = {
            "message": "Supabase Python client library not installed",
            "fix": "Run: pip install supabase"
        }
        return result
    
    # Check if client was created
    if supabase is None:
        result["status"] = "connection_failed"
        result["details"] = {
            "message": "Failed to create Supabase client",
            "url": SUPABASE_URL[:50] + "..." if len(SUPABASE_URL) > 50 else SUPABASE_URL
        }
        return result
    
    result["supabase_configured"] = True
    
    # Test connection by querying tables
    tables_to_check = ["shops", "products", "feedback"]
    
    for table_name in tables_to_check:
        try:
            response = supabase.table(table_name).select("*").limit(1).execute()
            result["tables_checked"][table_name] = {
                "accessible": True,
                "row_count_sample": len(response.data) if response.data else 0,
                "error": None
            }
        except Exception as e:
            result["tables_checked"][table_name] = {
                "accessible": False,
                "error": str(e)
            }
    
    # Determine overall status
    accessible_tables = sum(1 for t in result["tables_checked"].values() if t.get("accessible", False))
    
    if accessible_tables == len(tables_to_check):
        result["supabase_connected"] = True
        result["status"] = "connected"
        result["details"] = {
            "message": "✅ Supabase connection successful",
            "accessible_tables": accessible_tables,
            "total_tables_checked": len(tables_to_check)
        }
    elif accessible_tables > 0:
        result["supabase_connected"] = True
        result["status"] = "partially_connected"
        result["details"] = {
            "message": "⚠️ Supabase connected but some tables are not accessible",
            "accessible_tables": accessible_tables,
            "total_tables_checked": len(tables_to_check)
        }
    else:
        result["status"] = "connection_failed"
        result["details"] = {
            "message": "❌ Supabase connection failed - cannot access tables",
            "accessible_tables": 0,
            "total_tables_checked": len(tables_to_check)
        }
    
    return result

# ─────────────────────────────────────────────────────────
# 8) /rank_auto  (auto-fetch + ML rank + explain)
# ─────────────────────────────────────────────────────────
@app.post("/rank_auto", response_model=RecommendationResponse, tags=["Recommendations"])
def rank_auto(req: RankRequest):
    try:
        # Logging for debugging consistency
        logger.info(
            f"[RANK_AUTO] error_type='{req.error_type}', "
            f"budget='{req.budget}', urgency='{req.urgency}', "
            f"user_district='{req.user_district}', top_k={req.top_k}, mix_results={req.mix_results}"
        )
        
        # Validate error_type is provided
        if not req.error_type or not req.error_type.strip():
            raise HTTPException(status_code=400, detail="error_type is required. Please describe your issue.")
        
        # Validate district is provided
        if not req.user_district or not req.user_district.strip():
            raise HTTPException(status_code=400, detail="user_district is required. Please select a district.")
        
        desired_type = ERR_TO_TYPE.get(req.error_type, "repair_shop")
        logger.info(f"Processing request: error_type='{req.error_type}', district='{req.user_district}', desired_type='{desired_type}'")
        rows: List[Dict[str, Any]] = []

        # Prefer Supabase
        if USE_SUPABASE and supabase is not None:
            try:
                same = supabase.table("shops").select(
                    "shop_id, shop_name, shop_type, district, average_rating, reviews_count, verified, average_turnaround_time, price_range"
                ).eq("shop_type", desired_type)\
                 .eq("district", req.user_district)\
                 .order("average_rating", desc=True)\
                 .limit(15).execute().data or []

                need = max(0, req.top_k - len(same))
                others = []
                if need > 0:
                    others = supabase.table("shops").select(
                        "shop_id, shop_name, shop_type, district, average_rating, reviews_count, verified, average_turnaround_time, price_range"
                    ).eq("shop_type", desired_type)\
                     .neq("district", req.user_district)\
                     .order("average_rating", desc=True)\
                     .limit(need).execute().data or []

                rows = (same or []) + (others or [])
            except Exception as e:
                error_msg = str(e)
                logger.info(f"Supabase query failed: {error_msg}")
                if "requested path is invalid" in error_msg.lower() or "relation" in error_msg.lower():
                    logger.info(f"   This usually means the 'shops' table doesn't exist in Supabase.")
                    logger.info(f"   Please create the table in your Supabase project or check table name.")
                logger.info(f"   Falling back to CSV data...")
                rows = []

        # CSV fallback
        if not rows and shops_df is not None and not shops_df.empty:
            filtered = shops_df[
                (shops_df["shop_type"].str.lower() == desired_type.lower()) |
                (shops_df["shop_type"].fillna("").str.contains(desired_type, case=False, na=False))
            ].copy()

            if not filtered.empty and "district" in filtered.columns:
                sd = filtered[filtered["district"].str.lower() == req.user_district.lower()].copy()
                od = filtered[filtered["district"].str.lower() != req.user_district.lower()].copy()
            else:
                sd, od = filtered.copy(), pd.DataFrame()

            # Deterministic sorting for CSV data
            sd = sd.sort_values(
                by=["average_rating", "reviews_count", "shop_id"],
                ascending=[False, False, True],
                kind="mergesort",
                na_position="last"
            )
            od = od.sort_values(
                by=["average_rating", "reviews_count", "shop_id"],
                ascending=[False, False, True],
                kind="mergesort",
                na_position="last"
            )
            combined = pd.concat([sd.head(15), od.head(req.top_k)], ignore_index=True)

            rows = combined.head(req.top_k).to_dict(orient="records")

        # Log candidate count for debugging
        logger.info(f"[RANK_AUTO] candidates_count={len(rows)}")

        if not rows:
            # Return empty response with appropriate structure
            return RecommendationResponse(
                recommendations=[],
                summary=f"I couldn't find any repair centers for '{req.error_type}' in your area. Please try adjusting your search criteria or expanding to nearby districts.",
                total_found=0,
                suitable_count=0
            )

        # Normalize rows and build candidates
        norm_rows: List[Dict[str, Any]] = []
        for r in rows:
            nr = {
                "shop_id": str(r.get("shop_id", "")),
                "shop_name": r.get("shop_name") or "Unknown Shop",
                "shop_type": r.get("shop_type") or desired_type,
                "district": r.get("district") or "",
                "average_rating": float(r["average_rating"]) if r.get("average_rating") not in (None, "",) and pd.notna(r.get("average_rating")) else None,
                "reviews_count": float(r["reviews_count"]) if r.get("reviews_count") not in (None, "",) and pd.notna(r.get("reviews_count")) else None,
                "verified": (str(r.get("verified", "false")).lower() in ["true", "t", "1", "yes", "y", "maybe"]),
                "average_turnaround_time": parse_turnaround_time(r.get("average_turnaround_time")),
                "price_range": r.get("price_range") or "",
            }
            norm_rows.append(nr)

        query = Query(
            error_type=req.error_type,
            budget=req.budget,
            urgency=req.urgency,
            user_district=req.user_district,
            top_k=req.top_k,
        )

        candidates: List[Candidate] = [
            Candidate(
                shop_id=nr["shop_id"],
                shop_type=nr["shop_type"],
                district=nr["district"],
                average_rating=nr["average_rating"],
                reviews_count=nr["reviews_count"],
                verified=nr["verified"],
                average_turnaround_time=nr["average_turnaround_time"],
                price_range=nr["price_range"],
                shop_name=nr["shop_name"],
            )
            for nr in norm_rows
        ]

        try:
            feats = [build_features(query, c) for c in candidates]
            df = pd.DataFrame(feats)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Feature build failed: {str(e)}")

        if df.empty:
            # Return empty response with appropriate structure
            return RecommendationResponse(
                recommendations=[],
                summary=f"I couldn't find any suitable repair centers for '{req.error_type}' in your area. Please try adjusting your search criteria or expanding to nearby districts.",
                total_found=0,
                suitable_count=0
            )

        # Rank all shops first
        ranked_df = rank_df(df)
        
        if req.mix_results:
            # Get 6-7 shops and mix them up (don't show best first)
            num_shops_to_show = min(7, max(6, len(ranked_df)))
            if num_shops_to_show > 0:
                # Take top shops (up to 7)
                top_shops = ranked_df.head(num_shops_to_show)
                
                # Shuffle them to mix up the order (so best shop isn't always first)
                if len(top_shops) > 1:
                    out = top_shops.sample(frac=1, random_state=random.randint(1, 1000)).reset_index(drop=True)
                else:
                    out = top_shops
            else:
                out = ranked_df.head(req.top_k)
        else:
            # Deterministic top results (used for Best Match / explanations)
            out = ranked_df.head(req.top_k)

        # Handle empty results after ranking
        if out.empty:
            return RecommendationResponse(
                recommendations=[],
                summary=f"I couldn't find any repair centers for '{req.error_type}' in your area. Please try adjusting your search criteria or expanding to nearby districts.",
                total_found=0,
                suitable_count=0
            )

        results: List[ShopRecommendation] = []
        used_factors: List[str] = []  # Track used factors for diversity
        for rank_idx, (_, row) in enumerate(out.iterrows()):
            reason, factors = explain_recommendation(
                row.to_dict(),
                req.error_type,
                req.user_district,
                req.budget,
                req.urgency,
                rank=rank_idx,
                used_reasons=used_factors,
            )
            # Track factors to avoid repetition
            used_factors.extend(factors[:2])  # Track first 2 factors per shop
            results.append(ShopRecommendation(
                shop_id=str(row["shop_id"]),
                shop_name=str(row.get("shop_name", "Unknown Shop")),
                score=float(row["score"]),
                shop_type=str(row.get("shop_type", "")),
                district=str(row.get("district", "")),
                avg_rating=float(row["avg_rating"]) if pd.notna(row.get("avg_rating")) else None,
                reviews=int(row["reviews"]) if pd.notna(row.get("reviews")) else None,
                verified=bool(row.get("verified", 0)) if pd.notna(row.get("verified")) else None,
                turnaround_days=float(row["turnaround_days"]) if pd.notna(row.get("turnaround_days")) else None,
                district_match=int(row.get("district_match", 0)),
                type_match=int(row.get("type_match", 0)),
                budget_fit=int(row.get("budget_fit", 0)),
                reason=reason,
                factors=factors,
            ))

        # Handle empty results case (should not happen after ranking, but just in case)
        if not results:
            return RecommendationResponse(
                recommendations=[],
                summary=f"I couldn't find any repair centers for '{req.error_type}' in your area. Please try adjusting your search criteria or expanding to nearby districts.",
                total_found=0,
                suitable_count=0
            )
        
        # Filter to show only suitable repair centers (score >= 0.5 or top matches)
        suitable_results = []
        
        # Helper function to safely get attribute
        def get_attr(obj, attr, default=0):
            if hasattr(obj, attr):
                return getattr(obj, attr)
            elif isinstance(obj, dict):
                return obj.get(attr, default)
            return default
        
        # Get top score as reference
        if results:
            scores = [get_attr(r, 'score', 0) for r in results]
            max_score = max(scores) if scores else 1.0
        else:
            max_score = 1.0
        score_threshold = max(0.4, max_score * 0.5)  # At least 50% of top score or 0.4
        
        for r in results:
            # Safely access attributes
            score = get_attr(r, 'score', 0)
            type_match = get_attr(r, 'type_match', 0)
            district_match = get_attr(r, 'district_match', 0)
            
            # Include if:
            # 1. Score is above threshold, OR
            # 2. Has strong matches (type_match + district_match), OR
            # 3. Top 5 results regardless of score
            is_suitable = (
                score >= score_threshold or
                (type_match == 1 and district_match == 1) or
                len(suitable_results) < 5
            )
            
            if is_suitable:
                suitable_results.append(r)
        
        # Convert suitable_results to dicts for summary function
        results_dicts = []
        for r in suitable_results:
            # Safely extract attributes
            results_dicts.append({
                "district_match": get_attr(r, 'district_match', 0),
                "verified": get_attr(r, 'verified', False),
                "avg_rating": get_attr(r, 'avg_rating', None)
            })
        
        # Handle empty suitable results
        if not suitable_results:
            return RecommendationResponse(
                recommendations=[],
                summary=f"I analyzed our database for '{req.error_type}' but couldn't find any repair centers that meet the quality thresholds. This might be because:\n\n• No shops in your district match this error type\n• Quality scores were below our minimum threshold\n• Limited availability in your area\n\n**Try:** Expanding your search to nearby districts or adjusting your budget preference.",
                total_found=len(results),
                suitable_count=0
            )
        
        # Generate summary analysis based on filtered suitable results
        summary = generate_recommendation_summary(results_dicts, req.error_type, req.user_district, req.budget)
        
        # Return filtered results with summary
        return RecommendationResponse(
            recommendations=suitable_results,
            summary=summary,
            total_found=len(results),
            suitable_count=len(suitable_results)
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

# ─────────────────────────────────────────────────────────
# 9) /rank  (manual candidates → ML rank + explain)
# ─────────────────────────────────────────────────────────
@app.post("/rank", response_model=List[ShopRecommendation], tags=["Recommendations"])
def rank(req: InferenceRequest):
    try:
        feats = [build_features(req.query, c) for c in req.candidates]
        df = pd.DataFrame(feats)
        if df.empty:
            return []

        out = rank_df(df)

        results: List[ShopRecommendation] = []
        used_factors: List[str] = []  # Track used factors for diversity
        for rank_idx, (_, row) in enumerate(out.iterrows()):
            reason, factors = explain_recommendation(
                row.to_dict(),
                req.query.error_type,
                req.query.user_district,
                req.query.budget,
                req.query.urgency,
                rank=rank_idx,
                used_reasons=used_factors,
            )
            # Track factors to avoid repetition
            used_factors.extend(factors[:2])  # Track first 2 factors per shop
            results.append(ShopRecommendation(
                shop_id=str(row["shop_id"]),
                shop_name=str(row.get("shop_name", "Unknown Shop")),
                score=float(row["score"]),
                shop_type=str(row.get("shop_type", "")),
                district=str(row.get("district", "")),
                avg_rating=float(row["avg_rating"]) if pd.notna(row.get("avg_rating")) else None,
                reviews=int(row["reviews"]) if pd.notna(row.get("reviews")) else None,
                verified=bool(row.get("verified", 0)) if pd.notna(row.get("verified")) else None,
                turnaround_days=float(row["turnaround_days"]) if pd.notna(row.get("turnaround_days")) else None,
                district_match=int(row.get("district_match", 0)),
                type_match=int(row.get("type_match", 0)),
                budget_fit=int(row.get("budget_fit", 0)),
                reason=reason,
                factors=factors,
            ))

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rank shops: {str(e)}")

# ─────────────────────────────────────────────────────────
# 10) /shop_details
# ─────────────────────────────────────────────────────────
@app.get("/shop_details", tags=["Shops"])
def get_shop_details(shop_id: str):
    try:
        # Validate shop_id is provided
        if not shop_id or not shop_id.strip():
            raise HTTPException(status_code=400, detail="shop_id parameter is required")
        
        shop_id = shop_id.strip()  # Clean the shop_id
        logger.info(f"Fetching shop details for shop_id: '{shop_id}'")
        
        shop_data: Optional[Dict[str, Any]] = None
        products: List[Dict[str, Any]] = []
        feedback: List[Dict[str, Any]] = []

        # Supabase first
        if USE_SUPABASE and supabase is not None:
            try:
                sres = supabase.table("shops").select("*").eq("shop_id", shop_id).execute()
                if sres.data:
                    shop_data = sres.data[0]
                    logger.info(f"Found shop in Supabase: {shop_data.get('shop_name', 'Unknown')}")
                else:
                    logger.info(f"Shop '{shop_id}' not found in Supabase")
                    
                try:
                    pres = supabase.table("products").select("*").eq("shop_id", shop_id).execute()
                    products = pres.data or []
                    if products:
                        logger.info(f"Found {len(products)} products in Supabase")
                except Exception as e:
                    logger.info(f"Failed to fetch products from Supabase: {e}")
                    
                try:
                    fres = supabase.table("feedback").select("*").eq("shop_id", shop_id).order("date", desc=True).limit(10).execute()
                    feedback = fres.data or []
                    if feedback:
                        logger.info(f"Found {len(feedback)} feedback entries in Supabase")
                except Exception as e:
                    logger.info(f"Failed to fetch feedback from Supabase: {e}")
            except Exception as e:
                error_msg = str(e)
                logger.info(f"Supabase shop_details failed: {error_msg}")
                if "requested path is invalid" in error_msg.lower() or "relation" in error_msg.lower():
                    logger.info(f"   This usually means the 'shops' table doesn't exist in Supabase.")
                    logger.info(f"   Please create the table in your Supabase project or check table name.")
                import traceback
                traceback.print_exc()

        # CSV fallback
        if not shop_data and shops_df is not None and not shops_df.empty:
            logger.info(f"Searching CSV for shop_id: '{shop_id}'")
            try:
                if 'shop_id' in shops_df.columns:
                    logger.info(f"   Available shop_ids in CSV (first 5): {list(shops_df['shop_id'].head(5))}")
                    
                    # Try exact match first
                    row = shops_df[shops_df["shop_id"].astype(str).str.strip() == shop_id]
                    if not row.empty:
                        shop_data = row.iloc[0].to_dict()
                        logger.info(f"Found shop in CSV: {shop_data.get('shop_name', 'Unknown')}")
                    else:
                        # Try case-insensitive match
                        row = shops_df[shops_df["shop_id"].astype(str).str.strip().str.lower() == shop_id.lower()]
                        if not row.empty:
                            shop_data = row.iloc[0].to_dict()
                            logger.info(f"Found shop in CSV (case-insensitive): {shop_data.get('shop_name', 'Unknown')}")
                else:
                    logger.info(f"CSV loaded but 'shop_id' column not found. Available columns: {list(shops_df.columns)}")
            except Exception as csv_error:
                logger.info(f"Error searching CSV: {csv_error}")
                import traceback
                traceback.print_exc()

        if not shop_data:
            error_msg = f"Shop with ID '{shop_id}' not found in database"
            logger.info(f"{error_msg}")
            raise HTTPException(status_code=404, detail=error_msg)

        # Load products from CSV if not already loaded
        if not products and PRODUCTS_CSV.exists():
            try:
                pdf = pd.read_csv(PRODUCTS_CSV, dtype=str, keep_default_na=False)
                products = pdf[pdf["shop_id"].astype(str).str.strip() == shop_id].to_dict(orient="records")
                if products:
                    logger.info(f"Found {len(products)} products in CSV")
            except Exception as e:
                logger.info(f"Failed to load products from CSV: {e}")
                import traceback
                traceback.print_exc()

        # Clean up shop_data to ensure JSON serializable (handle NaN, None, infinity)
        if shop_data:
            cleaned_shop_data = {}
            for key, value in shop_data.items():
                # Handle NaN values from pandas
                if pd.isna(value):
                    cleaned_shop_data[key] = None
                # Handle infinity values
                elif isinstance(value, (int, float)) and (not math.isfinite(value) if hasattr(math, 'isfinite') else False):
                    cleaned_shop_data[key] = None
                # Handle numpy types
                elif hasattr(value, 'item'):  # numpy scalar types
                    try:
                        cleaned_shop_data[key] = value.item()
                    except:
                        cleaned_shop_data[key] = str(value)
                else:
                    cleaned_shop_data[key] = value
            shop_data = cleaned_shop_data

        logger.info(f"Returning shop details for: {shop_data.get('shop_name', 'Unknown') if shop_data else 'Unknown'}")
        return {"shop": shop_data, "products": products, "feedback": feedback}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.info(f"Error in get_shop_details: {e}")
        logger.info(f"Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch shop details: {str(e)}")

# ─────────────────────────────────────────────────────────
# 11) /product_details
# ─────────────────────────────────────────────────────────
@app.get("/product_details", tags=["Products"])
def get_product_details(product_id: str):
    try:
        # Validate product_id is provided
        if not product_id or not product_id.strip():
            raise HTTPException(status_code=400, detail="product_id parameter is required")
        
        product_data: Optional[Dict[str, Any]] = None
        shop_data: Optional[Dict[str, Any]] = None

        # Supabase first
        if USE_SUPABASE and supabase is not None:
            try:
                pres = supabase.table("products").select("*").eq("product_id", product_id).execute()
                if pres.data:
                    product_data = pres.data[0]
                    # Get shop details
                    if product_data.get("shop_id"):
                        sres = supabase.table("shops").select("*").eq("shop_id", product_data["shop_id"]).execute()
                        if sres.data:
                            shop_data = sres.data[0]
            except Exception as e:
                logger.info(f"Supabase product_details failed: {e}")

        # CSV fallback
        if not product_data and PRODUCTS_CSV.exists():
            try:
                pdf = pd.read_csv(PRODUCTS_CSV, dtype=str, keep_default_na=False).replace({"": None})
                product_row = pdf[pdf["product_id"] == product_id]
                if not product_row.empty:
                    product_data_raw = product_row.iloc[0].to_dict()
                    # Clean up NaN values
                    product_data = {}
                    for k, v in product_data_raw.items():
                        if pd.isna(v) or (isinstance(v, float) and (math.isnan(v) or not math.isfinite(v))):
                            product_data[k] = None
                        elif isinstance(v, (int, float)) and not math.isfinite(v):
                            product_data[k] = None
                        else:
                            product_data[k] = v
                    
                    # Get shop details
                    if product_data.get("shop_id") and shops_df is not None and not shops_df.empty:
                        try:
                            shop_row = shops_df[shops_df["shop_id"].astype(str).str.strip() == str(product_data["shop_id"]).strip()]
                            if not shop_row.empty:
                                shop_data_raw = shop_row.iloc[0].to_dict()
                                # Clean up NaN values from shop_data
                                shop_data = {}
                                for k, v in shop_data_raw.items():
                                    if pd.isna(v) or (isinstance(v, float) and (math.isnan(v) or not math.isfinite(v))):
                                        shop_data[k] = None
                                    elif isinstance(v, (int, float)) and not math.isfinite(v):
                                        shop_data[k] = None
                                    else:
                                        shop_data[k] = v
                        except Exception as shop_error:
                            logger.info(f"Error fetching shop data for product: {shop_error}")
            except Exception as e:
                logger.info(f"CSV product_details failed: {e}")
                import traceback
                traceback.print_exc()

        if not product_data:
            raise HTTPException(status_code=404, detail="Product not found")

        # Clean up product_data and shop_data to ensure JSON serializable
        if product_data:
            cleaned_product_data = {}
            for key, value in product_data.items():
                # Handle NaN values from pandas
                if pd.isna(value):
                    cleaned_product_data[key] = None
                # Handle infinity values
                elif isinstance(value, (int, float)) and (not math.isfinite(value) if hasattr(math, 'isfinite') else False):
                    cleaned_product_data[key] = None
                # Handle numpy types
                elif hasattr(value, 'item'):  # numpy scalar types
                    try:
                        cleaned_product_data[key] = value.item()
                    except:
                        cleaned_product_data[key] = str(value)
                else:
                    cleaned_product_data[key] = value
            product_data = cleaned_product_data

        if shop_data:
            cleaned_shop_data = {}
            for key, value in shop_data.items():
                # Handle NaN values from pandas
                if pd.isna(value):
                    cleaned_shop_data[key] = None
                # Handle infinity values
                elif isinstance(value, (int, float)) and (not math.isfinite(value) if hasattr(math, 'isfinite') else False):
                    cleaned_shop_data[key] = None
                # Handle numpy types
                elif hasattr(value, 'item'):  # numpy scalar types
                    try:
                        cleaned_shop_data[key] = value.item()
                    except:
                        cleaned_shop_data[key] = str(value)
                else:
                    cleaned_shop_data[key] = value
            shop_data = cleaned_shop_data

        logger.info(f"Returning product details for: {product_data.get('product_id', 'Unknown') if product_data else 'Unknown'}")
        return {"product": product_data, "shop": shop_data}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.info(f"Error in get_product_details: {e}")
        logger.info(f"Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch product details: {str(e)}")

# ─────────────────────────────────────────────────────────
# 12) Products auto
# ─────────────────────────────────────────────────────────
class ProductQuery(BaseModel):
    error_type: Optional[str] = ""
    product_category: Optional[str] = ""
    query: Optional[str] = ""
    budget: str = "medium"
    district: str = ""
    user_district: Optional[str] = ""

@app.post("/rank_products_auto", tags=["Products"])
def rank_products_auto(q: ProductQuery):
    try:
        # Apply spell checking to improve product matching
        try:
            from spell_checker import check_and_correct
            if q.query:
                corrected_query, corrections = check_and_correct(q.query)
                if corrections:
                    logger.info(f"[SPELL_CHECK] Product query corrected: {corrections}")
                    q.query = corrected_query
            if q.error_type:
                corrected_error_type, _ = check_and_correct(q.error_type)
                if corrected_error_type != q.error_type:
                    q.error_type = corrected_error_type
            if q.product_category:
                corrected_category, _ = check_and_correct(q.product_category)
                if corrected_category != q.product_category:
                    q.product_category = corrected_category
        except Exception as e:
            logger.info(f"[WARNING] Spell checker failed: {e}")
            pass  # Continue without spell checking
        
        search_text = (q.query or q.error_type or q.product_category or "").lower()
        user_district = q.user_district or q.district or ""

        error_to_category = {
            "SSD Upgrade": "SSD",
            "RAM Upgrade": "RAM",
            "Wi-Fi Adapter Upgrade": "Wi-Fi Adapter",
            "GPU Overheat": "GPU",
            "PSU / Power Issue": "PSU",
        }

        product_category = q.product_category or ""
        detected_category = None
        detection_confidence = 0.0
        detection_source = "none"
        
        # STEP 1: If product_category is provided, use it directly
        if product_category:
            pass  # Use provided category
        # STEP 2: Try to detect from search text (symptom descriptions) using hybrid detection
        elif search_text:
            detection_result = detect_product_category_hybrid(search_text.strip())
            detected_category = detection_result.get('label')
            detection_confidence = detection_result.get('confidence', 0.0)
            detection_source = detection_result.get('source', 'none')
            
            if detected_category and detection_confidence >= 0.6:
                product_category = detected_category
                logger.info(f"[PRODUCT NLP] Mapped '{search_text}' -> '{detected_category}' (source={detection_source}, conf={detection_confidence:.2f})")
        # STEP 3: Fallback to error_type mapping
        if not product_category and q.error_type:
            product_category = error_to_category.get(q.error_type, "")

        desired_type = "product_shop"
        results: List[Dict[str, Any]] = []

        # Supabase
        if USE_SUPABASE and supabase is not None:
            try:
                pres = supabase.table("products").select(
                    "product_id, brand, model, category, price_lkr, stock_status, warranty, shop_id"
                ).execute()
                for p in (pres.data or []):
                    sres = supabase.table("shops").select(
                        "shop_id, shop_name, shop_type, district, average_rating, reviews_count, verified"
                    ).eq("shop_id", p["shop_id"]).execute()
                    if sres.data and sres.data[0].get("shop_type") == desired_type:
                        shop = sres.data[0]
                        results.append({
                            **p,
                            "shop_name": shop.get("shop_name", "Unknown Shop"),
                            "district": shop.get("district", ""),
                            "shop_rating": shop.get("average_rating", 0) or 0,
                            "reviews": shop.get("reviews_count", 0) or 0,
                            "shop_verified": shop.get("verified", False) or False,
                            "match_reason": f"Available at {shop.get('shop_name', 'Unknown Shop')}",
                        })
            except Exception as e:
                logger.info(f"Supabase products fetch failed: {e}")

        # CSV supplement/fallback
        if (not results) and PRODUCTS_CSV.exists():
            try:
                pdf = pd.read_csv(PRODUCTS_CSV, dtype=str, keep_default_na=False).replace({"": None})
                logger.info(f"Loaded products CSV: {len(pdf)} rows, columns: {list(pdf.columns)}")
                
                # If products CSV doesn't contain shop meta, try join with shops_df
                if "shop_type" in pdf.columns:
                    pdf = pdf[pdf["shop_type"].str.lower() == "product_shop"]
                    logger.info(f"   After shop_type filter: {len(pdf)} rows")
                elif shops_df is not None and not shops_df.empty:
                    # Ensure shop_id exists in both
                    if "shop_id" in pdf.columns:
                        pdf = pdf.merge(
                            shops_df[["shop_id", "shop_name", "district", "average_rating", "reviews_count", "verified", "shop_type"]],
                            on="shop_id",
                            how="left"
                        )
                        pdf = pdf[pdf["shop_type"].str.lower() == "product_shop"]
                        logger.info(f"   After merge and shop_type filter: {len(pdf)} rows")
                    else:
                        logger.info(f"   No shop_id column in products CSV")
                else:
                    # If no shops_df, continue without filtering by shop_type
                    logger.info(f"   No shops_df available, using all products")

                # Filter by product category (if provided)
                if product_category and "category" in pdf.columns:
                    category_filter = pdf["category"].str.lower().str.contains(product_category.lower(), na=False)
                    # Also try partial matches for flexibility (e.g., "RAM" matches "RAM Module")
                    if not category_filter.any():
                        # Try exact match
                        category_filter = pdf["category"].str.lower() == product_category.lower()
                    pdf = pdf[category_filter]

                # Filter by search text (if provided and no category filter was effective)
                if search_text and (not product_category or len(pdf) == 0):
                    for col in ["brand", "model", "category"]:
                        if col not in pdf.columns:
                            pdf[col] = ""
                    text_filter = (
                        pdf["brand"].str.lower().str.contains(search_text, na=False) |
                        pdf["model"].str.lower().str.contains(search_text, na=False) |
                        pdf["category"].str.lower().str.contains(search_text, na=False)
                    )
                    if text_filter.any():
                        pdf = pdf[text_filter]

                # Filter by district (optional - if no results, try without district filter)
                original_count = len(pdf)
                if user_district and "district" in pdf.columns and original_count > 0:
                    district_filtered = pdf[pdf["district"].str.lower() == user_district.lower()]
                    # Only apply district filter if it returns results
                    if len(district_filtered) > 0:
                        pdf = district_filtered
                    # Otherwise keep all products (don't filter by district if it excludes everything)

                pdf = pdf.drop_duplicates(subset=["product_id", "shop_id"], keep="first")
                
                logger.info(f"   After all filters: {len(pdf)} products found")

                for _, r in pdf.iterrows():
                    price_val = 0.0
                    if r.get("price_lkr"):
                        try:
                            price_val = float(str(r["price_lkr"]).replace(",", "").strip())
                        except Exception:
                            price_val = 0.0

                    results.append({
                        "product_id": str(r.get("product_id", "")),
                        "brand": r.get("brand", "") or "",
                        "model": r.get("model", "") or "",
                        "category": r.get("category", "") or "",
                        "price_lkr": price_val,
                        "stock_status": r.get("stock_status", "") or "unknown",
                        "warranty": r.get("warranty", "") or "",
                        "shop_id": str(r.get("shop_id", "")),
                        "shop_name": (r.get("shop_name") or "Unknown Shop"),
                        "district": r.get("district", "") or "",
                        "shop_rating": float(r.get("average_rating", 0) or 0),
                        "reviews": int(float(r.get("reviews_count", 0) or 0)),
                        "shop_verified": str(r.get("verified", "false")).lower() in ["true", "t", "1", "yes", "y", "maybe"],
                        "match_reason": f"Available at {(r.get('shop_name') or 'Unknown Shop')}",
                    })
            except Exception as e:
                logger.info(f"CSV products load failed: {e}")
                import traceback
                traceback.print_exc()

        # Debug logging
        logger.info(f"Product search results: category='{product_category}', search_text='{search_text}', district='{user_district}', found={len(results)} products")
        
        if not results:
            logger.info(f"No products found. Check if CSV exists at: {PRODUCTS_CSV}")
            logger.info(f"   CSV exists: {PRODUCTS_CSV.exists()}")
            return []

        # Budget-aware ordering
        if q.budget.lower() == "low":
            results = sorted(results, key=lambda x: x.get("price_lkr", 10**12))
        elif q.budget.lower() == "high":
            results = sorted(results, key=lambda x: -x.get("price_lkr", 0))

        # In-stock first, then by rating, then price asc
        in_stock = [p for p in results if "in stock" in str(p.get("stock_status", "")).lower() and "out" not in str(p.get("stock_status", "")).lower()]
        out_stock = [p for p in results if p not in in_stock]

        ranked = sorted(in_stock, key=lambda x: (-x.get("shop_rating", 0), x.get("price_lkr", 10**12))) + \
                 sorted(out_stock, key=lambda x: (-x.get("shop_rating", 0), x.get("price_lkr", 10**12)))

        # Add detected_category info to each product (optional metadata)
        result_with_meta = []
        for product in ranked[:20]:
            product_dict = dict(product)
            if detected_category:
                product_dict["detected_category"] = detected_category
                product_dict["detection_confidence"] = detection_confidence
                product_dict["detection_source"] = detection_source
            result_with_meta.append(product_dict)

        return result_with_meta

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch product recommendations: {str(e)}")

# ─────────────────────────────────────────────────────────
# 11.5) Product Category Detection from Symptoms
# ─────────────────────────────────────────────────────────
def detect_product_category_from_text_rules(text: str) -> Tuple[Optional[str], float]:
    """
    Rule-based product category detection from symptom descriptions.
    Returns: (category, confidence)
    """
    if not text or not text.strip():
        return None, 0.0
    
    text_lower = text.lower().strip()
    
    # GPU-related symptoms (high confidence)
    gpu_patterns = [
        "low fps", "fps drop", "fps issue", "fps problem", "fps low",
        "lag in games", "lag in game", "stutter in games", "stuttering",
        "gpu", "graphics card", "graphic card", "video card",
        "gaming slow", "game lag", "game stutter", "game performance",
        "frame rate", "framerate", "frame drop", "fps while gaming"
    ]
    if any(pattern in text_lower for pattern in gpu_patterns):
        return "GPU", 0.9
    
    # SSD-related symptoms (OS load / slow boot)
    ssd_patterns = [
        "slow boot", "boots slowly", "taking too long to load windows",
        "windows load slow", "os load slow", "startup slow", "boot slow",
        "windows loads very slowly", "slow startup", "slow to boot",
        "taking long to start", "startup takes long", "boot time slow"
    ]
    if any(pattern in text_lower for pattern in ssd_patterns):
        return "SSD", 0.9
    
    # RAM-related symptoms
    ram_patterns = [
        "browser tabs closing", "many tabs", "chrome lagging", "firefox lagging",
        "out of memory", "not enough ram", "multitasking slow", "multiple tabs",
        "tabs closing", "browser slow", "many programs", "too many tabs",
        "memory full", "low memory", "running out of memory"
    ]
    if any(pattern in text_lower for pattern in ram_patterns):
        return "RAM", 0.9
    
    # Wi-Fi Adapter symptoms
    wifi_patterns = [
        "no wifi", "no wi-fi", "unstable wifi", "wifi disconnecting",
        "weak wifi", "bad wifi signal", "wifi not working", "internet not working",
        "wifi problem", "wifi issue", "no internet", "internet slow",
        "wifi keeps disconnecting", "wifi unstable", "poor wifi"
    ]
    if any(pattern in text_lower for pattern in wifi_patterns):
        return "Wi-Fi Adapter", 0.85
    
    # PSU / Power symptoms
    psu_patterns = [
        "random shutdowns", "pc turns off suddenly", "power cut feeling",
        "system restarts when under load", "sudden restart", "power problem",
        "random restart", "keeps shutting down", "turns off randomly",
        "unexpected shutdown", "sudden power off"
    ]
    if any(pattern in text_lower for pattern in psu_patterns):
        return "PSU", 0.85
    
    # General performance issues (medium confidence - could be SSD or RAM)
    # Prioritize SSD for general slowness unless RAM-specific keywords present
    general_slow_patterns = [
        "pc is very slow", "slow performance", "programs take long to open",
        "computer slow", "system slow", "very slow", "extremely slow",
        "sluggish", "laggy", "slow for gaming"  # "slow for gaming" might be GPU, but check gaming context
    ]
    
    # Check if it's gaming-related slowness (likely GPU)
    if "gaming" in text_lower or "game" in text_lower:
        if any(pattern in text_lower for pattern in ["slow", "lag", "stutter"]):
            return "GPU", 0.75
    
    # General slowness without gaming context - prioritize SSD
    if any(pattern in text_lower for pattern in general_slow_patterns):
        # If RAM keywords are present, suggest RAM; otherwise SSD
        if any(kw in text_lower for kw in ["ram", "memory", "multitask", "tabs"]):
            return "RAM", 0.7
        return "SSD", 0.7
    
    # Cooling solutions for overheating (if mentioned with gaming/performance)
    if "overheat" in text_lower or "overheating" in text_lower:
        if "gaming" in text_lower or "game" in text_lower:
            return "GPU", 0.8  # Could be GPU or cooling, but GPU is more likely upgrade
        return "Cooling", 0.7
    
    # No match found
    return None, 0.0

def detect_product_category_ml(text: str) -> Dict[str, Any]:
    """
    Detect product category using ML model only.
    Returns dict with label, confidence, source, alternatives.
    """
    if product_nlp_model is None:
        return {
            "label": None,
            "confidence": 0.0,
            "source": "none",
            "alternatives": []
        }
    
    best_label, best_confidence, top3_list = nlp_predict(product_nlp_model, text.strip())
    
    if best_label is None:
        return {
            "label": None,
            "confidence": 0.0,
            "source": "none",
            "alternatives": []
        }
    
    alternatives = [
        {"label": label, "confidence": conf}
        for label, conf in top3_list
    ]
    
    if best_confidence < 0.6:
        return {
            "label": None,
            "confidence": best_confidence,
            "source": "ml_low_conf",
            "alternatives": alternatives
        }
    else:
        return {
            "label": best_label,
            "confidence": best_confidence,
            "source": "ml",
            "alternatives": alternatives
        }

def detect_product_category_hybrid(text: str) -> Dict[str, Any]:
    """
    Hybrid product category detection: Rules first, then ML model.
    Returns dict with label, confidence, source, alternatives.
    """
    if not text or not text.strip():
        return {
            "label": None,
            "confidence": 0.0,
            "source": "none",
            "alternatives": []
        }
    
    # STEP 1: Try rule-based detection first
    rule_category, rule_conf = detect_product_category_from_text_rules(text.strip())
    
    if rule_category and rule_conf >= 0.8:  # High confidence from rules
        return {
            "label": rule_category,
            "confidence": rule_conf,
            "source": "rule",
            "alternatives": []
        }
    
    # STEP 2: Try ML model
    ml_result = detect_product_category_ml(text.strip())
    
    if ml_result["label"] and ml_result["confidence"] >= 0.6:
        # High confidence from ML
        return ml_result
    
    # STEP 3: Use rule result if available (even if lower confidence)
    if rule_category:
        return {
            "label": rule_category,
            "confidence": rule_conf,
            "source": "rule",
            "alternatives": []
        }
    
    # STEP 4: Return ML result (may have alternatives even if low confidence)
    if ml_result["source"] != "none":
        return ml_result
    
    # STEP 5: No match
    return {
        "label": None,
        "confidence": 0.0,
        "source": "none",
        "alternatives": []
    }

# Legacy function name for backward compatibility
def detect_product_category_from_text(text: str) -> Tuple[Optional[str], float]:
    """
    Detect product category from non-technical symptom descriptions.
    Returns: (category, confidence) where category is like "GPU", "SSD", "RAM", etc.
    """
    if not text or not text.strip():
        return None, 0.0
    
    text_lower = text.lower().strip()
    
    # GPU-related symptoms (high confidence)
    gpu_patterns = [
        "low fps", "fps drop", "fps issue", "fps problem", "fps low",
        "lag in games", "lag in game", "stutter in games", "stuttering",
        "gpu", "graphics card", "graphic card", "video card",
        "gaming slow", "game lag", "game stutter", "game performance",
        "frame rate", "framerate", "frame drop", "fps while gaming"
    ]
    if any(pattern in text_lower for pattern in gpu_patterns):
        return "GPU", 0.9
    
    # SSD-related symptoms (OS load / slow boot)
    ssd_patterns = [
        "slow boot", "boots slowly", "taking too long to load windows",
        "windows load slow", "os load slow", "startup slow", "boot slow",
        "windows loads very slowly", "slow startup", "slow to boot",
        "taking long to start", "startup takes long", "boot time slow"
    ]
    if any(pattern in text_lower for pattern in ssd_patterns):
        return "SSD", 0.9
    
    # RAM-related symptoms
    ram_patterns = [
        "browser tabs closing", "many tabs", "chrome lagging", "firefox lagging",
        "out of memory", "not enough ram", "multitasking slow", "multiple tabs",
        "tabs closing", "browser slow", "many programs", "too many tabs",
        "memory full", "low memory", "running out of memory"
    ]
    if any(pattern in text_lower for pattern in ram_patterns):
        return "RAM", 0.9
    
    # Wi-Fi Adapter symptoms
    wifi_patterns = [
        "no wifi", "no wi-fi", "unstable wifi", "wifi disconnecting",
        "weak wifi", "bad wifi signal", "wifi not working", "internet not working",
        "wifi problem", "wifi issue", "no internet", "internet slow",
        "wifi keeps disconnecting", "wifi unstable", "poor wifi"
    ]
    if any(pattern in text_lower for pattern in wifi_patterns):
        return "Wi-Fi Adapter", 0.85
    
    # PSU / Power symptoms
    psu_patterns = [
        "random shutdowns", "pc turns off suddenly", "power cut feeling",
        "system restarts when under load", "sudden restart", "power problem",
        "random restart", "keeps shutting down", "turns off randomly",
        "unexpected shutdown", "sudden power off"
    ]
    if any(pattern in text_lower for pattern in psu_patterns):
        return "PSU", 0.85
    
    # General performance issues (medium confidence - could be SSD or RAM)
    # Prioritize SSD for general slowness unless RAM-specific keywords present
    general_slow_patterns = [
        "pc is very slow", "slow performance", "programs take long to open",
        "computer slow", "system slow", "very slow", "extremely slow",
        "sluggish", "laggy", "slow for gaming"  # "slow for gaming" might be GPU, but check gaming context
    ]
    
    # Check if it's gaming-related slowness (likely GPU)
    if "gaming" in text_lower or "game" in text_lower:
        if any(pattern in text_lower for pattern in ["slow", "lag", "stutter"]):
            return "GPU", 0.75
    
    # General slowness without gaming context - prioritize SSD
    if any(pattern in text_lower for pattern in general_slow_patterns):
        # If RAM keywords are present, suggest RAM; otherwise SSD
        if any(kw in text_lower for kw in ["ram", "memory", "multitask", "tabs"]):
            return "RAM", 0.7
        return "SSD", 0.7
    
    # Cooling solutions for overheating (if mentioned with gaming/performance)
    if "overheat" in text_lower or "overheating" in text_lower:
        if "gaming" in text_lower or "game" in text_lower:
            return "GPU", 0.8  # Could be GPU or cooling, but GPU is more likely upgrade
        return "Cooling", 0.7
    
    # No match found
    return None, 0.0

# ─────────────────────────────────────────────────────────
# 12) Tools (static)
# ─────────────────────────────────────────────────────────
@app.get("/tools_recommend", tags=["Tools"])
def tools_recommend(error_type: str = ""):
    try:
        tools = [
            {
                "tool_id": "tool_1",
                "name": "Malwarebytes",
                "category": "Antivirus",
                "description": "Advanced malware protection and removal tool",
                "os_support": ["Windows", "macOS", "Android", "iOS"],
                "license": "freemium",
                "official_url": "https://www.malwarebytes.com/",
                "error_types": ["Blue Screen (BSOD)", "Boot Failure"]
            },
            {
                "tool_id": "tool_2",
                "name": "Driver Booster",
                "category": "Driver Updater",
                "description": "Automatically update outdated drivers",
                "os_support": ["Windows"],
                "license": "freemium",
                "official_url": "https://www.iobit.com/en/driver-booster.php",
                "error_types": ["GPU Overheat", "Boot Failure"]
            },
            {
                "tool_id": "tool_3",
                "name": "CCleaner",
                "category": "System Cleaner",
                "description": "Clean and optimize your system performance",
                "os_support": ["Windows", "macOS"],
                "license": "freemium",
                "official_url": "https://www.ccleaner.com/",
                "error_types": ["Blue Screen (BSOD)", "Boot Failure"]
            },
            {
                "tool_id": "tool_4",
                "name": "Windows Update Assistant",
                "category": "System Update",
                "description": "Keep Windows up to date with latest patches",
                "os_support": ["Windows"],
                "license": "free",
                "official_url": "https://support.microsoft.com/en-us/windows",
                "error_types": ["Blue Screen (BSOD)", "Boot Failure", "OS Installation"]
            },
        ]
        if error_type and error_type.lower() != "general":
            ft = [t for t in tools if error_type.lower() in (t["name"] + t["category"]).lower() or any(error_type.lower() in et.lower() for et in t.get("error_types", []))]
            return ft if ft else tools[:2]
        return tools
    except Exception as e:
        return {"error": f"Failed to fetch tools: {str(e)}"}

# ─────────────────────────────────────────────────────────
# 13) Feedback
# ─────────────────────────────────────────────────────────
@app.post("/feedback", tags=["Feedback"])
def feedback(feedback: FeedbackRequest):
    try:
        payload = {
            "shop_id": feedback.shop_id,
            "error_type": feedback.error_type,
            "rating": feedback.rating,
            "comment": feedback.comment or "",
            "solved": feedback.solved,
            "feedback_type": feedback.feedback_type,
        }
        if USE_SUPABASE and supabase is not None:
            try:
                res = supabase.table("feedback").insert(payload).execute()
                if res.data:
                    return {"message": "Feedback submitted", "data": res.data}
            except Exception as e:
                logger.info(f"Failed to write feedback to Supabase: {e}")

        # Fallback: acknowledge only (or you could append to FEEDBACK_CSV)
        return {"message": "Feedback received (local)", "data": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

# ─────────────────────────────────────────────────────────
# 14) Explain Shop (Why Not This Shop?)
# ─────────────────────────────────────────────────────────
def explain_shop_detailed(
    shop_id: str,
    error_type: str,
    budget: str,
    urgency: str,
    user_district: str
) -> Tuple[List[str], List[str], str]:
    """
    Generate positive and negative factors for a shop.
    Returns: (positive_factors, negative_factors, summary)
    """
    # Fetch shop data
    shop_row: Optional[Dict[str, Any]] = None
    
    # Try Supabase first
    if USE_SUPABASE and supabase is not None:
        try:
            res = supabase.table("shops").select("*").eq("shop_id", shop_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                shop_row = res.data[0]
        except Exception as e:
            logger.info(f"Failed to fetch shop from Supabase: {e}")
    
    # Fallback to CSV
    if shop_row is None and shops_df is not None:
        shop_df = shops_df[shops_df["shop_id"] == shop_id]
        if not shop_df.empty:
            shop_row = shop_df.iloc[0].to_dict()
    
    if shop_row is None:
        raise HTTPException(status_code=404, detail=f"Shop with ID {shop_id} not found")
    
    # Normalize shop data
    norm_shop = {
        "shop_id": str(shop_row.get("shop_id", "")),
        "shop_name": shop_row.get("shop_name") or "Unknown Shop",
        "shop_type": shop_row.get("shop_type") or "",
        "district": shop_row.get("district") or "",
        "average_rating": float(shop_row["average_rating"]) if shop_row.get("average_rating") not in (None, "",) and pd.notna(shop_row.get("average_rating")) else None,
        "reviews_count": float(shop_row["reviews_count"]) if shop_row.get("reviews_count") not in (None, "",) and pd.notna(shop_row.get("reviews_count")) else None,
        "verified": (str(shop_row.get("verified", "false")).lower() in ["true", "t", "1", "yes", "y", "maybe"]),
        "average_turnaround_time": parse_turnaround_time(shop_row.get("average_turnaround_time")),
        "price_range": shop_row.get("price_range") or "",
    }
    
    # Build features to get match indicators
    desired_type = ERR_TO_TYPE.get(error_type, "repair_shop")
    candidate = Candidate(
        shop_id=norm_shop["shop_id"],
        shop_type=norm_shop["shop_type"],
        district=norm_shop["district"],
        average_rating=norm_shop["average_rating"],
        reviews_count=norm_shop["reviews_count"],
        verified=norm_shop["verified"],
        average_turnaround_time=norm_shop["average_turnaround_time"],
        price_range=norm_shop["price_range"],
        shop_name=norm_shop["shop_name"],
    )
    
    query = Query(
        error_type=error_type,
        budget=budget,
        urgency=urgency,
        user_district=user_district,
        top_k=10,
    )
    
    features = build_features(query, candidate)
    shop_row_with_features = {**norm_shop, **features}
    
    # Generate positive factors using explain_recommendation
    positive_reason, positive_factors = explain_recommendation(
        shop_row_with_features,
        error_type,
        user_district,
        budget,
        urgency,
        rank=0,
        used_reasons=[],
    )
    
    # Generate negative factors
    negative_factors: List[str] = []
    
    # Low rating
    if norm_shop["average_rating"] is not None:
        if norm_shop["average_rating"] < 3.0:
            negative_factors.append(f"Low rating ({norm_shop['average_rating']:.1f}/5.0)")
        elif norm_shop["average_rating"] < 3.5:
            negative_factors.append(f"Below average rating ({norm_shop['average_rating']:.1f}/5.0)")
    
    # Low review count
    if norm_shop["reviews_count"] is not None:
        if norm_shop["reviews_count"] < 10:
            negative_factors.append(f"Limited reviews ({int(norm_shop['reviews_count'])} reviews)")
        elif norm_shop["reviews_count"] < 20:
            negative_factors.append(f"Few reviews ({int(norm_shop['reviews_count'])} reviews)")
    
    # Not verified
    if not norm_shop["verified"]:
        negative_factors.append("Not verified by platform")
    
    # Long turnaround time
    if norm_shop["average_turnaround_time"] is not None:
        if urgency.lower() == "high" and norm_shop["average_turnaround_time"] > 3:
            negative_factors.append(f"Long turnaround time ({norm_shop['average_turnaround_time']:.1f} days) for urgent needs")
        elif norm_shop["average_turnaround_time"] > 7:
            negative_factors.append(f"Long turnaround time ({norm_shop['average_turnaround_time']:.1f} days)")
    
    # Not in same district
    if shop_row_with_features.get("district_match", 0) == 0:
        negative_factors.append(f"Not located in your district ({user_district})")
    
    # Type mismatch
    if shop_row_with_features.get("type_match", 0) == 0:
        negative_factors.append(f"May not specialize in {error_type}")
    
    # Budget mismatch
    if shop_row_with_features.get("budget_fit", 0) == 0:
        negative_factors.append(f"May not match your {budget} budget preferences")
    
    # Build summary
    shop_name = norm_shop["shop_name"]
    summary_parts = []
    
    if positive_factors:
        summary_parts.append(f"{shop_name} has some positive aspects: {', '.join(positive_factors[:2])}.")
    
    if negative_factors:
        summary_parts.append(f"However, there are some concerns: {', '.join(negative_factors[:3])}.")
    
    if not summary_parts:
        summary_parts.append(f"{shop_name} is a viable option, though it may not be the best match for your specific needs.")
    
    summary = " ".join(summary_parts)
    
    return positive_factors, negative_factors, summary

@app.post("/explain_shop", response_model=ExplainShopResponse, tags=["Recommendations"])
def explain_shop(req: ExplainShopRequest):
    try:
        positive_factors, negative_factors, summary = explain_shop_detailed(
            req.shop_id,
            req.error_type,
            req.budget,
            req.urgency,
            req.user_district
        )
        
        return ExplainShopResponse(
            positive_factors=positive_factors,
            negative_factors=negative_factors,
            summary=summary
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to explain shop: {str(e)}")

# ─────────────────────────────────────────────────────────
# 15) NLP Helpers - Generic Prediction
# ─────────────────────────────────────────────────────────
def nlp_predict(model: Optional[Any], text: str) -> Tuple[Optional[str], float, List[Tuple[str, float]]]:
    """
    Generic NLP prediction helper.
    Handles both Pipeline objects and dict-based models.
    Returns: (best_label, best_confidence, top3_list)
    """
    if model is None:
        return None, 0.0, []
    
    try:
        # Check if model has predict_proba method (Pipeline or fitted model)
        if hasattr(model, 'predict_proba'):
            try:
                # Try to get predictions
                predictions = model.predict_proba([text])[0]
                
                # Get classes - try different ways
                if hasattr(model, 'classes_'):
                    classes = model.classes_
                elif hasattr(model, 'named_steps') and 'classifier' in model.named_steps:
                    classes = model.named_steps['classifier'].classes_
                elif hasattr(model, 'steps') and len(model.steps) > 0:
                    # Try to get from the last step (classifier)
                    last_step = model.steps[-1][1]
                    if hasattr(last_step, 'classes_'):
                        classes = last_step.classes_
                    else:
                        return None, 0.0, []
                else:
                    return None, 0.0, []
                
                # Get top 3 predictions
                top3_indices = predictions.argsort()[-3:][::-1]
                top3_list = [
                    (str(classes[idx]), float(predictions[idx]))
                    for idx in top3_indices
                ]
                
                # Best prediction
                best_idx = top3_indices[0]
                best_label = str(classes[best_idx])
                best_confidence = float(predictions[best_idx])
                
                return best_label, best_confidence, top3_list
            except Exception as e:
                # If predict_proba fails, fall through to dict handling
                pass
        
        # Otherwise, treat as dict-based model
        if isinstance(model, dict):
            vectorizer = model.get('vectorizer')
            classifier = model.get('classifier')
            
            if vectorizer is None or classifier is None:
                return None, 0.0, []
            
            # Vectorize text
            text_vec = vectorizer.transform([text])
            
            # Get predictions
            predictions = classifier.predict_proba(text_vec)[0]
            classes = classifier.classes_
            
            # Get top 3 predictions
            top3_indices = predictions.argsort()[-3:][::-1]
            top3_list = [
                (str(classes[idx]), float(predictions[idx]))
                for idx in top3_indices
            ]
            
            # Best prediction
            best_idx = top3_indices[0]
            best_label = str(classes[best_idx])
            best_confidence = float(predictions[best_idx])
            
            return best_label, best_confidence, top3_list
        
        # Unknown model type
        return None, 0.0, []
        
    except Exception as e:
        logger.info(f"NLP prediction error: {e}")
        import traceback
        traceback.print_exc()
        return None, 0.0, []

# ─────────────────────────────────────────────────────────
# 16) NLP Error Type Detection
# ─────────────────────────────────────────────────────────
def predict_error_type_nlp(text: str) -> Tuple[str, float, List[Dict[str, Any]]]:
    """
    Legacy function - Predict error type using NLP model.
    Returns: (best_label, best_confidence, top3_predictions)
    """
    best_label, best_confidence, top3_list = nlp_predict(error_nlp_model or nlp_model, text.strip())
    
    if best_label is None:
        return None, 0.0, []
    
    top3_predictions = [
        {
            'label': label,
            'confidence': conf
        }
        for label, conf in top3_list
    ]
    
    return best_label, best_confidence, top3_predictions

def rule_based_error_type(text: str) -> Tuple[Optional[str], float]:
    """
    Robust rule-based error type detection with regex patterns.
    Returns: (label, confidence) - simplified version for high-priority detection.
    This is used first in the hybrid detection pipeline for stability.
    """
    if not text or not text.strip():
        return None, 0.0
    
    t = text.lower().strip()
    
    # 🔋 PSU / power issues
    if re.search(r"random shutdown|shuts down|turns off|no power|won't turn on|wont turn on|sudden restart|restarts by itself|power cut|\bpsu\b|power supply|smells.*burning|burning.*smell|vibrates|buzzing|whistling|randomly.*loses.*power|loses.*power|shuts down.*randomly|restart.*without.*warning|restarts.*when|shuts down.*when|plug.*in.*shuts|battery.*drain|shuts down.*battery|doesn't boot.*battery|remove.*battery|reconnect.*cables", t):
        return "PSU / Power Issue", 0.95
    
    # 🔥 Overheating while gaming → GPU Overheat
    if re.search(r"overheat|too hot|high temp|temperature|thermal", t) and \
       re.search(r"game|gaming|fps|valorant|csgo|pubg|fortnite|dota|gta", t):
        return "GPU Overheat", 0.9
    
    # 🔥 General overheating (but exclude GPU-specific and monitor issues)
    if re.search(r"overheat|too hot|high temp|temperature|thermal|fan.*loud|fan.*noise|fan.*spin|fans.*spin|fan.*never.*spin|fan.*not.*spin|gets hot|smells.*burning|burning.*smell|vibrates|buzzing|whistling|popping.*noise.*speakers|hinge.*tight.*noise", t):
        # Exclude monitor static noise and GPU fan issues
        if "static noise" in t or "monitor.*static" in t:
            return "Monitor or GPU Check", 0.85
        if "gpu.*fan" in t or "fans.*do not.*spin" in t or "gpu fans" in t:
            return "GPU Upgrade", 0.85
        # Exclude laptop hinge noise - that's General Repair
        if "hinge" in t:
            return "General Repair", 0.7
        # Exclude speaker popping - that's General Repair
        if "popping.*speakers" in t or "speakers.*popping" in t:
            return "General Repair", 0.7
        return "CPU Overheat", 0.8
    
    # 💙 Blue screen / BSOD
    if re.search(r"bsod|blue screen|stop code|0x000000|sad face|error screen", t):
        return "Blue Screen (BSOD)", 0.95
    
    # 🧬 Boot failures
    if re.search(r"no bootable device|boot failure|boot loop|cannot boot|cant boot|won't boot|wont boot|not starting|won't start|stuck on.*logo|manufacturer logo|black screen after boot|stuck on.*screen|freezes on.*login|login screen.*freeze|wake from sleep|does not wake|sleep mode|windows.*crash.*installing.*updates|installing.*updates.*crash", t):
        return "Windows Boot Failure", 0.9
    
    # 🐌 General slow performance / speed up requests
    if re.search(r"speed up|make.*faster|faster.*pc|faster.*computer|slow.*pc|slow.*computer|pc.*slow|computer.*slow|very slow|too slow|running slow|system slow|performance.*slow|slow.*performance|sluggish|lagging|unresponsive|freezing|hanging|not responsive", t):
        # Check if it's specifically about boot/startup
        if re.search(r"boot|startup|start.*up|loading|takes.*long.*start", t):
            return "SSD Upgrade", 0.85
        # Check if it's about multitasking/memory
        if re.search(r"tabs|browser|multitask|many.*apps|multiple.*apps|memory|ram", t):
            return "RAM Upgrade", 0.85
        # General slow performance
        return "Slow Performance", 0.85
    
    # 💾 Slow boot / OS slowness → SSD upgrade
    if re.search(r"slow boot|boots slowly|windows takes .* (minutes|long)|startup slow|os load slow|takes too long to start|takes too long to open|file transfers.*slow|file transfer.*slow|slow.*file|ssd.*slow|read.*write.*slow|cannot detect.*ssd|ssd.*disappear|ssd.*not detect|detect.*ssd.*sometimes|apps.*slowly.*startup|open.*slowly|hangs.*copying|copying.*large.*files|games.*forever.*load|take forever.*load|freezes.*downloading|downloading.*games|clicking.*apps.*long|takes.*long.*respond|lags.*after.*update|windows update.*lag|apps.*very.*slowly.*startup", t):
        return "SSD Upgrade", 0.85
    
    # Clicking noise from HDD/SSD
    if re.search(r"clicking.*noise|noise.*inside.*computer|clicking.*coming", t):
        return "SSD Upgrade", 0.85
    
    # 🧠 RAM / multitasking
    if re.search(r"many tabs|browser tabs|chrome lag|out of memory|need more ram|not enough ram|multitasking slow|multiple.*tabs|freeze.*tabs|apps freeze|multiple apps|freezes when.*tabs|chrome.*freeze|cannot detect.*ram|ram.*sticks.*cleaning|detect.*ram.*after|ram sticks.*cleaning", t):
        return "RAM Upgrade", 0.9
    
    # 📶 Wi-Fi problems
    if re.search(r"no wifi|no wi-fi|unstable wifi|wifi disconnect|wifi dropping|weak wifi|wifi not working|internet not working|wifi disconnects|slow.*internet|internet.*slow|slow.*wifi|wifi.*slow|limited connectivity|does not detect.*wifi|wifi adapter.*not detect|disconnects.*only.*desktop|disconnects.*downloading|downloading.*files.*disconnect|internet.*disconnect.*downloading|downloading.*files", t):
        return "Wi-Fi Adapter Upgrade", 0.9
    
    # 📱 Phone / USB Connection Issues (HIGH PRIORITY - before display rules)
    if re.search(r"phone|mobile|android|iphone|device", t) and \
       re.search(r"connect|connecting|connection|not connecting|won't connect|can't connect|not recognized|not detected", t):
        return "Phone Connection Issue", 0.9
    
    # 🔵 Bluetooth Issues (HIGH PRIORITY - before display rules)
    if re.search(r"bluetooth", t) and \
       re.search(r"not working|no working|not connect|won't connect|can't connect|not detected|not recognized|disconnect|keep.*disconnect|doesn't work|does not work|not pairing|won't pair", t):
        return "General Repair", 0.9
    
    if re.search(r"usb|port|cable|drive|mouse|printer|headphone|mic|microphone|hard drive|secondary.*drive", t) and \
       re.search(r"not recognized|not detected|not showing|doesn't show|won't detect|not working|does not detect|cannot detect|won't detect|disconnect.*randomly|randomly.*disconnect|stop.*working.*minutes|ports.*stop|wireless.*mouse.*lag|mouse.*lag.*randomly", t):
        # But exclude secondary hard drive - that's SSD issue
        if "secondary" in t or ("hard drive" in t and "secondary" not in t and "cannot detect" in t):
            return "SSD Upgrade", 0.85
        # Printer recognition is USB issue
        if "printer" in t and "recognize" in t:
            return "USB / Port Issue", 0.85
        # USB headphone mic is USB issue
        if "headphone" in t and "mic" in t:
            return "USB / Port Issue", 0.85
        return "USB / Port Issue", 0.85
    
    # 💻 Monitor/display - "no signal" should be "No Display / No Signal"
    # EXCLUDE Bluetooth issues from display rules
    has_bluetooth = re.search(r"bluetooth", t)
    if not has_bluetooth and re.search(r"no signal.*pc.*running|no signal.*even though|monitor shows.*no signal", t):
        return "No Display / No Signal", 0.9
    
    # Other display issues - EXCLUDE Bluetooth
    if not has_bluetooth and re.search(r"no display|black screen but pc on|monitor.*blinking|screen.*flicker|monitor not power on|flickering|flicker|color lines|random.*lines|ghosting|static noise|dim brightness|blurry|refresh rate|turns off.*randomly|randomly.*turns off|refuses.*connect.*monitor|external monitor|freezes.*connecting.*hdmi|hdmi.*cable", t):
        return "Monitor or GPU Check", 0.85
    
    # Monitor power issues (PSU/RAM)
    if re.search(r"monitor.*not power|monitor.*won't power|monitor.*no power", t):
        return "PSU / Power Issue", 0.85
    
    # Upgrade phrases
    if re.search(r"upgrade ssd|add ssd|bigger ssd|new ssd|1tb ssd|2tb ssd", t):
        return "SSD Upgrade", 0.9
    
    if re.search(r"upgrade ram|need more ram|more ram|add ram|new ram|8gb ram|16gb ram", t):
        return "RAM Upgrade", 0.9
    
    # GPU Overheat (gaming + overheating/black screen/crash)
    if re.search(r"screen.*black.*gaming|black.*gaming|stutter.*minutes|games.*stutter|games.*crash.*minutes|crashing.*few.*minutes|games.*keep.*crashing|stutter.*few.*minutes|play.*stutter", t):
        return "GPU Overheat", 0.9
    
    # GPU Upgrade (performance issues, detection issues, driver issues)
    if re.search(r"upgrade gpu|new graphics card|better gpu|low fps|fps.*low|graphics card|gpu.*not detect|won't detect.*graphics|graphics.*error|device manager.*error|video editing.*crash|driver.*update.*crash|gpu.*fans.*not.*spin|fans.*do not.*spin|video editing.*software.*crash", t):
        return "GPU Upgrade", 0.9
    
    # System lags when opening games - GPU issue
    if re.search(r"lags.*opening.*games|opening.*games.*lag|system.*lags.*opening.*games", t):
        return "GPU Upgrade", 0.85
    
    # General Repair cases (audio, keyboard, battery, Bluetooth, etc.)
    if re.search(r"audio.*crackling|crackling.*audio|microphone.*does not|mic.*does not|audio.*works.*microphone|battery.*drain.*quickly|drains.*quickly|keyboard.*types.*own|types.*own.*sometimes|keyboard.*stop.*working.*sleep|waking.*sleep|bluetooth.*headphone.*disconnect|bluetooth.*keep.*disconnecting|bluetooth.*device.*connect|connect.*bluetooth|keyboard.*rgb.*stop|rgb.*lights.*stop|touchpad.*unresponsive|unresponsive.*touchpad|keyboard.*keys.*delay|keys.*respond.*delay|shuts down.*50.*battery|battery.*50.*shut", t):
        return "General Repair", 0.7
    
    # 🧪 Generic fallback (very low confidence)
    if re.search(r"desktop|pc|computer", t):
        return "General Desktop Issue", 0.4
    if re.search(r"laptop|notebook", t):
        return "General Laptop Issue", 0.4
    
    return None, 0.0

def detect_error_type_rules(text: str) -> Tuple[Optional[str], float, List[Dict[str, Any]]]:
    """
    Rule-based error type detection (high priority patterns).
    Returns: (label, confidence, alternatives)
    """
    if not text or not text.strip():
        return None, 0.0, []
    
    # Apply spell checking to improve detection accuracy
    try:
        from spell_checker import check_and_correct
        corrected_text, _ = check_and_correct(text)
        if corrected_text != text:
            # Use corrected text for better matching
            text = corrected_text
            logger.info(f"[SPELL_CHECK] Corrected: '{text}' -> '{corrected_text}'")
    except Exception as e:
        # Continue without spell checking if it fails
        pass
    
    text_lower = text.lower().strip()
    
    # HIGH PRIORITY: Overheat + Gaming → GPU Overheat
    has_overheat = any(kw in text_lower for kw in ["overheat", "too hot", "high temp", "temperature", "thermal", "heating", "hot", "fan", "cooling"])
    has_gaming = any(kw in text_lower for kw in ["game", "gaming", "valorant", "csgo", "pubg", "fortnite", "fps", "apex", "league", "dota"])
    
    if has_overheat and has_gaming:
        return "GPU Overheat", 0.9, [
            {"label": "GPU Overheat", "confidence": 0.9},
            {"label": "CPU Overheat", "confidence": 0.3}
        ]
    
    # General Overheating → CPU Overheat
    if has_overheat and not has_gaming:
        return "CPU Overheat", 0.8, [
            {"label": "CPU Overheat", "confidence": 0.8},
            {"label": "GPU Overheat", "confidence": 0.4}
        ]
    
    # Blue Screen / BSOD
    if any(kw in text_lower for kw in ["bsod", "blue screen", "stop code", "0x000000", "sad face", "error screen"]):
        return "Blue Screen (BSOD)", 0.9, [
            {"label": "Blue Screen (BSOD)", "confidence": 0.9},
            {"label": "Windows Boot Failure", "confidence": 0.3}
        ]
    
    # Boot Failure
    if any(kw in text_lower for kw in ["no bootable device", "boot failure", "boot loop", "cannot boot", "won't boot"]):
        return "Windows Boot Failure", 0.85, [
            {"label": "Windows Boot Failure", "confidence": 0.85}
        ]
    
    # Monitor Power Issues (Check for power-related keywords first)
    has_power_keywords = any(kw in text_lower for kw in ["not power", "won't power", "no power", "power not", "power off", "not turning on", "won't turn on", "not starting", "not booting"])
    has_monitor_keywords = any(kw in text_lower for kw in ["monitor", "display", "screen"])
    
    if has_monitor_keywords and has_power_keywords:
        # Monitor won't power on - likely PSU or RAM issue
        return "PSU / Power Issue", 0.85, [
            {"label": "PSU / Power Issue", "confidence": 0.85},
            {"label": "RAM Upgrade", "confidence": 0.6},
            {"label": "No Display / No Signal", "confidence": 0.5},
            {"label": "Windows Boot Failure", "confidence": 0.4}
        ]
    
    # No Display / No Signal (but monitor has power)
    if any(kw in text_lower for kw in ["no signal", "no display", "black screen", "blank screen", "no image"]) and not has_power_keywords:
        return "No Display / No Signal", 0.85, [
            {"label": "No Display / No Signal", "confidence": 0.85},
            {"label": "Monitor Issue", "confidence": 0.6}
        ]
    
    # PC Won't Power On / Not Starting
    if any(kw in text_lower for kw in ["won't power", "not power", "no power", "power not", "won't turn on", "not turning on", "not starting", "not booting"]) and not has_monitor_keywords:
        return "PSU / Power Issue", 0.85, [
            {"label": "PSU / Power Issue", "confidence": 0.85},
            {"label": "RAM Upgrade", "confidence": 0.5},
            {"label": "Windows Boot Failure", "confidence": 0.4}
        ]
    
    # PC Restarts
    if any(kw in text_lower for kw in ["restart", "shutdown", "turns off", "shuts down", "reboot", "restarting"]):
        if has_gaming:
            return "GPU Overheat", 0.8, [
                {"label": "GPU Overheat", "confidence": 0.8},
                {"label": "PSU / Power Issue", "confidence": 0.5}
            ]
        return "PSU / Power Issue", 0.75, [
            {"label": "PSU / Power Issue", "confidence": 0.75},
            {"label": "CPU Overheat", "confidence": 0.4},
            {"label": "RAM Upgrade", "confidence": 0.3}
        ]
    
    # Slow performance / speed up requests
    if any(kw in text_lower for kw in ["speed up", "make faster", "faster pc", "faster computer", "slow pc", "slow computer", "pc slow", "computer slow", "very slow", "too slow", "running slow", "system slow", "performance slow", "slow performance", "sluggish", "lagging", "unresponsive"]):
        # Check if it's about boot/startup
        if any(kw in text_lower for kw in ["boot", "startup", "start up", "loading", "takes long start"]):
            return "SSD Upgrade", 0.85, [{"label": "SSD Upgrade", "confidence": 0.85}]
        # Check if it's about multitasking/memory
        if any(kw in text_lower for kw in ["tabs", "browser", "multitask", "many apps", "multiple apps", "memory", "ram"]):
            return "RAM Upgrade", 0.85, [{"label": "RAM Upgrade", "confidence": 0.85}]
        # General slow performance
        return "Slow Performance", 0.85, [
            {"label": "Slow Performance", "confidence": 0.85},
            {"label": "SSD Upgrade", "confidence": 0.6},
            {"label": "RAM Upgrade", "confidence": 0.5}
        ]
    
    # Upgrade phrases
    if any(kw in text_lower for kw in ["upgrade ssd", "add ssd", "bigger ssd", "1tb ssd", "2tb ssd"]):
        return "SSD Upgrade", 0.9, [{"label": "SSD Upgrade", "confidence": 0.9}]
    
    if any(kw in text_lower for kw in ["upgrade ram", "need ram", "more ram", "add ram"]):
        return "RAM Upgrade", 0.9, [{"label": "RAM Upgrade", "confidence": 0.9}]
    
    if any(kw in text_lower for kw in ["upgrade gpu", "new gpu", "better gpu"]):
        return "GPU Upgrade", 0.85, [{"label": "GPU Upgrade", "confidence": 0.85}]
    
    # Phone / USB Connection Issues
    has_phone = any(kw in text_lower for kw in ["phone", "mobile", "android", "iphone", "device"])
    has_connect = any(kw in text_lower for kw in ["connect", "connecting", "connection", "not connecting", "won't connect", "can't connect"])
    has_usb = any(kw in text_lower for kw in ["usb", "cable", "wire"])
    has_not_recognized = any(kw in text_lower for kw in ["not recognized", "not detected", "not showing", "doesn't show", "won't detect"])
    
    if has_phone and (has_connect or has_not_recognized):
        return "Phone Connection Issue", 0.9, [
            {"label": "Phone Connection Issue", "confidence": 0.9},
            {"label": "USB / Port Issue", "confidence": 0.6}
        ]
    
    if has_usb and has_not_recognized:
        return "USB / Port Issue", 0.85, [
            {"label": "USB / Port Issue", "confidence": 0.85},
            {"label": "Phone Connection Issue", "confidence": 0.5}
        ]
    
    # No match from rules
    return None, 0.0, []

def detect_error_type_ml(text: str) -> Dict[str, Any]:
    """
    Detect error type using ML model only.
    Returns dict with label, confidence, source, alternatives.
    """
    if error_nlp_model is None:
        return {
            "label": None,
            "confidence": 0.0,
            "source": "none",
            "alternatives": []
        }
    
    best_label, best_confidence, top3_list = nlp_predict(error_nlp_model, text.strip())
    
    if best_label is None:
        return {
            "label": None,
            "confidence": 0.0,
            "source": "none",
            "alternatives": []
        }
    
    alternatives = [
        {"label": label, "confidence": conf}
        for label, conf in top3_list
    ]
    
    if best_confidence < 0.6:
        return {
            "label": None,
            "confidence": best_confidence,
            "source": "ml_low_conf",
            "alternatives": alternatives
        }
    else:
        return {
            "label": best_label,
            "confidence": best_confidence,
            "source": "ml",
            "alternatives": alternatives
        }

def detect_error_type_hybrid(text: str) -> Dict[str, Any]:
    """
    Hybrid error type detection: Rules first (for stability), then ML model.
    Returns dict with label, confidence, source, alternatives, multiple_types.
    This ensures deterministic behavior - same text always produces same error_type.
    Also detects multiple error types when applicable.
    """
    if not text or not text.strip():
        return {
            "label": "General Repair",
            "confidence": 0.0,
            "source": "fallback",
            "alternatives": [],
            "multiple_types": []
        }
    
    text_lower = text.lower()
    multiple_types = []
    
    # Check for multiple error types using keyword patterns
    error_keywords_multi = {
        "CPU Overheat": ["cpu", "processor", "overheat", "overheating", "thermal", "temperature", "hot", "fan"],
        "GPU Overheat": ["gpu", "graphics", "overheat", "overheating", "thermal", "temperature", "hot", "fan"],
        "Slow Performance": ["slow", "lag", "lagging", "sluggish", "unresponsive", "performance", "speed up", "faster", "speed", "make faster"],
        "RAM Upgrade": ["ram", "memory", "insufficient", "full", "not enough"],
        "SSD Upgrade": ["ssd", "storage", "slow boot", "slow loading", "hard drive"],
        "PSU / Power Issue": ["power", "psu", "not turning on", "no power", "dead", "charging"],
        "Windows Boot Failure": ["boot", "booting", "not starting", "startup", "boot failure"],
        "No Display / No Signal": ["no display", "no signal", "black screen", "blank screen", "monitor"],
        "Blue Screen (BSOD)": ["blue screen", "bsod", "crash", "freeze"],
        "Wi-Fi Adapter Upgrade": ["wifi", "wi-fi", "internet", "network", "connection", "adapter"],
    }
    
    # Detect multiple error types
    detected_types = []
    for error_type, keywords in error_keywords_multi.items():
        match_count = sum(1 for keyword in keywords if keyword in text_lower)
        if match_count >= 2:  # At least 2 keywords match
            confidence = min(0.8, 0.4 + (match_count * 0.1))
            detected_types.append({
                "label": error_type,
                "confidence": confidence
            })
    
    # Sort by confidence and take top ones
    detected_types.sort(key=lambda x: x['confidence'], reverse=True)
    
    # If we have multiple high-confidence detections, mark them as multiple_types
    high_conf_types = [dt for dt in detected_types if dt['confidence'] >= 0.5]
    if len(high_conf_types) > 1:
        multiple_types = high_conf_types[:3]  # Top 3 multiple types
    
    # STEP 1: Try rule-based detection first (HIGH PRIORITY for stability)
    rule_label, rule_conf = rule_based_error_type(text.strip())
    if rule_label and rule_conf >= 0.8:  # High confidence from rules
        return {
            "label": rule_label,
            "confidence": rule_conf,
            "source": "rule",
            "alternatives": [],
            "multiple_types": multiple_types if multiple_types else []
        }
    
    # STEP 2: Fallback to existing detect_error_type_rules (for compatibility)
    rule_label_legacy, rule_conf_legacy, rule_alternatives = detect_error_type_rules(text.strip())
    if rule_label_legacy and rule_conf_legacy >= 0.7:
        return {
            "label": rule_label_legacy,
            "confidence": rule_conf_legacy,
            "source": "rules",
            "alternatives": rule_alternatives,
            "multiple_types": multiple_types if multiple_types else []
        }
    
    # STEP 3: Try ML model (if available)
    try:
        ml_result = detect_error_type_ml(text.strip())
        
        if ml_result["label"] and ml_result["confidence"] >= 0.6:
            # High confidence from ML
            ml_result["multiple_types"] = multiple_types if multiple_types else []
            return ml_result
        
        # STEP 4: Use rule result if available (even if lower confidence)
        if rule_label:
            return {
                "label": rule_label,
                "confidence": rule_conf,
                "source": "rule",
                "alternatives": [],
                "multiple_types": multiple_types if multiple_types else []
            }
        
        # STEP 5: Return ML result (may have alternatives even if low confidence)
        if ml_result["source"] != "none":
            ml_result["multiple_types"] = multiple_types if multiple_types else []
            return ml_result
    except NameError:
        # ML function not available, skip ML
        pass
    except Exception as e:
        logger.info(f"[NLP ERROR] detect_error_type_ml failed: {e}")
    
    # STEP 6: Use rule result if available (even if lower confidence)
    if rule_label:
        return {
            "label": rule_label,
            "confidence": rule_conf,
            "source": "rule",
            "alternatives": [],
            "multiple_types": multiple_types if multiple_types else []
        }
    
    # STEP 7: Fallback - use detected types if available
    if detected_types:
        primary = detected_types[0]
        return {
            "label": primary["label"],
            "confidence": primary["confidence"],
            "source": "fallback",
            "alternatives": detected_types[1:4] if len(detected_types) > 1 else [],
            "multiple_types": multiple_types if multiple_types else []
        }
    
    # STEP 8: Final fallback
    return {
        "label": "General Repair",
        "confidence": 0.3,
        "source": "fallback",
        "alternatives": [],
        "multiple_types": []
    }

def detect_error_type(text: str, confidence_threshold: float = 0.6) -> Tuple[str, float, str, List[Dict[str, Any]]]:
    """
    Hybrid error type detection: Rules first, then NLP model.
    Returns: (label, confidence, source, alternatives)
    - source: "rules", "ml", "ml_low_conf", or "fallback"
    """
    if not text or not text.strip():
        return "General Repair", 0.0, "fallback", []
    
    # STEP 1: Try rule-based detection first (HIGH PRIORITY)
    rule_label, rule_conf, rule_alternatives = detect_error_type_rules(text.strip())
    if rule_label and rule_conf >= 0.7:  # High confidence from rules
        return rule_label, rule_conf, "rules", rule_alternatives
    
    # STEP 2: Try NLP model if available
    best_label, best_confidence, top3 = predict_error_type_nlp(text.strip())
    
    if best_label:
        if best_confidence >= confidence_threshold:
            # High confidence from NLP
            return best_label, best_confidence, "ml", top3
        else:
            # Low confidence from NLP - return alternatives
            return None, best_confidence, "ml_low_conf", top3
    
    # STEP 3: Use rule result if available (even if lower confidence)
    if rule_label:
        return rule_label, rule_conf, "rules", rule_alternatives
    
    # STEP 4: Fallback to keyword matching
    text_lower = text.lower()
    error_matches = []
    
    error_keywords = {
        "GPU Overheat": ["gpu", "graphics", "overheat", "overheating", "thermal", "temperature", "hot", "fan", "cooling"],
        "Blue Screen (BSOD)": ["blue screen", "bsod", "crash", "freeze", "hang", "stopped working"],
        "Windows Boot Failure": ["boot", "startup", "won't start", "not starting", "power on", "turn on", "booting"],
        "SSD Upgrade": ["ssd", "solid state", "hard drive", "storage", "upgrade ssd"],
        "RAM Upgrade": ["ram", "memory", "upgrade ram", "add memory", "more ram"],
        "PSU / Power Issue": ["power", "psu", "power supply", "won't turn on", "no power", "charging", "battery"],
        "Wi-Fi Adapter Upgrade": ["wifi", "wi-fi", "wireless", "internet", "network", "adapter", "connection"]
    }
    
    for error_type, keywords in error_keywords.items():
        match_count = sum(1 for keyword in keywords if keyword in text_lower)
        if match_count > 0:
            confidence = min(0.5, 0.2 + (match_count * 0.1))
            error_matches.append({
                'label': error_type,
                'confidence': confidence
            })
    
    if error_matches:
        error_matches.sort(key=lambda x: x['confidence'], reverse=True)
        best_match = error_matches[0]
        return best_match['label'], best_match['confidence'], "fallback", error_matches[:3]
    
    # Default fallback
    return "General Repair", 0.3, "fallback", []

@app.post("/nlp/detect_error_type", response_model=DetectErrorResponse, tags=["NLP"])
def detect_error_type_endpoint(req: DetectErrorRequest):
    """
    Detect error type from text description using hybrid system:
    1. Priority rules (high confidence patterns)
    2. NLP model (if available)
    3. Fallback keyword matching
    
    Returns:
    - label: The detected error type
    - confidence: Confidence score (0-1)
    - source: Detection source ("rule", "ml", "ml_low_conf", "fallback")
    - alternatives: Top predictions from ML model
    - similar_errors: Related/similar errors that might also apply
    - explanation: Human-readable explanation of the detected error
    """
    try:
        # Apply spell checking before error detection
        original_text = req.text
        try:
            from spell_checker import check_and_correct
            corrected_text, corrections = check_and_correct(req.text)
            if corrections:
                logger.info(f"[SPELL_CHECK] Error detection: corrected {corrections}")
                req.text = corrected_text
        except Exception as e:
            logger.info(f"[WARNING] Spell checker failed: {e}")
            pass  # Continue without spell checking
        
        from similar_errors import get_similar_errors, get_error_explanation
        
        result = detect_error_type_hybrid(req.text)
        detected_label = result.get('label')
        detected_confidence = result.get('confidence', 0.0)
        
        # Convert alternatives to proper format
        alternatives = [
            DetectAlternative(label=alt['label'], confidence=alt['confidence'])
            for alt in result.get('alternatives', [])
        ]
        
        # Get similar/related errors
        similar_errors_list = get_similar_errors(detected_label, detected_confidence)
        similar_errors = [
            DetectAlternative(
                label=sim['label'], 
                confidence=sim['confidence']
            )
            for sim in similar_errors_list
        ]
        
        # Get explanation
        explanation = get_error_explanation(detected_label) if detected_label else None
        
        # Get multiple types if detected
        multiple_types = [
            DetectAlternative(label=mt['label'], confidence=mt['confidence'])
            for mt in result.get('multiple_types', [])
        ]
        
        # Get fixing steps for the detected error
        fixing_steps = None
        if detected_label:
            try:
                from error_fixing_steps import get_fixing_steps
                fixing_steps = get_fixing_steps(detected_label)
            except ImportError:
                pass  # Fixing steps optional
        
        return DetectErrorResponse(
            label=detected_label,
            confidence=detected_confidence,
            source=result.get('source', 'none'),
            alternatives=alternatives,
            similar_errors=similar_errors,
            explanation=explanation,
            multiple_types=multiple_types,
            fixing_steps=fixing_steps
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect error type: {str(e)}")

# Legacy endpoint for backward compatibility
@app.post("/detect_error_type", response_model=DetectErrorResponse, tags=["NLP"])
def detect_error_type_endpoint_legacy(req: DetectErrorRequest):
    """Legacy endpoint - uses same logic as /nlp/detect_error_type"""
    try:
        from similar_errors import get_similar_errors, get_error_explanation
        
        result = detect_error_type_hybrid(req.text)
        detected_label = result.get('label')
        detected_confidence = result.get('confidence', 0.0)
        
        # Convert alternatives to proper format
        alternatives = [
            DetectAlternative(label=alt['label'], confidence=alt['confidence'])
            for alt in result.get('alternatives', [])
        ]
        
        # Get similar/related errors
        similar_errors_list = get_similar_errors(detected_label, detected_confidence)
        similar_errors = [
            DetectAlternative(
                label=sim['label'], 
                confidence=sim['confidence']
            )
            for sim in similar_errors_list
        ]
        
        # Get explanation
        explanation = get_error_explanation(detected_label) if detected_label else None
        
        # Get multiple types if detected
        multiple_types = [
            DetectAlternative(label=mt['label'], confidence=mt['confidence'])
            for mt in result.get('multiple_types', [])
        ]
        
        # Get fixing steps for the detected error
        fixing_steps = None
        if detected_label:
            try:
                from error_fixing_steps import get_fixing_steps
                fixing_steps = get_fixing_steps(detected_label)
            except ImportError:
                pass  # Fixing steps optional
        
        return DetectErrorResponse(
            label=detected_label,
            confidence=detected_confidence,
            source=result.get('source', 'none'),
            alternatives=alternatives,
            similar_errors=similar_errors,
            explanation=explanation,
            multiple_types=multiple_types,
            fixing_steps=fixing_steps
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect error type: {str(e)}")

@app.post("/nlp/detect_product_category", response_model=DetectProductCategoryResponse, tags=["NLP"])
def detect_product_category_endpoint(req: DetectErrorRequest):
    """
    Detect product category from symptom description using hybrid system:
    1. Rule-based patterns (high confidence)
    2. NLP model (if available)
    """
    try:
        result = detect_product_category_hybrid(req.text)
        
        # Convert alternatives to proper format
        alternatives = [
            DetectAlternative(label=alt['label'], confidence=alt['confidence'])
            for alt in result.get('alternatives', [])
        ]
        
        return DetectProductCategoryResponse(
            label=result.get('label'),
            confidence=result.get('confidence', 0.0),
            source=result.get('source', 'none'),
            alternatives=alternatives
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect product category: {str(e)}")

@app.post("/product_need_recommend", response_model=ProductNeedResponse, tags=["Products"])
def product_need_recommend(req: ProductNeedRequest):
    """
    UPGRADED: Detect hardware component using hierarchical ML + rule-based system.
    
    Inference Flow:
    1. Rule-based matching (if match → return immediately with high confidence)
    2. Hierarchical ML (Category → Component, filtered by category)
    3. Fallback to flat ML model if hierarchical not available
    
    Features:
    - Confidence thresholds (High ≥0.7, Medium 0.4-0.7, Low <0.4)
    - Always provides top 5 alternatives
    - Active learning: requests feedback if confidence < 0.5
    - Source tracking: "rule", "hierarchical_ml", "ml", or "hybrid"
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty")
    
    # Spell checking - detect and suggest corrections
    spell_correction_suggestion = None
    corrected_text = text  # Default to original text
    has_typos = False
    try:
        from spell_checker import check_and_correct, get_correction_suggestion
        corrected_text, corrections = check_and_correct(text)
        if corrections:
            has_typos = True
            spell_correction_suggestion = get_correction_suggestion(text, corrected_text, corrections)
            # Use corrected text for processing if typos detected - improves accuracy
            text = corrected_text
    except ImportError:
        pass  # Spell checker optional
    except Exception as e:
        logger.info(f"[WARNING] Spell checker failed: {e}")
        pass  # Continue without spell checking

    # Constants
    HIGH_CONF_THRESHOLD = 0.7
    MEDIUM_CONF_THRESHOLD = 0.4
    LOW_CONF_THRESHOLD = LOW_CONFIDENCE_THRESHOLD if HIERARCHICAL_AVAILABLE else 0.5
    
    final_label = None
    final_conf = 0.0
    source = "none"
    explanation = None
    alternatives_list = []
    
    # ============================================================================
    # STAGE 1: Rule-based matching (highest priority)
    # ============================================================================
    if HIERARCHICAL_AVAILABLE and match_rule:
        rule_result = match_rule(text)
        if rule_result:
            if len(rule_result) == 4:
                final_label, final_conf, explanation, related_components = rule_result
            else:
                # Backward compatibility
                final_label, final_conf, explanation = rule_result[:3]
                related_components = []
            
            source = "rule"
            
            # Rule-based predictions: include primary + related components
            alternatives_list = [
                ProductNeedAlternative(label=final_label, confidence=final_conf, explanation=explanation)
            ]
            
            # Add related components as alternatives
            for related_comp in related_components[:4]:  # Limit to 4 related
                alternatives_list.append(
                    ProductNeedAlternative(label=related_comp, confidence=final_conf * 0.8)
                )
            
            logger.info(f"[PRODUCT_NEED] Rule matched: '{final_label}' (conf={final_conf:.2f})")
    
    # ============================================================================
    # STAGE 2: Hierarchical ML (if rule didn't match)
    # ============================================================================
    grouped_by_category_list = None
    if final_label is None and HIERARCHICAL_AVAILABLE and predict_hierarchical:
        try:
            comp, conf, ml_source, top5, grouped_by_category = predict_hierarchical(text, return_multiple=True)
            if comp:
                final_label = comp
                final_conf = conf
                source = ml_source
                
                # Get related components for multi-component recommendations
                try:
                    from multi_component_mapping import get_related_components
                    related = get_related_components(text, comp)
                    # Merge related with top5
                    all_components = list(top5) + related
                    # Remove duplicates and sort by confidence
                    seen = set()
                    unique_components = []
                    for label, c in all_components:
                        if label not in seen:
                            seen.add(label)
                            unique_components.append((label, c))
                    unique_components.sort(key=lambda x: x[1], reverse=True)
                    top5 = unique_components[:5]
                except:
                    pass  # Use original top5 if related components fail
                
                # Convert top5 to alternatives
                alternatives_list = [
                    ProductNeedAlternative(label=label, confidence=conf)
                    for label, conf in top5[:5]
                ]
                
                # Convert grouped_by_category to response format
                if grouped_by_category:
                    try:
                        from multi_component_mapping import group_by_category as group_func
                        from hierarchical_inference import _load_models
                        _, _, _, component_to_category = _load_models()
                        
                        # Group all alternatives
                        all_grouped = group_func(top5, component_to_category)
                        
                        grouped_by_category_list = [
                            CategoryRecommendations(
                                category=cat,
                                components=[
                                    ProductNeedAlternative(label=comp, confidence=conf)
                                    for comp, conf in comps
                                ]
                            )
                            for cat, comps in all_grouped.items()
                        ]
                    except Exception as e:
                        logger.info(f"[WARNING] Failed to group by category: {e}")
                
                logger.info(f"[PRODUCT_NEED] Hierarchical ML: '{final_label}' (conf={final_conf:.2f})")
        except Exception as e:
            logger.info(f"[ERROR] Hierarchical prediction failed: {e}")
            import traceback
            traceback.print_exc()
    
    # ============================================================================
    # STAGE 3: Fallback to flat ML model (backward compatibility)
    # ============================================================================
    if final_label is None and product_need_model:
        try:
            base_label, base_conf, top3 = predict_product_need(text)
            if base_label:
                final_label = base_label
                final_conf = base_conf
                source = "ml"
                
                # Get top 5 from flat model
                try:
                    probs = product_need_model.predict_proba([text])[0]
                    classes = product_need_model.classes_
                    idx_sorted = np.argsort(probs)[::-1]
                    top5 = [(str(classes[i]), float(probs[i])) for i in idx_sorted[:5]]
                except:
                    top5 = top3
                
                alternatives_list = [
                    ProductNeedAlternative(label=label, confidence=conf)
                    for label, conf in top5[:5]
                ]
                
                logger.info(f"[PRODUCT_NEED] Flat ML fallback: '{final_label}' (conf={final_conf:.2f})")
        except Exception as e:
            logger.info(f"[ERROR] Flat ML prediction failed: {e}")
    
    # ============================================================================
    # Handle no prediction case or very low confidence (unclear issue)
    # ============================================================================
    # Threshold for considering an issue "unclear" - very low confidence
    # Be more lenient if typos were detected (user tried to describe issue, just had spelling errors)
    # Lowered threshold to be more accepting of user inputs
    UNCLEAR_CONFIDENCE_THRESHOLD = 0.05 if has_typos else 0.10
    
    if final_label is None or (final_label and final_conf < UNCLEAR_CONFIDENCE_THRESHOLD):
        return ProductNeedResponse(
            component=None,
            need_label=None,
            confidence=final_conf if final_label else 0.0,
            definition=None,
            why_useful=None,
            extra_explanation=(
                "Your issue description is not clear enough for us to provide a specific hardware recommendation. "
                "Please provide more details about your PC problem or need. "
                "For example: 'PC is very slow', 'Gaming lag with low FPS', 'WiFi keeps disconnecting', "
                "'PC overheating', 'No display on monitor', 'Need more storage space', etc."
            ),
            alternatives=[],
            fixing_tips=None,
            is_low_confidence=True,
            source="none",
            ask_feedback=True,
            spell_correction_suggestion=spell_correction_suggestion
        )
    
    # ============================================================================
    # Prepare response with alternatives
    # ============================================================================
    # Ensure primary is in alternatives
    seen_labels = {alt.label for alt in alternatives_list}
    if final_label not in seen_labels:
        alternatives_list.insert(0, ProductNeedAlternative(label=final_label, confidence=final_conf))
    
    # Limit to top 5
    alternatives_list = alternatives_list[:5]
    
    # ============================================================================
    # Confidence-based handling
    # ============================================================================
    is_low_conf = final_conf < MEDIUM_CONF_THRESHOLD
    ask_feedback = final_conf < LOW_CONF_THRESHOLD
    
    # Save feedback request if low confidence
    if ask_feedback and save_feedback:
        save_feedback(
            text=text,
            predicted_label=final_label,
            confidence=final_conf,
            source=source
        )
    
    # ============================================================================
    # Look up component info and fixing tips
    # ============================================================================
    info = COMPONENT_INFO.get(final_label, {})
    definition = info.get("definition")
    why_useful = info.get("why_useful")
    extra_explanation = info.get("extra_explanation") or explanation
    
    # Get fixing tips - always fetch tips if component is detected
    # Tips help users troubleshoot before purchasing an upgrade
    fixing_tips = []
    if final_label:  # Only fetch tips if we have a component recommendation
        try:
            from component_fixing_tips import get_fixing_tips
            fixing_tips = get_fixing_tips(final_label)
        except ImportError:
            fixing_tips = []
        except Exception as e:
            logger.info(f"[WARNING] Failed to get fixing tips: {e}")
            fixing_tips = []
    
    # Generate explanation if not available
    if not extra_explanation:
        if source == "rule":
            extra_explanation = explanation or f"{final_label} is recommended based on rule matching."
        elif final_conf >= HIGH_CONF_THRESHOLD:
            extra_explanation = (
                f"Based on your description, {final_label} is highly recommended. "
                "This component should help resolve your issue."
            )
        elif final_conf >= MEDIUM_CONF_THRESHOLD:
            extra_explanation = (
                f"Based on your description, {final_label} is likely what you need. "
                "However, please also consider the alternative options below."
            )
        else:
            extra_explanation = (
                f"We suggest {final_label} as a possibility, but we're not very confident. "
                "Please review the alternative options below and choose what best matches your situation."
            )
    
    logger.info(
        f"[PRODUCT_NEED] text='{text[:50]}...' -> '{final_label}' "
        f"(conf={final_conf:.2f}, source={source}, ask_feedback={ask_feedback})"
    )
    
    return ProductNeedResponse(
        component=final_label,
        need_label=None,
        confidence=final_conf,
        definition=definition,
        why_useful=why_useful,
        extra_explanation=extra_explanation,
        alternatives=alternatives_list,
        fixing_tips=fixing_tips if fixing_tips else None,  # Always include tips if available
        is_low_confidence=is_low_conf,
        source=source,
        ask_feedback=ask_feedback,
        grouped_by_category=grouped_by_category_list,
        spell_correction_suggestion=spell_correction_suggestion
    )

# ─────────────────────────────────────────────────────────
# Product Need Feedback Endpoint (Active Learning)
# ─────────────────────────────────────────────────────────
class ProductNeedFeedbackRequest(BaseModel):
    text: str = Field(..., description="Original user text")
    predicted_label: Optional[str] = Field(..., description="Model's prediction")
    confidence: float = Field(..., description="Prediction confidence")
    user_correct_label: Optional[str] = Field(None, description="User's correction (if prediction was wrong)")
    source: str = Field(default="ml", description="Prediction source")

class ProductNeedFeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_count: Optional[int] = None

@app.post("/product_need_feedback", response_model=ProductNeedFeedbackResponse, tags=["Products"])
def product_need_feedback(req: ProductNeedFeedbackRequest):
    """
    Submit feedback for product need predictions.
    Used for active learning - feedback is stored and used to retrain models.
    
    When confidence < 0.5, the system automatically requests feedback.
    User can submit corrections which will be used in the next retraining cycle.
    """
    if not save_feedback:
        raise HTTPException(status_code=503, detail="Feedback system not available")
    
    success = save_feedback(
        text=req.text,
        predicted_label=req.predicted_label,
        confidence=req.confidence,
        user_correct_label=req.user_correct_label,
        source=req.source
    )
    
    if success:
        from feedback_storage import get_feedback_count
        count = get_feedback_count()
        return ProductNeedFeedbackResponse(
            success=True,
            message="Feedback saved successfully. Thank you for helping improve our recommendations!",
            feedback_count=count
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to save feedback")

# ─────────────────────────────────────────────────────────
# 16) Full Recommendation (Shops + Products + Tools)
# ─────────────────────────────────────────────────────────
@app.post("/full_recommendation", response_model=FullRecommendationResponse, tags=["Recommendations"])
def full_recommendation(req: FullRecommendationRequest):
    """
    Full recommendation endpoint - returns shops, products, and tools for a given error type.
    """
    try:
        # Get shops using rank_auto
        # Note: rank_auto requires top_k >= 5, so we request at least 5 but only return the requested number
        rank_req = RankRequest(
            error_type=req.error_type,
            budget=req.budget,
            urgency=req.urgency,
            user_district=req.user_district,
            top_k=max(req.top_k_shops, 5),  # Ensure at least 5 to satisfy validation
            mix_results=False  # Keep ordering deterministic for Best Match
        )
        try:
            shops_response = rank_auto(rank_req)
            top_shops = shops_response.recommendations[:req.top_k_shops] if shops_response.recommendations else []
        except HTTPException as e:
            # If rank_auto fails, return empty shops but continue with products and tools
            logger.info(f"rank_auto failed: {e.detail}")
            top_shops = []
        
        # Get products using rank_products_auto
        product_query = ProductQuery(
            error_type=req.error_type,
            budget=req.budget,
            user_district=req.user_district
        )
        try:
            products_list = rank_products_auto(product_query)
            top_products = products_list[:req.top_k_products] if products_list else []
        except Exception as e:
            logger.info(f"rank_products_auto failed: {str(e)}")
            top_products = []
        
        # Get tools using tools_recommend
        try:
            tools_list = tools_recommend(req.error_type)
            # Handle both list and dict response
            if isinstance(tools_list, dict) and "error" in tools_list:
                top_tools = []
            else:
                top_tools = tools_list[:req.top_k_tools] if isinstance(tools_list, list) else []
        except Exception as e:
            logger.info(f"tools_recommend failed: {str(e)}")
            top_tools = []
        
        # Generate summary
        summary_parts = []
        
        if top_shops:
            shop_names = [s.shop_name for s in top_shops[:3]]
            summary_parts.append(f"**Top Recommended Shops:** {', '.join(shop_names)}")
            if top_shops[0].reason:
                summary_parts.append(f"Our top pick, {top_shops[0].shop_name}, {top_shops[0].reason.lower()}")
        else:
            summary_parts.append("**Shops:** No shops found matching your criteria.")
        
        if top_products:
            product_names = [f"{p.get('brand', '')} {p.get('model', '')}" for p in top_products[:3] if p.get('brand')]
            if product_names:
                summary_parts.append(f"**Recommended Products:** {', '.join(product_names)}")
        else:
            summary_parts.append("**Products:** No products found matching your criteria.")
        
        if top_tools:
            tool_names = [t.get('name', '') for t in top_tools if t.get('name')]
            if tool_names:
                summary_parts.append(f"**Recommended Tools:** {', '.join(tool_names)}")
        else:
            summary_parts.append("**Tools:** No tools found matching your criteria.")
        
        summary_parts.append(f"This comprehensive plan addresses your {req.error_type} issue with the best shops, products, and tools available in {req.user_district}.")
        
        summary = "\n\n".join(summary_parts)
        
        return FullRecommendationResponse(
            shops=top_shops,
            products=top_products,
            tools=top_tools,
            summary=summary
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate full recommendation: {str(e)}")

# Merge hardcoded COMPONENT_INFO (fallback/override for labels not in CSV)
COMPONENT_INFO_HARDCODED = {
    "SSD Upgrade": {
        "definition": "An SSD (Solid State Drive) is a storage device that uses flash memory instead of spinning disks, so it can read and write data much faster than a hard drive.",
        "why_useful": "Moving Windows and frequently used apps to an SSD dramatically reduces boot time and loading delays, making an old PC feel new again.",
        "extra_explanation": "If your PC feels slow mainly when opening programs or files, an SSD upgrade is usually the single biggest speed improvement you can buy."
    },
    "NVMe SSD Upgrade": {
        "definition": "An NVMe SSD is a high-speed solid-state drive that connects directly to the motherboard via an M.2 or PCIe slot for very high bandwidth.",
        "why_useful": "Compared to SATA SSDs, NVMe drives can load large games, projects, and files significantly faster, which is helpful for heavy workloads and modern titles.",
        "extra_explanation": "If your motherboard supports M.2 NVMe and you do a lot of gaming, video editing, or large file work, an NVMe SSD gives the most noticeable storage performance boost."
    },
    "2.5-inch SSD Upgrade": {
        "definition": "A 2.5-inch SSD is a SATA-based solid-state drive that physically fits in the same bays as laptop and desktop hard drives.",
        "why_useful": "It is an easy drop-in replacement for older HDDs and provides much better responsiveness without needing special motherboard support.",
        "extra_explanation": "If you have a laptop or desktop with a 2.5-inch hard drive, swapping it for a 2.5-inch SSD is a simple way to speed up the entire system."
    },
    "HDD Upgrade": {
        "definition": "An HDD (Hard Disk Drive) is a mechanical storage device that uses rotating platters to store large amounts of data at a low cost.",
        "why_useful": "A larger HDD lets you store more games, videos, and backups without constantly worrying about space, especially when SSD capacity is too expensive.",
        "extra_explanation": "HDDs are ideal for storing big libraries of media and files, while you keep the OS and critical apps on an SSD for speed."
    },
    "External SSD": {
        "definition": "An external SSD is a portable solid-state drive that connects over USB or USB-C, providing fast storage you can easily carry around.",
        "why_useful": "It's useful for moving large projects, games, or backups between machines quickly without opening the PC case.",
        "extra_explanation": "If your internal drives are full but you still need fast storage for editing or gaming on the go, an external SSD is a flexible solution."
    },
    "External HDD": {
        "definition": "An external HDD is a mechanical hard drive in a portable enclosure that connects via USB for extra storage capacity.",
        "why_useful": "It is cost-effective for backups and archiving large files that don't need SSD-level speed.",
        "extra_explanation": "You can use an external HDD to store old projects, movies, and photos so your main system drive stays clean and responsive."
    },
    "RAM Upgrade": {
        "definition": "RAM (Random Access Memory) is the fast working memory your computer uses to hold data for running programs and the operating system.",
        "why_useful": "If you run out of RAM, the system is forced to swap data to disk, causing freezes, stutters, and very slow multitasking.",
        "extra_explanation": "Upgrading from 4GB to 8GB or 16GB can transform the experience of using browsers, office apps, and games at the same time."
    },
    "Dual-Channel RAM Upgrade": {
        "definition": "Dual-channel RAM uses two memory sticks working in parallel, doubling the memory bandwidth available to the CPU compared to a single stick.",
        "why_useful": "Higher memory bandwidth helps integrated graphics, some games, and content creation workloads run smoother.",
        "extra_explanation": "If you currently use one RAM stick, adding a second matching module often improves performance more than just increasing capacity alone."
    },
    "GPU Upgrade": {
        "definition": "A GPU (Graphics Processing Unit) or graphics card handles rendering for games, 3D applications, and GPU-accelerated tasks like video editing and AI.",
        "why_useful": "A more capable GPU delivers higher frame rates, better visual quality, and smoother performance in modern games and creative software.",
        "extra_explanation": "If your CPU usage is low but your games still stutter or need low settings, upgrading the GPU is usually the best fix."
    },
    "Entry-Level GPU Upgrade": {
        "definition": "An entry-level GPU is a budget graphics card designed for light gaming, eSports titles, and multimedia workloads.",
        "why_useful": "It is ideal for users upgrading from integrated graphics who want 1080p gaming on modest settings without spending too much.",
        "extra_explanation": "If you mainly play lighter games like Valorant, CS, or League, a modest GPU upgrade gives a big jump over integrated graphics at a low cost."
    },
    "High-End GPU Upgrade": {
        "definition": "A high-end GPU is a powerful graphics card built for demanding AAA games, high refresh rate monitors, and heavy GPU workloads.",
        "why_useful": "It allows you to enable higher resolutions, ray tracing, and ultra graphics presets while keeping frame rates smooth.",
        "extra_explanation": "If you own a 144Hz or 240Hz monitor and want to fully use it in modern games, a high-end GPU is often required."
    },
    "APU / Integrated Graphics Upgrade": {
        "definition": "An APU or CPU with stronger integrated graphics combines processor cores and a GPU on the same chip.",
        "why_useful": "It improves casual gaming and graphics tasks without needing a separate graphics card, which is great for compact or budget systems.",
        "extra_explanation": "For small office PCs or HTPCs, upgrading to a modern APU can give you playable performance in many games while staying power-efficient."
    },
    "CPU Upgrade": {
        "definition": "The CPU (Central Processing Unit) is the main processor that handles general logic, calculations, and system control.",
        "why_useful": "A faster CPU improves performance in tasks like compiling code, running many background apps, simulations, and CPU-heavy games.",
        "extra_explanation": "If your CPU is constantly at 90–100% usage in games or workloads while the GPU is underused, a CPU upgrade can remove that bottleneck."
    },
    "CPU Cooler Upgrade": {
        "definition": "A CPU cooler sits on top of the processor and removes heat using a heatsink and fan, keeping temperatures within safe limits.",
        "why_useful": "Better coolers keep the CPU from thermal throttling, which maintains higher boost clocks and reduces noise.",
        "extra_explanation": "If your CPU quickly hits high temperatures or the stock fan is very loud, a quality air cooler is a cheap and effective fix."
    },
    "AIO Liquid Cooler Upgrade": {
        "definition": "An AIO (All-in-One) liquid cooler uses a pump, radiator, and liquid to move heat away from the CPU more efficiently than basic air coolers.",
        "why_useful": "It offers strong cooling for high-end processors and overclocked systems while often being quieter under heavy load.",
        "extra_explanation": "If you have a powerful CPU that runs hot in a compact case, an AIO cooler can keep temperatures under control without a massive air tower."
    },
    "Case Fans Upgrade": {
        "definition": "Case fans are mounted in the PC case to pull in cool air and push out hot air, controlling internal airflow.",
        "why_useful": "Adding or upgrading fans reduces component temperatures, which improves stability and can extend hardware lifespan.",
        "extra_explanation": "If you see high GPU and CPU temperatures, installing front intake and rear exhaust fans is a simple, effective first step."
    },
    "High Airflow Case Upgrade": {
        "definition": "A high airflow case is a PC chassis designed with mesh panels and good fan mounts to allow lots of cool air in and warm air out.",
        "why_useful": "Better airflow keeps all components cooler, which helps maintain performance and reduces fan noise.",
        "extra_explanation": "If your components are powerful but cramped in a closed-off case, moving them into a high airflow chassis can noticeably drop temperatures."
    },
    "PSU Upgrade": {
        "definition": "A PSU (Power Supply Unit) converts wall AC power into stable DC power used by the CPU, GPU, storage, and other components.",
        "why_useful": "A reliable PSU with enough wattage prevents random shutdowns, protects against power spikes, and feeds stable power to new GPUs.",
        "extra_explanation": "If your PC restarts under load or you've added a more powerful graphics card, upgrading the PSU is essential for stability."
    },
    "Modular PSU Upgrade": {
        "definition": "A modular PSU lets you plug in only the power cables you need, reducing cable clutter inside the case.",
        "why_useful": "Cleaner cabling improves airflow and makes it easier to build or upgrade the system later.",
        "extra_explanation": "If your case is cramped and full of unused power cables, a modular PSU helps both cable management and cooling."
    },
    "UPS (Battery Backup)": {
        "definition": "A UPS (Uninterruptible Power Supply) is an external battery and surge protection box that provides backup power when the electricity cuts out.",
        "why_useful": "It prevents sudden shutdowns, giving you enough time to save work and safely power down your PC.",
        "extra_explanation": "If your area has unstable power or frequent outages, a UPS can protect your PC from data loss and potential hardware damage."
    },
    "Surge Protector": {
        "definition": "A surge protector is a power strip that filters sudden voltage spikes from the mains before they reach your PC.",
        "why_useful": "It reduces the risk of components being damaged by lightning, faulty wiring, or power surges.",
        "extra_explanation": "Even simple desktops benefit from a surge protector, which is a cheap layer of safety for everything plugged into it."
    },
    "Wi-Fi Adapter Upgrade": {
        "definition": "A Wi-Fi adapter is the hardware that lets your PC connect to wireless networks instead of using an Ethernet cable.",
        "why_useful": "Newer adapters support faster Wi-Fi standards and stronger antennas, improving speed and stability.",
        "extra_explanation": "If every other device in your home has stable Wi-Fi but your PC keeps disconnecting, upgrading the adapter is often the quickest fix."
    },
    "Monitor or GPU Check": {
        "definition": "The monitor and GPU work together to show the image; issues can come from either the screen or the graphics output.",
        "why_useful": "A faulty monitor or GPU output can cause no display, flickering, lines on screen, or random black screens.",
        "extra_explanation": "Testing with another monitor or GPU helps locate whether the screen or the graphics card is faulty."
    },
    "Router Upgrade": {
        "definition": "A router manages your home network and directs traffic between your devices and the internet.",
        "why_useful": "A modern router with better antennas and Wi-Fi standards can greatly improve wireless speed, range, and stability.",
        "extra_explanation": "If multiple users stream and game at the same time, an old router will struggle—upgrading it helps the whole network, not just one PC."
    },
    "Mesh Wi-Fi System": {
        "definition": "A mesh Wi-Fi system uses multiple nodes placed around your home to create a single, large wireless coverage area.",
        "why_useful": "It eliminates dead zones and keeps your connection stable as you move between rooms.",
        "extra_explanation": "If your PC or console is far from the main router and Wi-Fi is weak, mesh Wi-Fi can provide strong signal without running long cables."
    },
    "Ethernet Adapter": {
        "definition": "An Ethernet adapter allows a PC or laptop to connect to the network using a wired Ethernet cable.",
        "why_useful": "Wired connections offer lower latency and more stable speeds than Wi-Fi, which is ideal for gaming and large downloads.",
        "extra_explanation": "If you have the option to run a network cable, adding an Ethernet adapter often solves lag and packet loss issues instantly."
    },
    "Network Switch": {
        "definition": "A network switch is a small box that provides additional Ethernet ports so you can connect more wired devices.",
        "why_useful": "It allows multiple PCs, consoles, and smart devices to share the same wired network without overloading the router's limited ports.",
        "extra_explanation": "If you've run out of Ethernet ports on your router, a simple switch lets you add more wired devices without reconfiguring your network."
    },
    "Monitor Upgrade": {
        "definition": "A monitor is the display screen where you see your desktop, games, and applications.",
        "why_useful": "A better monitor can offer clearer text, more accurate colors, and a more comfortable viewing experience.",
        "extra_explanation": "If you spend many hours at your PC, upgrading to a higher quality monitor can reduce eye strain and make everything look sharper."
    },
    "144Hz Gaming Monitor Upgrade": {
        "definition": "A 144Hz monitor refreshes the image 144 times per second, showing many more frames than a standard 60Hz screen.",
        "why_useful": "High refresh rates make fast-paced games feel smoother and more responsive, especially when paired with a strong GPU.",
        "extra_explanation": "Competitive gamers often prioritize a 144Hz display because it helps tracking movement and reacting quickly in shooters and eSports titles."
    },
    "4K Monitor Upgrade": {
        "definition": "A 4K monitor has a very high resolution (3840×2160), providing much more detail than 1080p screens.",
        "why_useful": "It's ideal for content creation, productivity, and watching high-resolution movies with extremely sharp visuals.",
        "extra_explanation": "If you edit photos or videos or just want a very crisp desktop, a 4K monitor can be a big quality-of-life improvement when your GPU can support it."
    },
    "Ergonomic Monitor Arm": {
        "definition": "A monitor arm mounts your display on an adjustable arm instead of a fixed stand.",
        "why_useful": "It lets you easily change height, angle, and distance, improving posture and reducing neck and back strain.",
        "extra_explanation": "If you feel uncomfortable after long sessions, putting your monitor on an arm so it sits at eye level can make a huge difference."
    },
    "Gaming Mouse Upgrade": {
        "definition": "A gaming mouse is a precision pointing device with a better sensor, extra buttons, and often adjustable DPI.",
        "why_useful": "It provides more accurate tracking and quicker response, especially helpful in FPS and competitive games.",
        "extra_explanation": "Upgrading to a comfortable, accurate mouse helps both gaming and everyday use feel smoother and more controlled."
    },
    "Mechanical Keyboard Upgrade": {
        "definition": "A mechanical keyboard uses individual mechanical switches for each key instead of rubber domes.",
        "why_useful": "Mechanical switches offer better feedback, durability, and typing comfort compared to cheap membrane keyboards.",
        "extra_explanation": "If you type or game a lot, moving to a mechanical keyboard can reduce fatigue and make every keypress feel more satisfying and precise."
    },
    "Headset Upgrade": {
        "definition": "A gaming or studio headset combines quality headphones with a built-in microphone for communication.",
        "why_useful": "It improves audio clarity in games, calls, and videos while also making your voice clearer to teammates.",
        "extra_explanation": "If people struggle to hear you or your audio sounds muddy, a better headset upgrades both sides of your communication."
    },
    "External DAC / Sound Card Upgrade": {
        "definition": "An external DAC or sound card converts digital audio to analog with higher quality than built-in motherboard audio.",
        "why_useful": "It can reduce noise, improve dynamic range, and drive high-impedance headphones properly.",
        "extra_explanation": "If you hear buzzing or hiss from your headphones, or you use good speakers, an external audio interface can noticeably clean up the sound."
    },
    "Webcam Upgrade": {
        "definition": "A webcam is a small camera used for video calls, streaming, and recording yourself.",
        "why_useful": "Upgrading to a better webcam provides a sharper image and improved low-light performance for professional-looking calls.",
        "extra_explanation": "If you look grainy or dark in meetings, a higher-quality webcam with decent optics and sensor makes you appear much clearer."
    },
    "Microphone Upgrade": {
        "definition": "A dedicated microphone is built to capture clear voice audio with less background noise than most headsets or laptop mics.",
        "why_useful": "It makes your voice sound more natural and easier to understand in calls, streams, and recordings.",
        "extra_explanation": "If people complain your audio is muffled or noisy, upgrading to a standalone USB mic is one of the best improvements you can make."
    },
    "Capture Card Upgrade": {
        "definition": "A capture card records or passes through video signals from consoles or another PC into your streaming or recording setup.",
        "why_useful": "It allows you to stream gameplay from a console or a second PC without overloading your main gaming system.",
        "extra_explanation": "If you want smooth 1080p or 4K console streams with overlays and alerts, a dedicated capture card is the standard solution."
    },
    "Docking Station / USB Hub Upgrade": {
        "definition": "A docking station or powered USB hub expands the number and type of ports available to your laptop or desktop.",
        "why_useful": "It lets you plug in multiple monitors, USB devices, and network cables using a single connection.",
        "extra_explanation": "If you constantly plug and unplug many devices, a dock helps keep your setup tidy and makes switching locations much easier."
    },
    "Laptop Cooling Pad": {
        "definition": "A laptop cooling pad is a stand with built-in fans that blows air against the bottom of the laptop.",
        "why_useful": "It improves airflow to the laptop's intake vents, helping reduce temperatures and fan noise.",
        "extra_explanation": "If your laptop gets hot and throttles under load, using a cooling pad can provide a few extra degrees of headroom with zero internal changes."
    },
    "Thermal Paste Replacement": {
        "definition": "Thermal paste is a conductive compound between the CPU/GPU and cooler that fills tiny gaps to transfer heat efficiently.",
        "why_useful": "Old or poorly applied paste can dry out and reduce cooling performance, leading to higher temperatures and throttling.",
        "extra_explanation": "Replacing old thermal paste with a quality compound often drops temperatures several degrees, especially on older or heavily used systems."
    },
    "M.2 Heatsink": {
        "definition": "An M.2 heatsink is a small metal cooler that attaches to an M.2 SSD to help disperse heat.",
        "why_useful": "Some NVMe drives run hot and may throttle under sustained loads; a heatsink helps maintain their top speed.",
        "extra_explanation": "If your NVMe SSD is in a cramped area near the GPU, adding a heatsink can prevent performance drops during long transfers or installs."
    },
    "PC Case Upgrade": {
        "definition": "A PC case is the chassis that holds all your components, fans, and cables together.",
        "why_useful": "A better case provides improved airflow, cable management options, and space for future upgrades.",
        "extra_explanation": "If building or upgrading is a headache due to tight space and poor airflow, moving into a modern case can make maintenance much easier."
    },
    "Storage Expansion Card": {
        "definition": "A storage expansion card is a PCIe add-in card that provides extra M.2 or SATA slots for more drives.",
        "why_useful": "It's useful when your motherboard has run out of storage ports but you still need to add SSDs or HDDs.",
        "extra_explanation": "If you keep hitting limits on how many drives you can plug in, a storage expansion card lets your system grow further without a full platform change."
    },
    "Bluetooth Adapter Upgrade": {
        "definition": "A Bluetooth adapter allows your PC to connect to wireless peripherals like headphones, controllers, and keyboards.",
        "why_useful": "Upgrading to a newer adapter can fix connection drops and support modern Bluetooth features and codecs.",
        "extra_explanation": "If your wireless headphones cut out or you cannot pair new devices, a fresh Bluetooth adapter is often a simple fix."
    },
    "Speakers Upgrade": {
        "definition": "Desktop speakers are external audio devices that play sound from your PC without needing headphones.",
        "why_useful": "Better speakers improve clarity, bass, and volume for games, music, and movies.",
        "extra_explanation": "If you only use tiny built-in monitor speakers, upgrading to decent desktop speakers makes everything sound more immersive and enjoyable."
    },
    "Game Controller Upgrade": {
        "definition": "A game controller is a handheld input device commonly used for racing, sports, and action games.",
        "why_useful": "Some games are more comfortable and natural to play with a controller than with a keyboard and mouse.",
        "extra_explanation": "If you play platformers, racing games, or console ports, a solid controller can greatly improve comfort and control."
    },
    "NVMe Enclosure": {
        "definition": "An NVMe enclosure converts an internal NVMe SSD into a fast external drive using USB-C or Thunderbolt.",
        "why_useful": "It lets you reuse old NVMe drives as extremely fast portable storage instead of leaving them unused.",
        "extra_explanation": "If you upgrade your internal NVMe and have a spare drive, putting it in an enclosure gives you a high-speed external SSD for backups and transfers."
    },
    "SD Card Reader Upgrade": {
        "definition": "An SD card reader allows your PC to read and write SD and microSD cards used by cameras, phones, and other devices.",
        "why_useful": "A good reader transfers photos and videos much faster and more reliably than cheap built-in slots.",
        "extra_explanation": "If you work with cameras or drones, a quality USB-C card reader saves a lot of time when copying large media files."
    },
    "VR-Ready GPU Upgrade": {
        "definition": "A VR-ready GPU is a graphics card powerful enough to drive virtual reality headsets at high frame rates and resolutions.",
        "why_useful": "VR demands more consistent performance than flat-screen gaming to avoid motion sickness and maintain immersion.",
        "extra_explanation": "If you are planning to buy a VR headset or already own one, upgrading to a VR-capable GPU ensures smooth and comfortable experiences."
    },
    "RGB Controller / Hub Upgrade": {
        "definition": "An RGB controller or hub manages multiple RGB fans and light strips from one central unit.",
        "why_useful": "It lets you synchronize lighting effects and reduces the number of connectors going directly to the motherboard.",
        "extra_explanation": "If your system already has several RGB parts, adding a controller makes it easier to manage colors and effects in one place."
    },
}

# Update COMPONENT_INFO with hardcoded values (hardcoded takes precedence)
COMPONENT_INFO.update(COMPONENT_INFO_HARDCODED)

# ─────────────────────────────────────────────────────────
# Product Need Error Logging
# ─────────────────────────────────────────────────────────
ERROR_LOG_PATH = HERE.parent / "data" / "product_need_errors.csv"

def log_product_need_error(
    user_text: str,
    predicted_label: Optional[str],
    confidence: float,
    top3: List[Tuple[str, float]],
    note: str = ""
) -> None:
    """
    Append a row to product_need_errors.csv so we can later inspect and
    re-label hard/incorrect cases and improve the model.
    """
    try:
        ERROR_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        file_exists = ERROR_LOG_PATH.exists()
        with ERROR_LOG_PATH.open("a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow([
                    "timestamp",
                    "user_text",
                    "predicted_label",
                    "confidence",
                    "top3",
                    "note",
                ])
            writer.writerow([
                datetime.datetime.utcnow().isoformat(),
                user_text,
                predicted_label or "",
                f"{confidence:.4f}",
                str(top3),
                note,
            ])
    except Exception as e:
        logger.info(f"Failed to log product need error: {e}")

# ─────────────────────────────────────────────────────────
# Product Need Prediction Helpers
# ─────────────────────────────────────────────────────────
def predict_product_need(text: str) -> Tuple[Optional[str], float, List[Tuple[str, float]]]:
    """
    Use the trained product_need_model to predict which hardware component
    should be recommended based on user_text.

    Returns:
        best_label (str | None), best_confidence (float), top3 [(label, conf), ...]
    """
    if not product_need_model:
        return None, 0.0, []

    try:
        probs = product_need_model.predict_proba([text])[0]
        classes = product_need_model.classes_
        idx_sorted = np.argsort(probs)[::-1]

        top3 = [(str(classes[i]), float(probs[i])) for i in idx_sorted[:3]]
        best_label, best_conf = top3[0]
        
        # Debug: Log prediction details (only in verbose mode)
        # logger.info(f"[DEBUG] ML prediction: '{best_label}' (conf={best_conf:.3f}), top3={top3}")
        
        return best_label, best_conf, top3
    except Exception as e:
        logger.info(f"[ERROR] Failed to predict product need: {e}")
        return None, 0.0, []

def apply_product_need_rules(
    text: str,
    base_label: Optional[str],
    base_conf: float,
    top3: List[Tuple[str, float]]
) -> Tuple[Optional[str], float, str]:
    """
    Apply rule-based overrides to stabilize and improve product need predictions.
    Only applies rules when ML confidence is low (< 0.50) to avoid overriding good ML predictions.
    Special case: Always override "PC Case Upgrade" unless confidence is very high.

    Returns:
        (final_label, final_confidence, rule_note)
    """
    t = text.lower()
    label = base_label
    conf = base_conf
    rule_note = ""

    # Check for phone/USB connection issues early (to exclude from other rules)
    has_phone = any(kw in t for kw in ["phone", "mobile", "android", "iphone", "device"])
    has_connect = any(kw in t for kw in ["connect", "connecting", "connection", "not connecting", "won't connect", "can't connect", "doesn't connect"])
    has_usb = any(kw in t for kw in ["usb", "cable", "wire", "port"])
    has_not_recognized = any(kw in t for kw in ["not recognized", "not detected", "not showing", "doesn't show", "won't detect", "not working"])
    
    is_phone_connection_issue = has_phone and (has_connect or has_not_recognized)
    is_usb_port_issue = has_usb and has_not_recognized and not has_phone

    # Special safeguard: If model predicts common wrong labels with low confidence, force rules
    # "Case RGB Controller" and "I/O Shield Fix" are often wrong defaults
    wrong_defaults = ["Case RGB Controller", "I/O Shield Fix"]
    if base_label in wrong_defaults and base_conf < 0.70:
        base_conf = 0.30  # Force rule application
    
    # Special safeguard: If query is about speed/performance but predicts wrong defaults
    speed_keywords = ["speed", "faster", "slow", "performance", "sluggish", "freezes", "hangs", "boost", "improve", "load", "disk", "storage", "file", "app", "program", "crash", "bsod", "freeze"]
    has_speed_keyword = any(kw in t for kw in speed_keywords)
    if has_speed_keyword and base_label in wrong_defaults and base_conf < 0.80:
        base_conf = 0.30  # Force rule application
    
    # Special safeguard: If query mentions specific components but predicts wrong defaults
    component_keywords = ["gpu", "cpu", "ram", "ssd", "hdd", "monitor", "display", "screen", "wifi", "network", "internet", "fan", "cooler", "thermal", "overheat", "power", "psu", "battery", "charger", "bios", "memory", "disk", "drive", "storage"]
    has_component_keyword = any(kw in t for kw in component_keywords)
    if has_component_keyword and base_label in wrong_defaults:
        base_conf = 0.30  # ALWAYS force rule application
    
    # Special safeguard: Override Display Cable Replacement for general display issues
    if base_label == "Display Cable Replacement" and base_conf < 0.60:
        if "display" in t and ("not" in t or "no" in t or "not working" in t):
            base_conf = 0.30  # Force rule application for display issues
    
    # Special safeguard: If input is about internet/network but model predicts something unrelated
    internet_keywords = ["internet", "wifi", "wi-fi", "connection", "network", "download", "upload", "speed", "router", "modem", "browsing", "pages"]
    has_internet_keyword = any(keyword in t for keyword in internet_keywords)
    unrelated_labels_for_internet = ["GPU Upgrade", "CPU Upgrade", "RAM Upgrade", "SSD Upgrade", "PSU Upgrade", "Monitor Replacement", "Case RGB Controller", "I/O Shield Fix", "Display Cable Replacement"]
    if has_internet_keyword and base_label in unrelated_labels_for_internet and base_conf < 0.60:
        base_conf = 0.30  # Force rule application

    # Only apply rules if ML confidence is low (< 0.50) - trust ML when it's confident
    # BUT: If it's a speed/performance query and predicts wrong defaults, always apply rules
    speed_keywords_check = ["speed", "faster", "slow", "performance", "sluggish", "boost", "improve", "load"]
    has_speed_keyword_check = any(kw in t for kw in speed_keywords_check)
    wrong_defaults_check = ["Case RGB Controller", "I/O Shield Fix", "Laptop RAM Upgrade"]
    
    RULE_APPLY_THRESHOLD = 0.50
    # If speed query predicts wrong defaults, always apply rules regardless of confidence
    force_rules = False
    if has_speed_keyword_check and base_label in wrong_defaults_check:
        force_rules = True
        RULE_APPLY_THRESHOLD = 1.0  # Force rule application
    
    if not force_rules and base_conf >= RULE_APPLY_THRESHOLD:
        # ML is confident, trust it (unless we're forcing rules)
        return label, conf, rule_note

    # Apply rules only when ML confidence is low
    
    # 0) Generic "slow PC" / "slow computer" - default to SSD (most common cause)
    if (("slow" in t or "lag" in t or "laggy" in t) and 
        ("pc" in t or "computer" in t or "laptop" in t or "system" in t or "windows" in t or "everything" in t or "all" in t) and
        "internet" not in t and "connection" not in t and "wifi" not in t and "wi-fi" not in t and
        "network" not in t and "download" not in t and "upload" not in t and "speed" not in t and
        "pages" not in t and "browsing" not in t and
        "game" not in t and "gaming" not in t and "fps" not in t and
        "boot" not in t and "startup" not in t and "start" not in t and
        "tabs" not in t and "browser" not in t and "chrome" not in t and "multitask" not in t):
        # Generic slow PC - suggest SSD as most common fix
        label = "SSD Upgrade"
        conf = max(conf, 0.70)
        rule_note = "rule: generic slow PC → SSD Upgrade"
    # 1) Overheating / hot / temperature -> CPU Cooler (comprehensive patterns)
    if ("overheat" in t or "overheating" in t or 
        ("hot" in t and ("cpu" in t or "computer" in t or "pc" in t or "system" in t or "runs" in t or "gets" in t or "laptop" in t)) or
        ("temperature" in t and ("high" in t or "too" in t or "hot" in t)) or
        (("too hot" in t or "very hot" in t) and ("computer" in t or "pc" in t or "laptop" in t or len(t.split()) <= 4))):
        if "game" in t or "gaming" in t or "fps" in t:
            # Focus on cooling for gaming load
            label = "CPU Cooler Upgrade"
            conf = max(conf, 0.75)
            rule_note = "rule: overheating during gaming → CPU Cooler Upgrade"
        else:
            label = "CPU Cooler Upgrade"
            conf = max(conf, 0.70)
            rule_note = "rule: overheating/hot/temperature → CPU Cooler Upgrade"

    # 2) Power / shutdown / restarts -> PSU (comprehensive patterns)
    elif ("shut" in t and "down" in t) or ("shutdown" in t) or ("turn" in t and "off" in t) or ("power" in t and "off" in t):
        label = "PSU Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: shutdown pattern → PSU Upgrade"
    
    elif "restart" in t or "restarts" in t or "restarting" in t:
        label = "PSU Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: restart pattern → PSU Upgrade"
    
    elif ("power" in t and ("issue" in t or "problem" in t or "fail" in t)):
        label = "PSU Upgrade"
        conf = max(conf, 0.70)
        rule_note = "rule: power issues → PSU Upgrade"

    # 2.5) Phone / USB Connection Issues → Repair Shop (HIGH PRIORITY - before display rules)
    if is_phone_connection_issue or is_usb_port_issue:
        # Phone/USB connection issue - this is a repair shop issue, not a product purchase
        # Return None to prevent wrong product suggestions, let error type handle recommendations
        label = None
        conf = 0.1
        rule_note = "rule: phone/USB connection issue → repair shop (no product needed)"

    # 3) No display / no signal → Monitor or GPU check (comprehensive)
    # EXCLUDE phone connection issues from this rule
    elif not is_phone_connection_issue and not is_usb_port_issue and (
          "no display" in t or "no signal" in t or "black screen" in t or "blank screen" in t or 
          ("screen" in t and ("black" in t or "blank" in t)) or 
          ("display" in t and ("not" in t or "no" in t or "not working" in t)) or
          ("display not working" in t) or
          (("my" in t or "the" in t or "this" in t or "pc" in t or "computer" in t) and "no display" in t)):
        # Always override Display Cable Replacement for general display issues
        label = "Monitor or GPU Check"
        conf = max(conf, 0.75)
        rule_note = "rule: no display → Monitor or GPU Check"

    # 4) Slow internet / slow connection / slow Wi-Fi → Wi-Fi adapter or router (comprehensive)
    elif (("slow" in t or "lag" in t or "laggy" in t or "low" in t) and (
        "internet" in t or "connection" in t or "wifi" in t or "wi-fi" in t or "network" in t or 
        "download" in t or "upload" in t or "speed" in t or "pages" in t or "browsing" in t or "page" in t
    )) or (("low" in t and "speed" in t) and (
        "internet" in t or "connection" in t or "wifi" in t or "wi-fi" in t or "network" in t
    )):
        # Check if it's specifically about router/network infrastructure
        if "router" in t or "modem" in t or "isp" in t:
            label = "Router Upgrade"
            conf = max(conf, 0.75)
            rule_note = "rule: slow internet/router → Router Upgrade"
        else:
            # Default to Wi-Fi adapter for general slow internet
            label = "WiFi Adapter Upgrade"
            conf = max(conf, 0.75)
            rule_note = "rule: slow/low internet → WiFi Adapter Upgrade"

    # 5) Wi-Fi disconnection issues → Wi-Fi adapter / networking (comprehensive)
    elif (("wifi" in t or "wi-fi" in t or "connection" in t or "network" in t or "internet" in t) and (
        "disconnect" in t or "drops" in t or "keeps disconnecting" in t or "keeps dropping" in t or 
        "unstable" in t or "goes out" in t or "cuts out" in t or "disconnects" in t or
        "cutting out" in t or "dropping" in t
    )):
        label = "WiFi Adapter Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: wifi/connection/internet disconnects → WiFi Adapter Upgrade"
    
    # 5b) Network errors / problems / issues → WiFi adapter
    elif (("internet" in t or "wifi" in t or "wi-fi" in t or "connection" in t or "network" in t) and (
        "error" in t or "problem" in t or "issue" in t or "not working" in t or "broken" in t or
        "sucks" in t or "terrible" in t or "bad" in t or "horrible" in t or "poor" in t or
        "no" in t or "fails" in t or "failing" in t
    )):
        label = "WiFi Adapter Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: network errors/problems → WiFi Adapter Upgrade"
    
    # 5c) Router/Modem specific mentions → Router Upgrade
    elif ("router" in t or "modem" in t) and (
        "slow" in t or "problem" in t or "issue" in t or "not working" in t or "upgrade" in t or 
        "new" in t or "need" in t or "bad" in t or "poor" in t
    ):
        label = "Router Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: router/modem issues → Router Upgrade"

    # 6) Slow boot / slow file open → SSD (comprehensive, avoid internet)
    elif ("slow" in t or "lag" in t or "laggy" in t or "forever" in t or "takes long" in t) and (
        "internet" not in t and "connection" not in t and "wifi" not in t and "wi-fi" not in t and 
        "network" not in t and "download" not in t and "upload" not in t and "speed" not in t and
        "pages" not in t and "browsing" not in t
    ) and (
        "boot" in t or "startup" in t or "start up" in t or "start" in t or 
        ("opening" in t and ("apps" in t or "programs" in t or "files" in t)) or 
        ("loading" in t and ("windows" in t or "programs" in t or "apps" in t)) or 
        "takes forever" in t or ("file" in t and ("opening" in t or "open" in t)) or
        ("apps" in t and "open" in t and "slow" in t) or ("files" in t and "open" in t and "slow" in t) or
        ("programs" in t and "load" in t and "slow" in t) or
        ("slow" in t and "app" in t and "opening" in t) or ("slow" in t and "app opening" in t) or
        ("slow" in t and "loading" in t)
    ):
        if label != "SSD Upgrade":
            label = "SSD Upgrade"
            conf = max(conf, 0.70)
            rule_note = "rule: slow boot / app open → SSD Upgrade"

    # 7) Many tabs / multitasking slow → RAM (comprehensive)
    elif (("tabs" in t or "chrome" in t or "browser" in t or "multitask" in t or "multiple programs" in t or "many programs" in t) and 
          ("slow" in t or "freezes" in t or "hangs" in t or "crash" in t or "freeze" in t)) or \
         ("many browser tabs" in t or "many tabs" in t):
        label = "RAM Upgrade"
        conf = max(conf, 0.70)
        rule_note = "rule: many tabs / multitasking slow → RAM Upgrade"

    # 8) Gaming performance issues → GPU
    elif ("game" in t or "gaming" in t or "fps" in t or "frame" in t) and ("slow" in t or "lag" in t or "laggy" in t or "low" in t or "bad" in t or "poor" in t):
        label = "GPU Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: gaming performance issues → GPU Upgrade"
    
    # 9) Graphics card mentions → GPU
    elif "graphics card" in t or "gpu" in t or "graphics" in t:
        label = "GPU Upgrade"
        conf = max(conf, 0.80)
        rule_note = "rule: graphics card mention → GPU Upgrade"
    
    # 9b) GPU-specific issues → GPU
    elif (("gpu" in t or "vram" in t or "pcie" in t) and (
        "not detected" in t or "missing" in t or "not working" in t or "fan" in t or
        "thermal" in t or "overheat" in t or "driver" in t or "artifact" in t or
        "crash" in t or "power" in t or "clock" in t or "coil" in t or "display" in t
    )):
        label = "GPU Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: GPU-specific issue → GPU Upgrade"
    
    # 9c) CPU-specific issues → CPU or Cooler
    elif (("cpu" in t or "processor" in t) and (
        "usage" in t or "overheat" in t or "temperature" in t or "thermal" in t or
        "fan" in t or "cooler" in t or "frequency" in t or "voltage" in t or
        "overclock" in t or "throttle" in t or "clogging" in t or "dust" in t or
        "load" in t or "slow" in t or "encode" in t or "behaves" in t
    )):
        if "cooler" in t or "fan" in t or "thermal" in t or "overheat" in t or "temperature" in t or "clogging" in t or "dust" in t:
            label = "CPU Cooler Upgrade"
            conf = max(conf, 0.75)
            rule_note = "rule: CPU cooling issue → CPU Cooler Upgrade"
        else:
            label = "CPU Upgrade"
            conf = max(conf, 0.70)
            rule_note = "rule: CPU performance issue → CPU Upgrade"
    
    # 9d) Storage/disk issues → SSD
    elif (("disk" in t or "drive" in t or "ssd" in t or "hdd" in t or "storage" in t) and (
        "slow" in t or "not detected" in t or "disappear" in t or "missing" in t or
        "bad sector" in t or "health" in t or "corruption" in t or "freeze" in t or
        "takes long" in t or "noisy" in t or "clicking" in t
    )):
        label = "SSD Upgrade"
        conf = max(conf, 0.75)
        rule_note = "rule: storage/disk issue → SSD Upgrade"
    
    # 9e) Display/monitor issues → Monitor or GPU
    # EXCLUDE phone connection issues from this rule
    elif not is_phone_connection_issue and not is_usb_port_issue and (
        ("display" in t or "monitor" in t or "screen" in t) and (
        "no signal" in t or "flicker" in t or "black" in t or "white" in t or
        "line" in t or "artifact" in t or "pixel" in t or "color" in t or
        "brightness" in t or "tearing" in t or "ghosting" in t or "stretching" in t
    )):
        label = "Monitor or GPU Check"
        conf = max(conf, 0.75)
        rule_note = "rule: display/monitor issue → Monitor or GPU Check"
    
    # 10) General speed/performance issues → SSD or RAM (catch-all for generic speed complaints)
    # This is a comprehensive catch-all for any speed-related query
    elif (("speed" in t and ("up" in t or "faster" in t or "improve" in t or "boost" in t)) or
          ("faster" in t and ("pc" in t or "computer" in t)) or
          ("speed up" in t) or ("make" in t and "faster" in t) or
          ("improve" in t and ("speed" in t or "pc" in t or "computer" in t)) or
          ("boost" in t and ("speed" in t or "pc" in t or "computer" in t)) or
          ("need faster" in t or "want faster" in t) or
          ("sluggish" in t) or ("performance" in t and ("poor" in t or "bad" in t or "slow" in t)) or
          (("freezes" in t or "hangs" in t) and "internet" not in t and "wifi" not in t) or
          ("take" in t and "long" in t and ("open" in t or "load" in t)) or
          (("slow" in t and ("to load" in t or "to open" in t or "loading" in t)) or
           ("is slow" in t and ("to load" in t or "to open" in t or "loading" in t)) or
           ("very slow" in t and ("to load" in t or "to open" in t or "loading" in t))) or
          ("very slow" in t) or ("so slow" in t) or ("too slow" in t) or
          ("incredibly slow" in t) or ("really slow" in t)):
        # Exclude internet-related speed issues (handled by rule #4)
        if "internet" not in t and "connection" not in t and "wifi" not in t and "wi-fi" not in t and "network" not in t:
            # If it mentions multitasking/tabs/browser, prefer RAM
            if any(kw in t for kw in ["tabs", "browser", "chrome", "multitask", "many programs", "freezes", "hangs"]):
                label = "RAM Upgrade"
                conf = max(conf, 0.70)
                rule_note = "rule: general speed + multitasking → RAM Upgrade"
            # Otherwise default to SSD (most common speed improvement)
            else:
                label = "SSD Upgrade"
                conf = max(conf, 0.70)
                rule_note = "rule: general speed up → SSD Upgrade"

    return label, conf, rule_note

# Component to Product Category Mapping
COMPONENT_TO_PRODUCT_CATEGORY = {
    "SSD Upgrade": ["SSD"],
    "SSD or HDD Upgrade": ["SSD", "HDD"],
    "RAM Upgrade": ["RAM"],
    "GPU Upgrade": ["GPU"],
    "PSU Upgrade": ["PSU"],
    "CPU Cooler / Case Fans": ["CPU Cooler", "Case Fan"],
    "Wi-Fi Adapter Upgrade": ["Wi-Fi Adapter"],
    "Monitor or GPU Check": ["Monitor", "GPU"],
    "SSD and RAM Upgrade": ["SSD", "RAM"],
}

def get_product_categories_for_component(component: str) -> List[str]:
    """Get product categories for a given component recommendation."""
    return COMPONENT_TO_PRODUCT_CATEGORY.get(component, [])
