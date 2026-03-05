from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import uuid
import logging
from typing import Dict

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
    return SERVICE_STATUS

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
