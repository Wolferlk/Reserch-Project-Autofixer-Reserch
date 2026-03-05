import json
import os
from datetime import datetime
from pathlib import Path

import pandas as pd
import torch
from datasets import load_dataset
from transformers import (
    DataCollatorForSeq2Seq,
    T5ForConditionalGeneration,
    T5Tokenizer,
    Trainer,
    TrainingArguments,
)


ROOT = Path(__file__).resolve().parents[2]
MODEL_NAME = "google/flan-t5-small"

DATA_DIR = ROOT / "data" / "generator"
TRAIN_FILE = DATA_DIR / "train.csv"
VAL_FILE = DATA_DIR / "val.csv"

BASE_MODEL_DIR = ROOT / "models" / "generator"
RUNS_DIR = BASE_MODEL_DIR / "runs"
REPORT_DIR = BASE_MODEL_DIR / "reports"
FIG_DIR = ROOT / "Reports" / "figures"
TABLE_DIR = ROOT / "Reports" / "tables"

for p in [BASE_MODEL_DIR, RUNS_DIR, REPORT_DIR, FIG_DIR, TABLE_DIR]:
    p.mkdir(parents=True, exist_ok=True)

REPORT_JSON = REPORT_DIR / "training_report.json"
REPORT_TXT = REPORT_DIR / "training_report.txt"
LOG_CSV = TABLE_DIR / "generator_training_log.csv"
SUMMARY_CSV = TABLE_DIR / "generator_training_summary.csv"

MAX_INPUT_LEN = 192
MAX_OUTPUT_LEN = 256
NUM_EPOCHS = int(os.getenv("AUTO_FIXER_EPOCHS", "6"))
TRAIN_BATCH_SIZE = int(os.getenv("AUTO_FIXER_TRAIN_BATCH", "4"))
EVAL_BATCH_SIZE = int(os.getenv("AUTO_FIXER_EVAL_BATCH", "4"))
MAX_STEPS = int(os.getenv("AUTO_FIXER_MAX_STEPS", "-1"))


def _load_and_tokenize(tokenizer: T5Tokenizer):
    if not TRAIN_FILE.exists() or not VAL_FILE.exists():
        raise FileNotFoundError(
            "Missing train/val CSV. Run backend/generator/prepare_data.py first."
        )

    raw = load_dataset(
        "csv",
        data_files={"train": str(TRAIN_FILE), "validation": str(VAL_FILE)},
    )

    def tokenize(batch):
        model_inputs = tokenizer(
            batch["input"],
            truncation=True,
            padding="max_length",
            max_length=MAX_INPUT_LEN,
        )
        labels = tokenizer(
            batch["output"],
            truncation=True,
            padding="max_length",
            max_length=MAX_OUTPUT_LEN,
        )

        # Ignore padding token in loss.
        label_ids = []
        for seq in labels["input_ids"]:
            label_ids.append([
                tok if tok != tokenizer.pad_token_id else -100
                for tok in seq
            ])

        model_inputs["labels"] = label_ids
        return model_inputs

    tokenized = raw.map(
        tokenize,
        batched=True,
        remove_columns=raw["train"].column_names,
    )

    return raw, tokenized


def run_training() -> dict:
    start = datetime.now()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    run_id = start.strftime("%Y%m%d_%H%M%S")
    model_output_dir = RUNS_DIR / run_id
    model_output_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)
    model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
    model.to(device)

    raw_dataset, tokenized_dataset = _load_and_tokenize(tokenizer)

    training_args = TrainingArguments(
        output_dir=str(model_output_dir),
        overwrite_output_dir=True,
        do_train=True,
        do_eval=True,
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=3e-4,
        per_device_train_batch_size=TRAIN_BATCH_SIZE,
        per_device_eval_batch_size=EVAL_BATCH_SIZE,
        num_train_epochs=NUM_EPOCHS,
        max_steps=MAX_STEPS,
        weight_decay=0.01,
        logging_steps=20,
        save_total_limit=2,
        fp16=torch.cuda.is_available(),
        report_to="none",
        remove_unused_columns=False,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
    )

    data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"],
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    train_result = trainer.train()
    eval_metrics = trainer.evaluate()

    model.save_pretrained(model_output_dir)
    tokenizer.save_pretrained(model_output_dir)

    logs = pd.DataFrame(trainer.state.log_history)
    if not logs.empty:
        logs.to_csv(LOG_CSV, index=False)

    train_loss = None
    eval_loss = None
    if not logs.empty and "loss" in logs.columns and logs["loss"].notna().any():
        train_loss = float(logs["loss"].dropna().iloc[-1])
    if not logs.empty and "eval_loss" in logs.columns and logs["eval_loss"].notna().any():
        eval_loss = float(logs["eval_loss"].dropna().iloc[-1])

    end = datetime.now()

    report = {
        "timestamp": end.isoformat(),
        "run_id": run_id,
        "model": MODEL_NAME,
        "model_output_dir": str(model_output_dir),
        "device": device,
        "train_samples": int(len(raw_dataset["train"])),
        "validation_samples": int(len(raw_dataset["validation"])),
        "epochs": training_args.num_train_epochs,
        "learning_rate": training_args.learning_rate,
        "batch_size_train": training_args.per_device_train_batch_size,
        "batch_size_eval": training_args.per_device_eval_batch_size,
        "max_steps": training_args.max_steps,
        "training_minutes": round((end - start).total_seconds() / 60.0, 2),
        "train_runtime_seconds": round(float(train_result.metrics.get("train_runtime", 0.0)), 3),
        "train_samples_per_second": round(float(train_result.metrics.get("train_samples_per_second", 0.0)), 3),
        "final_train_loss": train_loss,
        "final_eval_loss": float(eval_metrics.get("eval_loss", eval_loss or 0.0)),
        "best_checkpoint": trainer.state.best_model_checkpoint,
        "notes": "Use backend/evaluation/eval_generator.py for BLEU/ROUGE and pseudo-accuracy.",
    }

    pd.DataFrame([report]).to_csv(SUMMARY_CSV, index=False)

    with REPORT_JSON.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    with REPORT_TXT.open("w", encoding="utf-8") as f:
        f.write("AUTO FIXER - GENERATOR TRAINING REPORT\\n")
        f.write("=" * 44 + "\\n")
        for k, v in report.items():
            f.write(f"{k}: {v}\\n")

    return report


if __name__ == "__main__":
    summary = run_training()
    print("Generator training completed")
    print(f"Final eval loss: {summary['final_eval_loss']}")
