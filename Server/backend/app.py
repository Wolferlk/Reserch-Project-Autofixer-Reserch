from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import uuid
import logging
import sys
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

# --------------------------------------------------
# Health check
# --------------------------------------------------
@app.get("/")
def root():
    logger.info("🩺 Health check called")
    return {"status": "Auto Fixer V6 backend running"}


@app.get("/services/status")
def services_status():
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
        software_src = Path(__file__).resolve().parent / "Software_Instruction_server" / "src"
        if str(software_src) not in sys.path:
            sys.path.insert(0, str(software_src))

        from retrieval.search_engine import get_available_softwares, search  # type: ignore
        from response_generator.generate_response import generate_detailed_response  # type: ignore

        _SOFTWARE_INSTRUCTION_CACHE["get_available_softwares"] = get_available_softwares
        _SOFTWARE_INSTRUCTION_CACHE["search"] = search
        _SOFTWARE_INSTRUCTION_CACHE["generate_detailed_response"] = generate_detailed_response
        SOFTWARE_INSTRUCTION_STATUS = "loaded"
        return _SOFTWARE_INSTRUCTION_CACHE
    except Exception as exc:
        SOFTWARE_INSTRUCTION_STATUS = f"failed: {exc.__class__.__name__}"
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


@app.get("/software-instruction/softwares")
def list_softwares():
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
        scope = selected_software or "All software"

        return {
            "software_scope": scope,
            "issue_type": issue_type,
            "answer": response_text,
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

    try:
        if kb_results:

            kb_context = " ".join(
                [r.get("steps", "") for r in kb_results]
            )

            prompt = (
                "Based on the following known fixing steps:\n"
                + kb_context
                + "\n\nGenerate clear step-by-step instructions for this error:\n"
                + cleaned_text
            )

            generated_steps = generate_fix(prompt)

            logger.info("✅ Fix generation completed")

        else:
            logger.info("ℹ️ Skipping fix generation (no KB results)")

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
    }
