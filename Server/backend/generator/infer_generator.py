from datetime import datetime
from pathlib import Path
import json
import re

import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer


ROOT = Path(__file__).resolve().parents[2]
BASE_MODEL_DIR = ROOT / "models" / "generator"
RUNS_DIR = BASE_MODEL_DIR / "runs"
REPORT_DIR = BASE_MODEL_DIR / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

REPORT_TXT = REPORT_DIR / "inference_report.txt"
REPORT_JSON = REPORT_DIR / "inference_report.json"


device = "cuda" if torch.cuda.is_available() else "cpu"


def _resolve_model_dir() -> Path:
    if RUNS_DIR.exists():
        run_dirs = [p for p in RUNS_DIR.iterdir() if p.is_dir()]
        if run_dirs:
            return sorted(run_dirs, key=lambda p: p.name)[-1]
    return BASE_MODEL_DIR


MODEL_DIR = _resolve_model_dir()

tokenizer = T5Tokenizer.from_pretrained(MODEL_DIR)
model = T5ForConditionalGeneration.from_pretrained(MODEL_DIR)
model.to(device)
model.eval()


def build_prompt(text: str) -> str:
    return (
        "Generate clear, numbered troubleshooting steps for this software/system error.\\n"
        f"Error details: {text.strip()}"
    )


def _normalize_steps(text: str) -> str:
    cleaned = text.replace("<STEP>", "\n")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # If model already generated numbering, keep it.
    if re.search(r"\b1[\.)]\s", cleaned):
        return cleaned

    # Otherwise split into small step-like chunks and number them.
    chunks = [c.strip(" -") for c in re.split(r"\.|;", cleaned) if c.strip()]
    if not chunks:
        return cleaned

    numbered = [f"{i + 1}. {chunk}" for i, chunk in enumerate(chunks[:8])]
    return "\n".join(numbered)


def generate_fix(text: str, max_length: int = 220, num_beams: int = 5) -> str:
    prompt = build_prompt(text)

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=192,
    ).to(device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,
            min_length=48,
            num_beams=num_beams,
            repetition_penalty=1.4,
            no_repeat_ngram_size=3,
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return _normalize_steps(decoded)


def run_inference(text: str) -> str:
    start = datetime.now()
    result = generate_fix(text)
    end = datetime.now()

    report = {
        "timestamp": end.isoformat(),
        "device": device,
        "model_dir": str(MODEL_DIR),
        "input_text": text,
        "normalized_prompt": build_prompt(text),
        "output_text": result,
        "generation_params": {"max_length": 220, "num_beams": 5},
        "inference_time_seconds": round((end - start).total_seconds(), 3),
    }

    with REPORT_JSON.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    with REPORT_TXT.open("w", encoding="utf-8") as f:
        f.write("AUTO FIXER - GENERATOR INFERENCE REPORT\\n")
        f.write("=" * 46 + "\\n")
        for k, v in report.items():
            f.write(f"{k}: {v}\\n")

    return result
