from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import uuid
import logging
import sys
import time
import re
import html
import random
from typing import Dict, Any, Optional

from backend.ocr.ocr_engine import extract_text, clean_text
from backend.retriever.kb_retriever import KBRetriever
from backend.generator.infer_generator import generate_fix

# --------------------------------------------------
# Logging setup
# --------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("AUTO_FIXER")

# --------------------------------------------------
# App setup
# --------------------------------------------------
app = FastAPI(title="Auto Fixer V6 – AI Troubleshooting System")

# ✅ CORS FIX
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_STATUS: Dict[str, str] = {}
SOFTWARE_INSTRUCTION_STATUS = "not_loaded"
_SOFTWARE_INSTRUCTION_CACHE: Dict[str, Any] = {}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    logger.info("➡️ [%s] %s", request.method, request.url.path)
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "⬅️ [%s] %s | status=%s | %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


def _mount_service(service_name: str, path: str, module_path: str) -> None:
    """Import and mount sub-services without crashing the main API."""
    try:
        module = __import__(module_path, fromlist=["app"])
        sub_app = getattr(module, "app", None)
        if sub_app is None:
            raise RuntimeError(f"No 'app' object found in {module_path}")
        app.mount(path, sub_app)
        SERVICE_STATUS[service_name] = "mounted"
        logger.info("✅ Mounted %s service at %s", service_name, path)
    except Exception as exc:
        SERVICE_STATUS[service_name] = f"failed: {exc.__class__.__name__}"
        logger.exception("❌ Failed to mount %s service (%s)", service_name, module_path)


_mount_service("chatbot", "/chatbot", "backend.chatbot_winerror.ml_backend.app")
_mount_service("recommendation", "/recommendation", "backend.recomondation_service.backend.app")

# --------------------------------------------------
# Upload directory
# --------------------------------------------------
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# Load retriever once
# --------------------------------------------------
logger.info("📚 Loading knowledge base retriever...")
retriever = KBRetriever()
retriever.load()
logger.info("✅ Knowledge base loaded")


def _strip_step_prefix(text: str) -> str:
    return re.sub(r"^\s*(?:\d+[\.\)]|[-*•])\s*", "", text).strip()


def _clean_step_text(text: str) -> str:
    cleaned = html.unescape(text or "")
    cleaned = cleaned.replace("\r", " ").replace("\n", " ").strip()
    cleaned = cleaned.replace("&nbsp", " ").replace("nbsp", " ")
    cleaned = re.sub(r"[%/\\][a-z]{2,5}\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^A-Za-z0-9\s\.,:;'\-\(\)/]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -.;")
    cleaned = _strip_step_prefix(cleaned)
    return cleaned


def _is_valid_step(text: str) -> bool:
    if not text or len(text) < 12:
        return False
    if len(text) > 220:
        return False
    if re.search(r"\b(?:nbsp|nba|nbc|lorem|undefined|null)\b", text, flags=re.IGNORECASE):
        return False
    alpha_chars = len(re.findall(r"[A-Za-z]", text))
    return alpha_chars >= 8


def _extract_numbered_steps(text: str) -> list[str]:
    if not text:
        return []
    normalized = html.unescape(text).replace("\r", "\n")
    chunks = re.split(r"\n+|(?=\s*\d+[\.\)])|(?=\s*[•\-]\s+)", normalized)
    steps: list[str] = []
    for chunk in chunks:
        cleaned = _clean_step_text(chunk)
        if _is_valid_step(cleaned):
            steps.append(cleaned)
    return steps


def _extract_kb_steps(kb_results: list[dict]) -> list[str]:
    steps: list[str] = []
    for item in kb_results or []:
        raw = str(item.get("steps", ""))
        for part in raw.split("|"):
            cleaned = _clean_step_text(part)
            if _is_valid_step(cleaned):
                steps.append(cleaned)
    return steps


def _dedupe_steps(steps: list[str]) -> list[str]:
    seen = set()
    out: list[str] = []
    for step in steps:
        key = re.sub(r"\W+", "", step.lower())
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(step)
    return out


def _fallback_steps(cleaned_text: str) -> list[str]:
    issue_hint = cleaned_text.strip() or "the error message shown in your screenshot"
    return [
        f"Confirm the exact error by reproducing the issue and noting when it appears: {issue_hint[:120]}",
        "Check recent system changes (updates, drivers, or newly installed software) and undo the most recent one first.",
        "Run a full malware scan and repair corrupted system files using built-in tools (SFC and DISM).",
        "Restart the related service or application, then retry the same action to verify whether the issue is resolved.",
        "If the issue remains, apply the latest stable Windows and driver updates, then test again.",
    ]


