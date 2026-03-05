import pandas as pd
import joblib
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATASET_PATH = Path("data/processed/kb_dataset.csv")
MODEL_DIR = Path("models/retriever")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

VECTORIZER_PATH = MODEL_DIR / "tfidf.pkl"
MATRIX_PATH = MODEL_DIR / "kb_vectors.pkl"

class KBRetriever:
    def __init__(self):
        self.df = pd.read_csv(DATASET_PATH)
        self.vectorizer = None
        self.kb_matrix = None

    def train(self):
        texts = (
            self.df["title"].fillna("") + " " +
            self.df["tags"].fillna("") + " " +
            self.df["full_text"].fillna("")
        )

        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1
        )

        self.kb_matrix = self.vectorizer.fit_transform(texts)

        joblib.dump(self.vectorizer, VECTORIZER_PATH)
        joblib.dump(self.kb_matrix, MATRIX_PATH)

        print("✅ Retriever trained and saved")

    def load(self):
        self.vectorizer = joblib.load(VECTORIZER_PATH)
        self.kb_matrix = joblib.load(MATRIX_PATH)

    def query(self, text, top_k=3):
        query_vec = self.vectorizer.transform([text])
        sims = cosine_similarity(query_vec, self.kb_matrix)[0]

        results = []
        for idx in sims.argsort()[::-1][:top_k]:
            results.append({
                "error_id": self.df.iloc[idx]["error_id"],
                "title": self.df.iloc[idx]["title"],
                "steps": self.df.iloc[idx]["steps"],
                "score": round(float(sims[idx]), 4)
            })

        return results


if __name__ == "__main__":
    retriever = KBRetriever()
    retriever.train()

    retriever.load()

    test_query = "your pc ran into a problem irql not less or equal blue screen"
    results = retriever.query(test_query)

    print("\n===== TOP MATCHES =====\n")
    for r in results:
        print(f"{r['title']} | score={r['score']}")
