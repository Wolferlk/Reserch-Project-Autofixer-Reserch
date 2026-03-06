import os

DATA_DIR = "../data/softwares"

def check_dataset():
    print("\n=== DATASET SUMMARY ===\n")
    total_pdfs = 0

    for software in os.listdir(DATA_DIR):
        path = os.path.join(DATA_DIR, software)

        if os.path.isdir(path):
            pdfs = [f for f in os.listdir(path) if f.endswith(".pdf")]
            print(f"{software} → {len(pdfs)} PDFs")
            total_pdfs += len(pdfs)

    print("\nTotal PDFs:", total_pdfs)

if __name__ == "__main__":
    check_dataset()