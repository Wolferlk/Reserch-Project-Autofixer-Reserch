import os
import pdfplumber
import json
from datetime import datetime

DATA_DIR = "../../data/softwares"
OUTPUT_TEXT_DIR = "../../data/extracted_text"
METADATA_DIR = "../../data/metadata"
REPORT_DIR = "../../data/reports"

os.makedirs(OUTPUT_TEXT_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)


def extract_pdf_text():
    dataset_stats = {
        "total_softwares": 0,
        "total_pdfs": 0,
        "total_pages": 0,
        "total_text_pages": 0
    }

    all_metadata = []

    for software in os.listdir(DATA_DIR):
        software_path = os.path.join(DATA_DIR, software)

        if not os.path.isdir(software_path):
            continue

        dataset_stats["total_softwares"] += 1
        software_output_dir = os.path.join(OUTPUT_TEXT_DIR, software)
        os.makedirs(software_output_dir, exist_ok=True)

        for pdf_file in os.listdir(software_path):
            if not pdf_file.endswith(".pdf"):
                continue

            dataset_stats["total_pdfs"] += 1

            pdf_path = os.path.join(software_path, pdf_file)
            print(f"Processing: {software} → {pdf_file}")

            with pdfplumber.open(pdf_path) as pdf:
                for page_number, page in enumerate(pdf.pages):
                    dataset_stats["total_pages"] += 1
                    text = page.extract_text()

                    if text and len(text.strip()) > 20:
                        dataset_stats["total_text_pages"] += 1

                        text_filename = f"{pdf_file.replace('.pdf','')}_page_{page_number+1}.txt"
                        text_path = os.path.join(software_output_dir, text_filename)

                        with open(text_path, "w", encoding="utf-8") as f:
                            f.write(text)

                        metadata_entry = {
                            "software": software,
                            "pdf_file": pdf_file,
                            "page_number": page_number + 1,
                            "text_file": text_filename
                        }

                        all_metadata.append(metadata_entry)

    # Save metadata
    metadata_file = os.path.join(METADATA_DIR, "text_metadata.json")
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(all_metadata, f, indent=4)

    # Save dataset report
    dataset_stats["generated_at"] = str(datetime.now())

    report_file = os.path.join(REPORT_DIR, "dataset_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(dataset_stats, f, indent=4)

    print("\n✅ TEXT EXTRACTION COMPLETE")
    print(dataset_stats)


if __name__ == "__main__":
    extract_pdf_text()