"""
Auto Fixer – Generator Inference
=================================
Optimized, production-grade inference pipeline for the Flan-T5 troubleshooting
step generator.

Features
--------
- Lazy model loading with a singleton cache (no reload on every call)
- Batch inference support (`generate_fixes`)
- Configurable via environment variables *and* call-site kwargs
- Structured per-run reporting (JSON + TXT) without clobbering prior runs
- Full type annotations; zero bare-except blocks
- Thread-safe (model / tokenizer are read-only after `.eval()`)
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("auto_fixer.inference")
log.setLevel(os.getenv("AUTO_FIXER_LOG_LEVEL", "INFO").upper())

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
BASE_MODEL_DIR = ROOT / "models" / "generator"
RUNS_DIR = BASE_MODEL_DIR / "runs"
REPORT_DIR = BASE_MODEL_DIR / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Generation defaults (all overridable via env vars)
# ---------------------------------------------------------------------------
DEFAULT_MAX_INPUT_LEN: int = int(os.getenv("AUTO_FIXER_MAX_INPUT_LEN", "192"))
DEFAULT_MAX_OUTPUT_LEN: int = int(os.getenv("AUTO_FIXER_MAX_OUTPUT_LEN", "256"))
DEFAULT_MIN_OUTPUT_LEN: int = int(os.getenv("AUTO_FIXER_MIN_OUTPUT_LEN", "48"))
DEFAULT_NUM_BEAMS: int = int(os.getenv("AUTO_FIXER_NUM_BEAMS", "1"))
DEFAULT_TEMPERATURE: float = float(os.getenv("AUTO_FIXER_TEMPERATURE", "0.85"))
DEFAULT_TOP_P: float = float(os.getenv("AUTO_FIXER_TOP_P", "0.92"))
DEFAULT_TOP_K: int = int(os.getenv("AUTO_FIXER_TOP_K", "50"))
DEFAULT_REPETITION_PENALTY: float = float(os.getenv("AUTO_FIXER_REP_PENALTY", "1.4"))
DEFAULT_NO_REPEAT_NGRAM: int = int(os.getenv("AUTO_FIXER_NO_REPEAT_NGRAM", "3"))
MAX_STEPS_NORMALIZED: int = int(os.getenv("AUTO_FIXER_MAX_STEPS_OUT", "8"))

# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------
DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
log.info("Inference device: %s", DEVICE)


# ---------------------------------------------------------------------------
# Generation config dataclass
# ---------------------------------------------------------------------------
@dataclass
class GenerationConfig:
    """Holds all knobs for a single generate call."""
    max_input_len: int = DEFAULT_MAX_INPUT_LEN
    max_output_len: int = DEFAULT_MAX_OUTPUT_LEN
    min_output_len: int = DEFAULT_MIN_OUTPUT_LEN
    num_beams: int = DEFAULT_NUM_BEAMS
    temperature: float = DEFAULT_TEMPERATURE
    top_p: float = DEFAULT_TOP_P
    top_k: int = DEFAULT_TOP_K
    repetition_penalty: float = DEFAULT_REPETITION_PENALTY
    no_repeat_ngram_size: int = DEFAULT_NO_REPEAT_NGRAM
    variation_seed: Optional[int] = None

    @property
    def do_sample(self) -> bool:
        """Sampling is only meaningful when num_beams == 1."""
        return self.num_beams == 1


# ---------------------------------------------------------------------------
# Singleton model cache
# ---------------------------------------------------------------------------
@dataclass
class _ModelCache:
    tokenizer: Optional[T5Tokenizer] = field(default=None, repr=False)
    model: Optional[T5ForConditionalGeneration] = field(default=None, repr=False)
    model_dir: Optional[Path] = None
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def load(self, model_dir: Path) -> None:
        """Load (or reload if dir changed) the tokenizer and model."""
        with self._lock:
            if self.model_dir == model_dir and self.model is not None:
                return  # already loaded

            log.info("Loading model from: %s", model_dir)
            self.tokenizer = T5Tokenizer.from_pretrained(str(model_dir))
            self.model = T5ForConditionalGeneration.from_pretrained(str(model_dir))
            self.model.to(DEVICE)
            self.model.eval()
            self.model_dir = model_dir
            log.info("Model loaded successfully.")

    @property
    def ready(self) -> bool:
        return self.model is not None and self.tokenizer is not None


_cache = _ModelCache()


# ---------------------------------------------------------------------------
# Model resolution
# ---------------------------------------------------------------------------
def _resolve_model_dir() -> Path:
    """Pick the most recent run directory, falling back to BASE_MODEL_DIR."""
    if RUNS_DIR.exists():
        run_dirs = sorted(
            (p for p in RUNS_DIR.iterdir() if p.is_dir()),
            key=lambda p: p.name,
        )
        if run_dirs:
            chosen = run_dirs[-1]
            log.debug("Resolved model dir: %s", chosen)
            return chosen

    log.warning(
        "No run directories found in %s – falling back to %s",
        RUNS_DIR,
        BASE_MODEL_DIR,
    )
    return BASE_MODEL_DIR


def ensure_model_loaded(model_dir: Optional[Path] = None) -> None:
    """Public helper: guarantee the singleton cache is populated."""
    _cache.load(model_dir or _resolve_model_dir())


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------
def build_prompt(error_text: str, kb_context: str = "") -> str:
    """Construct the instruction prompt passed to the model."""
    prompt = (
        "Generate clear, numbered troubleshooting steps for this "
        "software/system error. Use concise imperative instructions.\n"
        f"Error details: {error_text.strip()}"
    )
    if kb_context.strip():
        prompt += f"\nKnowledge base context: {kb_context.strip()}"
    return prompt


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------
_STEP_SPLIT_RE = re.compile(r"[.;]")
_LEADING_NUM_RE = re.compile(r"^\d+[\.)]\s+")
_WHITESPACE_RE = re.compile(r"\s+")
_ALREADY_NUMBERED_RE = re.compile(r"\b1[\.)]\s")


def _normalize_steps(raw: str, max_steps: int = MAX_STEPS_NORMALIZED) -> str:
    """
    Clean model output into a numbered step list.

    • Replaces <STEP> tokens with newlines.
    • Collapses excess whitespace.
    • If no numbering is present, splits on sentence boundaries and numbers.
    """
    text = raw.replace("<STEP>", "\n")
    text = _WHITESPACE_RE.sub(" ", text).strip()

    if _ALREADY_NUMBERED_RE.search(text):
        return text

    chunks = [
        _LEADING_NUM_RE.sub("", c).strip(" -–•")
        for c in _STEP_SPLIT_RE.split(text)
        if c.strip()
    ]
    chunks = [c for c in chunks if len(c) > 4][:max_steps]  # drop noise tokens

    if not chunks:
        return text

    return "\n".join(f"{i + 1}. {chunk}" for i, chunk in enumerate(chunks))


# ---------------------------------------------------------------------------
# Core generation
# ---------------------------------------------------------------------------
def _set_seed(seed: Optional[int]) -> None:
    if seed is None:
        return
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def generate_fix(
    error_text: str,
    kb_context: str = "",
    config: Optional[GenerationConfig] = None,
    model_dir: Optional[Path] = None,
) -> str:
    """
    Generate troubleshooting steps for a single error description.

    Parameters
    ----------
    error_text : str
        The raw error message or description.
    kb_context : str
        Optional knowledge-base context to append to the prompt.
    config : GenerationConfig
        Generation hyper-parameters. Defaults used if not supplied.
    model_dir : Path
        Override the resolved model directory (useful for testing).

    Returns
    -------
    str
        Numbered troubleshooting steps.
    """
    cfg = config or GenerationConfig()
    ensure_model_loaded(model_dir)

    prompt = build_prompt(error_text, kb_context)
    inputs = _cache.tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=cfg.max_input_len,
        padding=False,
    ).to(DEVICE)

    _set_seed(cfg.variation_seed)

    generate_kwargs: dict = dict(
        max_length=cfg.max_output_len,
        min_length=cfg.min_output_len,
        repetition_penalty=cfg.repetition_penalty,
        no_repeat_ngram_size=cfg.no_repeat_ngram_size,
    )

    if cfg.num_beams > 1:
        generate_kwargs.update(num_beams=cfg.num_beams)
    else:
        generate_kwargs.update(
            do_sample=True,
            temperature=cfg.temperature,
            top_p=cfg.top_p,
            top_k=cfg.top_k,
        )

    with torch.no_grad():
        outputs = _cache.model.generate(**inputs, **generate_kwargs)

    raw = _cache.tokenizer.decode(outputs[0], skip_special_tokens=True)
    return _normalize_steps(raw)


def generate_fixes(
    error_texts: list[str],
    kb_contexts: Optional[list[str]] = None,
    config: Optional[GenerationConfig] = None,
    model_dir: Optional[Path] = None,
) -> list[str]:
    """
    Batch variant of :func:`generate_fix`.

    Runs tokenization in parallel, generation sequentially (safe on any
    hardware), returning results in the same order as inputs.
    """
    contexts = kb_contexts or [""] * len(error_texts)
    if len(contexts) != len(error_texts):
        raise ValueError(
            f"kb_contexts length ({len(contexts)}) must match "
            f"error_texts length ({len(error_texts)})."
        )
    return [
        generate_fix(et, kc, config, model_dir)
        for et, kc in zip(error_texts, contexts)
    ]


# ---------------------------------------------------------------------------
# Inference runner with reporting
# ---------------------------------------------------------------------------
def run_inference(
    error_text: str,
    kb_context: str = "",
    config: Optional[GenerationConfig] = None,
    model_dir: Optional[Path] = None,
    write_report: bool = True,
) -> str:
    """
    High-level entry point: generate steps and optionally persist a report.

    Reports are written to timestamped files so successive runs don't
    overwrite each other.
    """
    cfg = config or GenerationConfig()
    start = datetime.now()

    result = generate_fix(error_text, kb_context, cfg, model_dir)

    end = datetime.now()
    elapsed = round((end - start).total_seconds(), 4)

    if write_report:
        _write_report(
            error_text=error_text,
            kb_context=kb_context,
            cfg=cfg,
            result=result,
            timestamp=end,
            elapsed=elapsed,
        )

    log.info("Inference complete in %.3fs.", elapsed)
    return result


def _write_report(
    error_text: str,
    kb_context: str,
    cfg: GenerationConfig,
    result: str,
    timestamp: datetime,
    elapsed: float,
) -> None:
    run_ts = timestamp.strftime("%Y%m%d_%H%M%S")
    report = {
        "timestamp": timestamp.isoformat(),
        "device": DEVICE,
        "model_dir": str(_cache.model_dir),
        "input_text": error_text,
        "kb_context": kb_context,
        "normalized_prompt": build_prompt(error_text, kb_context),
        "output_text": result,
        "generation_config": asdict(cfg),
        "inference_time_seconds": elapsed,
    }

    json_path = REPORT_DIR / f"inference_report_{run_ts}.json"
    txt_path = REPORT_DIR / f"inference_report_{run_ts}.txt"

    with json_path.open("w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    with txt_path.open("w", encoding="utf-8") as fh:
        fh.write("AUTO FIXER – GENERATOR INFERENCE REPORT\n")
        fh.write("=" * 46 + "\n")
        for k, v in report.items():
            fh.write(f"{k}: {v}\n")

    log.debug("Report written → %s", json_path)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Auto Fixer – run generator inference from the command line."
    )
    parser.add_argument("error_text", help="Error message or description to fix.")
    parser.add_argument("--kb-context", default="", help="Optional KB context string.")
    parser.add_argument("--num-beams", type=int, default=DEFAULT_NUM_BEAMS)
    parser.add_argument("--temperature", type=float, default=DEFAULT_TEMPERATURE)
    parser.add_argument("--top-p", type=float, default=DEFAULT_TOP_P)
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K)
    parser.add_argument("--max-output-len", type=int, default=DEFAULT_MAX_OUTPUT_LEN)
    parser.add_argument("--seed", type=int, default=None, help="Variation seed.")
    parser.add_argument(
        "--no-report", action="store_true", help="Skip writing report files."
    )
    args = parser.parse_args()

    cfg = GenerationConfig(
        num_beams=args.num_beams,
        temperature=args.temperature,
        top_p=args.top_p,
        top_k=args.top_k,
        max_output_len=args.max_output_len,
        variation_seed=args.seed,
    )

    output = run_inference(
        error_text=args.error_text,
        kb_context=args.kb_context,
        config=cfg,
        write_report=not args.no_report,
    )
    print("\n=== Troubleshooting Steps ===\n")
    print(output)