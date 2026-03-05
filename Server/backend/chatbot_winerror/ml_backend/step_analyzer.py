"""
Analyze solution steps to determine difficulty levels and extract commands
"""
import re

def get_step_difficulty(step_text: str, step_num: int) -> str:
    """
    Determine step difficulty: easy, medium, or advanced
    """
    step_lower = step_text.lower()
    
    # Advanced indicators
    advanced_keywords = [
        'command prompt', 'cmd', 'powershell', 'registry', 'bios', 'uefi',
        'chkdsk', 'sfc', 'dism', 'netsh', 'bootrec', 'bcdedit', 'regedit',
        'device manager', 'system files', 'reinstall', 'format', 'partition',
        'hardware replacement', 'replace', 'swap', 'thermal', 'smart'
    ]
    
    # Medium indicators
    medium_keywords = [
        'update', 'driver', 'settings', 'troubleshooter', 'recovery',
        'safe mode', 'restart services', 'uninstall', 'reinstall',
        'check', 'verify', 'test', 'monitor', 'temperature'
    ]
    
    # Easy indicators
    easy_keywords = [
        'restart', 'reboot', 'turn off', 'turn on', 'click', 'select',
        'choose', 'try', 'check cable', 'unplug', 'plug', 'disconnect',
        'connect', 'refresh', 'reload', 'close', 'open'
    ]
    
    # Check for advanced
    for keyword in advanced_keywords:
        if keyword in step_lower:
            return 'advanced'
    
    # Check for medium
    for keyword in medium_keywords:
        if keyword in step_lower:
            return 'medium'
    
    # Check for easy
    for keyword in easy_keywords:
        if keyword in step_lower:
            return 'easy'
    
    # Default based on step number
    if step_num <= 2:
        return 'easy'
    elif step_num <= 4:
        return 'medium'
    else:
        return 'advanced'

def extract_commands(step_text: str) -> list[str]:
    """
    Extract command-line commands from step text
    """
    commands = []
    
    # Patterns for common commands
    patterns = [
        r'chkdsk[^\s]*\s+[^\n]+',
        r'sfc\s+[^\n]+',
        r'dism\s+[^\n]+',
        r'netsh\s+[^\n]+',
        r'bootrec\s+[^\n]+',
        r'bcdedit\s+[^\n]+',
        r'ipconfig\s+[^\n]+',
        r'`([^`]+)`',  # Backtick commands
        r'run\s+([a-z]+\s+[^\n]+)',  # "run command" pattern
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, step_text, re.IGNORECASE)
        commands.extend(matches)
    
    # Clean and filter commands
    cleaned = []
    for cmd in commands:
        cmd = cmd.strip()
        if len(cmd) > 5 and any(c in cmd for c in ['/', '-', ' ', '\\']):
            cleaned.append(cmd)
    
    return cleaned[:3]  # Return max 3 commands

def get_risk_warning(step_text: str, difficulty: str, risk: str) -> str:
    """
    Generate risk warning for step
    """
    step_lower = step_text.lower()
    
    if 'format' in step_lower or 'delete' in step_lower or 'remove data' in step_lower:
        return "⚠️ WARNING: This step may delete data. Backup important files first."
    
    if 'registry' in step_lower or 'regedit' in step_lower:
        return "⚠️ WARNING: Modifying registry can damage your system. Follow instructions carefully."
    
    if 'bios' in step_lower or 'uefi' in step_lower:
        return "⚠️ WARNING: Incorrect BIOS settings can prevent booting. Only change if you're confident."
    
    if 'hardware' in step_lower or 'replace' in step_lower:
        return "⚠️ WARNING: Hardware changes require technical knowledge. Consider professional help."
    
    if difficulty == 'advanced' and risk == 'high':
        return "⚠️ CAUTION: This is an advanced step. Proceed carefully or seek help."
    
    if risk == 'high':
        return "⚠️ CAUTION: This step has high risk. Follow instructions exactly."
    
    return ""



























