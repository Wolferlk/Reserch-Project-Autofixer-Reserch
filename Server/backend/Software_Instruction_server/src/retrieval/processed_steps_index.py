from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    import pdfplumber
except ModuleNotFoundError:
    pdfplumber = None


BASE_DIR = Path(__file__).resolve().parents[2]
PROCESSED_STEPS_DIR = BASE_DIR / "data" / "Prossedsteps"
CACHE_DIR = BASE_DIR / "data" / "cache"
EXTRACTED_TEXT_DIR = CACHE_DIR / "processed_steps_text"
INDEX_CACHE_PATH = CACHE_DIR / "processed_steps_index.json"
VOCAB_CACHE_PATH = CACHE_DIR / "processed_steps_vocabulary.txt"


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _normalize_slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")


def _display_name(slug: str) -> str:
    return slug.replace("_", " ").title()


def _infer_software_slug(file_name: str) -> str:
    stem = Path(file_name).stem.lower()
    stem = re.sub(r"\s*\(\d+\)\s*$", "", stem)
    stem = re.sub(
        r"_(common_errors.*|detailed_error_fixing_steps_dataset|installation_step_by_step.*|detailed_installation_steps_dataset|installation_steps|complete_guide|troubleshooting_extended)$",
        "",
        stem,
    )
    return _normalize_slug(stem)


def _extract_pdf_text(pdf_path: Path) -> str:
    EXTRACTED_TEXT_DIR.mkdir(parents=True, exist_ok=True)
    text_cache_path = EXTRACTED_TEXT_DIR / f"{pdf_path.stem}.txt"

    if text_cache_path.exists() and text_cache_path.stat().st_mtime >= pdf_path.stat().st_mtime:
        return text_cache_path.read_text(encoding="utf-8")

    if pdfplumber is None:
        return ""

    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            page_text = page_text.replace("\x00", " ")
            if page_text.strip():
                pages.append(page_text.strip())

    combined = "\n\n".join(pages).strip()
    text_cache_path.write_text(combined, encoding="utf-8")
    return combined


def _extract_steps(text: str) -> list[str]:
    steps: list[str] = []
    for raw_line in (text or "").replace("\r", "\n").split("\n"):
        line = raw_line.strip()
        match = re.match(r"^(?:Step\s*\d+[:\-]|Step\s*\d+\s*fi|\d+[\.\)])\s*(.+)$", line, flags=re.IGNORECASE)
        if not match:
            continue
        value = match.group(1).strip(" .-")
        value = value.replace(" fi ", " > ")
        value = _normalize_whitespace(value)
        if len(value) >= 6:
            steps.append(value)
    return steps


