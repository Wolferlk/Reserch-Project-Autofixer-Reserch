from response_generator.llm_generator import generate_ai_response
import re


def clean_context(text):
    text = re.sub(r'http\S+', '', text)         # remove URLs
    text = re.sub(r'\d{6,}', '', text)         # remove long numbers
    text = re.sub(r'\S+@\S+', '', text)        # remove emails
    text = re.sub(r'\b\d{1,2}\s*,\s*\d{2,4}\b', '', text)  # remove noisy date-like tokens
    text = re.sub(r'[^a-zA-Z0-9\s\.\,\-\:\(\)]', ' ', text)
    text = re.sub(r'\s+', ' ', text)           # remove extra spaces
    return text.strip()


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

    issue_type = str(predicted_type).replace("_", " ").title()
    software_scope = "Mixed"
    if "software" in results_df.columns:
        softwares = results_df["software"].dropna().astype(str).unique().tolist()
        if len(softwares) == 1:
            software_scope = softwares[0]
        elif len(softwares) > 1:
            software_scope = ", ".join(sorted(softwares[:3]))

    final_response = "\n"
    final_response += "=" * 50 + "\n"
    final_response += f"Software Scope: {software_scope}\n"
    final_response += f"Detected Issue Type: {issue_type}\n"
    final_response += "=" * 50 + "\n\n"
    final_response += ai_answer
    final_response += "\n\nEnd of response.\n"

    return final_response
