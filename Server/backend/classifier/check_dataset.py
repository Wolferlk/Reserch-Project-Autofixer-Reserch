from pathlib import Path

BASE = Path("data/classifier")

VALID_EXT = {".jpg", ".jpeg", ".png"}

for split in ["train", "val", "test"]:
    print(f"\nChecking {split.upper()} set")
    for cls in (BASE / split).iterdir():
        if not cls.is_dir():
            continue

        images = [f for f in cls.iterdir() if f.suffix.lower() in VALID_EXT]

        if len(images) == 0:
            print(f"❌ EMPTY CLASS: {cls.name}")
        else:
            print(f"✅ {cls.name}: {len(images)} images")
