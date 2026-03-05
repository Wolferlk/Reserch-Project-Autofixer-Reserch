"""
Find similar/related errors based on detected error type.
"""

from typing import List, Dict, Any, Optional

# Error relationships - similar/related errors
# Based on actual error types detected by the system
ERROR_RELATIONSHIPS: Dict[str, List[Dict[str, Any]]] = {
    "GPU Overheat": [
        {"label": "CPU Overheat", "confidence": 0.75, "reason": "Both involve overheating - similar symptoms"},
        {"label": "PSU / Power Issue", "confidence": 0.6, "reason": "Overheating can cause power-related shutdowns"},
        {"label": "No Display / No Signal", "confidence": 0.5, "reason": "GPU overheating can cause display issues"},
    ],
    "CPU Overheat": [
        {"label": "GPU Overheat", "confidence": 0.75, "reason": "Both involve overheating - similar symptoms"},
        {"label": "PSU / Power Issue", "confidence": 0.6, "reason": "Overheating can cause power-related shutdowns"},
        {"label": "Windows Boot Failure", "confidence": 0.4, "reason": "Overheating can prevent proper booting"},
    ],
    "Blue Screen (BSOD)": [
        {"label": "Windows Boot Failure", "confidence": 0.7, "reason": "Both are Windows system errors"},
        {"label": "RAM Upgrade", "confidence": 0.6, "reason": "BSOD is often caused by faulty RAM"},
        {"label": "OS Installation", "confidence": 0.5, "reason": "Reinstalling OS can fix BSOD errors"},
    ],
    "Windows Boot Failure": [
        {"label": "Blue Screen (BSOD)", "confidence": 0.7, "reason": "Both are Windows system errors"},
        {"label": "PSU / Power Issue", "confidence": 0.6, "reason": "Power issues can prevent booting"},
        {"label": "OS Installation", "confidence": 0.65, "reason": "Reinstalling OS can fix boot problems"},
        {"label": "SSD Upgrade", "confidence": 0.5, "reason": "Boot failure can be storage-related"},
    ],
    "PSU / Power Issue": [
        {"label": "Windows Boot Failure", "confidence": 0.7, "reason": "Power issues prevent booting"},
        {"label": "No Display / No Signal", "confidence": 0.65, "reason": "Power issues can cause display problems"},
        {"label": "GPU Overheat", "confidence": 0.5, "reason": "Insufficient power can cause overheating"},
        {"label": "CPU Overheat", "confidence": 0.5, "reason": "Power issues can affect cooling"},
    ],
    "No Display / No Signal": [
        {"label": "PSU / Power Issue", "confidence": 0.7, "reason": "Power issues often cause no display"},
        {"label": "GPU Overheat", "confidence": 0.6, "reason": "GPU problems can cause display issues"},
        {"label": "Windows Boot Failure", "confidence": 0.5, "reason": "Boot issues can prevent display"},
        {"label": "Laptop Screen Repair", "confidence": 0.55, "reason": "Screen issues cause no display"},
    ],
    "SSD Upgrade": [
        {"label": "RAM Upgrade", "confidence": 0.6, "reason": "Both improve system performance"},
        {"label": "Windows Boot Failure", "confidence": 0.5, "reason": "SSD can fix slow boot issues"},
        {"label": "OS Installation", "confidence": 0.4, "reason": "SSD upgrade often done with OS reinstall"},
    ],
    "RAM Upgrade": [
        {"label": "SSD Upgrade", "confidence": 0.6, "reason": "Both improve system performance"},
        {"label": "Blue Screen (BSOD)", "confidence": 0.55, "reason": "RAM issues often cause BSOD"},
        {"label": "Windows Boot Failure", "confidence": 0.45, "reason": "Faulty RAM can prevent booting"},
    ],
    "OS Installation": [
        {"label": "Windows Boot Failure", "confidence": 0.75, "reason": "OS installation fixes boot issues"},
        {"label": "Blue Screen (BSOD)", "confidence": 0.6, "reason": "OS installation can fix BSOD"},
        {"label": "Data Recovery", "confidence": 0.55, "reason": "OS installation may require data backup"},
    ],
    "OS Reinstall / Corrupted": [
        {"label": "Windows Boot Failure", "confidence": 0.75, "reason": "OS reinstall fixes boot issues"},
        {"label": "Blue Screen (BSOD)", "confidence": 0.6, "reason": "OS reinstall can fix BSOD"},
        {"label": "Driver Issue", "confidence": 0.5, "reason": "OS reinstall fixes driver problems"},
    ],
    "Monitor Issue": [
        {"label": "No Display / No Signal", "confidence": 0.85, "reason": "Monitor issues cause no display"},
        {"label": "Laptop Screen Repair", "confidence": 0.7, "reason": "Both involve display problems"},
        {"label": "PSU / Power Issue", "confidence": 0.5, "reason": "Power issues can affect monitor"},
    ],
    "Slow Performance": [
        {"label": "SSD Upgrade", "confidence": 0.7, "reason": "SSD significantly improves performance"},
        {"label": "RAM Upgrade", "confidence": 0.65, "reason": "More RAM improves multitasking"},
        {"label": "Virus / Malware", "confidence": 0.5, "reason": "Malware can slow down system"},
    ],
    "Virus / Malware": [
        {"label": "Slow Performance", "confidence": 0.7, "reason": "Malware causes slow performance"},
        {"label": "OS Reinstall / Corrupted", "confidence": 0.6, "reason": "Severe malware may need OS reinstall"},
        {"label": "Blue Screen (BSOD)", "confidence": 0.4, "reason": "Malware can cause system crashes"},
    ],
    "Driver Issue": [
        {"label": "Blue Screen (BSOD)", "confidence": 0.6, "reason": "Driver issues can cause BSOD"},
        {"label": "No Display / No Signal", "confidence": 0.5, "reason": "GPU drivers affect display"},
        {"label": "OS Reinstall / Corrupted", "confidence": 0.45, "reason": "OS reinstall fixes driver issues"},
    ],
    "Laptop Screen Repair": [
        {"label": "No Display / No Signal", "confidence": 0.8, "reason": "Both involve display problems"},
        {"label": "PSU / Power Issue", "confidence": 0.4, "reason": "Power issues can affect laptop screen"},
    ],
    "Data Recovery": [
        {"label": "OS Installation", "confidence": 0.6, "reason": "OS installation may require data backup"},
        {"label": "SSD Upgrade", "confidence": 0.45, "reason": "SSD upgrade may involve data transfer"},
        {"label": "Windows Boot Failure", "confidence": 0.4, "reason": "Boot failure may require data recovery"},
    ],
    "Phone Connection Issue": [
        {"label": "USB / Port Issue", "confidence": 0.85, "reason": "Phone connection uses USB ports"},
    ],
    "USB / Port Issue": [
        {"label": "Phone Connection Issue", "confidence": 0.85, "reason": "USB issues affect phone connections"},
    ],
    "Wi-Fi Adapter Upgrade": [
        {"label": "USB / Port Issue", "confidence": 0.5, "reason": "WiFi adapters often use USB"},
        {"label": "General Repair", "confidence": 0.4, "reason": "Network issues may need general repair"},
    ],
    "General Repair": [
        {"label": "Windows Boot Failure", "confidence": 0.5, "reason": "Common repair issue"},
        {"label": "PSU / Power Issue", "confidence": 0.5, "reason": "Common repair issue"},
        {"label": "Blue Screen (BSOD)", "confidence": 0.45, "reason": "Common repair issue"},
        {"label": "No Display / No Signal", "confidence": 0.45, "reason": "Common repair issue"},
    ],
    # New error types relationships
    "Motherboard Issue": [
        {"label": "PSU / Power Issue", "confidence": 0.7, "reason": "Motherboard issues can cause power problems"},
        {"label": "Windows Boot Failure", "confidence": 0.6, "reason": "Motherboard problems prevent booting"},
        {"label": "No Display / No Signal", "confidence": 0.5, "reason": "Motherboard issues can affect display"},
    ],
    "CPU Upgrade": [
        {"label": "Slow Performance", "confidence": 0.7, "reason": "CPU upgrade improves performance"},
        {"label": "RAM Upgrade", "confidence": 0.5, "reason": "Both improve system performance"},
        {"label": "SSD Upgrade", "confidence": 0.5, "reason": "Both improve system performance"},
    ],
    "HDD Upgrade": [
        {"label": "SSD Upgrade", "confidence": 0.8, "reason": "SSD is better upgrade than HDD"},
        {"label": "Slow Performance", "confidence": 0.6, "reason": "HDD upgrade improves performance"},
        {"label": "Data Recovery", "confidence": 0.4, "reason": "HDD upgrade may require data transfer"},
    ],
    "Fan / Cooling Issue": [
        {"label": "CPU Overheat", "confidence": 0.9, "reason": "Cooling issues cause overheating"},
        {"label": "GPU Overheat", "confidence": 0.8, "reason": "Cooling problems affect GPU"},
        {"label": "Thermal Paste Reapply", "confidence": 0.7, "reason": "Both relate to cooling"},
    ],
    "Thermal Paste Reapply": [
        {"label": "CPU Overheat", "confidence": 0.9, "reason": "Thermal paste fixes CPU overheating"},
        {"label": "Fan / Cooling Issue", "confidence": 0.7, "reason": "Both relate to cooling"},
        {"label": "GPU Overheat", "confidence": 0.6, "reason": "Thermal paste can help GPU cooling"},
    ],
    "Battery Replacement": [
        {"label": "PSU / Power Issue", "confidence": 0.7, "reason": "Battery issues affect power"},
        {"label": "Charging Port Issue", "confidence": 0.6, "reason": "Both relate to laptop power"},
        {"label": "Laptop Screen Repair", "confidence": 0.3, "reason": "Both are laptop-specific"},
    ],
    "Charging Port Issue": [
        {"label": "Battery Replacement", "confidence": 0.7, "reason": "Charging port issues affect battery"},
        {"label": "PSU / Power Issue", "confidence": 0.6, "reason": "Both relate to power"},
        {"label": "USB / Port Issue", "confidence": 0.5, "reason": "Both are port-related"},
    ],
    "Display Cable Issue": [
        {"label": "No Display / No Signal", "confidence": 0.9, "reason": "Cable issues cause no display"},
        {"label": "Monitor Issue", "confidence": 0.6, "reason": "Both affect display"},
        {"label": "GPU Upgrade", "confidence": 0.4, "reason": "GPU issues can cause display problems"},
    ],
    "BIOS Issue": [
        {"label": "Windows Boot Failure", "confidence": 0.8, "reason": "BIOS issues prevent booting"},
        {"label": "Boot Device Error", "confidence": 0.7, "reason": "BIOS controls boot device"},
        {"label": "Motherboard Issue", "confidence": 0.6, "reason": "BIOS is on motherboard"},
    ],
    "Boot Device Error": [
        {"label": "Windows Boot Failure", "confidence": 0.8, "reason": "Boot device errors prevent booting"},
        {"label": "SSD Upgrade", "confidence": 0.6, "reason": "Boot device can be SSD/HDD"},
        {"label": "BIOS Issue", "confidence": 0.6, "reason": "BIOS controls boot device"},
    ],
    "System Freeze": [
        {"label": "Slow Performance", "confidence": 0.7, "reason": "Freezing is extreme slowness"},
        {"label": "RAM Upgrade", "confidence": 0.6, "reason": "RAM issues cause freezing"},
        {"label": "CPU Overheat", "confidence": 0.5, "reason": "Overheating can cause freezing"},
    ],
    "Application Crash": [
        {"label": "Driver Issue", "confidence": 0.6, "reason": "Driver problems cause crashes"},
        {"label": "RAM Upgrade", "confidence": 0.5, "reason": "RAM issues cause crashes"},
        {"label": "Software Conflict", "confidence": 0.7, "reason": "Software conflicts cause crashes"},
    ],
    "Software Conflict": [
        {"label": "Application Crash", "confidence": 0.8, "reason": "Conflicts cause crashes"},
        {"label": "System Freeze", "confidence": 0.6, "reason": "Conflicts can freeze system"},
        {"label": "OS Reinstall / Corrupted", "confidence": 0.5, "reason": "OS reinstall fixes conflicts"},
    ],
    "Windows Update Issue": [
        {"label": "Windows Boot Failure", "confidence": 0.6, "reason": "Update issues can prevent booting"},
        {"label": "OS Reinstall / Corrupted", "confidence": 0.5, "reason": "Update problems may need OS reinstall"},
        {"label": "Driver Issue", "confidence": 0.4, "reason": "Updates can cause driver issues"},
    ],
    "Ethernet Issue": [
        {"label": "Wi-Fi Adapter Upgrade", "confidence": 0.6, "reason": "Both are network issues"},
        {"label": "Network Cable Issue", "confidence": 0.8, "reason": "Ethernet uses network cable"},
        {"label": "Driver Issue", "confidence": 0.5, "reason": "Ethernet drivers may be the problem"},
    ],
    "Network Cable Issue": [
        {"label": "Ethernet Issue", "confidence": 0.9, "reason": "Cable issues cause Ethernet problems"},
        {"label": "Wi-Fi Adapter Upgrade", "confidence": 0.4, "reason": "Both are network issues"},
    ],
    "Bluetooth Issue": [
        {"label": "Driver Issue", "confidence": 0.7, "reason": "Bluetooth issues often driver-related"},
        {"label": "USB / Port Issue", "confidence": 0.4, "reason": "Bluetooth adapters use USB"},
        {"label": "Wi-Fi Adapter Upgrade", "confidence": 0.3, "reason": "Both are wireless connectivity"},
    ],
    "Keyboard Issue": [
        {"label": "USB / Port Issue", "confidence": 0.6, "reason": "Keyboards often use USB"},
        {"label": "Driver Issue", "confidence": 0.5, "reason": "Keyboard drivers may be the problem"},
        {"label": "General Repair", "confidence": 0.4, "reason": "Keyboard may need physical repair"},
    ],
    "Mouse Issue": [
        {"label": "USB / Port Issue", "confidence": 0.6, "reason": "Mice often use USB"},
        {"label": "Driver Issue", "confidence": 0.5, "reason": "Mouse drivers may be the problem"},
        {"label": "General Repair", "confidence": 0.4, "reason": "Mouse may need physical repair"},
    ],
    "Audio Issue": [
        {"label": "Driver Issue", "confidence": 0.8, "reason": "Audio issues often driver-related"},
        {"label": "Speaker Issue", "confidence": 0.7, "reason": "Both relate to audio output"},
        {"label": "Microphone Issue", "confidence": 0.6, "reason": "Both relate to audio"},
    ],
    "Speaker Issue": [
        {"label": "Audio Issue", "confidence": 0.8, "reason": "Speaker issues cause audio problems"},
        {"label": "Driver Issue", "confidence": 0.6, "reason": "Audio drivers may be the problem"},
    ],
    "Microphone Issue": [
        {"label": "Audio Issue", "confidence": 0.8, "reason": "Microphone issues cause audio problems"},
        {"label": "Driver Issue", "confidence": 0.7, "reason": "Microphone drivers may be the problem"},
        {"label": "Webcam Issue", "confidence": 0.5, "reason": "Both are input devices"},
    ],
    "Webcam Issue": [
        {"label": "Driver Issue", "confidence": 0.8, "reason": "Webcam issues often driver-related"},
        {"label": "USB / Port Issue", "confidence": 0.6, "reason": "Webcams often use USB"},
        {"label": "Microphone Issue", "confidence": 0.5, "reason": "Both are input devices"},
    ],
    "Printer Issue": [
        {"label": "Driver Issue", "confidence": 0.8, "reason": "Printer issues often driver-related"},
        {"label": "USB / Port Issue", "confidence": 0.6, "reason": "Printers often use USB"},
        {"label": "Network Cable Issue", "confidence": 0.4, "reason": "Network printers use cables"},
    ],
    "Touchpad Issue": [
        {"label": "Driver Issue", "confidence": 0.8, "reason": "Touchpad issues often driver-related"},
        {"label": "Mouse Issue", "confidence": 0.6, "reason": "Both are pointing devices"},
        {"label": "Laptop Screen Repair", "confidence": 0.3, "reason": "Both are laptop-specific"},
    ],
    "File Corruption": [
        {"label": "Data Recovery", "confidence": 0.8, "reason": "Corrupted files need recovery"},
        {"label": "SSD Upgrade", "confidence": 0.5, "reason": "Storage issues can cause corruption"},
        {"label": "Partition Issue", "confidence": 0.6, "reason": "Partition problems cause corruption"},
    ],
    "Partition Issue": [
        {"label": "Windows Boot Failure", "confidence": 0.7, "reason": "Partition issues prevent booting"},
        {"label": "File Corruption", "confidence": 0.6, "reason": "Partition problems cause corruption"},
        {"label": "Data Recovery", "confidence": 0.5, "reason": "Partition issues may need data recovery"},
    ],
    "Device Not Recognized": [
        {"label": "USB / Port Issue", "confidence": 0.8, "reason": "USB devices not recognized"},
        {"label": "Driver Issue", "confidence": 0.7, "reason": "Driver issues prevent recognition"},
        {"label": "Phone Connection Issue", "confidence": 0.6, "reason": "Phones often not recognized"},
    ],
    "Hardware Diagnostic": [
        {"label": "General Repair", "confidence": 0.8, "reason": "Diagnostic leads to repair"},
        {"label": "Motherboard Issue", "confidence": 0.5, "reason": "Diagnostic may find motherboard issues"},
        {"label": "PSU / Power Issue", "confidence": 0.5, "reason": "Diagnostic may find power issues"},
    ],
    "System Optimization": [
        {"label": "Slow Performance", "confidence": 0.8, "reason": "Optimization improves performance"},
        {"label": "Virus / Malware", "confidence": 0.5, "reason": "Optimization removes malware"},
        {"label": "SSD Upgrade", "confidence": 0.4, "reason": "SSD upgrade is optimization"},
    ],
}


