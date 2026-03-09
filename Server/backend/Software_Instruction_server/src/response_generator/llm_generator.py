import os
import random
import re
from typing import List

_MODEL_ERROR = None
_TOKENIZER = None
_MODEL = None
_DEVICE = None


def _extract_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    cleaned = []
    for part in parts:
        part = re.sub(r"\s+", " ", part).strip()
        if len(part.split()) >= 6:
            cleaned.append(part)
    return cleaned


def _shorten(text: str, limit: int = 140) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _extract_step_actions(context: str, limit: int = 6) -> List[str]:
    clean = re.sub(r"\s+", " ", context)
    clean = re.sub(r"[^\x20-\x7E]", " ", clean)
    # Capture patterns such as "Step 1: ... Step 2: ..."
    matches = re.findall(
        r"step\s*\d+\s*[:\-]\s*(.*?)(?=\s*step\s*\d+\s*[:\-]|$)",
        clean,
        flags=re.IGNORECASE,
    )

    steps = []
    seen = set()
    for raw in matches:
        step = re.sub(r"\s+", " ", raw).strip(" .,-")
        if len(step.split()) < 4:
            continue
        key = step.lower()
        if key in seen:
            continue
        seen.add(key)
        steps.append(step[0].upper() + step[1:])
        if len(steps) >= limit:
            break
    return steps


def _select_relevant_sentences(context: str, query: str, limit: int = 3) -> List[str]:
    query_terms = set(re.findall(r"[a-z0-9]+", query.lower()))
    sentences = _extract_sentences(context)

    ranked = []
    for sentence in sentences:
        sentence_terms = set(re.findall(r"[a-z0-9]+", sentence.lower()))
        overlap = len(query_terms.intersection(sentence_terms))
        ranked.append((overlap, len(sentence), sentence))

    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [item[2] for item in ranked[:limit] if item[0] > 0] or sentences[:limit]


def _fallback_response(context: str, query: str) -> str:
    selected = _select_relevant_sentences(context, query, limit=3)
    context_steps = _extract_step_actions(context, limit=5)
    query_l = query.lower()

    lines = [
        "Software Fix Plan:",
        "1. Confirm scope: identify the exact software name, version, and full error text.",
        "2. Prepare safely: save your current work and create a restore point or backup.",
        "3. Reproduce once: perform the same action and note exactly where it fails.",
        "4. Apply focused fix: follow only one fix path at a time to avoid side effects.",
        "5. Validate result: repeat the original action and verify the issue is fully resolved.",
        "6. Harden setup: update software/plugins and document the final working steps.",
    ]

    if ("background" in query_l and "photo" in query_l) or "remove bg" in query_l:
        variants = [
            [
                "Step 1: Open the photo and launch the background removal tool.",
                "Step 2: Mark the subject carefully, then refine hair and edge regions.",
                "Step 3: Clean leftover artifacts with the eraser or mask refinement controls.",
                "Step 4: Export as PNG and verify transparency on a dark and light background.",
            ],
            [
                "Step 1: Import the image and switch to the cutout or remove-background workspace.",
                "Step 2: Keep the subject, remove the backdrop, and inspect fine boundaries closely.",
                "Step 3: Adjust feather/smooth settings to avoid jagged edges around the subject.",
                "Step 4: Save in PNG format to preserve alpha transparency.",
            ],
        ]
        lines = ["Software Fix Plan:"] + [f"{i+1}. {s[8:] if s.lower().startswith('step ') else s}" for i, s in enumerate(random.choice(variants))]

    elif any(k in query_l for k in ["internet", "no connection", "network", "offline"]):
        variants = [
            [
                "Step 1: Confirm your device has internet access outside the app (open any other website).",
                "Step 2: Restart Chrome and your router, then test again.",
                "Step 3: Open Chrome Incognito mode and retry to rule out extension conflicts.",
                "Step 4: Disable VPN/proxy temporarily and check system firewall or antivirus rules.",
                "Step 5: Clear DNS cache and reset network settings if the issue persists.",
            ],
            [
                "Step 1: Verify the URL and test two different websites to confirm the failure scope.",
                "Step 2: Update Chrome to the latest version and restart the computer.",
                "Step 3: Disable all extensions, then re-enable one by one to identify the blocker.",
                "Step 4: Check date/time settings and certificate warnings.",
                "Step 5: If still failing, reset Chrome settings to defaults and retry.",
            ],
        ]
        lines = ["Software Fix Plan:"] + [f"{i+1}. {s[8:] if s.lower().startswith('step ') else s}" for i, s in enumerate(random.choice(variants))]

    elif context_steps:
        lines = ["Software Fix Plan:"]
        for idx, step in enumerate(context_steps[:5], start=1):
            lines.append(f"{idx}. {step}")
        lines.append("6. If unresolved, share exact error text and a screenshot for deeper diagnosis.")

    lines.append("")
    lines.append("Verification checklist:")
    lines.append("- Restart the software and test the same workflow.")
    lines.append("- Confirm no new warning/error is introduced.")
    lines.append("- If shared machine: verify user permissions and network access.")

    if selected:
        lines.append("")
        lines.append("Evidence snippets:")
        for i, sentence in enumerate(selected, start=1):
            lines.append(f"{i}. {_shorten(sentence)}")

    return "\n".join(lines)


def _load_local_llm():
    global _MODEL_ERROR, _TOKENIZER, _MODEL, _DEVICE

    # Enable only when explicitly requested, so default runs stay fast and stable.
    if os.getenv("USE_LOCAL_LLM", "0") != "1":
        _MODEL_ERROR = "Local LLM disabled by default (USE_LOCAL_LLM != 1)."
        return False

    if _TOKENIZER is not None and _MODEL is not None:
        return True
    if _MODEL_ERROR is not None:
        return False

    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        model_name = os.getenv("LOCAL_LLM_MODEL", "google/flan-t5-small")
        _TOKENIZER = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
        _MODEL = AutoModelForSeq2SeqLM.from_pretrained(model_name, local_files_only=True)
        _DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
        _MODEL.to(_DEVICE)
        return True
    except Exception as exc:
        _MODEL_ERROR = exc
        return False


def generate_ai_response(context, query):
    prompt = (
        "You are an expert software support assistant. "
        "Return user-friendly, practical, detailed troubleshooting steps. "
        "Include verification and safety guidance. Avoid repetition.\n\n"
        f"Context:\n{context[:1500]}\n\n"
        f"Question:\n{query}\n\n"
        "Answer:"
    )

    if not _load_local_llm():
        return _fallback_response(context, query)

    try:
        inputs = _TOKENIZER(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        ).to(_DEVICE)

        outputs = _MODEL.generate(
            **inputs,
            max_new_tokens=220,
            temperature=0.75,
            top_p=0.9,
            do_sample=True,
            repetition_penalty=1.2,
        )

        decoded = _TOKENIZER.decode(outputs[0], skip_special_tokens=True).strip()
        decoded = re.sub(r"(?i)^answer:\s*", "", decoded).strip()
        return decoded if decoded else _fallback_response(context, query)
    except Exception:
        return _fallback_response(context, query)
