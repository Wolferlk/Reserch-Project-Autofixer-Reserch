from pathlib import Path
from typing import Iterable

import pandas as pd
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


class FilteredImageFolder(datasets.ImageFolder):
    def __init__(self, root, allowed_classes=None, transform=None):
        self.allowed_classes = set(allowed_classes) if allowed_classes else None
        super().__init__(root=root, transform=transform)

    def find_classes(self, directory):
        classes, _ = super().find_classes(directory)
        if self.allowed_classes is not None:
            classes = [c for c in classes if c in self.allowed_classes]

        if not classes:
            raise FileNotFoundError(f"No class folders found in {directory}")

        classes = sorted(classes)
        class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
        return classes, class_to_idx


def _non_empty_train_classes(train_dir: Path) -> list[str]:
    classes = []
    for class_dir in sorted(train_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        has_images = any(
            p.is_file() and p.suffix.lower() in IMAGE_EXTS
            for p in class_dir.rglob("*")
        )
        if has_images:
            classes.append(class_dir.name)
    return classes


def _build_transform(image_size: int = 224, train: bool = False):
    if train:
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def get_dataloaders(data_dir, batch_size=16, image_size=224, num_workers=0):
    data_dir = Path(data_dir)
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"
    test_dir = data_dir / "test"

    allowed_classes = _non_empty_train_classes(train_dir)
    if not allowed_classes:
        raise RuntimeError(f"No non-empty classes in {train_dir}")

    train_ds = FilteredImageFolder(
        train_dir,
        allowed_classes=allowed_classes,
        transform=_build_transform(image_size=image_size, train=True),
    )
    eval_transform = _build_transform(image_size=image_size, train=False)
    val_ds = FilteredImageFolder(
        val_dir,
        allowed_classes=allowed_classes,
        transform=eval_transform,
    )
    test_ds = FilteredImageFolder(
        test_dir,
        allowed_classes=allowed_classes,
        transform=eval_transform,
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    return train_loader, val_loader, test_loader, train_ds.classes


def dataset_summary(data_dir, classes: Iterable[str]) -> pd.DataFrame:
    data_dir = Path(data_dir)
    rows = []
    for split in ["train", "val", "test"]:
        split_dir = data_dir / split
        for cls in classes:
            cls_dir = split_dir / cls
            count = 0
            if cls_dir.exists():
                count = sum(
                    1
                    for p in cls_dir.rglob("*")
                    if p.is_file() and p.suffix.lower() in IMAGE_EXTS
                )
            rows.append({"split": split, "label": cls, "count": count})
    return pd.DataFrame(rows)