def _build_professional_fix_plan(
    cleaned_text: str,
    kb_results: list[dict],
    generated_text: str,
    file_id: str,
) -> tuple[str, list[str]]:
    generated_steps = _extract_numbered_steps(generated_text)
    kb_steps = _extract_kb_steps(kb_results)

    # Prefer model output when it's usable; otherwise rely on curated KB steps.
    base_steps = generated_steps if len(generated_steps) >= 3 else kb_steps
    merged_steps = _dedupe_steps(base_steps + kb_steps)

    if len(merged_steps) < 3:
        merged_steps = _fallback_steps(cleaned_text)

    rng = random.Random(hash(file_id))
    selected = merged_steps[:8]

    # Add light variation while preserving logical flow.
    if len(selected) > 4 and rng.random() > 0.5:
        selected[1], selected[2] = selected[2], selected[1]

    intros = [
        "Recommended professional troubleshooting plan:",
        "Follow these validated steps to resolve the issue:",
        "Use this clear step-by-step fix plan:",
    ]
    intro = intros[rng.randint(0, len(intros) - 1)]
    fix_text = intro + "\n" + "\n".join(f"{i + 1}. {step}" for i, step in enumerate(selected))
    return fix_text, selected

# --------------------------------------------------
# Health check
# --------------------------------------------------
@app.get("/")
def root():
    logger.info("🩺 Health check called")
    return {"status": "Auto Fixer V6 backend running"}


@app.get("/services/status")
def services_status():
    logger.info("🧾 Service status requested")
    return {
        **SERVICE_STATUS,
        "software_instruction": SOFTWARE_INSTRUCTION_STATUS,
    }


class SoftwareInstructionRequest(BaseModel):
    message: str
    software: Optional[str] = None


