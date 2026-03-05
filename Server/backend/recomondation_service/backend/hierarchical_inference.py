"""
Hierarchical inference for Product Need Model.
Implements two-stage prediction: Category → Component (filtered by category).
"""

from pathlib import Path
import joblib
import json
import numpy as np
from typing import Tuple, List, Optional, Dict, Any
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = Path(__file__).parent.resolve()

# Model paths
CATEGORY_MODEL_PATH = HERE / "product_need_category_model.pkl"
COMPONENT_MODEL_PATH = HERE / "product_need_component_model.pkl"
MAPPING_PATH = HERE / "component_category_mapping.json"

# Load models and mapping (lazy loading)
_category_model = None
_component_model = None
_category_mapping = None
_component_to_category = None


def _load_models():
    """Lazy load models and mapping."""
    global _category_model, _component_model, _category_mapping, _component_to_category
    
    if _category_model is None and CATEGORY_MODEL_PATH.exists():
        _category_model = joblib.load(CATEGORY_MODEL_PATH)
    
    if _component_model is None and COMPONENT_MODEL_PATH.exists():
        _component_model = joblib.load(COMPONENT_MODEL_PATH)
    
    if _category_mapping is None and MAPPING_PATH.exists():
        with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
            _category_mapping = json.load(f)
        
        # Create reverse mapping
        _component_to_category = {}
        for category, components in _category_mapping.items():
            for component in components:
                _component_to_category[component] = category
    
    return _category_model, _component_model, _category_mapping, _component_to_category


def predict_hierarchical(text: str, return_multiple: bool = True) -> Tuple[Optional[str], float, str, List[Tuple[str, float]], Dict[str, List[Tuple[str, float]]]]:
    """
    Predict component using hierarchical approach.
    Returns multiple recommendations grouped by category.
    
    Args:
        text: User's problem description
        return_multiple: If True, returns multiple recommendations grouped by category
    
    Returns:
        Tuple of:
        - predicted_component (str or None) - primary recommendation
        - confidence (float)
        - source ("hierarchical_ml")
        - top5_alternatives [(component, confidence), ...]
        - grouped_by_category {category: [(component, confidence), ...]}
    """
    category_model, component_model, category_mapping, component_to_category = _load_models()
    
    if category_model is None or component_model is None:
        return None, 0.0, "models_not_loaded", [], {}
    
    if category_mapping is None or component_to_category is None:
        return None, 0.0, "mapping_not_loaded", [], {}
    
    # Stage 1: Predict category
    try:
        cat_probs = category_model.predict_proba([text])[0]
        cat_classes = category_model.classes_
        cat_idx = np.argmax(cat_probs)
        predicted_category = str(cat_classes[cat_idx])
        cat_confidence = float(cat_probs[cat_idx])
    except Exception as e:
        print(f"[ERROR] Category prediction failed: {e}")
        return None, 0.0, "category_prediction_failed", [], {}
    
    # Stage 2: Predict component (filtered by category)
    try:
        comp_probs = component_model.predict_proba([text])[0]
        comp_classes = component_model.classes_
        
        # Filter components by predicted category
        category_components = set(category_mapping.get(predicted_category, []))
        
        # Get probabilities for components in this category
        filtered_probs = []
        filtered_components = []
        
        for i, comp in enumerate(comp_classes):
            if comp in category_components:
                filtered_probs.append(comp_probs[i])
                filtered_components.append(comp)
        
        if not filtered_probs:
            # Fallback: use all components if category filtering yields nothing
            filtered_probs = list(comp_probs)
            filtered_components = list(comp_classes)
        
        # Normalize probabilities
        total_prob = sum(filtered_probs)
        if total_prob > 0:
            normalized_probs = [p / total_prob for p in filtered_probs]
        else:
            normalized_probs = [1.0 / len(filtered_probs)] * len(filtered_probs)
        
        # Get top component
        top_idx = np.argmax(normalized_probs)
        predicted_component = str(filtered_components[top_idx])
        comp_confidence = float(normalized_probs[top_idx])
        
        # Get top 5 alternatives (within category)
        top5_indices = np.argsort(normalized_probs)[::-1][:5]
        top5_alternatives = [
            (str(filtered_components[i]), float(normalized_probs[i]))
            for i in top5_indices
        ]
        
        # Combined confidence (category confidence * component confidence)
        combined_confidence = cat_confidence * comp_confidence
        
        # Group by category if requested
        grouped_by_category = {}
        if return_multiple:
            from multi_component_mapping import group_by_category
            grouped_by_category = group_by_category(top5_alternatives, component_to_category)
        
        return predicted_component, combined_confidence, "hierarchical_ml", top5_alternatives, grouped_by_category
        
    except Exception as e:
        print(f"[ERROR] Component prediction failed: {e}")
        return None, 0.0, "component_prediction_failed", [], {}


def get_category_for_component(component: str) -> Optional[str]:
    """Get the category for a given component."""
    _, _, _, component_to_category = _load_models()
    if component_to_category:
        return component_to_category.get(component)
    return None

