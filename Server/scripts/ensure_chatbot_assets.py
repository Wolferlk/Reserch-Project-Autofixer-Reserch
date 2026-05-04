from __future__ import annotations

import os
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[1]
LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1"

REPOSITORY = os.getenv("GITHUB_REPOSITORY", "Wolferlk/Reserch-Project-Autofixer-Reserch")
BRANCH = (
    os.getenv("MODEL_ASSET_BRANCH")
    or os.getenv("RAILWAY_GIT_BRANCH")
    or os.getenv("GIT_BRANCH")
    or "Production"
)
MEDIA_BASE_URL = os.getenv(
    "MODEL_ASSET_BASE_URL",
    f"https://media.githubusercontent.com/media/{REPOSITORY}/{BRANCH}/Server",
).rstrip("/")


REQUIRED_ASSETS = (
    # Screenshot scanner: image classifier, KB retriever, and generator model.
    (
        Path("models/classifier/cnn_classifier.pt"),
        40_000_000,
    ),
    (
        Path("models/retriever/tfidf.pkl"),
        100_000,
    ),
    (
        Path("models/retriever/kb_vectors.pkl"),
        500_000,
    ),
    (
        Path("data/processed/kb_dataset.csv"),
        500_000,
    ),
    (
        Path("models/generator/model.safetensors"),
        250_000_000,
    ),
    (
        Path("models/generator/spiece.model"),
        500_000,
    ),

    # Tutorial/software-instruction service.
    (
        Path("backend/Software_Instruction_server/data/processed_dataset/train.csv"),
        100_000,
    ),
    (
        Path("backend/Software_Instruction_server/data/models/problem_classifier.pkl"),
        1_000,
    ),

    # Hardware repair and recommendation service.
    (
        Path("backend/recomondation_service/backend/reco_model.pkl"),
        100_000,
    ),
    (
        Path("backend/recomondation_service/backend/reco_features.json"),
        100,
    ),
    (
        Path("backend/recomondation_service/backend/nlp_error_model_error_type.pkl"),
        100_000,
    ),
    (
        Path("backend/recomondation_service/backend/nlp_error_model_product.pkl"),
        10_000,
    ),
    (
        Path("backend/recomondation_service/backend/product_need_model.pkl"),
        1_000_000,
    ),
    (
        Path("backend/recomondation_service/data/shops.csv"),
        100_000,
    ),
    (
        Path("backend/recomondation_service/data/products.csv"),
        1_000_000,
    ),

    # Error fixer chatbot.
    (
        Path("backend/chatbot_winerror/ml_backend/models/sentence_transformer/model.safetensors"),
        80_000_000,
    ),
    (
        Path("backend/chatbot_winerror/ml_backend/models/error_database_no_emb.pkl"),
        1_000_000,
    ),
    (
        Path("backend/chatbot_winerror/ml_backend/models/embeddings.npy"),
        1_000_000,
    ),
)


def is_lfs_pointer(path: Path) -> bool:
    try:
        with path.open("rb") as handle:
            return handle.read(len(LFS_POINTER_PREFIX)) == LFS_POINTER_PREFIX
    except FileNotFoundError:
        return False


def asset_needs_download(path: Path, min_size: int) -> bool:
    if not path.exists():
        return True
    if is_lfs_pointer(path):
        return True
    return path.stat().st_size < min_size


def validate_asset(path: Path, min_size: int) -> None:
    if not path.exists():
        raise RuntimeError(f"required asset is missing: {path}")
    if is_lfs_pointer(path):
        raise RuntimeError(f"required asset is still a Git LFS pointer: {path}")
    if path.stat().st_size < min_size:
        raise RuntimeError(
            f"required asset is too small: {path} ({path.stat().st_size} bytes)"
        )


def download_asset(relative_path: Path, target: Path) -> None:
    url = f"{MEDIA_BASE_URL}/{relative_path.as_posix()}"
    target.parent.mkdir(parents=True, exist_ok=True)

    print(f"Downloading backend asset: {relative_path}")
    try:
        with urllib.request.urlopen(url, timeout=120) as response:
            with tempfile.NamedTemporaryFile(delete=False, dir=str(target.parent)) as tmp:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    tmp.write(chunk)
                temp_name = tmp.name
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"failed to download {url}: HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"failed to download {url}: {exc.reason}") from exc

    Path(temp_name).replace(target)


def main() -> int:
    print(f"Checking backend model assets from {MEDIA_BASE_URL}")
    for relative_path, min_size in REQUIRED_ASSETS:
        target = SERVER_ROOT / relative_path
        if asset_needs_download(target, min_size):
            download_asset(relative_path, target)
        validate_asset(target, min_size)

    print("Backend model assets are ready.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Backend asset check failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
