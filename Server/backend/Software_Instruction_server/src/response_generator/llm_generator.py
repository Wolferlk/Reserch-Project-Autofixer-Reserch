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


def _is_tutorial_query(query: str) -> bool:
    query_l = query.lower()
    tutorial_terms = [
        "how to",
        "steps to",
        "guide",
        "tutorial",
        "walkthrough",
        "export",
        "render",
        "create",
        "install",
        "set up",
        "setup",
        "configure",
    ]
    return any(term in query_l for term in tutorial_terms)


def _infer_software_name(context: str, query: str) -> str:
    combined = f"{context} {query}".lower()
    aliases = {
        "after effects": "After Effects",
        "after_effects": "After Effects",
        "premiere pro": "Premiere Pro",
        "photoshop": "Photoshop",
        "illustrator": "Illustrator",
        "vs code": "VS Code",
        "visual studio code": "VS Code",
        "android studio": "Android Studio",
        "intellij idea": "IntelliJ IDEA",
    }
    for key, value in aliases.items():
        if key in combined:
            return value
    return "the software"


def _build_export_steps(software_name: str) -> List[str]:
    if software_name == "After Effects":
        return [
            "Open the final composition you want to export and confirm the work area covers the full section you want in the video.",
            "Go to File > Export or Composition > Add to Render Queue so the finished composition is sent to the render pipeline.",
            "Open Render Settings and keep Best Settings unless you specifically need a draft or lower-resolution export.",
            "Open Output Module, choose a common delivery format, and confirm video/audio settings match the platform where you will publish.",
            "Choose the output folder and file name, then make sure you have enough disk space before starting the render.",
            "Start the export, wait for the render to finish, then play the file back fully to confirm video quality, timing, and audio are correct.",
        ]
    return [
        "Open the project or file you want to export and verify that the final edits are complete before starting.",
        "Use the export, render, or save-as-video option from the main menu so you are working from the app's supported export flow.",
        "Choose the output format, resolution, and quality settings that match where the file will be used.",
        "Select the save location and file name, then confirm storage space and permissions for that folder.",
        "Run the export and avoid editing the project until the process completes successfully.",
        "Open the exported file and check playback quality, size, and audio before sharing it or uploading it anywhere.",
    ]


def _build_tutorial_steps(query: str, software_name: str, context_steps: List[str]) -> List[str]:
    query_l = query.lower()
    if any(term in query_l for term in ["export", "render", "output"]):
        return _build_export_steps(software_name)
    if context_steps:
        return context_steps[:6]
    return [
        f"Open {software_name} and go to the exact screen or project area related to your request.",
        "Prepare the required file, settings, or assets first so you do not have to restart midway through the workflow.",
        "Use the main menu or toolbar option that matches the task you want to complete instead of testing random settings.",
        "Adjust the key options one by one and keep note of any setting changes that affect the result.",
        "Run the action once and review the output immediately so you can correct mistakes before continuing.",
        "Save the successful settings or document the working steps so the same task is faster next time.",
    ]


def _fallback_response(context: str, query: str) -> str:
    selected = _select_relevant_sentences(context, query, limit=3)
    context_steps = _extract_step_actions(context, limit=5)
    query_l = query.lower()

    software_name = _infer_software_name(context, query)
    is_tutorial = _is_tutorial_query(query)

    normalized_query = query.strip().rstrip("?")
    title = normalized_query if normalized_query.lower().startswith("how to ") else f"How to {normalized_query}"
    summary = (
        f"Use this task-focused guide for {software_name}. Follow the steps in order and verify the result after the export or action completes."
        if is_tutorial
        else f"Use this targeted troubleshooting plan for {software_name}. Make one change at a time so you can confirm which fix actually resolves the issue."
    )

    lines = [f"Title: {title}", f"Summary: {summary}", "", "Steps:"]

    steps = [
        "Confirm scope: identify the exact software version, affected file, and full error text before changing settings.",
        "Save your current work and create a backup so you can roll back if one of the fixes changes the project unexpectedly.",
        "Reproduce the problem once and note the exact action that triggers it.",
        "Apply one focused fix path at a time instead of changing several settings together.",
        "Repeat the same workflow to verify the issue is fully resolved.",
        "Document the working fix and update related software, plugins, or drivers if needed.",
    ]

    if is_tutorial:
        steps = _build_tutorial_steps(query, software_name, context_steps)
    elif ("background" in query_l and "photo" in query_l) or "remove bg" in query_l:
        variants = [
            [
                "Open the photo and launch the background removal tool.",
                "Mark the subject carefully, then refine hair and edge regions.",
                "Clean leftover artifacts with the eraser or mask refinement controls.",
                "Export as PNG and verify transparency on a dark and light background.",
            ],
            [
                "Import the image and switch to the cutout or remove-background workspace.",
                "Keep the subject, remove the backdrop, and inspect fine boundaries closely.",
                "Adjust feather and smooth settings to avoid jagged edges around the subject.",
                "Save in PNG format to preserve alpha transparency.",
            ],
        ]
        steps = random.choice(variants)
    elif any(k in query_l for k in ["internet", "no connection", "network", "offline"]):
        variants = [
            [
                "Confirm your device has internet access outside the app by opening another website first.",
                "Restart the app and your router, then test again.",
                "Retry in private browsing mode or with extensions disabled to rule out conflicts.",
                "Temporarily disable VPN or proxy settings and check firewall or antivirus rules.",
                "Clear DNS cache or reset network settings if the issue still appears.",
            ],
            [
                "Verify the URL and test two different websites to confirm whether the failure is app-specific or system-wide.",
                "Update the app to the latest stable version and restart the computer.",
                "Disable all extensions or plugins, then re-enable them one by one to identify the blocker.",
                "Check system date and time settings together with any certificate warnings.",
                "If the issue remains, reset the app network-related settings to defaults and retry.",
            ],
        ]
        steps = random.choice(variants)
    elif context_steps:
        steps = context_steps[:5] + ["If unresolved, share exact error text and a screenshot for deeper diagnosis."]

    for idx, step in enumerate(steps, start=1):
        lines.append(f"{idx}. {step}")

    lines.append("")
    lines.append("Checklist:")
    if is_tutorial:
        lines.append("- Confirm the final output opens correctly and matches the expected quality or format.")
        lines.append("- Check the save location, file name, and export settings before closing the software.")
        lines.append("- Repeat the workflow once more if you need to confirm the process is now reliable.")
    else:
        lines.append("- Restart the software and test the same workflow.")
        lines.append("- Confirm no new warning or error is introduced.")
        lines.append("- Verify permissions, plugins, and related system dependencies if the issue affects multiple users.")

    lines.append("")
    lines.append("Tips:")
    lines.append("- Keep the exact version number and full error text when asking for a deeper fix.")
    if is_tutorial:
        lines.append("- Save a reusable preset or note the successful settings if this is a task you repeat often.")
    else:
        lines.append("- Change one setting at a time so the successful fix is easy to identify.")

    if selected:
        lines.append("")
        lines.append("Evidence:")
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