def get_similar_errors(detected_error: Optional[str], confidence: float = 0.0) -> List[Dict[str, Any]]:
    """
    Get similar/related errors based on detected error type.
    
    Args:
        detected_error: The detected error type label
        confidence: Confidence of the detection
    
    Returns:
        List of similar errors with confidence and reason
    """
    if not detected_error:
        return []
    
    # Get similar errors from relationships
    similar = ERROR_RELATIONSHIPS.get(detected_error, [])
    
    # Filter by minimum confidence if original detection was low confidence
    if confidence < 0.5:
        # Include all similar errors if detection was uncertain
        return similar[:5]  # Return top 5 similar errors
    
    # For high confidence, return top 3 similar errors
    return similar[:3]


def get_error_explanation(error_type: str) -> Optional[str]:
    """
    Get human-readable explanation for an error type.
    """
    explanations = {
        # Hardware Issues
        "GPU Overheat": "Your graphics card is overheating, likely during gaming or intensive tasks. This can cause crashes, shutdowns, or performance issues.",
        "CPU Overheat": "Your processor is running too hot. This can cause system instability, crashes, or automatic shutdowns.",
        "PSU / Power Issue": "Your power supply unit may be failing or insufficient. This can cause random shutdowns, boot failures, or system instability.",
        "Motherboard Issue": "Your motherboard may have hardware problems, damaged components, or connection issues. This can cause various system failures.",
        "CPU Upgrade": "Upgrading your processor will improve overall system performance, multitasking, and application speed.",
        "GPU Upgrade": "Upgrading your graphics card will improve gaming performance, video editing, and graphics-intensive applications.",
        "RAM Upgrade": "Adding more RAM will help with multitasking, reduce slowdowns, and improve performance when running multiple applications.",
        "SSD Upgrade": "Upgrading to an SSD will significantly improve boot times, application loading, and overall system responsiveness.",
        "HDD Upgrade": "Upgrading or replacing your hard drive will provide more storage space and better reliability.",
        "Fan / Cooling Issue": "Your cooling system (fans, heatsinks) may be failing or insufficient. This can cause overheating and system instability.",
        "Thermal Paste Reapply": "Thermal paste between CPU/GPU and heatsink may be dried out or insufficient. Reapplying can fix overheating issues.",
        "Battery Replacement": "Your laptop battery may be dead, not holding charge, or swelling. Replacement is needed for portable use.",
        "Charging Port Issue": "Your laptop charging port may be damaged, loose, or not working. This prevents the laptop from charging.",
        
        # Display Issues
        "Monitor Issue": "Your monitor may have hardware problems, display issues, or connection problems.",
        "No Display / No Signal": "Your monitor is not receiving a signal from your computer. This can be due to cable issues, GPU problems, or monitor failure.",
        "Laptop Screen Repair": "Your laptop screen may be cracked, damaged, or not displaying properly. This requires professional repair or replacement.",
        "Display Cable Issue": "Your display cable (HDMI, VGA, DisplayPort) may be damaged or loose. This can cause no signal or display problems.",
        
        # System Issues
        "Blue Screen (BSOD)": "Windows encountered a critical error and had to stop. This is often caused by hardware issues, driver problems, or system corruption.",
        "Windows Boot Failure": "Your computer cannot start Windows properly. This can be due to corrupted system files, hardware issues, or boot configuration problems.",
        "OS Reinstall / Corrupted": "Reinstalling Windows can fix system corruption, driver issues, or persistent errors.",
        "BIOS Issue": "Your BIOS/UEFI firmware may be corrupted, outdated, or misconfigured. This can prevent booting or cause hardware detection issues.",
        "Boot Device Error": "Your computer cannot find a bootable device. This can be due to disk failure, incorrect boot order, or missing OS.",
        
        # Performance Issues
        "Slow Performance": "Your computer is running slower than expected. This can be due to hardware limitations, software issues, or malware.",
        "System Freeze": "Your computer freezes or becomes unresponsive. This can be due to hardware issues, driver problems, or software conflicts.",
        "Application Crash": "Applications are crashing unexpectedly. This can be due to software bugs, memory issues, or compatibility problems.",
        
        # Software Issues
        "Virus / Malware": "Your computer may be infected with malware or viruses. This can cause slow performance, crashes, or data loss.",
        "Driver Issue": "Hardware drivers may be outdated, corrupted, or incompatible. This can cause crashes, display problems, or device failures.",
        "Software Conflict": "Software programs are conflicting with each other. This can cause crashes, freezes, or system instability.",
        "Windows Update Issue": "Windows updates are failing, causing errors, or causing system problems. This may require update troubleshooting or rollback.",
        
        # Network Issues
        "Wi-Fi Adapter Upgrade": "Upgrading your WiFi adapter will improve internet speed, range, and connection stability.",
        "Ethernet Issue": "Your Ethernet connection is not working. This can be due to cable problems, port issues, or network adapter failure.",
        "Network Cable Issue": "Your network cable may be damaged or not properly connected. This prevents internet connectivity.",
        "Bluetooth Issue": "Bluetooth is not working or devices are not connecting. This can be due to driver issues, hardware problems, or interference.",
        
        # Peripheral Issues
        "Keyboard Issue": "Your keyboard is not working, keys are stuck, or typing incorrectly. This can be due to hardware damage or connection issues.",
        "Mouse Issue": "Your mouse is not working, cursor is jumping, or buttons are not responding. This can be due to hardware or driver issues.",
        "USB / Port Issue": "USB ports or devices are not working properly. This can affect device connections, data transfer, or charging.",
        "Audio Issue": "Audio is not working, sound is distorted, or speakers are not detected. This can be due to driver or hardware issues.",
        "Speaker Issue": "Your speakers are not working, producing no sound, or sound quality is poor. This may require speaker replacement or repair.",
        "Microphone Issue": "Your microphone is not working, not being detected, or producing poor quality audio. This can be due to driver or hardware issues.",
        "Webcam Issue": "Your webcam is not working, not being detected, or producing poor quality video. This can be due to driver or hardware issues.",
        "Printer Issue": "Your printer is not working, not connecting, or producing print errors. This can be due to driver, connection, or hardware issues.",
        "Touchpad Issue": "Your laptop touchpad is not working, cursor is jumping, or gestures are not responding. This can be due to driver or hardware issues.",
        
        # Data & Recovery
        "Data Recovery": "You need to recover lost, deleted, or corrupted files. This requires specialized tools and expertise.",
        "File Corruption": "Your files are corrupted and cannot be opened. This can be due to disk errors, software issues, or incomplete transfers.",
        "Partition Issue": "Your disk partitions are corrupted, missing, or inaccessible. This can prevent booting or accessing data.",
        
        # Phone/Device Issues
        "Phone Connection Issue": "Your phone is not connecting to your computer properly. This can be due to USB issues, driver problems, or phone settings.",
        "Device Not Recognized": "Your device is not being recognized by the computer. This can be due to driver issues, USB problems, or device failure.",
        
        # General
        "General Repair": "Your computer needs general repair services. A technician can diagnose and fix the specific issue.",
        "Hardware Diagnostic": "You need a comprehensive hardware diagnostic to identify the root cause of system problems.",
        "System Optimization": "Your system needs optimization to improve performance, remove bloatware, and fix registry issues.",
    }
    
    return explanations.get(error_type)


