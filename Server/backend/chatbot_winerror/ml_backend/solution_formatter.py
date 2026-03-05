"""
Solution formatter to create structured step-by-step solutions
with titles and sub-steps
"""
import re
import pandas as pd

def format_solution_steps(step_1, step_2, step_3, step_4, step_5, error_name, category):
    """
    Format solution steps into structured format with titles and sub-steps
    """
    steps = []
    raw_steps = [step_1, step_2, step_3, step_4, step_5]
    # Filter out NaN, None, empty strings, and 'nan' strings
    valid_steps = []
    for s in raw_steps:
        if s is None:
            continue
        if isinstance(s, float) and pd.isna(s):
            continue
        s_str = str(s).strip()
        if not s_str or s_str.lower() == 'nan':
            continue
        valid_steps.append(s_str)
    
    if not valid_steps:
        return []
    
    raw_steps = valid_steps
    
    # Safely get error_name and category
    error_name_str = str(error_name) if error_name is not None and not (isinstance(error_name, float) and pd.isna(error_name)) else ''
    category_str = str(category) if category is not None and not (isinstance(category, float) and pd.isna(category)) else ''
    
    # Define step titles based on error category and type
    step_titles = get_step_titles(error_name_str, category_str, len(raw_steps))
    
    # Format each step
    for i, (title, content) in enumerate(zip(step_titles, raw_steps)):
        if not content or not str(content).strip():
            continue
            
        formatted_step = format_single_step(i + 1, title, content)
        if formatted_step:
            steps.append(formatted_step)
    
    return steps

def get_step_titles(error_name, category, num_steps):
    """Get appropriate step titles based on error type"""
    error_lower = error_name.lower()
    category_lower = category.lower()
    
    if 'boot' in error_lower or 'startup' in category_lower or 'black screen' in error_lower:
        titles = [
            "Basic Checks (Very Important)",
            "Check If Windows Is Actually Booting",
            "Try Safe Mode",
            "External Devices & RAM",
            "BIOS / Display Output"
        ]
    elif 'display' in category_lower or 'graphics' in category_lower or 'resolution' in error_lower:
        titles = [
            "Check Monitor & Cables",
            "Test Display Output",
            "Update Graphics Drivers",
            "BIOS Display Settings",
            "Hardware Testing"
        ]
    elif 'audio' in category_lower or 'sound' in error_lower or 'microphone' in error_lower:
        titles = [
            "Check Audio Settings",
            "Restart Audio Services",
            "Update Audio Drivers",
            "Test Hardware",
            "Advanced Troubleshooting"
        ]
    elif 'network' in category_lower or 'internet' in category_lower or 'connection' in error_lower:
        titles = [
            "Basic Network Checks",
            "Reset Network Settings",
            "Check Drivers",
            "Router/Modem Troubleshooting",
            "Advanced Network Configuration"
        ]
    elif 'storage' in category_lower or 'disk' in category_lower or 'drive' in error_lower:
        titles = [
            "Backup Important Data",
            "Check Disk Health",
            "Run Disk Repair Tools",
            "Check File System",
            "Hardware Replacement"
        ]
    elif 'performance' in category_lower or 'slow' in error_lower or 'cpu' in error_lower:
        titles = [
            "Identify Resource Usage",
            "Clean Up System",
            "Check for Overheating",
            "Hardware Upgrade Options",
            "Malware Scan"
        ]
    elif 'driver' in category_lower or 'device' in error_lower:
        titles = [
            "Check Device Manager",
            "Update Drivers",
            "Rollback Drivers",
            "Reinstall Drivers",
            "Hardware Testing"
        ]
    elif 'update' in category_lower or 'windows update' in error_lower:
        titles = [
            "Run Update Troubleshooter",
            "Clear Update Cache",
            "Run System File Checker",
            "Manual Update Installation",
            "Repair/Upgrade Windows"
        ]
    elif 'bsod' in category_lower or 'blue screen' in error_lower:
        titles = [
            "Note Error Details",
            "Boot into Safe Mode",
            "Run Memory & Disk Tests",
            "Update/Rollback Drivers",
            "Collect Diagnostic Data"
        ]
    elif 'hardware' in category_lower:
        titles = [
            "Check Physical Connections",
            "Check Event Logs",
            "Monitor Temperatures",
            "Test Components",
            "Replace Failing Hardware"
        ]
    else:
        titles = [
            "Initial Troubleshooting",
            "System Diagnostics",
            "Driver/Software Updates",
            "Advanced Solutions",
            "Final Verification"
        ]
    
    return titles[:num_steps]

def format_single_step(step_num, title, content):
    """Format a single step with title and sub-steps"""
    content = str(content).strip()
    
    if re.search(r'^\d+[\.\)]\s', content, re.MULTILINE):
        sub_steps = parse_numbered_items(content)
    else:
        sub_steps = split_into_substeps(content)
    
    # if the default title is generic and the first sub-step is an explicit option
    # treat that sub-step as the new title (remove it from the list)
    if title.lower().startswith("initial troubleshooting") and sub_steps:
        first = sub_steps[0]
        if "option" in first.lower() or first.strip().startswith('✅') or first.strip().startswith('✔️'):
            title = first
            sub_steps = sub_steps[1:]

    formatted = f"Step {step_num}: {title}\n\n"

    for i, sub_step in enumerate(sub_steps, 1):
        formatted += f"{i}. {sub_step}\n"

    return formatted.strip()

def parse_numbered_items(text):
    """Parse already numbered items from text"""
    items = []
    pattern = r'(\d+)[\.\)]\s*([^\n]+)'
    matches = re.findall(pattern, text)
    
    if matches:
        for _, item in matches:
            items.append(item.strip())
    else:
        items = split_into_substeps(text)
    
    return items

def split_into_substeps(text):
    """Split text into logical sub-steps"""
    separators = ['\n', ';', '→', '→', '•', '·']
    
    for sep in separators:
        if sep in text:
            parts = [p.strip() for p in text.split(sep) if p.strip()]
            if len(parts) > 1:
                return parts
    
    sentences = re.split(r'[.!?]\s+', text)
    if len(sentences) > 1:
        return [s.strip() for s in sentences if s.strip()]
    
    return [text]





























