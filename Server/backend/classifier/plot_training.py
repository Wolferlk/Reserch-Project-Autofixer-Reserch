import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("reports/classifier/training_log.csv")

plt.figure()
plt.plot(df["epoch"], df["train_accuracy"], label="Train Accuracy")
plt.plot(df["epoch"], df["val_accuracy"], label="Validation Accuracy")
plt.xlabel("Epoch")
plt.ylabel("Accuracy")
plt.title("CNN Training vs Validation Accuracy")
plt.legend()
plt.savefig("reports/classifier/figures/accuracy_curve.png")
plt.close()

print("✅ Accuracy curve generated")
