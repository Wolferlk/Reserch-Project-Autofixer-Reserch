"""
Simple spell checker for PC/hardware-related terms.
Uses edit distance (Levenshtein) to suggest corrections for common typos.
"""

# Dictionary of common PC/hardware terms
PC_TERMS = {
    # Common words
    "pc", "computer", "laptop", "desktop", "system",
    "slow", "slowly", "speed", "fast", "quick", "faster", "fastest",
    "much", "many", "too", "very", "really", "really",
    "i", "is", "are", "my", "the", "a", "an", "and", "or",
    "not", "no", "yes", "need", "want", "have", "has",
    "when", "while", "during", "after", "before",
    "to", "up", "down", "in", "on", "at", "for", "with", "from",
    "make", "makes", "making", "made",
    
    # Performance terms
    "performance", "lag", "lagging", "freeze", "freezing", "frozen",
    "stutter", "stuttering", "hang", "hanging", "crash", "crashing",
    "overheat", "overheating", "hot", "heat", "temperature", "thermal",
    "fps", "frame", "frames", "graphics", "gpu", "cpu",
    "sluggish", "unresponsive", "responsive", "bottleneck",
    
    # Storage terms
    "storage", "space", "full", "empty", "disk", "drive", "hard",
    "ssd", "hdd", "memory", "ram", "upgrade", "upgrading", "upgrades",
    "nvme", "m2", "m.2", "sata", "gb", "tb", "terabyte", "gigabyte",
    
    # Network terms
    "wifi", "wi-fi", "wireless", "internet", "network", "connection",
    "connect", "disconnect", "disconnecting", "signal", "speed",
    "adapter", "ethernet", "lan", "router", "modem",
    
    # Display terms
    "screen", "display", "monitor", "black", "blue", "white", "color",
    "bright", "brightness", "resolution", "pixel", "pixels",
    "lcd", "led", "oled", "no signal", "signal", "blank",
    
    # Audio terms
    "sound", "audio", "speaker", "speakers", "microphone", "mic",
    "volume", "loud", "quiet", "noise", "static",
    
    # Gaming terms
    "game", "games", "gaming", "gamer", "play", "playing", "run", "running",
    
    # Problem terms
    "problem", "issue", "error", "wrong", "broken", "damaged", "not working",
    "work", "working", "fix", "repair", "repairing", "broken",
    "fail", "failure", "failing", "failed", "broken", "damage",
    
    # Error types - Blue Screen / BSOD
    "bluescreen", "blue screen", "bsod", "blue screen of death",
    "stop error", "stop code", "kernel error",
    
    # Error types - Boot issues
    "boot", "booting", "startup", "start", "starting", "won't start",
    "not starting", "won't boot", "boot failure", "boot error",
    "power on", "turn on", "startup error",
    
    # Error types - GPU/Graphics
    "gpu", "graphics", "graphics card", "video card", "vga",
    "nvidia", "amd", "radeon", "geforce", "rtx", "gtx",
    "driver", "drivers", "graphics driver",
    
    # Error types - RAM/Memory
    "ram", "memory", "ddr", "ddr4", "ddr5", "memory error",
    "out of memory", "memory leak", "memory full",
    
    # Error types - Storage
    "hard drive", "harddisk", "hard disk", "storage full",
    "disk error", "disk failure", "corrupted", "corruption",
    
    # Error types - OS/Software
    "windows", "os", "operating system", "install", "installation",
    "reinstall", "format", "formatted", "fresh install",
    
    # Error types - Power
    "power", "psu", "power supply", "battery", "charging",
    "adapter", "ac adapter", "power button", "won't turn on",
    
    # Error types - WiFi/Network
    "wifi", "wi-fi", "wireless", "network adapter",
    "internet not working", "no internet", "connection lost",
    
    # Error types - Screen/Display
    "screen broken", "cracked screen", "black screen",
    "no display", "display not working", "screen repair",
    
    # Error types - Data
    "data", "files", "recovery", "lost files", "deleted",
    "backup", "retrieve", "data recovery",
    
    # Hardware components
    "keyboard", "mouse", "mousepad", "webcam", "camera", "microphone",
    "processor", "motherboard", "mobo", "mainboard",
    "power", "supply", "psu", "cooling", "fan", "fans", "cooler",
    "case", "chassis", "tower",
    
    # Brands (common misspellings)
    "intel", "amd", "nvidia", "samsung", "crucial", "kingston",
    "corsair", "western digital", "seagate", "toshiba",
    "hp", "dell", "lenovo", "asus", "acer", "msi",
    
    # Action terms
    "start", "starting", "boot", "booting", "shutdown", "shut", "down",
    "turn", "turning", "on", "off", "open", "opening", "close", "closing",
    "load", "loading", "install", "installing", "update", "updating",
    "restart", "restarting", "reboot", "rebooting",
}

