#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re

with open('add_new_errors.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace arrow characters
content = content.replace('→', '->')
content = content.replace(chr(0x2192), '->')

# Fix all contractions and possessives in the NEW entries (lines after NEW167)
# Common contractions
replacements = {
    "won't": "will not",
    "Didn't": "Did not", 
    "didn't": "did not",
    "You'll": "You will",
    "you'll": "you will",
    "monitor's": "monitor",
    "GPU's": "GPU",
    "manufacturer's": "manufacturer",
    "PC's": "PC",
    "Windows's": "Windows",
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Also fix any remaining possessives with regex (only in string content, not in code)
# This is safer - only replace in step content
lines = content.split('\n')
new_lines = []
for line in lines:
    if "'step_" in line or "'verification'" in line or "'symptoms'" in line or "'cause'" in line:
        # Replace possessives in these specific fields
        line = re.sub(r"(\w+)'s\s+", r'\1 ', line)
    new_lines.append(line)

content = '\n'.join(new_lines)

with open('add_new_errors.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed arrow characters and apostrophes")
