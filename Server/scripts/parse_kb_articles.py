import csv
import re
from pathlib import Path

KB_DIR = Path("data\\kb\\articles")
INDEX_FILE = Path("data\\kb\\articles\\kb_index.csv")
OUTPUT_FILE = Path("data\\processed\\kb_dataset.csv")

def parse_md(md_path):
    text = md_path.read_text(encoding="utf-8", errors="ignore")

    title = re.search(r"Title:\s*(.*)", text)
    tags = re.search(r"Tags:\s*(.*)", text, re.IGNORECASE)
    steps = re.findall(r"\d+\.\s+(.*)", text)

    return {
        "title": title.group(1).strip() if title else "",
        "tags": tags.group(1).strip() if tags else "",
        "steps": " | ".join(steps),
        "full_text": text.replace("\n", " ")
    }

def main():
    rows = []

    with open(INDEX_FILE, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        for r in reader:
            if len(r) < 3:
                continue

            error_id = r[0]
            md_path = Path(r[2])

            if not md_path.exists():
                print(f"[WARN] Missing: {md_path}")
                continue

            parsed = parse_md(md_path)
            rows.append([
                error_id,
                parsed["title"],
                parsed["tags"],
                parsed["full_text"],
                parsed["steps"]
            ])

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["error_id", "title", "tags", "full_text", "steps"])
        writer.writerows(rows)

    print(f"✅ KB dataset created: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
