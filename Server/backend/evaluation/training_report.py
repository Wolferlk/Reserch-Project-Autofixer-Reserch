import json
import matplotlib.pyplot as plt

log_file = "logs/trainer_state.json"

with open(log_file) as f:
    data = json.load(f)

losses = [x["loss"] for x in data["log_history"] if "loss" in x]
epochs = list(range(1, len(losses) + 1))

plt.plot(epochs, losses)
plt.xlabel("Epoch")
plt.ylabel("Training Loss")
plt.title("Generator Training Loss Curve")
plt.savefig("reports/figures/training_loss.png")
plt.close()

print("✅ Training loss chart generated")
