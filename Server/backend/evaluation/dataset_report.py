import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
from pathlib import Path

# ==============================
# PATH CONFIG
# ==============================
ROOT_DIR = Path(__file__).resolve().parents[2]  # Auto fixer V6
DATA_PATH = ROOT_DIR / "data" / "processed" / "kb_dataset.csv"

REPORTS_DIR = ROOT_DIR / "Reports"
TABLES_DIR = REPORTS_DIR / "tables"
FIGURES_DIR = REPORTS_DIR / "figures"

TABLES_DIR.mkdir(parents=True, exist_ok=True)
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# ==============================
# LOAD DATASET
# ==============================
df = pd.read_csv(DATA_PATH)

# ==============================
# BASIC STATS
# ==============================
report = {
    "total_articles": len(df),
    "avg_steps_per_article": df["steps"]
        .fillna("")
        .apply(lambda x: len(str(x).split("|")) if x else 0)
        .mean(),
    "avg_text_length": df["full_text"]
        .fillna("")
        .str.len()
        .mean()
}

summary_df = pd.DataFrame([report])
summary_df.to_csv(TABLES_DIR / "dataset_summary.csv", index=False)

# ==============================
# TAG FREQUENCY ANALYSIS
# ==============================
all_tags = []

for t in df["tags"].dropna():
    all_tags.extend(tag.strip() for tag in t.split(","))

tag_counts = Counter(all_tags)

# Keep top 15 tags for readability
top_tags = dict(tag_counts.most_common(15))

plt.figure(figsize=(10, 5))
plt.bar(top_tags.keys(), top_tags.values())
plt.xticks(rotation=45, ha="right")
plt.title("Top Knowledge Base Tag Distribution")
plt.xlabel("Tags")
plt.ylabel("Frequency")
plt.tight_layout()

plt.savefig(FIGURES_DIR / "tag_distribution.png", dpi=300)
plt.close()

print("✅ Dataset report generated successfully")
print(f"📄 Summary saved to: {TABLES_DIR / 'dataset_summary.csv'}")
print(f"📊 Figure saved to: {FIGURES_DIR / 'tag_distribution.png'}")
