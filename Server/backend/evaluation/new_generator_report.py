import json
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# =========================
# PATH CONFIG
# =========================
ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = ROOT / "models" / "generator" / "reports"
REPORTS_DIR = ROOT / "Reports"
FIGURES_DIR = REPORTS_DIR / "figures"
TABLES_DIR = REPORTS_DIR / "tables"

FIGURES_DIR.mkdir(parents=True, exist_ok=True)
TABLES_DIR.mkdir(parents=True, exist_ok=True)

# =========================
# LOAD TRAINING LOG (TXT)
# =========================
log_file = MODEL_DIR / "training_report.txt"

records = []

with open(log_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                records.append(eval(line))
            except Exception:
                continue

df = pd.DataFrame(records)

# =========================
# SAFE COLUMN HANDLING
# =========================
for col in ["loss", "eval_loss", "epoch", "learning_rate"]:
    if col not in df.columns:
        df[col] = None

# =========================
# SUMMARY METRICS (SAFE)
# =========================
summary = {
    "final_train_loss": df["loss"].dropna().iloc[-1] if df["loss"].notna().any() else None,
    "final_eval_loss": df["eval_loss"].dropna().iloc[-1] if df["eval_loss"].notna().any() else None,
    "total_epochs": int(df["epoch"].dropna().max()) if df["epoch"].notna().any() else None,
    "learning_rate_final": df["learning_rate"].dropna().iloc[-1] if df["learning_rate"].notna().any() else None
}

pd.DataFrame([summary]).to_csv(
    TABLES_DIR / "generator_training_summary.csv", index=False
)

# =========================
# TRAINING LOSS CURVE
# =========================
train_df = df.dropna(subset=["loss", "epoch"])

if not train_df.empty:
    plt.figure(figsize=(8, 4))
    plt.plot(train_df["epoch"], train_df["loss"], label="Training Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Generator Training Loss Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "generator_loss_curve.png", dpi=300)
    plt.close()

# =========================
# VALIDATION LOSS CURVE
# =========================
eval_df = df.dropna(subset=["eval_loss", "epoch"])

if not eval_df.empty:
    plt.figure(figsize=(8, 4))
    plt.plot(eval_df["epoch"], eval_df["eval_loss"], label="Validation Loss", color="orange")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Generator Validation Loss Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "generator_eval_loss_curve.png", dpi=300)
    plt.close()

print("✅ Generator training charts & summary generated successfully")
