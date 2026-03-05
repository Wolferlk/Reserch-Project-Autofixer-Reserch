import os
import shutil
import random
from pathlib import Path
import pandas as pd
from PIL import Image

RAW_DIR = Path("data/images")
OUT_DIR = Path("data/classifier")
REPORT_DIR = Path("Reports/classifier")

IMG_SIZE = (224, 224)
SPLIT = {"train": 0.7, "val": 0.15, "test": 0.15}
MIN_IMAGES_PER_CLASS = 3
VALID_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

random.seed(42)


def _safe_split_counts(n: int):
    if n < 3:
        raise ValueError("Need at least 3 images per class for train/val/test split.")

    n_train = int(n * SPLIT["train"])
    n_val = int(n * SPLIT["val"])
    n_test = n - n_train - n_val

    n_train = max(1, n_train)
    n_val = max(1, n_val)
    n_test = max(1, n_test)

    while (n_train + n_val + n_test) > n:
        if n_train >= n_val and n_train >= n_test and n_train > 1:
            n_train -= 1
        elif n_val >= n_test and n_val > 1:
            n_val -= 1
        elif n_test > 1:
            n_test -= 1
        else:
            break

    while (n_train + n_val + n_test) < n:
        n_train += 1

    return n_train, n_val, n_test


def prepare_dataset():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)

    records = []

    for category in RAW_DIR.iterdir():
        if not category.is_dir() or category.name.startswith("."):
            continue

        images = [
            p for p in category.glob("*.*")
            if p.is_file() and p.suffix.lower() in VALID_IMAGE_EXTS
        ]
        if len(images) < MIN_IMAGES_PER_CLASS:
            print(f"Skipped class {category.name}: only {len(images)} images")
            continue

        random.shuffle(images)

        n = len(images)
        n_train, n_val, n_test = _safe_split_counts(n)
        train_end = n_train
        val_end = train_end + n_val

        splits = {
            "train": images[:train_end],
            "val": images[train_end:val_end],
            "test": images[val_end:val_end + n_test]
        }

        for split, files in splits.items():
            target_dir = OUT_DIR / split / category.name
            target_dir.mkdir(parents=True, exist_ok=True)

            for img_path in files:
                try:
                    img = Image.open(img_path).convert("RGB")
                    img = img.resize(IMG_SIZE)
                    save_path = target_dir / img_path.name
                    img.save(save_path)

                    records.append({
                        "image": str(save_path),
                        "label": category.name,
                        "split": split
                    })
                except Exception as e:
                    print(f"Skipped {img_path}: {e}")

    df = pd.DataFrame(records)
    if df.empty:
        raise RuntimeError("No valid dataset samples were created.")

    df.to_csv(REPORT_DIR / "dataset_report.csv", index=False)

    print("Dataset prepared successfully")
    print(df["split"].value_counts())
    print(df["label"].value_counts())

if __name__ == "__main__":
    prepare_dataset()
