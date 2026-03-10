try:
    from response_generator.llm_generator import generate_ai_response
except ModuleNotFoundError:
    from .llm_generator import generate_ai_response
import re


def clean_context(text):
    text = re.sub(r'http\S+', '', text)         # remove URLs
    text = re.sub(r'\d{6,}', '', text)         # remove long numbers
    text = re.sub(r'\S+@\S+', '', text)        # remove emails
    text = re.sub(r'\b\d{1,2}\s*,\s*\d{2,4}\b', '', text)  # remove noisy date-like tokens
    text = re.sub(r'[^a-zA-Z0-9\s\.\,\-\:\(\)]', ' ', text)
    text = re.sub(r'\s+', ' ', text)           # remove extra spaces
    return text.strip()


def _normalize_issue_type(predicted_type):
    value = str(predicted_type or "").lower().strip()
    if value in {"how_to", "how to"}:
        return "how_to"
    return "troubleshooting"


def _default_checklist(mode):
    if mode == "how_to":
        return [
            "Confirm the final output opens correctly and matches the expected result.",
            "Repeat the same workflow once more to verify the steps are reliable.",
            "Check the save path, file name, and settings before closing the software.",
        ]
    return [
        "Repeat the failing action once to confirm the error is gone.",
        "Confirm no new warning or side effect appears after the fix.",
        "Keep the exact error text and version number if deeper diagnosis is needed.",
    ]


def _default_tips(mode):
    if mode == "how_to":
        return [
            "Use the official installer or built-in workflow when possible instead of third-party tools.",
            "Save the working settings or successful sequence for future reuse.",
        ]
    return [
        "Apply one fix path at a time so the real solution is easy to identify.",
        "Capture a screenshot of the error and the exact trigger step if the issue returns.",
    ]


def _build_processed_steps_response(query, predicted_type, results_df):
    top_row = results_df.iloc[0]
    mode = _normalize_issue_type(predicted_type)
    if str(top_row.get("doc_kind", "")).strip().lower() == "installation":
        mode = "how_to"
    title = str(top_row.get("title", "")).strip() or query.strip()
    summary = str(top_row.get("summary", "")).strip()
    steps = top_row.get("steps", [])
    if not isinstance(steps, list):
        steps = []

    if not summary:
        summary = (
            "Follow this direct step-by-step guide and verify the result after each action."
            if mode == "how_to"
            else "Use these targeted troubleshooting steps in order and retest after each fix."
        )

    lines = [f"Title: {title}", f"Summary: {summary}", "", "Steps:"]
    for idx, step in enumerate(steps[:40], start=1):
        lines.append(f"{idx}. {step}")

    lines.append("")
    lines.append("Checklist:")
    for item in _default_checklist(mode):
        lines.append(f"- {item}")

    lines.append("")
    lines.append("Tips:")
    for item in _default_tips(mode):
        lines.append(f"- {item}")

    evidence_title = str(top_row.get("pdf_file", "")).strip() or str(top_row.get("title", "")).strip()
    if evidence_title:
        lines.append("")
        lines.append("Evidence:")
        lines.append(f"1. Matched curated processed-steps document: {evidence_title}")

    return "\n".join(lines)


def generate_detailed_response(query, predicted_type, results_df):

    if results_df is None or results_df.empty:
        return (
            "No relevant documentation was found for this question. "
            "Try a more specific query with product name, feature, and exact error text."
        )

    if "text" not in results_df.columns:
        return (
            "Search results are missing the expected text content. "
            "Please rebuild the dataset and try again."
        )

    if "source" in results_df.columns:
        sources = set(results_df["source"].dropna().astype(str).tolist())
        if "processed_steps" in sources:
            return _build_processed_steps_response(query, predicted_type, results_df)

    context_chunks = []

    for _, row in results_df.head(3).iterrows():
        cleaned = clean_context(str(row.get("text", "")))
        if cleaned:
            context_chunks.append(cleaned)

    if not context_chunks:
        return (
            "Relevant records were found, but they contain no usable text. "
            "Re-run extraction and dataset build scripts."
        )

    combined_context = "\n".join(context_chunks[:3])

    try:
        ai_answer = generate_ai_response(combined_context, query)
    except Exception as exc:
        ai_answer = (
            "Step 1: Verify your local model setup and dataset paths.\n"
            "Step 2: Re-run preprocessing and model training scripts.\n"
            "Step 3: Retry the same query after confirming files exist.\n"
            f"Technical note: {exc}"
        )

    cleaned_answer = ai_answer.strip()
    if not re.search(r"(?im)^tips:\s*$", cleaned_answer):
        cleaned_answer += (
            "\n\nTips:\n"
            "- If this does not solve your issue, ask again with the exact error text, app version, and the step where it fails.\n"
        )

    return cleaned_answer
