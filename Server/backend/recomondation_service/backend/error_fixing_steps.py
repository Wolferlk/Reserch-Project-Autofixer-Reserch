"""
Fixing and troubleshooting steps for error types.
Provides step-by-step guidance to fix common PC issues.
"""

ERROR_FIXING_STEPS = {
    "No Display / No Signal": [
        "Check monitor power cable is connected and monitor is turned on",
        "Verify display cable (HDMI/DisplayPort/VGA) is properly connected to both PC and monitor",
        "Try a different display cable if available",
        "Check if monitor input source is set correctly (HDMI1, HDMI2, VGA, etc.)",
        "Reseat GPU in PCIe slot (if using dedicated GPU)",
        "Try connecting to a different monitor or TV to test",
        "Check if GPU fans are spinning (if using dedicated GPU)",
        "Test with integrated graphics if available (remove dedicated GPU temporarily)",
        "Check GPU power cables are connected (if using dedicated GPU)",
        "If fans spin but no display, likely GPU or monitor issue - professional diagnosis needed"
    ],
    
    "Monitor Issue": [
        "Adjust monitor brightness and contrast settings",
        "Check monitor cables for damage or loose connections",
        "Try a different cable (HDMI, DisplayPort, VGA)",
        "Update graphics drivers from manufacturer website",
        "Check monitor resolution settings in Windows Display Settings",
        "Test monitor on another PC to isolate the issue",
        "Check for physical damage to monitor screen",
        "Reset monitor to factory settings (check monitor menu)",
        "If lines/flickering persists, monitor may need repair or replacement"
    ],
    
    "PSU / Power Issue": [
        "Check power cable is firmly connected to PC and wall outlet",
        "Try a different power outlet or power cable",
        "Check if PSU switch on back of PC is turned on",
        "Listen for any clicking or buzzing sounds from PSU",
        "Check if PSU fan is spinning when PC is on",
        "Test with a known working PSU if available",
        "Check PSU wattage - should be 20-30% more than total system power",
        "Inspect PSU for any burnt smell or visible damage",
        "If PC won't turn on at all, PSU is likely the issue - replacement needed"
    ],
    
    "Windows Boot Failure": [
        "Try booting into Safe Mode (press F8 or Shift+F8 during startup)",
        "Run Windows Startup Repair from recovery options",
        "Check if boot device is set correctly in BIOS/UEFI",
        "Disconnect all USB devices except keyboard and mouse",
        "Run System File Checker: Open Command Prompt as admin, run 'sfc /scannow'",
        "Check disk for errors: Open Command Prompt as admin, run 'chkdsk C: /f'",
        "If stuck on boot screen, try Last Known Good Configuration",
        "Check if Windows updates are causing the issue - try System Restore",
        "If all else fails, may need OS reinstall or professional repair"
    ],
    
    "Monitor or GPU Check": [
        "Check monitor power and all connection cables",
        "Try a different monitor or cable to test",
        "Reseat GPU in PCIe slot (power off PC first)",
        "Check if GPU fans are spinning",
        "Try connecting to different GPU port (if multiple available)",
        "Check monitor input source settings",
        "Test with integrated graphics if available",
        "Update graphics drivers from manufacturer website",
        "If monitor works on another PC, likely GPU issue - professional diagnosis needed"
    ],
    
    "Blue Screen (BSOD)": [
        "Note the error code shown on blue screen",
        "Boot into Safe Mode to access Windows",
        "Update all drivers, especially graphics and chipset drivers",
        "Run Windows Memory Diagnostic (search in Start menu)",
        "Check for overheating - clean fans and check temperatures",
        "Run System File Checker: Open Command Prompt as admin, run 'sfc /scannow'",
        "Check disk for errors: Open Command Prompt as admin, run 'chkdsk C: /f'",
        "Uninstall recently installed software or drivers",
        "Check Windows Event Viewer for error details",
        "If BSOD persists, may need professional diagnosis"
    ],
    
    "Slow Performance": [
        "Open Task Manager (Ctrl+Shift+Esc) and check CPU, RAM, and Disk usage",
        "Close unnecessary programs and browser tabs",
        "Disable unnecessary startup programs (Task Manager > Startup tab)",
        "Run Disk Cleanup to free up space",
        "Check for malware with Windows Defender or antivirus",
        "Update Windows and all drivers",
        "Check disk health with CrystalDiskInfo or similar tool",
        "If RAM usage is consistently high (>80%), consider RAM upgrade",
        "If disk usage is high, consider SSD upgrade"
    ],
    
    "GPU Overheat": [
        "Check GPU temperature using MSI Afterburner or GPU-Z",
        "Clean GPU fans and heatsink from dust",
        "Improve case airflow - add more case fans if needed",
        "Check if GPU fans are spinning properly",
        "Lower graphics settings in games to reduce load",
        "Ensure PC case has adequate ventilation",
        "If temperature exceeds 83°C, GPU cooling upgrade may be needed",
        "Consider replacing thermal paste on GPU (advanced users only)"
    ],
    
    "CPU Overheat": [
        "Check CPU temperature in BIOS or using Core Temp",
        "Clean CPU cooler and case fans from dust",
        "Reapply thermal paste (replace every 2-3 years)",
        "Check if CPU cooler is properly mounted",
        "Improve case airflow - add more case fans",
        "Check if CPU cooler fan is spinning",
        "If temperature exceeds 85°C under load, cooler upgrade is needed",
        "Consider upgrading to better CPU cooler"
    ],
    
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
        "Check disk health with CrystalDiskInfo or similar tool",
        "If boot time is over 1 minute, SSD upgrade is highly recommended",
        "If using HDD, upgrading to SSD will significantly improve performance"
    ],
    
    "Wi-Fi Adapter Upgrade": [
        "Check WiFi is enabled (Fn key + WiFi key on laptop)",
        "Update WiFi drivers from manufacturer website",
        "Restart router and modem",
        "Check WiFi signal strength (move closer to router)",
        "Forget and reconnect to WiFi network",
        "Check if other devices can connect to WiFi",
        "Run Windows Network Troubleshooter",
        "If WiFi keeps disconnecting, adapter upgrade may be needed"
    ],
    
    "Driver Issue": [
        "Open Device Manager (Win+X > Device Manager)",
        "Look for devices with yellow warning icons",
        "Right-click problematic device > Update driver",
        "Download drivers from manufacturer website (not Windows Update)",
        "Uninstall and reinstall problematic drivers",
        "Check Windows Update for driver updates",
        "If issue persists, try rolling back to previous driver version"
    ],
    
    "Virus / Malware": [
        "Run full scan with Windows Defender",
        "Use Malwarebytes for additional malware scan",
        "Boot into Safe Mode and run scans",
        "Check for suspicious programs in Task Manager",
        "Review installed programs in Settings > Apps",
        "Clear browser cache and cookies",
        "If system is severely infected, may need professional cleanup or OS reinstall"
    ],
    
    "OS Reinstall / Corrupted": [
        "Try System Restore to previous working state",
        "Run System File Checker: Open Command Prompt as admin, run 'sfc /scannow'",
        "Run DISM repair: Open Command Prompt as admin, run 'DISM /Online /Cleanup-Image /RestoreHealth'",
        "Try Windows Reset (Settings > Update & Security > Recovery)",
        "Backup important files before proceeding",
        "If all repair options fail, OS reinstall may be necessary",
        "Create Windows installation media before reinstalling"
    ],
    
    "BIOS Issue": [
        "Reset BIOS to default settings (usually F9 or Load Defaults option)",
        "Update BIOS to latest version from motherboard manufacturer",
        "Clear CMOS by removing CMOS battery for 5 minutes",
        "Check if boot device order is correct in BIOS",
        "Ensure BIOS settings match your hardware configuration",
        "If BIOS is corrupted, may need professional repair or motherboard replacement"
    ],
    
    "Boot Device Error": [
        "Check if boot device (SSD/HDD) is detected in BIOS",
        "Verify boot order in BIOS/UEFI settings",
        "Check SATA cables are properly connected",
        "Try booting from different drive if available",
        "Run Windows Startup Repair",
        "Check disk for errors: Open Command Prompt as admin, run 'chkdsk C: /f'",
        "If boot device not detected, drive may be failing - backup data immediately"
    ],
    
    "General Repair": [
        "Check all cables and connections",
        "Restart the computer",
        "Update Windows and all drivers",
        "Run Windows Troubleshooter",
        "Check for overheating issues",
        "Scan for malware and viruses",
        "Check Windows Event Viewer for error details",
        "If issue persists, professional diagnosis may be needed"
    ],
}

def get_fixing_steps(error_type: str) -> list:
    """
    Get fixing steps for an error type.
    
    Args:
        error_type: The error type label
    
    Returns:
        List of fixing step strings, or empty list if not found
    """
    return ERROR_FIXING_STEPS.get(error_type, [])

