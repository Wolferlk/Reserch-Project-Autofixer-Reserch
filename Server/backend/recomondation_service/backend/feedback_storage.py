"""
Feedback storage and management for active learning.
Stores user feedback when confidence is low (< 0.5).
"""

from pathlib import Path
import csv
import datetime
from typing import Optional
import pandas as pd

HERE = Path(__file__).parent.resolve()
DATA_DIR = (HERE.parent / "data").resolve()
FEEDBACK_CSV = DATA_DIR / "product_need_feedback.csv"

# Low confidence threshold
LOW_CONFIDENCE_THRESHOLD = 0.5


def save_feedback(
    text: str,
    predicted_label: Optional[str],
    confidence: float,
    user_correct_label: Optional[str] = None,
    source: str = "ml"
) -> bool:
    """
    Save user feedback to CSV.
    
    Args:
        text: Original user text
        predicted_label: Model's prediction
        confidence: Prediction confidence
        user_correct_label: User's correction (if provided)
        source: Prediction source ("rule", "ml", "hierarchical_ml")
    
    Returns:
        True if saved successfully
    """
    try:
        FEEDBACK_CSV.parent.mkdir(parents=True, exist_ok=True)
        file_exists = FEEDBACK_CSV.exists()
        
        with FEEDBACK_CSV.open("a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow([
                    "timestamp",
                    "user_text",
                    "predicted_label",
                    "confidence",
                    "user_correct_label",
                    "source",
                    "needs_review"
                ])
            
            needs_review = user_correct_label is not None and user_correct_label != predicted_label
            
            writer.writerow([
                datetime.datetime.utcnow().isoformat(),
                text,
                predicted_label or "",
                f"{confidence:.4f}",
                user_correct_label or "",
                source,
                str(needs_review)
            ])
        
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save feedback: {e}")
        return False


def load_feedback() -> pd.DataFrame:
    """Load all feedback data."""
    if not FEEDBACK_CSV.exists():
        return pd.DataFrame()
    
    try:
        df = pd.read_csv(FEEDBACK_CSV)
        return df
    except Exception as e:
        print(f"[ERROR] Failed to load feedback: {e}")
        return pd.DataFrame()


def get_feedback_count() -> int:
    """Get total number of feedback entries."""
    df = load_feedback()
    return len(df)


def get_pending_review_count() -> int:
    """Get number of feedback entries that need review."""
    df = load_feedback()
    if df.empty:
        return 0
    if 'needs_review' in df.columns:
        return int(df['needs_review'].astype(str).str.lower() == 'true').sum()
    return 0

