import matplotlib.pyplot as plt
from pathlib import Path

# =========================
# STATIC / SAVED METRICS
# =========================
epochs = list(range(1, 11))

train_loss = [5.61, 0.95, 0.44, 0.26, 0.18, 0.12, 0.10, 0.08, 0.06, 0.28]
val_loss = [0.19, 0.11, 0.10, 0.10, 0.098, 0.097, 0.096, 0.097, 0.096, 0.098]

rouge_scores = {
    "ROUGE-1": 0.42,
    "ROUGE-2": 0.29,
    "ROUGE-L": 0.38
}

bleu_score = 0.31

throughput = {
    "Samples/sec": 1.079,
    "Steps/sec": 0.27
}

# =========================
# PATHS
# =========================
ROOT = Path(__file__).resolve().parents[2]
FIG = ROOT / "Reports" / "figures"
FIG.mkdir(parents=True, exist_ok=True)

# =========================
# LOSS CURVES
# =========================
plt.figure()
plt.plot(epochs, train_loss, label="Train Loss")
plt.plot(epochs, val_loss, label="Val Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.title("Training vs Validation Loss")
plt.legend()
plt.savefig(FIG / "loss_curve.png", dpi=300)
plt.close()

# =========================
# ROUGE ACCURACY
# =========================
plt.figure()
plt.bar(rouge_scores.keys(), rouge_scores.values())
plt.title("ROUGE Accuracy Scores")
plt.ylabel("Score")
plt.savefig(FIG / "rouge_accuracy.png", dpi=300)
plt.close()

# =========================
# BLEU ACCURACY
# =========================
plt.figure()
plt.bar(["BLEU"], [bleu_score])
plt.title("BLEU Accuracy Score")
plt.savefig(FIG / "bleu_accuracy.png", dpi=300)
plt.close()

# =========================
# THROUGHPUT
# =========================
plt.figure()
plt.bar(throughput.keys(), throughput.values())
plt.title("Inference Throughput")
plt.savefig(FIG / "throughput.png", dpi=300)
plt.close()

print("✅ Accuracy & performance charts generated")
