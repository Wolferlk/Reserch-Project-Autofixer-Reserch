import os
import pandas as pd
import joblib
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))

DATASET_PATH = os.path.join(PROJECT_ROOT, "data", "processed_dataset", "train.csv")
MODEL_PATH = os.path.join(PROJECT_ROOT, "data", "models", "problem_classifier.pkl")

print("Loading dataset from:", DATASET_PATH)
print("Loading model from:", MODEL_PATH)

df = pd.read_csv(DATASET_PATH)
model = joblib.load(MODEL_PATH)

# Improved retrieval vectorizer
retrieval_vectorizer = TfidfVectorizer(
    max_features=7000,
    ngram_range=(1, 2),
    stop_words="english"
)

retrieval_vectors = retrieval_vectorizer.fit_transform(df["text"])


def get_available_softwares():
    if "software" not in df.columns:
        return []
    return sorted(df["software"].dropna().astype(str).unique().tolist())


def search(query, selected_software=None, top_k=5):

    predicted_type = model.predict([query])[0]

    filtered_df = df[df["problem_type"] == predicted_type]
    if selected_software:
        filtered_df = filtered_df[filtered_df["software"] == selected_software]

    # If strict filtering returns nothing, relax to software-only retrieval.
    if filtered_df.empty and selected_software:
        filtered_df = df[df["software"] == selected_software]

    if filtered_df.empty:
        return predicted_type, pd.DataFrame()

    filtered_vectors = retrieval_vectorizer.transform(filtered_df["text"])
    query_vector = retrieval_vectorizer.transform([query])

    similarities = cosine_similarity(query_vector, filtered_vectors).flatten()

    top_indices = similarities.argsort()[-top_k:][::-1]
    results = filtered_df.iloc[top_indices]

    return predicted_type, results
