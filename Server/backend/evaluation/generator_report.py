import pandas as pd
import evaluate
import matplotlib.pyplot as plt
from backend.generator.infer_generator import generate_fix

df = pd.read_csv("data/generator/val.csv")

bleu = evaluate.load("bleu")
rouge = evaluate.load("rouge")

preds, refs, lengths = [], [], []

for _, row in df.iterrows():
    pred = generate_fix(row["input"])
    preds.append(pred)
    refs.append(row["output"])
    lengths.append(len(pred.split()))

bleu_score = bleu.compute(predictions=preds, references=refs)["bleu"]
rouge_score = rouge.compute(predictions=preds, references=refs)["rougeL"]

pd.DataFrame([{
    "BLEU": bleu_score,
    "ROUGE_L": rouge_score
}]).to_csv("reports/tables/generator_scores.csv", index=False)

plt.hist(lengths, bins=10)
plt.title("Generated Step Length Distribution")
plt.xlabel("Words")
plt.ylabel("Frequency")
plt.savefig("reports/figures/generator_output_length.png")
plt.close()

print("✅ Generator evaluation report generated")