# Common typo patterns - direct mappings for frequent mistakes
COMMON_TYPOS = {
    # Common misspellings
    "bluescreen": "blue screen",
    "bluescreenofdeath": "blue screen of death",
    "bsod": "bsod",  # Keep as is, it's an acronym
    "gpuoverheat": "gpu overheat",
    "gpuoverheating": "gpu overheating",
    "ramupgrade": "ram upgrade",
    "ssdupgrade": "ssd upgrade",
    "wifiadapter": "wifi adapter",
    "wifiadapter": "wifi adapter",
    "powersupply": "power supply",
    "harddrive": "hard drive",
    "harddisk": "hard drive",
    "operatingsystem": "operating system",
    "graphicscard": "graphics card",
    "videocard": "video card",
    "powersupply": "power supply",
    
    # Character substitutions
    "blu": "blue",
    "bluescren": "blue screen",
    "bluescreeen": "blue screen",
    "overheating": "overheating",  # Already correct
    "overheatingg": "overheating",
    "overheatin": "overheating",
    "overheatng": "overheating",
    "overheting": "overheating",
    "overheting": "overheating",
    
    # Missing letters
    "overheat": "overheat",  # Already correct
    "overhet": "overheat",
    "overheaat": "overheat",
    "overheaat": "overheat",
    
    # Extra letters
    "overheating": "overheating",  # Already correct
    "overheatingg": "overheating",
    "overheatinggg": "overheating",
    
    # Transposed letters
    "overheaitng": "overheating",
    "overheatnig": "overheating",
    
    # Common word mistakes
    "wifi": "wifi",  # Keep as is
    "wifi": "wifi",
    "wifi": "wifi",
    "wifi": "wifi",
    "wifi": "wifi",
}

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein (edit) distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]


def suggest_correction(word: str, max_distance: int = 3) -> str:
    """
    Suggest correction for a word if it's close to a known term.
    Enhanced with common typo patterns and better fuzzy matching.
    
    Args:
        word: The word to check
        max_distance: Maximum edit distance to consider (default: 3, increased for better matching)
    
    Returns:
        Corrected word if found, otherwise original word
    """
    word_lower = word.lower().strip()
    
    # Check common typo patterns first (exact matches)
    if word_lower in COMMON_TYPOS:
        corrected = COMMON_TYPOS[word_lower]
        # Preserve original capitalization
        if word and word[0].isupper():
            return corrected.capitalize()
        return corrected
    
    # If already correct, return as-is
    if word_lower in PC_TERMS:
        return word
    
    # Don't correct very short words (1-2 letters) unless they're clearly wrong
    # This prevents "i" from being corrected to "is", "a" to "an", etc.
    if len(word_lower) <= 2:
        # Only correct if it's a known typo pattern
        short_typos = {
            "ii": "i", "im": "i'm", "id": "i'd", "ive": "i've",
            "ur": "your", "u": "you", "r": "are", "y": "why"
        }
        if word_lower in short_typos:
            return short_typos[word_lower]
        # Otherwise, don't correct short words
        return word
    
    # Find closest match using fuzzy matching
    best_match = None
    best_distance = max_distance + 1
    
    # Calculate edit distance to all terms
    for term in PC_TERMS:
        # Skip very short terms when the word is also short (to avoid "i" -> "is")
        if len(word_lower) <= 2 and len(term) <= 2:
            continue
        
        # Calculate distance
        distance = levenshtein_distance(word_lower, term)
        
        # Prefer shorter distances
        if distance < best_distance:
            best_distance = distance
            best_match = term
            if distance == 0:  # Exact match
                break
        
        # Also check if word contains term or term contains word (for compound words)
        if len(word_lower) > 4 and len(term) > 4:
            if term in word_lower or word_lower in term:
                # If one contains the other, reduce distance by 1
                adjusted_distance = distance - 1
                if adjusted_distance < best_distance and adjusted_distance >= 0:
                    best_distance = adjusted_distance
                    best_match = term
    
    # Return correction if found
    if best_match and best_distance <= max_distance:
        # For short words (3-4 chars), be more strict (max distance 1)
        if len(word_lower) <= 4 and best_distance > 1:
            return word
        
        # For longer words, allow up to max_distance
        # Preserve original capitalization if first letter was uppercase
        if word and word[0].isupper():
            return best_match.capitalize()
        return best_match
    
    return word


def check_and_correct(text: str) -> tuple[str, list[str]]:
    """
    Check text for typos and suggest corrections.
    Enhanced to handle multi-word phrases and common error type patterns.
    
    Args:
        text: Input text to check
    
    Returns:
        Tuple of (corrected_text, list_of_corrections)
        corrections format: [(original_word, suggested_word), ...]
    """
    import re
    
    # First, check for common multi-word patterns (e.g., "bluescreen" -> "blue screen")
    corrected_text = text
    for typo, correction in COMMON_TYPOS.items():
        if len(typo) > 5:  # Only for longer patterns
            # Case-insensitive replacement
            pattern = re.compile(re.escape(typo), re.IGNORECASE)
            if pattern.search(corrected_text):
                corrected_text = pattern.sub(correction, corrected_text)
    
    # Then check individual words
    words = re.findall(r'\b\w+\b', corrected_text)
    corrections = []
    
    for word in words:
        corrected = suggest_correction(word)
        if corrected.lower() != word.lower():
            corrections.append((word, corrected))
            # Replace word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(word) + r'\b'
            corrected_text = re.sub(pattern, corrected, corrected_text, count=1, flags=re.IGNORECASE)
    
    return corrected_text, corrections


def get_correction_suggestion(original_text: str, corrected_text: str, corrections: list) -> str:
    """
    Generate a user-friendly correction suggestion message.
    
    Args:
        original_text: Original input text
        corrected_text: Corrected text
        corrections: List of (original, corrected) tuples
    
    Returns:
        Suggestion message string - just the corrected sentence
    """
    if not corrections:
        return ""
    
    # Return just the corrected text in a simple format
    return corrected_text

