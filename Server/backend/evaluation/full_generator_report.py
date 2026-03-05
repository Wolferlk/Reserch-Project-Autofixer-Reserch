import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path

# =========================
# STATIC METRICS (FROM YOU)
# =========================
EPOCHS = list(range(1, 11))

# Approximated from your logs (presentation-quality)
train_loss = [
    5.61, 0.95, 0.44, 0.26, 0.18,
    0.12, 0.10, 0.08, 0.06, 0.28
]

val_loss = [
    0.19, 0.11, 0.10, 0.10, 0.098,
    0.097, 0.096, 0.097, 0.096, 0.098
]

summary_metrics = {
    "Model": "google/flan-t5-small",
    "Device": "CPU",
    "Training Samples": 719,
    "Validation Samples": 180,
    "Epochs": 10,
    "Learning Rate": 0.0003,
    "Batch Size (Train)": 4,
    "Batch Size (Eval)": 4,
    "Weight Decay": 0.01,
    "Final Training Loss": 0.2814,
    "Final Validation Loss": 0.0979,
    "Training Time (minutes)": 368.24,
    "Eval Samples / Sec": 1.079,
    "Eval Steps / Sec": 0.27
}

# =========================
# PATH SETUP
# =========================
ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "Reports"
FIG = REPORTS / "figures"
TAB = REPORTS / "tables"

FIG.mkdir(parents=True, exist_ok=True)
TAB.mkdir(parents=True, exist_ok=True)

# =========================
# 1️⃣ TRAINING LOSS CURVE
# =========================
plt.figure(figsize=(8, 4))
plt.plot(EPOCHS, train_loss, marker="o")
plt.title("Generator Training Loss Curve")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.grid(True)
plt.tight_layout()
plt.savefig(FIG / "generator_training_loss.png", dpi=300)
plt.close()

# =========================
# 2️⃣ VALIDATION LOSS CURVE
# =========================
plt.figure(figsize=(8, 4))
plt.plot(EPOCHS, val_loss, marker="o", color="orange")
plt.title("Generator Validation Loss Curve")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.grid(True)
plt.tight_layout()
plt.savefig(FIG / "generator_validation_loss.png", dpi=300)
plt.close()

# =========================
# 3️⃣ LEARNING CURVE
# =========================
plt.figure(figsize=(8, 4))
plt.plot(EPOCHS, train_loss, label="Training Loss")
plt.plot(EPOCHS, val_loss, label="Validation Loss")
plt.title("Generator Learning Curve")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig(FIG / "generator_learning_curve.png", dpi=300)
plt.close()

# =========================
# 4️⃣ PERFORMANCE BAR CHART
# =========================
plt.figure(figsize=(7, 4))
plt.bar(
    ["Train Loss", "Val Loss"],
    [summary_metrics["Final Training Loss"], summary_metrics["Final Validation Loss"]]
)
plt.title("Final Generator Performance")
plt.ylabel("Loss")
plt.tight_layout()
plt.savefig(FIG / "generator_performance_metrics.png", dpi=300)
plt.close()

# =========================
# 5️⃣ THROUGHPUT CHART
# =========================
plt.figure(figsize=(7, 4))
plt.bar(
    ["Samples/sec", "Steps/sec"],
    [summary_metrics["Eval Samples / Sec"], summary_metrics["Eval Steps / Sec"]]
)
plt.title("Evaluation Throughput")
plt.tight_layout()
plt.savefig(FIG / "generator_throughput.png", dpi=300)
plt.close()

# =========================
# 6️⃣ SUMMARY TABLE
# =========================
pd.DataFrame([summary_metrics]).to_csv(
    TAB / "generator_summary.csv", index=False
)

# =========================
# 7️⃣ TEXT REPORT
# =========================
with open(REPORTS / "generator_full_report.txt", "w", encoding="utf-8") as f:
    f.write("AUTO FIXER – GENERATOR MODEL REPORT\n")
    f.write("=" * 50 + "\n\n")
    for k, v in summary_metrics.items():
        f.write(f"{k}: {v}\n")

print("✅  generator charts & reports created successfully")
