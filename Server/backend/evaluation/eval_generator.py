import json
from datetime import datetime
from pathlib import Path

import pandas as pd

from backend.generator.infer_generator import generate_fix


ROOT = Path(__file__).resolve().parents[2]
VAL_PATH = ROOT / "data" / "generator" / "val.csv"
REPORT_DIR = ROOT / "Reports"
TABLE_DIR = REPORT_DIR / "tables"
FIG_DIR = REPORT_DIR / "figures"

TABLE_DIR.mkdir(parents=True, exist_ok=True)
FIG_DIR.mkdir(parents=True, exist_ok=True)

SUMMARY_JSON = TABLE_DIR / "generator_eval_summary.json"
SUMMARY_CSV = TABLE_DIR / "generator_eval_summary.csv"
DETAIL_CSV = TABLE_DIR / "generator_eval_predictions.csv"


def _token_set(text: str):
    return set(t.lower() for t in text.split() if t.strip())


def _token_f1(pred: str, ref: str) -> float:
    p = _token_set(pred)
    r = _token_set(ref)
    if not p and not r:
        return 1.0
    if not p or not r:
        return 0.0
    common = len(p & r)
    precision = common / len(p)
    recall = common / len(r)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def evaluate_generator(limit: int | None = None) -> dict:
    if not VAL_PATH.exists():
        raise FileNotFoundError("Validation data not found. Run prepare_data.py first.")

    df = pd.read_csv(VAL_PATH)
    if limit is not None and limit > 0:
        df = df.head(limit)

    rows = []
    exact = 0
    f1_scores = []

    for _, row in df.iterrows():
        inp = str(row["input"])
        ref = str(row["output"])
        pred = generate_fix(inp, max_length=140, num_beams=1)

        norm_pred = " ".join(pred.lower().split())
        norm_ref = " ".join(ref.lower().split())

        is_exact = int(norm_pred == norm_ref)
        if is_exact:
            exact += 1

        f1 = _token_f1(pred, ref)
        f1_scores.append(f1)

        rows.append(
            {
                "input": inp,
                "reference": ref,
                "prediction": pred,
                "exact_match": is_exact,
                "token_f1": round(f1, 4),
            }
        )

    pred_df = pd.DataFrame(rows)
    pred_df.to_csv(DETAIL_CSV, index=False)

    total = len(pred_df)
    summary = {
        "timestamp": datetime.now().isoformat(),
        "samples_evaluated": int(total),
        "exact_match_accuracy": round(exact / total if total else 0.0, 4),
        "avg_token_f1": round(sum(f1_scores) / total if total else 0.0, 4),
        "notes": "For text generation, token-level F1 is more stable than strict exact-match accuracy.",
        "eval_generation_profile": "max_length=140, num_beams=1 (CPU-friendly evaluation mode)",
    }

    pd.DataFrame([summary]).to_csv(SUMMARY_CSV, index=False)
    with SUMMARY_JSON.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


if __name__ == "__main__":
    result = evaluate_generator()
    print("Generator evaluation completed")
    print(result)
