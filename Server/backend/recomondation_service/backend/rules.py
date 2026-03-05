"""
Rule-based safety layer for hardware component recommendations.
These rules match keyword patterns and return high-confidence predictions
before ML inference is attempted.
"""

from typing import Optional, Tuple, List
import re

# Rule structure: (keywords, component, confidence, explanation)
# Keywords can be a list of strings (all must match) or a single string
RULES = [
    # Very short inputs - Power
    {
        "keywords": "ps not start",
        "component": "PSU Upgrade",
        "confidence": 0.95,
        "explanation": "Power supply not starting indicates PSU failure. Also check power cable.",
        "related_components": ["Power Cable Replacement"]
    },
    {
        "keywords": "pc not start",
        "component": "PSU Upgrade",
        "confidence": 0.94,
        "explanation": "PC not starting could be PSU or power cable issue.",
        "related_components": ["Power Cable Replacement"]
    },
    {
        "keywords": "no power",
        "component": "PSU Upgrade",
        "confidence": 0.95,
        "explanation": "No power usually means PSU failure.",
        "related_components": ["Power Cable Replacement"]
    },
    
    # Very short inputs - Performance
    {
        "keywords": "pc slow",
        "component": "RAM Upgrade",
        "confidence": 0.90,
        "explanation": "Slow PC often needs RAM or SSD upgrade.",
        "related_components": ["SSD Upgrade", "CPU Upgrade"]
    },
    {
        "keywords": "pc vey slow",
        "component": "RAM Upgrade",
        "confidence": 0.90,
        "explanation": "Very slow PC typically needs RAM or SSD upgrade.",
        "related_components": ["SSD Upgrade"]
    },
    {
        "keywords": "computer slow",
        "component": "RAM Upgrade",
        "confidence": 0.90,
        "explanation": "Slow computer usually needs RAM or SSD upgrade.",
        "related_components": ["SSD Upgrade"]
    },
    {
        "keywords": "speed up",
        "component": "RAM Upgrade",
        "confidence": 0.88,
        "explanation": "To speed up your PC, consider upgrading RAM for better multitasking, or SSD for faster boot and loading times.",
        "related_components": ["SSD Upgrade", "CPU Upgrade"]
    },
    {
        "keywords": "make faster",
        "component": "RAM Upgrade",
        "confidence": 0.88,
        "explanation": "To make your PC faster, consider upgrading RAM for better multitasking, or SSD for faster boot and loading times.",
        "related_components": ["SSD Upgrade", "CPU Upgrade"]
    },
    {
        "keywords": ["want", "speed up"],
        "component": "RAM Upgrade",
        "confidence": 0.88,
        "explanation": "To speed up your PC, consider upgrading RAM for better multitasking, or SSD for faster boot and loading times.",
        "related_components": ["SSD Upgrade", "CPU Upgrade"]
    },
    {
        "keywords": ["want", "faster"],
        "component": "RAM Upgrade",
        "confidence": 0.88,
        "explanation": "To make your PC faster, consider upgrading RAM for better multitasking, or SSD for faster boot and loading times.",
        "related_components": ["SSD Upgrade", "CPU Upgrade"]
    },
    
    # Very short inputs - Network
    {
        "keywords": "no internet",
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.92,
        "explanation": "No internet could be WiFi adapter or router issue.",
        "related_components": ["Router Upgrade"]
    },
    {
        "keywords": "no internet in my pc",
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.92,
        "explanation": "No internet on PC suggests WiFi adapter or router problem.",
        "related_components": ["Router Upgrade"]
    },
    
    # Display + Power symptoms
    {
        "keywords": ["no display", "fans spinning", "no signal"],
        "component": "Monitor or GPU Check",
        "confidence": 0.95,
        "explanation": "No display with fans spinning typically indicates a GPU or monitor issue. Check GPU connections and monitor cables first."
    },
    {
        "keywords": ["no display", "black screen", "fans working"],
        "component": "Monitor or GPU Check",
        "confidence": 0.95,
        "explanation": "Black screen with working fans suggests a display or GPU problem. Verify monitor connections and GPU seating."
    },
    
    # Power issues
    {
        "keywords": "pc shuts down instantly",
        "component": "PSU Upgrade",
        "confidence": 0.96,
        "explanation": "Instant shutdowns are typically caused by power supply failure. The PSU cannot provide stable power to components."
    },
    {
        "keywords": "immediate shutdown",
        "component": "PSU Upgrade",
        "confidence": 0.96,
        "explanation": "Immediate shutdowns indicate power supply failure. Replace the PSU."
    },
    {
        "keywords": ["random shutdown", "power issue", "turns off randomly"],
        "component": "PSU Upgrade",
        "confidence": 0.94,
        "explanation": "Random shutdowns often indicate insufficient or failing power supply. Upgrade to a higher wattage PSU."
    },
    {
        "keywords": ["no power", "won't turn on", "dead"],
        "component": "PSU Upgrade",
        "confidence": 0.95,
        "explanation": "Complete power failure usually indicates a dead power supply unit. Replace the PSU."
    },
    
    # Performance - RAM
    {
        "keywords": ["slow", "multitasking", "chrome tabs", "browser"],
        "component": "RAM Upgrade",
        "confidence": 0.92,
        "explanation": "Slow performance with multiple browser tabs typically indicates insufficient RAM. Upgrade RAM for better multitasking."
    },
    {
        "keywords": ["tabs closing", "out of memory", "memory error"],
        "component": "RAM Upgrade",
        "confidence": 0.93,
        "explanation": "Browser tabs closing automatically or memory errors suggest RAM capacity issues. Add more RAM."
    },
    
    # Performance - Storage
    {
        "keywords": ["slow boot", "takes long to start", "windows slow startup"],
        "component": "SSD Upgrade",
        "confidence": 0.91,
        "explanation": "Slow boot times are often caused by old HDD. Upgrade to SSD for significantly faster startup."
    },
    {
        "keywords": ["loading slow", "files slow", "disk 100%"],
        "component": "SSD Upgrade",
        "confidence": 0.90,
        "explanation": "Slow file loading and high disk usage indicate storage bottleneck. Upgrade to SSD for better performance."
    },
    
    # Performance - GPU
    {
        "keywords": "low fps",
        "component": "GPU Upgrade",
        "confidence": 0.92,
        "explanation": "Low FPS typically indicates insufficient GPU power. Upgrade your graphics card."
    },
    {
        "keywords": "gaming lag",
        "component": "GPU Upgrade",
        "confidence": 0.92,
        "explanation": "Gaming lag typically indicates insufficient GPU power. Upgrade your graphics card."
    },
    {
        "keywords": "frame drops",
        "component": "GPU Upgrade",
        "confidence": 0.92,
        "explanation": "Frame drops typically indicate insufficient GPU power. Upgrade your graphics card."
    },
    {
        "keywords": ["graphics card", "gpu", "video card"],
        "component": "GPU Upgrade",
        "confidence": 0.88,
        "explanation": "Explicit mention of graphics card suggests GPU upgrade is needed."
    },
    
    # Overheating
    {
        "keywords": ["overheating", "too hot", "thermal"],
        "component": "CPU Cooler Upgrade",
        "confidence": 0.90,
        "explanation": "Overheating issues require better cooling. Upgrade CPU cooler and ensure proper thermal paste application."
    },
    {
        "keywords": ["thermal paste", "cpu temperature", "high temp"],
        "component": "Thermal Paste Reapply",
        "confidence": 0.93,
        "explanation": "High CPU temperatures often indicate dried or improperly applied thermal paste. Reapply thermal paste."
    },
    
    # Network
    {
        "keywords": ["wifi disconnects", "unstable wifi", "internet drops"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.91,
        "explanation": "Unstable WiFi connections suggest adapter issues. Upgrade to a better WiFi adapter."
    },
    {
        "keywords": ["no wifi", "can't connect", "wifi not working"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.89,
        "explanation": "Complete WiFi failure may indicate adapter malfunction. Replace or upgrade WiFi adapter."
    },
    
    # Display specific
    {
        "keywords": ["flickering", "lines on screen", "artifacts"],
        "component": "Monitor or GPU Check",
        "confidence": 0.92,
        "explanation": "Screen flickering or artifacts can indicate GPU issues or monitor problems. Check both components."
    },
    {
        "keywords": ["dead pixels", "screen damage", "cracked screen"],
        "component": "Monitor Replacement",
        "confidence": 0.95,
        "explanation": "Physical screen damage requires monitor replacement."
    },
    
    # Additional performance patterns
    {
        "keywords": ["slow boot", "takes long to start", "windows slow startup"],
        "component": "SSD Upgrade",
        "confidence": 0.91,
        "explanation": "Slow boot times are often caused by old HDD. Upgrade to SSD for significantly faster startup.",
        "related_components": ["RAM Upgrade"]
    },
    {
        "keywords": ["loading slow", "files slow", "disk 100%"],
        "component": "SSD Upgrade",
        "confidence": 0.90,
        "explanation": "Slow file loading and high disk usage indicate storage bottleneck. Upgrade to SSD for better performance.",
        "related_components": ["RAM Upgrade"]
    },
    
    # Gaming-specific
    {
        "keywords": ["low fps", "frame rate low", "fps drops"],
        "component": "GPU Upgrade",
        "confidence": 0.92,
        "explanation": "Low FPS typically indicates insufficient GPU power. Upgrade your graphics card.",
        "related_components": ["CPU Upgrade", "RAM Upgrade"]
    },
    {
        "keywords": ["gaming lag", "game stutter", "game performance"],
        "component": "GPU Upgrade",
        "confidence": 0.92,
        "explanation": "Gaming lag typically indicates insufficient GPU power. Upgrade your graphics card.",
        "related_components": ["CPU Upgrade"]
    },
    
    # Multitasking
    {
        "keywords": ["slow multitasking", "many programs", "multiple apps"],
        "component": "RAM Upgrade",
        "confidence": 0.92,
        "explanation": "Slow performance with multiple programs typically indicates insufficient RAM. Upgrade RAM for better multitasking.",
        "related_components": ["SSD Upgrade", "CPU Upgrade"]
    },
    {
        "keywords": ["tabs closing", "out of memory", "memory error"],
        "component": "RAM Upgrade",
        "confidence": 0.93,
        "explanation": "Browser tabs closing automatically or memory errors suggest RAM capacity issues. Add more RAM.",
        "related_components": []
    },
    
    # Overheating patterns
    {
        "keywords": ["cpu overheating", "processor too hot", "cpu temperature"],
        "component": "CPU Cooler Upgrade",
        "confidence": 0.90,
        "explanation": "CPU overheating requires better cooling. Upgrade CPU cooler and ensure proper thermal paste application.",
        "related_components": ["Thermal Paste Reapply", "Case Fan Upgrade"]
    },
    {
        "keywords": ["gpu overheating", "graphics card hot", "gpu temperature"],
        "component": "GPU Cooler Upgrade",
        "confidence": 0.90,
        "explanation": "GPU overheating requires better cooling. Check GPU fans and consider upgrading GPU cooler.",
        "related_components": ["Case Fan Upgrade"]
    },
    
    # Network patterns
    {
        "keywords": ["wifi disconnects", "unstable wifi", "internet drops"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.91,
        "explanation": "Unstable WiFi connections suggest adapter issues. Upgrade to a better WiFi adapter.",
        "related_components": ["Router Upgrade"]
    },
    {
        "keywords": ["no wifi", "can't connect", "wifi not working"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.89,
        "explanation": "Complete WiFi failure may indicate adapter malfunction. Replace or upgrade WiFi adapter.",
        "related_components": ["Router Upgrade"]
    },
    
    # Battery patterns
    {
        "keywords": ["laptop battery", "battery not charging", "battery dead"],
        "component": "Laptop Battery Replacement",
        "confidence": 0.93,
        "explanation": "Laptop battery issues require battery replacement. Check if battery is swollen or not holding charge.",
        "related_components": []
    },
    
    # USB patterns
    {
        "keywords": ["usb ports not enough", "need more usb", "usb devices not connecting"],
        "component": "USB Hub",
        "confidence": 0.88,
        "explanation": "Insufficient USB ports can be solved with a USB hub. Connect multiple devices simultaneously.",
        "related_components": []
    },
    
    # Webcam/Camera patterns - HIGH PRIORITY (using OR logic - any keyword matches)
    {
        "keywords": "lap camera",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Laptop camera not working requires webcam upgrade or repair. Check if it's a built-in laptop camera or external webcam.",
        "related_components": []
    },
    {
        "keywords": "laptop camera",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Laptop camera not working requires webcam upgrade or repair. Check if it's a built-in laptop camera or external webcam.",
        "related_components": []
    },
    {
        "keywords": "camera not working",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Camera not working requires webcam upgrade or repair. Check if it's a built-in laptop camera or external webcam.",
        "related_components": []
    },
    {
        "keywords": "webcam not working",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Webcam not working requires webcam upgrade or repair. Check if it's a built-in laptop camera or external webcam.",
        "related_components": []
    },
    
    # Audio issues - Application specific (CHECK BEFORE CAMERA RULES)
    {
        "keywords": ["zoom", "no sound"],
        "component": "Audio Issue",
        "confidence": 0.93,
        "explanation": "Zoom no sound is an audio issue. Check audio settings in Zoom and Windows.",
        "related_components": []
    },
    {
        "keywords": ["teams", "no sound"],
        "component": "Audio Issue",
        "confidence": 0.93,
        "explanation": "Teams no sound is an audio issue. Check audio settings in Teams and Windows.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "no audio"],
        "component": "Audio Issue",
        "confidence": 0.93,
        "explanation": "Zoom no audio is an audio issue. Check audio settings and device selection.",
        "related_components": []
    },
    
    # Application-specific camera issues (Zoom, Teams, Skype, etc.)
    {
        "keywords": ["zoom", "camera"],
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Zoom camera issues are webcam problems. Check webcam settings in Zoom and Windows Privacy settings.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "video"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Zoom video not working indicates webcam problem. Check webcam permissions and hardware.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "not showing"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Zoom not showing video is a webcam issue. Check webcam settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "can't see"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Can't see yourself in Zoom means webcam is not working. Check webcam settings and hardware.",
        "related_components": []
    },
    {
        "keywords": "zoom application",
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Zoom application camera/video issues are webcam problems. Check webcam settings and permissions.",
        "related_components": []
    },
    {
        "keywords": "zoom",
        "component": "Webcam Upgrade",
        "confidence": 0.90,
        "explanation": "Zoom issues are usually webcam problems. Check webcam settings in Zoom and Windows Privacy settings.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "camera"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Zoom camera not showing is a webcam issue. Check webcam settings in Zoom and Windows Privacy settings.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "video"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Zoom video not working indicates webcam problem. Check webcam permissions and hardware.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "not showing"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Zoom not showing video is a webcam issue. Check webcam settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["zoom", "can't see"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Can't see yourself in Zoom means webcam is not working. Check webcam settings and hardware.",
        "related_components": []
    },
    {
        "keywords": "zoom application",
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Zoom application camera/video issues are webcam problems. Check webcam settings and permissions.",
        "related_components": []
    },
    {
        "keywords": "teams",
        "component": "Webcam Upgrade",
        "confidence": 0.92,
        "explanation": "Teams camera/video issues are webcam problems. Check webcam settings in Teams and Windows.",
        "related_components": []
    },
    {
        "keywords": ["teams", "camera"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Teams camera not working is a webcam issue. Check webcam settings in Teams and Windows.",
        "related_components": []
    },
    {
        "keywords": "skype",
        "component": "Webcam Upgrade",
        "confidence": 0.92,
        "explanation": "Skype camera/video issues are webcam problems. Check webcam permissions and hardware.",
        "related_components": []
    },
    {
        "keywords": ["skype", "camera"],
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Skype camera not working indicates webcam problem. Check webcam permissions and hardware.",
        "related_components": []
    },
    {
        "keywords": "video call",
        "component": "Webcam Upgrade",
        "confidence": 0.91,
        "explanation": "Video call issues are usually webcam problems. Check webcam settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["video call", "camera"],
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Video call camera not working is a webcam issue. Check webcam settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["video call", "no video"],
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "No video in video calls indicates webcam problem. Check webcam hardware and settings.",
        "related_components": []
    },
    {
        "keywords": "meeting",
        "component": "Webcam Upgrade",
        "confidence": 0.90,
        "explanation": "Meeting camera issues are webcam problems. Check webcam permissions and hardware.",
        "related_components": []
    },
    {
        "keywords": ["meeting", "camera"],
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Camera not showing in meetings is a webcam issue. Check webcam permissions and hardware.",
        "related_components": []
    },
    
    
    # Microphone issues - Application specific
    {
        "keywords": ["zoom", "mic"],
        "component": "Microphone Upgrade",
        "confidence": 0.92,
        "explanation": "Zoom microphone issues may require microphone upgrade. Check mic settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["teams", "mic"],
        "component": "Microphone Upgrade",
        "confidence": 0.92,
        "explanation": "Teams microphone issues may require microphone upgrade. Check mic settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["discord", "mic"],
        "component": "Microphone Upgrade",
        "confidence": 0.92,
        "explanation": "Discord microphone issues may require microphone upgrade. Check mic settings and permissions.",
        "related_components": []
    },
    {
        "keywords": ["can't hear me"],
        "component": "Microphone Upgrade",
        "confidence": 0.91,
        "explanation": "People can't hear you indicates microphone problem. Check mic settings and hardware.",
        "related_components": []
    },
    
    # RAM - Application specific
    {
        "keywords": ["tabs closing"],
        "component": "RAM Upgrade",
        "confidence": 0.92,
        "explanation": "Browser tabs closing automatically indicates insufficient RAM. Upgrade RAM for better multitasking.",
        "related_components": []
    },
    {
        "keywords": ["chrome tabs"],
        "component": "RAM Upgrade",
        "confidence": 0.91,
        "explanation": "Chrome tabs issues often indicate RAM problems. Check RAM usage and consider upgrade.",
        "related_components": []
    },
    {
        "keywords": ["photoshop", "slow"],
        "component": "RAM Upgrade",
        "confidence": 0.90,
        "explanation": "Photoshop slow performance typically needs more RAM. Check RAM usage during Photoshop.",
        "related_components": []
    },
    {
        "keywords": ["premiere", "slow"],
        "component": "RAM Upgrade",
        "confidence": 0.90,
        "explanation": "Premiere Pro slow performance typically needs more RAM. Video editing requires lots of RAM.",
        "related_components": []
    },
    
    # SSD - Loading specific
    {
        "keywords": ["games", "long to load"],
        "component": "SSD Upgrade",
        "confidence": 0.91,
        "explanation": "Games taking long to load indicates slow storage. Upgrade to SSD for faster loading times.",
        "related_components": []
    },
    {
        "keywords": ["games", "slow to load"],
        "component": "SSD Upgrade",
        "confidence": 0.91,
        "explanation": "Games slow to load indicates storage bottleneck. SSD upgrade significantly improves loading times.",
        "related_components": []
    },
    {
        "keywords": ["loading", "slow"],
        "component": "SSD Upgrade",
        "confidence": 0.90,
        "explanation": "Slow loading times indicate storage bottleneck. Upgrade to SSD for better performance.",
        "related_components": []
    },
    
    # WiFi - Streaming/Buffering specific
    {
        "keywords": ["netflix", "buffering"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.92,
        "explanation": "Netflix buffering indicates network issue. Check WiFi adapter and connection speed.",
        "related_components": []
    },
    {
        "keywords": ["youtube", "buffering"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.92,
        "explanation": "YouTube buffering indicates network issue. Check WiFi adapter and connection speed.",
        "related_components": []
    },
    {
        "keywords": ["streaming", "buffering"],
        "component": "WiFi Adapter Upgrade",
        "confidence": 0.91,
        "explanation": "Streaming buffering indicates network issue. Upgrade WiFi adapter for better connection.",
        "related_components": []
    },
    {
        "keywords": "camera not detected",
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Camera not being detected suggests hardware or driver issue. May need webcam upgrade or driver update.",
        "related_components": []
    },
    {
        "keywords": "webcam not detected",
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Webcam not being detected suggests hardware or driver issue. May need webcam upgrade or driver update.",
        "related_components": []
    },
    {
        "keywords": "camera not showing",
        "component": "Webcam Upgrade",
        "confidence": 0.94,
        "explanation": "Camera not showing suggests hardware or driver issue. May need webcam upgrade or driver update.",
        "related_components": []
    },
    {
        "keywords": "camera error",
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Camera errors typically indicate hardware failure or driver issues. Consider webcam upgrade.",
        "related_components": []
    },
    {
        "keywords": "webcam error",
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Webcam errors typically indicate hardware failure or driver issues. Consider webcam upgrade.",
        "related_components": []
    },
    {
        "keywords": "camera problem",
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Camera problems typically indicate hardware failure or driver issues. Consider webcam upgrade.",
        "related_components": []
    },
    {
        "keywords": "webcam problem",
        "component": "Webcam Upgrade",
        "confidence": 0.93,
        "explanation": "Webcam problems typically indicate hardware failure or driver issues. Consider webcam upgrade.",
        "related_components": []
    },
    {
        "keywords": "camera not responding",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Camera not responding usually means hardware failure. Upgrade to a new webcam.",
        "related_components": []
    },
    {
        "keywords": "webcam not responding",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Webcam not responding usually means hardware failure. Upgrade to a new webcam.",
        "related_components": []
    },
    {
        "keywords": "camera broken",
        "component": "Webcam Upgrade",
        "confidence": 0.95,
        "explanation": "Broken camera requires webcam upgrade. Install a new webcam.",
        "related_components": []
    },
    {
        "keywords": "no camera",
        "component": "Webcam Upgrade",
        "confidence": 0.92,
        "explanation": "Missing camera requires webcam upgrade. Install an external webcam if built-in camera is not available.",
        "related_components": []
    },
    {
        "keywords": "no webcam",
        "component": "Webcam Upgrade",
        "confidence": 0.92,
        "explanation": "Missing webcam requires webcam upgrade. Install an external webcam if built-in camera is not available.",
        "related_components": []
    },
    {
        "keywords": "camera missing",
        "component": "Webcam Upgrade",
        "confidence": 0.92,
        "explanation": "Missing camera requires webcam upgrade. Install an external webcam if built-in camera is not available.",
        "related_components": []
    }
]


def match_rule(text: str) -> Optional[Tuple[str, float, str, List[str]]]:
    """
    Match user text against rule patterns.
    
    Args:
        text: User's problem description
    
    Returns:
        Tuple of (component, confidence, explanation, related_components) if rule matches, None otherwise
    """
    text_lower = text.lower().strip()
    
    for rule in RULES:
        keywords = rule["keywords"]
        related = rule.get("related_components", [])
        
        # Check if all keywords match
        if isinstance(keywords, list):
            # All keywords must be present (case-insensitive)
            if all(kw.lower() in text_lower for kw in keywords):
                return (
                    rule["component"],
                    rule["confidence"],
                    rule["explanation"],
                    related
                )
        else:
            # Single keyword pattern (case-insensitive)
            if keywords.lower() in text_lower:
                return (
                    rule["component"],
                    rule["confidence"],
                    rule["explanation"],
                    related
                )
    
    return None


def get_rule_explanation(text: str) -> Optional[str]:
    """
    Get explanation for a matched rule (for debugging/logging).
    """
    result = match_rule(text)
    if result:
        return result[2]
    return None

