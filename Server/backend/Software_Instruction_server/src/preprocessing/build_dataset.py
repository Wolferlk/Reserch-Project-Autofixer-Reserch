import os
import json
import re
import pandas as pd
from sklearn.model_selection import train_test_split
from datetime import datetime

TEXT_DIR = "../../data/extracted_text"
OCR_DIR = "../../data/ocr_text"
OUTPUT_DIR = "../../data/processed_dataset"
REPORT_DIR = "../../data/reports"

os.makedirs(OUTPUT_DIR, exist_ok=True)

CHUNK_SIZE = 400  # words per chunk


# -------------------------------
# TEXT CLEANING FUNCTION
# -------------------------------
def clean_text(text):
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^a-zA-Z0-9\s\.\,\-]', '', text)
    return text.strip()


# -------------------------------
# AUTO LABEL PROBLEM TYPE
# -------------------------------
def label_problem_type(text):
    if any(word in text for word in ["error", "failed", "issue", "crash", "bug"]):
        return "error_fix"
    elif any(word in text for word in ["install", "setup", "configure"]):
        return "installation"
    elif any(word in text for word in ["how to", "steps", "guide", "tutorial"]):
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
        chunk = " ".join(words[i:i+chunk_size])
        if len(chunk.split()) > 50:  # ignore very small chunks
            chunks.append(chunk)

    return chunks


# -------------------------------
# BUILD DATASET
# -------------------------------
def build_dataset():
    records = []

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

            for chunk in chunks:
                problem_type = label_problem_type(chunk)

                records.append({
                    "software": software,
                    "source_file": file,
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

                for chunk in chunks:
                    problem_type = label_problem_type(chunk)

                    records.append({
                        "software": software,
                        "text": chunk,
                        "problem_type": problem_type
                    })

    df = pd.DataFrame(records)

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
        "training_records": len(train_df),
        "testing_records": len(test_df),
        "class_distribution": df["problem_type"].value_counts().to_dict(),
        "generated_at": str(datetime.now())
    }

    with open(os.path.join(REPORT_DIR, "ml_dataset_report.json"), "w") as f:
        json.dump(dataset_report, f, indent=4)

    print("\n✅ DATASET BUILT SUCCESSFULLY")
    print(dataset_report)


if __name__ == "__main__":
    build_dataset()