def _parse_issue_blocks(text: str, software_slug: str, pdf_name: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    normalized = (text or "").replace("\r", "\n")
    matches = list(
        re.finditer(
            r"(ERROR\s+\d+\s+[–-]\s+.+?)(?=(?:\n\s*ERROR\s+\d+\s+[–-]\s+)|\Z)",
            normalized,
            flags=re.IGNORECASE | re.DOTALL,
        )
    )

    for match in matches:
        block = match.group(1).strip()
        title_match = re.search(r"ERROR\s+\d+\s+[–-]\s*(.+)", block, flags=re.IGNORECASE)
        cause_match = re.search(r"Cause:\s*(.+?)(?=\n(?:Solution Steps:|Step\s*\d+)|$)", block, flags=re.IGNORECASE | re.DOTALL)
        steps = _extract_steps(block)
        if not title_match or not steps:
            continue

        title = _normalize_whitespace(title_match.group(1))
        cause = _normalize_whitespace(cause_match.group(1)) if cause_match else ""
        summary = cause or f"Focused troubleshooting steps for {title.lower()} in {_display_name(software_slug)}."
        blocks.append(
            {
                "software": software_slug,
                "software_display": _display_name(software_slug),
                "pdf_file": pdf_name,
                "doc_kind": "error_fix",
                "title": title,
                "summary": summary,
                "steps": steps[:40],
                "text": _normalize_whitespace(block),
            }
        )
    return blocks


def _parse_installation_guides(text: str, software_slug: str, pdf_name: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    normalized = (text or "").replace("\r", "\n")
    lines = [line.strip() for line in normalized.split("\n") if line.strip()]
    if not lines:
        return records

    title = lines[0]
    main_text = normalized.split("COMMON INSTALLATION ISSUES", 1)[0]
    main_steps = _extract_steps(main_text)
    if main_steps:
        records.append(
            {
                "software": software_slug,
                "software_display": _display_name(software_slug),
                "pdf_file": pdf_name,
                "doc_kind": "installation",
                "title": title,
                "summary": f"Step-by-step installation workflow for {_display_name(software_slug)}.",
                "steps": main_steps[:40],
                "text": _normalize_whitespace(main_text),
            }
        )

    issue_matches = list(
        re.finditer(
            r"Issue:\s*(.+?)\s*Solution:\s*(.+?)(?=\n\s*Issue:|\n\s*This document|\Z)",
            normalized,
            flags=re.IGNORECASE | re.DOTALL,
        )
    )
    for match in issue_matches:
        issue_title = _normalize_whitespace(match.group(1))
        issue_text = match.group(2).strip()
        steps = _extract_steps(issue_text)
        if not steps:
            continue
        records.append(
            {
                "software": software_slug,
                "software_display": _display_name(software_slug),
                "pdf_file": pdf_name,
                "doc_kind": "error_fix",
                "title": issue_title,
                "summary": f"Installation troubleshooting for {issue_title.lower()} in {_display_name(software_slug)}.",
                "steps": steps[:40],
                "text": _normalize_whitespace(issue_text),
            }
        )
    return records


def _build_records() -> list[dict[str, Any]]:
    if not PROCESSED_STEPS_DIR.exists():
        return []

    records: list[dict[str, Any]] = []
    for pdf_path in sorted(PROCESSED_STEPS_DIR.glob("*.pdf")):
        extracted_text = _extract_pdf_text(pdf_path)
        if not extracted_text.strip():
            continue

        software_slug = _infer_software_slug(pdf_path.name)
        lower_name = pdf_path.stem.lower()
        if "common_errors" in lower_name or "error" in lower_name or "troubleshooting" in lower_name:
            records.extend(_parse_issue_blocks(extracted_text, software_slug, pdf_path.name))
        if "installation" in lower_name or "guide" in lower_name:
            records.extend(_parse_installation_guides(extracted_text, software_slug, pdf_path.name))

    return records


def _load_or_build_records() -> list[dict[str, Any]]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    latest_pdf_mtime = 0.0
    if PROCESSED_STEPS_DIR.exists():
        pdf_mtimes = [path.stat().st_mtime for path in PROCESSED_STEPS_DIR.glob("*.pdf")]
        latest_pdf_mtime = max(pdf_mtimes, default=0.0)

    if INDEX_CACHE_PATH.exists() and (pdfplumber is None or INDEX_CACHE_PATH.stat().st_mtime >= latest_pdf_mtime):
        return json.loads(INDEX_CACHE_PATH.read_text(encoding="utf-8"))

    if pdfplumber is None:
        return []

    records = _build_records()
    INDEX_CACHE_PATH.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return records


class ProcessedStepsIndex:
    def __init__(self) -> None:
        self.records = _load_or_build_records()
        self.df = pd.DataFrame(self.records)
        self.word_vectorizer: TfidfVectorizer | None = None
        self.char_vectorizer: TfidfVectorizer | None = None
        self.word_matrix = None
        self.char_matrix = None
        if not self.df.empty:
            self._fit()

    def _fit(self) -> None:
        corpus = (
            self.df["software_display"].fillna("")
            + " "
            + self.df["title"].fillna("")
            + " "
            + self.df["summary"].fillna("")
            + " "
            + self.df["text"].fillna("")
            + " "
            + self.df["steps"].apply(lambda items: " ".join(items) if isinstance(items, list) else "")
        )

        vocab_terms = sorted(set(re.findall(r"[a-z0-9]{3,}", " ".join(corpus).lower())))
        VOCAB_CACHE_PATH.write_text("\n".join(vocab_terms), encoding="utf-8")
        loaded_vocab = [line.strip() for line in VOCAB_CACHE_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]

        self.word_vectorizer = TfidfVectorizer(
            vocabulary=loaded_vocab,
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        self.char_vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 5),
            sublinear_tf=True,
        )
        self.word_matrix = self.word_vectorizer.fit_transform(corpus)
        self.char_matrix = self.char_vectorizer.fit_transform(corpus)

    def search(self, query: str, selected_software: str | None = None, top_k: int = 5) -> pd.DataFrame:
        if self.df.empty or self.word_vectorizer is None or self.char_vectorizer is None:
            return pd.DataFrame()

        filtered = self.df
        if selected_software:
            software_slug = _normalize_slug(selected_software)
            scoped = filtered[filtered["software"] == software_slug]
            if not scoped.empty:
                filtered = scoped

        if filtered.empty:
            return pd.DataFrame()

        query_text = _normalize_whitespace(query)
        query_l = query_text.lower()
        install_intent = any(term in query_l for term in ["install", "installation", "setup", "set up", "download"])
        troubleshooting_intent = any(
            term in query_l for term in ["error", "fix", "issue", "problem", "failed", "failure", "crash", "memory"]
        )
        word_query = self.word_vectorizer.transform([query_text])
        char_query = self.char_vectorizer.transform([query_text.lower()])

        candidate_idx = filtered.index.to_numpy()
        word_scores = cosine_similarity(word_query, self.word_matrix[candidate_idx]).flatten()
        char_scores = cosine_similarity(char_query, self.char_matrix[candidate_idx]).flatten()

        query_tokens = set(re.findall(r"[a-z0-9]{3,}", query_text.lower()))
        scored_rows: list[dict[str, Any]] = []
        for pos, row_idx in enumerate(candidate_idx):
            row = filtered.loc[row_idx].to_dict()
            title_tokens = set(re.findall(r"[a-z0-9]{3,}", str(row.get("title", "")).lower()))
            overlap = len(query_tokens & title_tokens) / max(1, len(query_tokens))
            combined = (0.68 * float(word_scores[pos])) + (0.32 * float(char_scores[pos])) + (0.22 * overlap)

            doc_kind = str(row.get("doc_kind", ""))
            title_l = str(row.get("title", "")).lower()
            if install_intent and not troubleshooting_intent:
                if doc_kind == "installation":
                    combined += 0.18
                else:
                    combined -= 0.14
                    if "failed" in title_l or "error" in title_l:
                        combined -= 0.06
            elif troubleshooting_intent:
                if doc_kind == "error_fix":
                    combined += 0.1
                else:
                    combined -= 0.08
            elif doc_kind == "error_fix":
                combined += 0.05

            row["score"] = round(combined, 6)
            scored_rows.append(row)

        ranked = pd.DataFrame(scored_rows).sort_values("score", ascending=False).head(top_k)
        if ranked.empty:
            return ranked

        top_score = float(ranked.iloc[0]["score"])
        if top_score < 0.18:
            return pd.DataFrame()

        ranked = ranked.copy()
        ranked["source"] = "processed_steps"
        return ranked.reset_index(drop=True)


_INDEX: ProcessedStepsIndex | None = None


def get_processed_steps_index() -> ProcessedStepsIndex:
    global _INDEX
    if _INDEX is None:
        _INDEX = ProcessedStepsIndex()
    return _INDEX
