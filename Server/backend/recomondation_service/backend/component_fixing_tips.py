"""
Fixing and troubleshooting tips for hardware components.
Provides step-by-step guidance before recommending an upgrade.
"""

COMPONENT_FIXING_TIPS = {
    "RAM Upgrade": [
        "Check current RAM usage in Task Manager (Ctrl+Shift+Esc)",
        "Close unnecessary programs and browser tabs",
        "Check if RAM slots are fully seated",
        "Run Windows Memory Diagnostic (search 'Windows Memory Diagnostic' in Start menu)",
        "Check for memory leaks in running programs",
        "Verify RAM compatibility with your motherboard",
        "If RAM usage is consistently above 80%, upgrade is recommended"
    ],
    
    "SSD Upgrade": [
        "Check disk usage in Task Manager (Disk tab)",
        "Run Disk Cleanup to free up space",
        "Disable unnecessary startup programs",
        "Check for disk errors: Open Command Prompt as admin, run 'chkdsk C: /f'",
        "Defragment HDD if using traditional hard drive (not needed for SSD)",
        "Check disk health with CrystalDiskInfo or similar tool",
        "If boot time is over 1 minute, SSD upgrade is highly recommended"
    ],
    
    "GPU Upgrade": [
        "Update graphics drivers from manufacturer website (NVIDIA/AMD/Intel)",
        "Check GPU temperature (should be under 80°C under load)",
        "Clean GPU fans and heatsink from dust",
        "Check if GPU is properly seated in PCIe slot",
        "Verify power supply can handle GPU requirements",
        "Check game settings - lower resolution/graphics may help",
        "Monitor GPU usage in Task Manager or MSI Afterburner",
        "If FPS is consistently low even on low settings, upgrade is needed"
    ],
    
    "PSU Upgrade": [
        "Check if power cable is properly connected",
        "Try a different power outlet",
        "Check PSU fan - if not spinning, PSU may be dead",
        "Listen for clicking or buzzing sounds from PSU",
        "Check PSU wattage - should be 20-30% more than total system power",
        "Test with a known working PSU if available",
        "If PC won't turn on at all, PSU is likely the issue"
    ],
    
    "CPU Upgrade": [
        "Check CPU usage in Task Manager",
        "Update CPU drivers and chipset drivers",
        "Check CPU temperature (should be under 70°C idle, 85°C under load)",
        "Clean CPU cooler and reapply thermal paste if overheating",
        "Check if CPU is bottlenecking (high CPU usage, low GPU usage in games)",
        "Verify CPU compatibility with motherboard socket",
        "If CPU is at 100% during normal tasks, upgrade is recommended"
    ],
    
    "WiFi Adapter Upgrade": [
        "Check WiFi is enabled (Fn key + WiFi key on laptop)",
        "Update WiFi drivers from manufacturer website",
        "Restart router and modem",
        "Check WiFi signal strength (move closer to router)",
        "Forget and reconnect to WiFi network",
        "Check if other devices can connect to WiFi",
        "Run Windows Network Troubleshooter",
        "If WiFi keeps disconnecting, adapter upgrade may be needed"
    ],
    
    "CPU Cooler Upgrade": [
        "Check CPU temperature in BIOS or using software like Core Temp",
        "Clean CPU cooler and case fans from dust",
        "Reapply thermal paste (replace every 2-3 years)",
        "Check if cooler is properly mounted",
        "Improve case airflow - add more case fans",
        "If CPU temperature exceeds 85°C under load, cooler upgrade is needed"
    ],
    
    "GPU Cooler Upgrade": [
        "Check GPU temperature using MSI Afterburner or GPU-Z",
        "Clean GPU fans and heatsink",
        "Improve case airflow",
        "Check if GPU fans are spinning",
        "If GPU temperature exceeds 83°C, cooling upgrade is recommended"
    ],
    
    "Monitor or GPU Check": [
        "Check monitor power and connection cables (HDMI/DisplayPort/VGA)",
        "Try a different monitor or cable",
        "Reseat GPU in PCIe slot",
        "Check if GPU fans are spinning",
        "Try connecting to different GPU port",
        "Check monitor input source settings",
        "Test with integrated graphics if available",
        "If fans spin but no display, GPU or monitor issue likely"
    ],
    
    "Thermal Paste Reapply": [
        "Power off PC and unplug",
        "Remove CPU cooler carefully",
        "Clean old thermal paste with isopropyl alcohol and lint-free cloth",
        "Apply pea-sized amount of new thermal paste to CPU center",
        "Reinstall cooler evenly (don't overtighten)",
        "Thermal paste should be replaced every 2-3 years"
    ],
    
    "Power Cable Replacement": [
        "Check cable for visible damage or fraying",
        "Try a different power cable",
        "Check cable connections at both ends",
        "Test cable with multimeter if available",
        "If cable is damaged or loose, replacement is needed"
    ],
    
    "Case Fan Upgrade": [
        "Check if fans are spinning",
        "Clean fans from dust buildup",
        "Check fan connections to motherboard",
        "Monitor system temperatures",
        "If system is overheating, add more case fans",
        "Ensure proper airflow (intake front, exhaust back/top)"
    ],
    
    "Laptop Battery Replacement": [
        "Check if battery is swollen (DO NOT USE if swollen - fire risk)",
        "Check battery health in Windows: Power & Sleep settings",
        "Calibrate battery: Fully charge, then fully discharge",
        "Check if laptop works when plugged in (if yes, battery issue)",
        "If battery doesn't hold charge, replacement is needed"
    ],
    
    "Bluetooth Adapter": [
        "Check if Bluetooth is enabled in Windows Settings",
        "Update Bluetooth drivers",
        "Restart Bluetooth service: Services > Bluetooth Support Service > Restart",
        "Remove and re-pair Bluetooth devices",
        "Check if Bluetooth adapter is enabled in Device Manager",
        "If Bluetooth doesn't work at all, adapter upgrade may be needed"
    ],
    
    "USB Hub": [
        "Check if USB ports work with other devices",
        "Try different USB ports",
        "Update USB drivers",
        "Check USB power management settings in Device Manager",
        "If you need more ports, USB hub is the solution"
    ],
    
    "Router Upgrade": [
        "Restart router and modem",
        "Check WiFi signal strength",
        "Update router firmware",
        "Change WiFi channel (use less crowded channel)",
        "Position router in central location",
        "If WiFi range is poor or speed is slow, router upgrade may help"
    ],
    
    "UPS Upgrade": [
        "Check if UPS battery is charged",
        "Test UPS by unplugging power",
        "Check UPS capacity matches your PC power needs",
        "If PC shuts down during power cuts, UPS is needed"
    ],
    
    "Webcam Upgrade": [
        "Check if webcam is enabled in Windows Privacy settings",
        "Update webcam drivers from manufacturer website",
        "Check if webcam works in other apps (Camera app, Zoom, etc.)",
        "Restart PC",
        "Check Device Manager for webcam errors",
        "Try unplugging and replugging external webcam",
        "Check if webcam is blocked by antivirus or firewall",
        "If webcam doesn't work after troubleshooting, upgrade is needed"
    ],
    
    "Microphone Upgrade": [
        "Check microphone privacy settings in Windows",
        "Test microphone in Windows Sound settings",
        "Update audio drivers",
        "Check microphone is set as default recording device",
        "Test microphone in different apps",
        "If microphone quality is poor, upgrade is recommended"
    ],
    
    "Keyboard Issue": [
        "Check if keyboard is properly connected",
        "Try different USB port",
        "Restart PC",
        "Check keyboard in Device Manager",
        "Test keyboard on another PC",
        "Clean keyboard from debris",
        "If keyboard doesn't work, replacement is needed"
    ],
    
    "Mouse Issue": [
        "Check if mouse is properly connected",
        "Try different USB port",
        "Clean mouse sensor",
        "Check mouse in Device Manager",
        "Test mouse on another PC",
        "If mouse doesn't work, replacement is needed"
    ],
    
    "Audio Issue": [
        "Check volume is not muted",
        "Check audio output device is selected correctly",
        "Update audio drivers",
        "Check audio cables are connected",
        "Test with headphones",
        "Run Windows Audio Troubleshooter",
        "If no sound after troubleshooting, audio device upgrade may be needed"
    ],
}

def get_fixing_tips(component: str) -> list:
    """
    Get fixing/troubleshooting tips for a component.
    
    Args:
        component: Component name (e.g., "RAM Upgrade")
    
    Returns:
        List of fixing tips, or empty list if not found
    """
    return COMPONENT_FIXING_TIPS.get(component, [])

