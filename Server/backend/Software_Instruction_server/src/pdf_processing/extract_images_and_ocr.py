import os
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import json
from datetime import datetime

DATA_DIR = "../../data/softwares"
IMAGE_DIR = "../../data/extracted_images"
OCR_DIR = "../../data/ocr_text"
REPORT_DIR = "../../data/reports"

os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(OCR_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

def process_pdfs_for_images():
    ocr_stats = {
        "total_images_extracted": 0,
        "total_images_with_text": 0
    }

    for software in os.listdir(DATA_DIR):
        software_path = os.path.join(DATA_DIR, software)
        if not os.path.isdir(software_path):
            continue

        software_image_dir = os.path.join(IMAGE_DIR, software)
        software_ocr_dir = os.path.join(OCR_DIR, software)

        os.makedirs(software_image_dir, exist_ok=True)
        os.makedirs(software_ocr_dir, exist_ok=True)

        for pdf_file in os.listdir(software_path):
            if not pdf_file.endswith(".pdf"):
                continue

            pdf_path = os.path.join(software_path, pdf_file)
            print(f"Extracting images from: {software} → {pdf_file}")

            doc = fitz.open(pdf_path)

            for page_index in range(len(doc)):
                page = doc[page_index]
                image_list = page.get_images(full=True)

                for img_index, img in enumerate(image_list):
                    ocr_stats["total_images_extracted"] += 1

                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]

                    image_filename = f"{pdf_file.replace('.pdf','')}_page_{page_index+1}_{img_index}.{image_ext}"
                    image_path = os.path.join(software_image_dir, image_filename)

                    with open(image_path, "wb") as img_file:
                        img_file.write(image_bytes)

                    # OCR processing
                    try:
                        image = Image.open(image_path)
                        text = pytesseract.image_to_string(image)

                        if text.strip():
                            ocr_stats["total_images_with_text"] += 1
                            ocr_filename = image_filename.replace(f".{image_ext}", ".txt")
                            ocr_path = os.path.join(software_ocr_dir, ocr_filename)

                            with open(ocr_path, "w", encoding="utf-8") as f:
                                f.write(text)

                    except Exception as e:
                        print(f"OCR error: {e}")

    # Save OCR report
    ocr_stats["generated_at"] = str(datetime.now())
    report_path = os.path.join(REPORT_DIR, "ocr_report.json")

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(ocr_stats, f, indent=4)

    print("\n✅ IMAGE + OCR PROCESSING COMPLETE")
    print(ocr_stats)


if __name__ == "__main__":
    process_pdfs_for_images()