def _normalize_software_name(name: str) -> str:
    return (
        name.strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def _load_software_instruction_modules() -> Dict[str, Any]:
    global SOFTWARE_INSTRUCTION_STATUS

    if _SOFTWARE_INSTRUCTION_CACHE:
        return _SOFTWARE_INSTRUCTION_CACHE

    try:
        logger.info("📚 Loading software instruction modules...")
        software_src = Path(__file__).resolve().parent / "Software_Instruction_server" / "src"
        if str(software_src) not in sys.path:
            sys.path.insert(0, str(software_src))

        from retrieval.search_engine import get_available_softwares, search  # type: ignore
        from response_generator.generate_response import generate_detailed_response  # type: ignore

        _SOFTWARE_INSTRUCTION_CACHE["get_available_softwares"] = get_available_softwares
        _SOFTWARE_INSTRUCTION_CACHE["search"] = search
        _SOFTWARE_INSTRUCTION_CACHE["generate_detailed_response"] = generate_detailed_response
        SOFTWARE_INSTRUCTION_STATUS = "loaded"
        logger.info("✅ Software instruction modules loaded")
        return _SOFTWARE_INSTRUCTION_CACHE
    except Exception as exc:
        SOFTWARE_INSTRUCTION_STATUS = f"failed: {exc.__class__.__name__}"
        logger.exception("❌ Failed to load software instruction modules")
        raise


def _resolve_software_scope(software: Optional[str], available: list[str]) -> Optional[str]:
    if not software:
        return None

    requested = _normalize_software_name(software)
    normalized_available = {_normalize_software_name(s): s for s in available}

    alias_map = {
        "ps": "photoshop",
        "adobe_photoshop": "photoshop",
        "illustrator": "illutrator",
        "adobe_illustrator": "illutrator",
        "ae": "after_effects",
        "aftereffects": "after_effects",
        "premiere": "premiere_pro",
        "premierepro": "premiere_pro",
        "androidstudio": "android_studio",
        "intellij": "intellij_idea",
        "vscode": "vs_code",
        "visual_studio_code": "vs_code",
        "7zip": "7_zip",
    }

    candidate = alias_map.get(requested, requested)
    return normalized_available.get(candidate)


def _format_scope_label(scope: Optional[str]) -> str:
    if not scope:
        return "General software guide"
    return scope.replace("_", " ").title()


def _extract_instruction_items(answer: str, heading: str, bullet_only: bool = False) -> list[str]:
    if not answer:
        return []

    lines = answer.replace("\r", "").split("\n")
    items: list[str] = []
    in_section = False

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if in_section and items:
                break
            continue

        if re.match(fr"^{re.escape(heading)}\s*:\s*$", line, flags=re.IGNORECASE):
            in_section = True
            continue

        if in_section and re.match(r"^[A-Za-z][A-Za-z ]{1,20}:\s*$", line):
            break

        if not in_section:
            continue

        match = re.match(r"^(?:\d+[\.\)]|[-*•])\s*(.+)$", line)
        if match:
            value = match.group(1).strip()
            if value:
                items.append(value)
            continue

        if not bullet_only:
            items.append(line)

    return items


def _extract_inline_value(answer: str, label: str) -> Optional[str]:
    match = re.search(fr"(?im)^{re.escape(label)}\s*:\s*(.+)$", answer or "")
    if not match:
        return None
    value = match.group(1).strip()
    return value or None


def _extract_steps_from_answer(answer: str) -> list[str]:
    if not answer:
        return []

    steps: list[str] = []
    for line in answer.replace("\r", "").split("\n"):
        cleaned = line.strip()
        match = re.match(r"^(?:\d+[\.\)]|step\s*\d+\s*[:\.\)-])\s*(.+)$", cleaned, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if len(value) >= 10:
                steps.append(value)
    return steps


def _parse_instruction_response(
    answer: str,
    message: str,
    software_scope: Optional[str],
    issue_type: str,
) -> Dict[str, Any]:
    title = _extract_inline_value(answer, "Title")
    summary = _extract_inline_value(answer, "Summary")
    steps = _extract_instruction_items(answer, "Steps") or _extract_steps_from_answer(answer)
    checklist = _extract_instruction_items(answer, "Checklist", bullet_only=True)
    tips = _extract_instruction_items(answer, "Tips", bullet_only=True)

    if not title:
        title = f"{_format_scope_label(software_scope)}: {message.strip().rstrip('?')}"

    if not summary:
        mode = "tutorial" if issue_type.lower() == "How To".lower() else "troubleshooting"
        summary = f"Structured {mode} guidance for {_format_scope_label(software_scope)}."

    if not checklist:
        checklist = [
            "Verify the result by repeating the same workflow once.",
            "Confirm no new warning, failure, or quality issue appears.",
        ]

    return {
        "title": title,
        "summary": summary,
        "steps": steps[:40],
        "checklist": checklist[:4],
        "tips": tips[:4],
    }


@app.get("/software-instruction/softwares")
def list_softwares():
    logger.info("📦 Listing software instruction scopes")
    try:
        modules = _load_software_instruction_modules()
        get_available_softwares = modules["get_available_softwares"]
        softwares = get_available_softwares()
        return {
            "softwares": softwares,
            "count": len(softwares),
        }
    except Exception as exc:
        logger.exception("Failed to list software instruction scopes")
        raise HTTPException(
            status_code=500,
            detail=f"Software instruction service unavailable: {exc.__class__.__name__}",
        )


@app.post("/software-instruction/chat")
def software_instruction_chat(payload: SoftwareInstructionRequest):
    logger.info("💬 Software instruction chat request received")
    message = payload.message.strip()
    if len(message) < 3:
        raise HTTPException(status_code=422, detail="Please provide a longer question.")

    try:
        modules = _load_software_instruction_modules()
        search = modules["search"]
        generate_detailed_response = modules["generate_detailed_response"]
        get_available_softwares = modules["get_available_softwares"]

        available_softwares = get_available_softwares()
        selected_software = _resolve_software_scope(payload.software, available_softwares)

        predicted_type, results = search(message, selected_software=selected_software)
        response_text = generate_detailed_response(message, predicted_type, results)

        evidence = []
        if results is not None and not results.empty and "text" in results.columns:
            for idx, row in enumerate(results.head(3).itertuples(index=False), start=1):
                row_dict = row._asdict() if hasattr(row, "_asdict") else {}
                snippet = str(row_dict.get("text", ""))[:220].replace("\n", " ").strip()
                if snippet:
                    evidence.append({"rank": idx, "snippet": snippet})

        issue_type = str(predicted_type).replace("_", " ").title()
        response_mode = "Tutorial guidance" if str(predicted_type) == "how_to" else "Troubleshooting guidance"
        if results is not None and not results.empty and "source" in results.columns:
            top_source = str(results.iloc[0].get("source", "")).strip().lower()
            top_doc_kind = str(results.iloc[0].get("doc_kind", "")).strip().lower()
            if top_source == "processed_steps" and top_doc_kind == "installation":
                issue_type = "How To"
                response_mode = "Tutorial guidance"

        scope = selected_software or "All software"
        structured = _parse_instruction_response(
            answer=response_text,
            message=message,
            software_scope=selected_software,
            issue_type=issue_type,
        )

        return {
            "software_scope": scope,
            "issue_type": issue_type,
            "response_mode": response_mode,
            "answer": response_text,
            **structured,
            "evidence": evidence,
            "result_count": 0 if results is None else int(len(results)),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Software instruction chat failed")
        raise HTTPException(
            status_code=500,
            detail=f"Software instruction chat failed: {exc.__class__.__name__}",
        )

# --------------------------------------------------
# Analyze endpoint
# --------------------------------------------------
@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    logger.info("📥 New analyze request received")

    file_id = str(uuid.uuid4())
    image_path = UPLOAD_DIR / f"{file_id}.png"

    # --------------------------------------------------
    # 1️⃣ Save uploaded file
    # --------------------------------------------------
    try:
        logger.info("💾 Saving uploaded image...")
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        logger.info(f"✅ Image saved: {image_path}")

    except Exception as e:
        logger.error(f"❌ File save failed: {e}")
        raise HTTPException(status_code=400, detail="Failed to save uploaded file")

    # --------------------------------------------------
    # 2️⃣ Image classification
    # --------------------------------------------------
    logger.info("🧠 Running image classification...")

    classification = {
        "label": None,
        "confidence": None,
        "error": None,
    }

    try:
        from backend.classifier.infer import classify_image

        classification = classify_image(str(image_path))

        logger.info(
            f"✅ Classification result: "
            f"{classification.get('label')} "
            f"(confidence={classification.get('confidence')})"
        )

    except Exception as e:
        logger.warning(f"⚠️ Image classification failed: {e}")
        classification["error"] = "Image classification failed"

    # --------------------------------------------------
    # 3️⃣ OCR
    # --------------------------------------------------
    logger.info("🔍 Running OCR...")

    raw_text = ""
    cleaned_text = ""

    try:
        raw_text = extract_text(str(image_path))
        cleaned_text = clean_text(raw_text)

        logger.info(
            f"✅ OCR completed | raw_chars={len(raw_text)} | clean_chars={len(cleaned_text)}"
        )

    except Exception as e:
        logger.warning(f"⚠️ OCR failed: {e}")

    # --------------------------------------------------
    # 4️⃣ Knowledge base retrieval
    # --------------------------------------------------
    logger.info("🔎 Identifying error from knowledge base...")

    kb_results = []

    try:
        if cleaned_text.strip():
            kb_results = retriever.query(cleaned_text, top_k=3)
            logger.info(f"✅ Found {len(kb_results)} related articles")
        else:
            logger.info("ℹ️ Skipping KB query (no extracted text)")

    except Exception as e:
        logger.warning(f"⚠️ KB retrieval failed: {e}")

    # --------------------------------------------------
    # 5️⃣ Fix generation
    # --------------------------------------------------
    logger.info("🛠 Generating fix steps...")

    generated_steps = ""
    fix_plan_steps: list[str] = []

    try:
        if kb_results:

            kb_context = " ".join(
                [r.get("steps", "") for r in kb_results]
            )

            prompt = (
                "Based on the following known fixing steps:\n"
                + kb_context
                + "\n\nGenerate professional, user-friendly step-by-step instructions for this error."
                + " Keep each step short, practical, and easy to follow.\nError:\n"
                + cleaned_text
            )

            raw_generated_steps = generate_fix(
                prompt,
                variation_seed=hash(file_id) % (2**31),
            )
            generated_steps, fix_plan_steps = _build_professional_fix_plan(
                cleaned_text=cleaned_text,
                kb_results=kb_results,
                generated_text=raw_generated_steps,
                file_id=file_id,
            )

            logger.info("✅ Fix generation completed")

        else:
            logger.info("ℹ️ Skipping fix generation (no KB results)")
            generated_steps, fix_plan_steps = _build_professional_fix_plan(
                cleaned_text=cleaned_text,
                kb_results=kb_results,
                generated_text="",
                file_id=file_id,
            )

    except Exception as e:
        logger.warning(f"⚠️ Fix generation failed: {e}")

    # --------------------------------------------------
    # Final response
    # --------------------------------------------------
    logger.info(f"🏁 Analyze request completed | image_id={file_id}")

    return {
        "image_id": file_id,
        "image_classification": classification,
        "ocr_text": raw_text,
        "clean_text": cleaned_text,
        "matched_articles": kb_results,
        "generated_fix": generated_steps,
        "fix_plan_steps": fix_plan_steps,
    }
