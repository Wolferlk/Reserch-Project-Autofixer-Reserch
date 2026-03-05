import json
from datetime import datetime
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parents[2]
KB_CSV_PATH = ROOT / "data" / "processed" / "kb_dataset.csv"
PAIR_JSONL_PATH = ROOT / "data" / "processed" / "training_pairs" / "gen_train.fixed.jsonl"
OUT_DIR = ROOT / "data" / "generator"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TRAIN_PATH = OUT_DIR / "train.csv"
VAL_PATH = OUT_DIR / "val.csv"
TEST_PATH = OUT_DIR / "test.csv"
REPORT_TXT = OUT_DIR / "dataset_report.txt"
REPORT_JSON = OUT_DIR / "dataset_report.json"


def _build_prompt(error_text: str, kb_context: str = "") -> str:
    prompt = (
        "Generate clear, numbered troubleshooting steps for this software/system error. "
        "Use concise imperative instructions.\\n"
        f"Error details: {error_text.strip()}"
    )
    if kb_context.strip():
        prompt += f"\\nKnowledge base context: {kb_context.strip()}"
    return prompt


def _from_jsonl(path: Path) -> pd.DataFrame:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)

            context = item.get("kb_context", "")
            if isinstance(context, list):
                context = " | ".join(str(v) for v in context if v)

            input_text = str(item.get("input_text", "")).strip()
            target_text = str(item.get("target_text", "")).strip()

            if not input_text or not target_text:
                continue

            rows.append(
                {
                    "id": item.get("id", ""),
                    "input": _build_prompt(input_text, str(context)),
                    "output": target_text.replace("<STEP>", "\\n2. ").replace("  ", " ").strip(),
                    "source": "training_pairs",
                }
            )

    return pd.DataFrame(rows)


def _from_kb_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)

    required_cols = {"error_id", "title", "tags", "steps"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in {path}: {sorted(missing)}")

    df = df.dropna(subset=["title", "steps"]).copy()
    df["tags"] = df["tags"].fillna("")

    def _make_row(r):
        title = str(r["title"]).strip()
        tags = str(r["tags"]).strip()
        steps = str(r["steps"]).replace("|", "\\n- ").strip()

        error_text = title if not tags else f"{title}. Tags: {tags}"
        return pd.Series(
            {
                "id": str(r.get("error_id", "")),
                "input": _build_prompt(error_text),
                "output": steps,
                "source": "kb_csv",
            }
        )

    return df.apply(_make_row, axis=1)


def prepare_generator_data() -> dict:
    start = datetime.now()

    frames = []
    used_sources = []

    if PAIR_JSONL_PATH.exists():
        pair_df = _from_jsonl(PAIR_JSONL_PATH)
        if not pair_df.empty:
            frames.append(pair_df)
            used_sources.append(str(PAIR_JSONL_PATH))

    if KB_CSV_PATH.exists():
        kb_df = _from_kb_csv(KB_CSV_PATH)
        if not kb_df.empty:
            frames.append(kb_df)
            used_sources.append(str(KB_CSV_PATH))

    if not frames:
        raise FileNotFoundError("No generator dataset source found")

    full_df = pd.concat(frames, ignore_index=True)

    # Normalize + deduplicate
    full_df["input"] = full_df["input"].astype(str).str.strip()
    full_df["output"] = full_df["output"].astype(str).str.strip()
    full_df = full_df[(full_df["input"] != "") & (full_df["output"] != "")]
    full_df = full_df.drop_duplicates(subset=["input", "output"]).reset_index(drop=True)

    if len(full_df) < 10:
        raise ValueError("Dataset too small after cleaning. Need at least 10 rows.")

    train_df, temp_df = train_test_split(
        full_df,
        test_size=0.2,
        random_state=42,
        shuffle=True,
    )
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.5,
        random_state=42,
        shuffle=True,
    )

    train_df[["input", "output"]].to_csv(TRAIN_PATH, index=False)
    val_df[["input", "output"]].to_csv(VAL_PATH, index=False)
    test_df[["input", "output"]].to_csv(TEST_PATH, index=False)

    end = datetime.now()

    report = {
        "run_timestamp": end.isoformat(),
        "sources_used": used_sources,
        "rows_total": int(len(full_df)),
        "rows_train": int(len(train_df)),
        "rows_val": int(len(val_df)),
        "rows_test": int(len(test_df)),
        "split_ratio": "80/10/10",
        "output_files": {
            "train": str(TRAIN_PATH),
            "validation": str(VAL_PATH),
            "test": str(TEST_PATH),
        },
        "sample_input": train_df.iloc[0]["input"],
        "sample_output": train_df.iloc[0]["output"],
        "duration_seconds": round((end - start).total_seconds(), 3),
    }

    with REPORT_JSON.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    with REPORT_TXT.open("w", encoding="utf-8") as f:
        f.write("AUTO FIXER - GENERATOR DATASET REPORT\\n")
        f.write("=" * 40 + "\\n")
        for key, value in report.items():
            f.write(f"{key}: {value}\\n")

    return report


if __name__ == "__main__":
    result = prepare_generator_data()
    print("Generator dataset prepared")
    print(f"Rows: {result['rows_total']} (train={result['rows_train']}, val={result['rows_val']}, test={result['rows_test']})")
