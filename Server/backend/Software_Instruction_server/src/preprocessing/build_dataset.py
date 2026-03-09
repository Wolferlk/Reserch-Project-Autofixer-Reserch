import os
import json
import re
import pandas as pd
from sklearn.model_selection import train_test_split
from datetime import datetime
from collections import Counter

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))

TEXT_DIR = os.path.join(PROJECT_ROOT, "data", "extracted_text")
OCR_DIR = os.path.join(PROJECT_ROOT, "data", "ocr_text")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "processed_dataset")
REPORT_DIR = os.path.join(PROJECT_ROOT, "data", "reports")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

CHUNK_SIZE = 320
MIN_CHUNK_WORDS = 45
MAX_CHUNK_WORDS = 420


# -------------------------------
# TEXT CLEANING FUNCTION
# -------------------------------
def clean_text(text):
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^a-zA-Z0-9\s\.\,\-\:\(\)\/]', ' ', text)
    return text.strip()


def is_high_quality_chunk(text):
    words = text.split()
    if len(words) < MIN_CHUNK_WORDS:
        return False

    alpha_words = [w for w in words if re.search(r"[a-zA-Z]", w)]
    alpha_ratio = len(alpha_words) / max(len(words), 1)
    if alpha_ratio < 0.65:
        return False

    unique_ratio = len(set(words)) / max(len(words), 1)
    if unique_ratio < 0.22:
        return False

    return True


# -------------------------------
# AUTO LABEL PROBLEM TYPE
# -------------------------------
def label_problem_type(text):
    error_words = [
        "error", "failed", "issue", "crash", "bug", "not working",
        "unable to", "exception", "fix", "resolve", "troubleshoot",
    ]
    install_words = [
        "install", "setup", "configure", "configuration", "deployment",
        "requirements", "prerequisite",
    ]
    tutorial_words = [
        "how to", "steps", "guide", "tutorial", "walkthrough",
        "procedure", "instructions", "best practice",
    ]

    if any(word in text for word in error_words):
        return "error_fix"
    elif any(word in text for word in install_words):
        return "installation"
    elif any(word in text for word in tutorial_words):
        return "how_to"
    else:
        return "general"


# -------------------------------
# CHUNKING FUNCTION
# -------------------------------
def chunk_text(text, chunk_size):
    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size):
        chunk_words = words[i:i + chunk_size]
        if len(chunk_words) > MAX_CHUNK_WORDS:
            chunk_words = chunk_words[:MAX_CHUNK_WORDS]

        chunk = " ".join(chunk_words)
        if is_high_quality_chunk(chunk):
            chunks.append(chunk)

    return chunks


# -------------------------------
# BUILD DATASET
# -------------------------------
def build_dataset():
    records = []
    source_counts = Counter()
    skipped_low_quality = 0

    for software in os.listdir(TEXT_DIR):
        software_path = os.path.join(TEXT_DIR, software)
        if not os.path.isdir(software_path):
            continue

        # Process extracted text
        for file in os.listdir(software_path):
            if not file.endswith(".txt"):
                continue

            file_path = os.path.join(software_path, file)

            with open(file_path, "r", encoding="utf-8") as f:
                text = clean_text(f.read())

            chunks = chunk_text(text, CHUNK_SIZE)
            source_counts["text_chunks"] += len(chunks)
            if text and not chunks:
                skipped_low_quality += 1

            for chunk in chunks:
                problem_type = label_problem_type(chunk)

                records.append({
                    "software": software,
                    "source_file": file,
                    "source_type": "text",
                    "text": chunk,
                    "problem_type": problem_type
                })

        # Process OCR text
        ocr_software_path = os.path.join(OCR_DIR, software)
        if os.path.exists(ocr_software_path):
            for file in os.listdir(ocr_software_path):
                if not file.endswith(".txt"):
                    continue

                file_path = os.path.join(ocr_software_path, file)

                with open(file_path, "r", encoding="utf-8") as f:
                    text = clean_text(f.read())

                chunks = chunk_text(text, CHUNK_SIZE)
                source_counts["ocr_chunks"] += len(chunks)
                if text and not chunks:
                    skipped_low_quality += 1

                for chunk in chunks:
                    problem_type = label_problem_type(chunk)

                    records.append({
                        "software": software,
                        "source_file": file,
                        "source_type": "ocr",
                        "text": chunk,
                        "problem_type": problem_type
                    })

    df = pd.DataFrame(records)
    if df.empty:
        raise RuntimeError("No valid records were generated. Check extracted text/OCR inputs.")

    before_dedup = len(df)
    df = df.drop_duplicates(subset=["software", "text"]).reset_index(drop=True)
    deduped_count = before_dedup - len(df)

    # Train Test Split
    train_df, test_df = train_test_split(
        df,
        test_size=0.3,
        random_state=42,
        stratify=df["problem_type"]
    )

    train_df.to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
    test_df.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)

    # Dataset Report
    dataset_report = {
        "total_records": len(df),
        "removed_duplicates": deduped_count,
        "skipped_low_quality_documents": skipped_low_quality,
        "training_records": len(train_df),
        "testing_records": len(test_df),
        "num_softwares": int(df["software"].nunique()),
        "avg_words_per_chunk": float(df["text"].str.split().str.len().mean()),
        "median_words_per_chunk": int(df["text"].str.split().str.len().median()),
        "source_distribution": df["source_type"].value_counts().to_dict(),
        "class_distribution": df["problem_type"].value_counts().to_dict(),
        "generated_at": str(datetime.now())
    }

    with open(os.path.join(REPORT_DIR, "ml_dataset_report.json"), "w") as f:
        json.dump(dataset_report, f, indent=4)

    with open(os.path.join(REPORT_DIR, "ml_dataset_report.txt"), "w", encoding="utf-8") as f:
        f.write("Software Instruction Dataset Report\n")
        f.write("=" * 40 + "\n")
        for key, value in dataset_report.items():
            f.write(f"{key}: {value}\n")

    print("\n[OK] DATASET BUILT SUCCESSFULLY")
    print(dataset_report)


if __name__ == "__main__":
    build_dataset()
