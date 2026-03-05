from pathlib import Path
import shutil

BASE = Path("data/classifier")
MIN_IMAGES = 10
VALID_EXT = {".jpg", ".jpeg", ".png"}

for split in ["train", "val", "test"]:
    for cls in (BASE / split).iterdir():
        if not cls.is_dir():
            continue

        images = [f for f in cls.iterdir() if f.suffix.lower() in VALID_EXT]

        if len(images) < MIN_IMAGES:
            print(f"🗑 Removing class '{cls.name}' from {split} (images={len(images)})")
            shutil.rmtree(cls)
