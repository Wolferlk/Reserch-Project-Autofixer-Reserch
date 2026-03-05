"""
Multi-component mapping for Product Need Model.
Maps one problem description to multiple possible components.
"""

from typing import List, Dict, Tuple
import json
from pathlib import Path

# Problem → Multiple Components mapping
PROBLEM_TO_COMPONENTS = {
    # Slow performance
    "slow": ["RAM Upgrade", "SSD Upgrade", "CPU Upgrade"],
    "sluggish": ["RAM Upgrade", "SSD Upgrade"],
    "lag": ["RAM Upgrade", "GPU Upgrade"],
    "freeze": ["RAM Upgrade", "SSD Upgrade"],
    "hanging": ["RAM Upgrade", "SSD Upgrade"],
    
    # Boot issues
    "slow boot": ["SSD Upgrade", "RAM Upgrade"],
    "takes long to start": ["SSD Upgrade"],
    "boot time": ["SSD Upgrade"],
    
    # Gaming
    "low fps": ["GPU Upgrade", "RAM Upgrade"],
    "gaming lag": ["GPU Upgrade", "RAM Upgrade"],
    "frame drops": ["GPU Upgrade"],
    
    # Overheating
    "overheat": ["CPU Cooler Upgrade", "Case Fan Upgrade", "Thermal Paste Reapply"],
    "too hot": ["CPU Cooler Upgrade", "Case Fan Upgrade"],
    "heating": ["CPU Cooler Upgrade", "Thermal Paste Reapply"],
    
    # Power
    "shuts down": ["PSU Upgrade", "CPU Cooler Upgrade"],
    "random shutdown": ["PSU Upgrade"],
    "no power": ["PSU Upgrade", "Power Cable Replacement"],
    "wont start": ["PSU Upgrade", "Power Cable Replacement"],
    
    # Display
    "no display": ["Monitor or GPU Check", "Display Cable Replacement"],
    "black screen": ["Monitor or GPU Check", "GPU Upgrade"],
    "no signal": ["Monitor or GPU Check", "Display Cable Replacement"],
    
    # Network
    "no internet": ["WiFi Adapter Upgrade", "Router Upgrade"],
    "wifi disconnects": ["WiFi Adapter Upgrade"],
    "slow internet": ["WiFi Adapter Upgrade", "Router Upgrade"],
    
    # Storage
    "full": ["SSD Upgrade", "HDD Upgrade"],
    "no space": ["SSD Upgrade", "HDD Upgrade"],
    "storage": ["SSD Upgrade", "HDD Upgrade"],
}


def get_related_components(text: str, primary_component: str) -> List[Tuple[str, float]]:
    """
    Get related components for a given text and primary component.
    Returns list of (component, relevance_score) tuples.
    
    Args:
        text: User's problem description
        primary_component: Primary recommended component
    
    Returns:
        List of (component, score) tuples, sorted by relevance
    """
    text_lower = text.lower()
    related = []
    
    # Check problem patterns
    for problem, components in PROBLEM_TO_COMPONENTS.items():
        if problem in text_lower:
            for comp in components:
                if comp != primary_component:
                    # Calculate relevance score
                    score = 0.7 if comp in components else 0.5
                    related.append((comp, score))
    
    # Remove duplicates and sort by score
    seen = set()
    unique_related = []
    for comp, score in related:
        if comp not in seen:
            seen.add(comp)
            unique_related.append((comp, score))
    
    # Sort by score (descending)
    unique_related.sort(key=lambda x: x[1], reverse=True)
    
    return unique_related[:5]  # Return top 5


def group_by_category(components: List[Tuple[str, float]], component_to_category: Dict[str, str]) -> Dict[str, List[Tuple[str, float]]]:
    """
    Group components by category.
    
    Args:
        components: List of (component, confidence) tuples
        component_to_category: Mapping from component to category
    
    Returns:
        Dictionary: {category: [(component, confidence), ...]}
    """
    grouped = {}
    
    for component, confidence in components:
        category = component_to_category.get(component, "Other")
        if category not in grouped:
            grouped[category] = []
        grouped[category].append((component, confidence))
    
    # Sort each category by confidence
    for category in grouped:
        grouped[category].sort(key=lambda x: x[1], reverse=True)
    
    return grouped


