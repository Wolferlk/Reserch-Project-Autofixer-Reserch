import os
import re

# 🔹 CHANGE THIS to your softwares folder path
SOFTWARES_PATH = r"../../data/softwares"  

def standardize_name(name):
    # Convert to lowercase
    name = name.lower()
    
    # Replace spaces with underscore
    name = name.replace(" ", "_")
    
    # Remove invalid characters (keep letters, numbers, underscore)
    name = re.sub(r'[^a-z0-9_]', '', name)
    
    return name

def rename_folders():
    for item in os.listdir(SOFTWARES_PATH):
        old_path = os.path.join(SOFTWARES_PATH, item)
        
        if os.path.isdir(old_path):
            new_name = standardize_name(item)
            new_path = os.path.join(SOFTWARES_PATH, new_name)
            
            if old_path != new_path:
                # Avoid overwrite
                if not os.path.exists(new_path):
                    os.rename(old_path, new_path)
                    print(f"Renamed: {item} → {new_name}")
                else:
                    print(f"Skipped (already exists): {new_name}")

    print("\n✅ Done!")

if __name__ == "__main__":
    rename_folders()