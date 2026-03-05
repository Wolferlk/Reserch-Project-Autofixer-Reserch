from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

try:
    from backend.classifier.model import ScreenshotCNN
    from backend.classifier.utils import get_dataloaders
except ImportError:
    from model import ScreenshotCNN
    from utils import get_dataloaders

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DATA_DIR = Path("data/classifier")
MODEL_PATH = Path("models/classifier/cnn_classifier.pt")
FIG_DIR = Path("Reports/classifier/figures")
TAB_DIR = Path("Reports/classifier/tables")
FIG_DIR.mkdir(parents=True, exist_ok=True)
TAB_DIR.mkdir(parents=True, exist_ok=True)

BATCH_SIZE = 32

checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
class_names = checkpoint["classes"]
image_size = checkpoint.get("image_size", 224)

model = ScreenshotCNN(num_classes=len(class_names), pretrained=False)
model.load_state_dict(checkpoint["model_state"])
model.to(DEVICE)
model.eval()

_, _, test_loader, _ = get_dataloaders(
    DATA_DIR, batch_size=BATCH_SIZE, image_size=image_size
)

y_true = []
y_pred = []
with torch.no_grad():
    for x, y in test_loader:
        x = x.to(DEVICE)
        outputs = model(x)
        preds = outputs.argmax(dim=1).cpu().numpy()
        y_pred.extend(preds)
        y_true.extend(y.numpy())

acc = accuracy_score(y_true, y_pred)
pd.DataFrame([{"accuracy": acc}]).to_csv(TAB_DIR / "overall_accuracy.csv", index=False)

report = classification_report(
    y_true,
    y_pred,
    labels=list(range(len(class_names))),
    target_names=class_names,
    output_dict=True,
    zero_division=0,
)
pd.DataFrame(report).transpose().to_csv(TAB_DIR / "classification_report.csv")

cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
pd.DataFrame(cm, index=class_names, columns=class_names).to_csv(
    TAB_DIR / "confusion_matrix.csv"
)

plt.figure(figsize=(10, 8))
plt.imshow(cm, interpolation="nearest")
plt.title("Confusion Matrix - Screenshot Classifier")
plt.colorbar()
plt.xticks(range(len(class_names)), class_names, rotation=45, ha="right")
plt.yticks(range(len(class_names)), class_names)
for i in range(len(class_names)):
    for j in range(len(class_names)):
        plt.text(j, i, int(cm[i, j]), ha="center", va="center")
plt.xlabel("Predicted Label")
plt.ylabel("True Label")
plt.tight_layout()
plt.savefig(FIG_DIR / "confusion_matrix.png", dpi=180)
plt.close()

print(f"Evaluation complete. Test accuracy: {acc:.4f}")
