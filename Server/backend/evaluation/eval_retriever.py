import pandas as pd
from backend.retriever.kb_retriever import KBRetriever

df = pd.read_csv("data/processed/kb_dataset.csv")
retriever = KBRetriever()
retriever.load()

top1 = 0
top3 = 0

for _, row in df.iterrows():
    query = row["title"]
    results = retriever.query(query, top_k=3)
    ids = [r["error_id"] for r in results]

    if row["error_id"] == ids[0]:
        top1 += 1
    if row["error_id"] in ids:
        top3 += 1

n = len(df)
print("Top-1 Accuracy:", top1 / n)
print("Top-3 Accuracy:", top3 / n)
