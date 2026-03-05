import argparse
import json
import random
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from torch.amp import GradScaler, autocast

try:
    from backend.classifier.model import ScreenshotCNN
    from backend.classifier.utils import dataset_summary, get_dataloaders
except ImportError:
    from model import ScreenshotCNN
    from utils import dataset_summary, get_dataloaders


def parse_args():
    parser = argparse.ArgumentParser(description="Train screenshot classifier")
    parser.add_argument("--data-dir", type=Path, default=Path("data/classifier"))
    parser.add_argument("--model-dir", type=Path, default=Path("models/classifier"))
    parser.add_argument("--report-dir", type=Path, default=Path("Reports/classifier"))
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=6)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-workers", type=int, default=0)
    return parser.parse_args()


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def accuracy_from_logits(logits, labels):
    preds = logits.argmax(dim=1)
    return (preds == labels).float().mean().item()


def evaluate_model(model, loader, device):
    model.eval()
    all_preds = []
    all_true = []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)
            logits = model(images)
            preds = logits.argmax(dim=1)

            all_preds.extend(preds.cpu().numpy().tolist())
            all_true.extend(labels.cpu().numpy().tolist())

    return np.array(all_true), np.array(all_preds)


def save_training_curves(history_df: pd.DataFrame, fig_dir: Path):
    plt.figure(figsize=(8, 5))
    plt.plot(history_df["epoch"], history_df["train_acc"], label="Train Accuracy")
    plt.plot(history_df["epoch"], history_df["val_acc"], label="Validation Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.title("Training vs Validation Accuracy")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(fig_dir / "accuracy_curve.png", dpi=180)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.plot(history_df["epoch"], history_df["train_loss"], label="Train Loss")
    plt.plot(history_df["epoch"], history_df["val_loss"], label="Validation Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Training vs Validation Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(fig_dir / "loss_curve.png", dpi=180)
    plt.close()


def save_confusion_matrix(cm: np.ndarray, classes: list[str], fig_dir: Path):
    plt.figure(figsize=(12, 10))
    plt.imshow(cm, interpolation="nearest")
    plt.title("Confusion Matrix - Screenshot Classifier")
    plt.colorbar()
    ticks = np.arange(len(classes))
    plt.xticks(ticks, classes, rotation=45, ha="right")
    plt.yticks(ticks, classes)

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, int(cm[i, j]), ha="center", va="center")

    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    plt.savefig(fig_dir / "confusion_matrix.png", dpi=180)
    plt.close()


def main():
    args = parse_args()
    set_seed(args.seed)

    device = "cuda" if torch.cuda.is_available() else "cpu"

    model_dir = args.model_dir
    report_dir = args.report_dir
    fig_dir = report_dir / "figures"
    table_dir = report_dir / "tables"

    model_dir.mkdir(parents=True, exist_ok=True)
    fig_dir.mkdir(parents=True, exist_ok=True)
    table_dir.mkdir(parents=True, exist_ok=True)

    train_loader, val_loader, test_loader, classes = get_dataloaders(
        data_dir=args.data_dir,
        batch_size=args.batch_size,
        image_size=args.image_size,
        num_workers=args.num_workers,
    )
    print(f"Classes used ({len(classes)}): {classes}")

    ds_summary = dataset_summary(args.data_dir, classes)
    ds_summary.to_csv(report_dir / "dataset_report.csv", index=False)

    model = ScreenshotCNN(num_classes=len(classes), pretrained=True).to(device)

    class_counts = np.bincount(train_loader.dataset.targets, minlength=len(classes))
    class_weights = np.where(class_counts > 0, class_counts.sum() / class_counts, 0.0)
    class_weights = torch.tensor(class_weights, dtype=torch.float32, device=device)

    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.05)
    optimizer = optim.AdamW(
        model.parameters(),
        lr=args.lr,
        weight_decay=args.weight_decay,
    )
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=2, min_lr=1e-6
    )
    scaler = GradScaler(enabled=(device == "cuda"))

    history = []
    best_val_acc = -1.0
    best_epoch = -1
    epochs_without_improvement = 0

    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss_total = 0.0
        train_acc_total = 0.0
        train_batches = 0

        for images, labels in train_loader:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            optimizer.zero_grad()
            with autocast(device_type=device, enabled=(device == "cuda")):
                logits = model(images)
                loss = criterion(logits, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            train_loss_total += loss.item()
            train_acc_total += accuracy_from_logits(logits, labels)
            train_batches += 1

        train_loss = train_loss_total / max(train_batches, 1)
        train_acc = train_acc_total / max(train_batches, 1)

        model.eval()
        val_loss_total = 0.0
        val_acc_total = 0.0
        val_batches = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device, non_blocking=True)
                labels = labels.to(device, non_blocking=True)
                logits = model(images)
                loss = criterion(logits, labels)

                val_loss_total += loss.item()
                val_acc_total += accuracy_from_logits(logits, labels)
                val_batches += 1

        val_loss = val_loss_total / max(val_batches, 1)
        val_acc = val_acc_total / max(val_batches, 1)
        scheduler.step(val_acc)

        current_lr = optimizer.param_groups[0]["lr"]
        history.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "train_acc": train_acc,
                "val_loss": val_loss,
                "val_acc": val_acc,
                "lr": current_lr,
            }
        )

        print(
            f"Epoch {epoch:02d}/{args.epochs} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} | lr={current_lr:.2e}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            epochs_without_improvement = 0
            torch.save(
                {
                    "model_state": model.state_dict(),
                    "classes": classes,
                    "backbone": "resnet18",
                    "image_size": args.image_size,
                    "best_epoch": best_epoch,
                    "best_val_acc": best_val_acc,
                    "trained_at": datetime.now().isoformat(timespec="seconds"),
                },
                model_dir / "cnn_classifier.pt",
            )
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= args.patience:
                print(f"Early stopping at epoch {epoch} (patience={args.patience}).")
                break

    checkpoint = torch.load(model_dir / "cnn_classifier.pt", map_location=device)
    model.load_state_dict(checkpoint["model_state"])

    y_true, y_pred = evaluate_model(model, test_loader, device)
    test_acc = accuracy_score(y_true, y_pred)
    report = classification_report(
        y_true,
        y_pred,
        target_names=classes,
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(classes))))

    history_df = pd.DataFrame(history)
    history_df.to_csv(report_dir / "training_log.csv", index=False)
    save_training_curves(history_df, fig_dir)
    save_confusion_matrix(cm, classes, fig_dir)

    pd.DataFrame(report).transpose().to_csv(table_dir / "classification_report.csv")
    pd.DataFrame([{"accuracy": test_acc}]).to_csv(table_dir / "overall_accuracy.csv", index=False)
    pd.DataFrame(cm, index=classes, columns=classes).to_csv(table_dir / "confusion_matrix.csv")

    summary = {
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "device": device,
        "epochs_requested": args.epochs,
        "epochs_ran": int(history_df["epoch"].max()),
        "best_epoch": best_epoch,
        "best_val_acc": float(best_val_acc),
        "final_train_acc": float(history_df.iloc[-1]["train_acc"]),
        "final_val_acc": float(history_df.iloc[-1]["val_acc"]),
        "test_acc": float(test_acc),
        "batch_size": args.batch_size,
        "learning_rate": args.lr,
        "weight_decay": args.weight_decay,
        "num_classes": len(classes),
        "classes": classes,
    }

    with open(report_dir / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    with open(report_dir / "summary.txt", "w", encoding="utf-8") as f:
        f.write("Screenshot Classifier Training Summary\n")
        f.write("=====================================\n")
        for key, value in summary.items():
            f.write(f"{key}: {value}\n")

    print("Training and evaluation complete.")
    print(f"Test accuracy: {test_acc:.4f}")
    print(f"Saved model: {model_dir / 'cnn_classifier.pt'}")
    print(f"Saved reports: {report_dir}")


if __name__ == "__main__":
    main()
