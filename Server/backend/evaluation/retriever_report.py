import pandas as pd
import matplotlib.pyplot as plt
from backend.retriever.kb_retriever import KBRetriever

df = pd.read_csv("data/processed/kb_dataset.csv")
retriever = KBRetriever()
retriever.load()

top1, top3 = 0, 0
scores = []

for _, row in df.iterrows():
    results = retriever.query(row["title"], top_k=3)
    ids = [r["error_id"] for r in results]
    scores.append(results[0]["score"])

    if row["error_id"] == ids[0]:
        top1 += 1
    if row["error_id"] in ids:
        top3 += 1

accuracy = {
    "top1_accuracy": top1 / len(df),
    "top3_accuracy": top3 / len(df)
}

pd.DataFrame([accuracy]).to_csv("reports/tables/retriever_accuracy.csv", index=False)

# Confidence distribution
plt.hist(scores, bins=10)
plt.title("Retriever Confidence Score Distribution")
plt.xlabel("Cosine Similarity")
plt.ylabel("Frequency")
plt.savefig("reports/figures/retriever_confidence.png")
plt.close()

print("✅ Retriever report generated")
