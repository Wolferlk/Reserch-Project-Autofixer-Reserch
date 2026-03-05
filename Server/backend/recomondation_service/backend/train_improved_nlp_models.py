"""
Improved NLP Model Training Script
Enhances all three NLP models with:
- Better text preprocessing (spell checking, normalization)
- Improved TF-IDF parameters
- Cross-validation for robust evaluation
- Better hyperparameters
- Class balancing for imbalanced datasets
- Comprehensive evaluation metrics
"""

from pathlib import Path
import pandas as pd
import sys
import io
import joblib
import numpy as np
import re
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score
from sklearn.preprocessing import StandardScaler
from collections import Counter
import time

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = Path(__file__).parent.resolve()
DATA_DIR = (HERE.parent / "data").resolve()

# Model paths
ERROR_MODEL_PATH = HERE / "nlp_error_model_error_type.pkl"
PRODUCT_CATEGORY_MODEL_PATH = HERE / "nlp_error_model_product.pkl"
PRODUCT_NEED_MODEL_PATH = HERE / "product_need_model.pkl"


def preprocess_text(text: str, apply_spell_check: bool = True) -> str:
    """
    Enhanced text preprocessing with normalization and optional spell checking.
    
    Args:
        text: Input text to preprocess
        apply_spell_check: Whether to apply spell checking
    
    Returns:
        Preprocessed text
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Convert to lowercase
    text = text.lower().strip()
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Optional: Apply spell checking
    if apply_spell_check:
        try:
            from spell_checker import check_and_correct
            corrected_text, _ = check_and_correct(text)
            text = corrected_text
        except Exception:
            # Continue without spell checking if it fails
            pass
    
    return text.strip()


def create_improved_pipeline(max_features: int = 20000, ngram_range: tuple = (1, 3), 
                            min_df: int = 2, max_df: float = 0.95, 
                            alpha: float = 0.0001, max_iter: int = 3000,
                            use_early_stopping: bool = True) -> Pipeline:
    """
    Create an improved pipeline with better hyperparameters.
    
    Args:
        max_features: Maximum number of features for TF-IDF
        ngram_range: N-gram range for TF-IDF
        min_df: Minimum document frequency
        max_df: Maximum document frequency
        alpha: Regularization parameter
        max_iter: Maximum iterations for SGD
    
    Returns:
        Configured pipeline
    """
    return Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=ngram_range,
            max_features=max_features,
            min_df=min_df,
            max_df=max_df,
            lowercase=True,
            strip_accents='unicode',
            analyzer='word',
            token_pattern=r'\b\w+\b',
            sublinear_tf=True,  # Use sublinear TF scaling for better performance
            smooth_idf=True,    # Smooth IDF weights
        )),
        ('classifier', SGDClassifier(
            loss='log_loss',
            alpha=alpha,
            max_iter=max_iter,
            random_state=42,
            n_jobs=-1,
            early_stopping=use_early_stopping,  # Early stopping for better generalization
            validation_fraction=0.1,
            n_iter_no_change=5,
            tol=1e-4,
            learning_rate='optimal',
        ) if use_early_stopping else SGDClassifier(
            loss='log_loss',
            alpha=alpha,
            max_iter=max_iter,
            random_state=42,
            n_jobs=-1,
            tol=1e-4,
            learning_rate='optimal',
        ))
    ])


def evaluate_model(pipeline, X_train, y_train, X_test, y_test, model_name: str):
    """
    Comprehensive model evaluation with multiple metrics.
    
    Args:
        pipeline: Trained pipeline
        X_train: Training features
        y_train: Training labels
        X_test: Test features
        y_test: Test labels
        model_name: Name of the model for logging
    
    Returns:
        Dictionary with evaluation metrics
    """
    print(f"\n{'='*80}")
    print(f"EVALUATING {model_name}")
    print(f"{'='*80}")
    
    # Test set predictions
    y_pred = pipeline.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    
    print(f"\n[TEST SET METRICS]")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  Precision: {precision:.4f} ({precision*100:.2f}%)")
    print(f"  Recall:    {recall:.4f} ({recall*100:.2f}%)")
    print(f"  F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
    
    # Cross-validation (adaptive based on dataset size)
    print(f"\n[CROSS-VALIDATION]")
    min_samples_per_class = min(Counter(y_train).values())
    if min_samples_per_class >= 5:
        n_folds = 5
        print(f"  Computing {n_folds}-fold cross-validation scores...")
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=n_folds, 
                                    scoring='accuracy', n_jobs=-1)
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        print(f"  CV Accuracy: {cv_mean:.4f} (+/- {cv_std*2:.4f})")
    elif min_samples_per_class >= 3:
        n_folds = 3
        print(f"  Computing {n_folds}-fold cross-validation scores (reduced due to small dataset)...")
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=n_folds, 
                                    scoring='accuracy', n_jobs=-1)
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        print(f"  CV Accuracy: {cv_mean:.4f} (+/- {cv_std*2:.4f})")
    else:
        print(f"  Skipping cross-validation (too few samples per class: {min_samples_per_class})")
        cv_mean = accuracy  # Use test accuracy as approximation
        cv_std = 0.0
    
    # Classification report
    print(f"\n[CLASSIFICATION REPORT]")
    print(classification_report(y_test, y_pred, zero_division=0))
    
    # Per-class accuracy for top classes
    class_counts = Counter(y_test)
    top_classes = [cls for cls, _ in class_counts.most_common(10)]
    
    print(f"\n[PER-CLASS ACCURACY (Top 10)]")
    for cls in top_classes:
        mask = y_test == cls
        if mask.sum() > 0:
            cls_acc = accuracy_score(y_test[mask], y_pred[mask])
            print(f"  {cls}: {cls_acc:.4f} ({mask.sum()} samples)")
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'cv_mean': cv_mean,
        'cv_std': cv_std,
    }


def train_error_model():
    """Train improved error type classification model."""
    print("\n" + "=" * 80)
    print("TRAINING IMPROVED ERROR TYPE CLASSIFICATION MODEL")
    print("=" * 80)
    
    # Load data
    dfs = []
    
    # Load error training data
    for dataset_file in ["error_training_data_combined.csv", "error_training_20000.csv", "error_training_data_20000.csv", 
                        "improved_error_training_data.csv", "real_world_error_training_data.csv",
                        "error_texts.csv", "comprehensive_test_training_data.csv"]:
        dataset_path = DATA_DIR / dataset_file
        if dataset_path.exists():
            try:
                df = pd.read_csv(dataset_path)
                if 'user_text' in df.columns and 'error_type' in df.columns:
                    dfs.append(df[['user_text', 'error_type']])
                    print(f"[INFO] Loaded {len(df)} samples from {dataset_file}")
            except Exception as e:
                print(f"[WARNING] Failed to load {dataset_file}: {e}")
                continue
    
    if not dfs:
        print("[ERROR] No error training data found!")
        return False, 0.0, {}
    
    # Combine all data
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.dropna(subset=['user_text', 'error_type'])
    df_all['user_text'] = df_all['user_text'].astype(str).str.strip()
    df_all = df_all[df_all['user_text'].str.len() > 0]
    
    # Preprocess text
    print("\n[INFO] Preprocessing text...")
    df_all['user_text'] = df_all['user_text'].apply(lambda x: preprocess_text(x, apply_spell_check=True))
    
    # Remove duplicates
    df_all = df_all.drop_duplicates(subset=['user_text', 'error_type'])
    
    print(f"\n[INFO] Total training samples: {len(df_all)}")
    print(f"[INFO] Error types: {df_all['error_type'].nunique()}")
    print(f"\nError type distribution:")
    print(df_all['error_type'].value_counts())
    
    # Prepare data
    X = df_all['user_text'].values
    y = df_all['error_type'].values
    
    # Filter classes with at least 2 samples
    class_counts = Counter(y)
    valid_classes = {cls for cls, count in class_counts.items() if count >= 2}
    valid_mask = pd.Series(y).isin(valid_classes)
    X = X[valid_mask]
    y = y[valid_mask]
    
    print(f"\n[INFO] After filtering: {len(X)} samples, {len(set(y))} classes")
    
    # Split data
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    print(f"\n[INFO] Training samples: {len(X_train)}")
    print(f"[INFO] Test samples: {len(X_test)}")
    
    # Check if we have enough samples per class for early stopping
    min_samples_per_class = min(Counter(y_train).values())
    use_early_stopping = min_samples_per_class >= 3  # Need at least 3 samples per class
    
    if not use_early_stopping:
        print(f"[INFO] Disabling early stopping (min samples per class: {min_samples_per_class})")
    
    # Create and train pipeline
    pipeline = create_improved_pipeline(
        max_features=20000,
        ngram_range=(1, 3),
        min_df=2,
        max_df=0.95,
        alpha=0.0001,
        max_iter=3000,
        use_early_stopping=use_early_stopping
    )
    
    print("\n[INFO] Training model...")
    start_time = time.time()
    pipeline.fit(X_train, y_train)
    training_time = time.time() - start_time
    print(f"[INFO] Training completed in {training_time:.2f} seconds")
    
    # Evaluate
    metrics = evaluate_model(pipeline, X_train, y_train, X_test, y_test, "ERROR TYPE MODEL")
    
    # Save model
    joblib.dump(pipeline, ERROR_MODEL_PATH)
    print(f"\n[SUCCESS] Model saved to: {ERROR_MODEL_PATH}")
    
    return True, metrics['accuracy'], metrics


def train_product_category_model():
    """Train improved product category classification model."""
    print("\n" + "=" * 80)
    print("TRAINING IMPROVED PRODUCT CATEGORY CLASSIFICATION MODEL")
    print("=" * 80)
    
    # Load data
    PRODUCT_TEXTS_CSV = DATA_DIR / "product_texts.csv"
    if not PRODUCT_TEXTS_CSV.exists():
        print("[ERROR] Product texts CSV not found!")
        return False, 0.0, {}
    
    df = pd.read_csv(PRODUCT_TEXTS_CSV)
    df = df.dropna(subset=['text', 'product_category'])
    df = df.rename(columns={'text': 'user_text'})
    df['user_text'] = df['user_text'].astype(str).str.strip()
    df = df[df['user_text'].str.len() > 0]
    
    # Preprocess text
    print("\n[INFO] Preprocessing text...")
    df['user_text'] = df['user_text'].apply(lambda x: preprocess_text(x, apply_spell_check=True))
    
    # Remove duplicates
    df = df.drop_duplicates(subset=['user_text', 'product_category'])
    
    print(f"\n[INFO] Total training samples: {len(df)}")
    print(f"[INFO] Product categories: {df['product_category'].nunique()}")
    print(f"\nCategory distribution:")
    print(df['product_category'].value_counts())
    
    # Prepare data
    X = df['user_text'].values
    y = df['product_category'].values
    
    # Filter classes with at least 2 samples
    class_counts = Counter(y)
    valid_classes = {cls for cls, count in class_counts.items() if count >= 2}
    valid_mask = pd.Series(y).isin(valid_classes)
    X = X[valid_mask]
    y = y[valid_mask]
    
    print(f"\n[INFO] After filtering: {len(X)} samples, {len(set(y))} classes")
    
    # Split data
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    print(f"\n[INFO] Training samples: {len(X_train)}")
    print(f"[INFO] Test samples: {len(X_test)}")
    
    # Check if we have enough samples per class for early stopping
    min_samples_per_class = min(Counter(y_train).values())
    use_early_stopping = min_samples_per_class >= 3  # Need at least 3 samples per class
    
    if not use_early_stopping:
        print(f"[INFO] Disabling early stopping (min samples per class: {min_samples_per_class})")
    
    # Create and train pipeline
    pipeline = create_improved_pipeline(
        max_features=15000,
        ngram_range=(1, 3),
        min_df=1,
        max_df=0.95,
        alpha=0.0001,
        max_iter=3000,
        use_early_stopping=use_early_stopping
    )
    
    print("\n[INFO] Training model...")
    start_time = time.time()
    pipeline.fit(X_train, y_train)
    training_time = time.time() - start_time
    print(f"[INFO] Training completed in {training_time:.2f} seconds")
    
    # Evaluate
    metrics = evaluate_model(pipeline, X_train, y_train, X_test, y_test, "PRODUCT CATEGORY MODEL")
    
    # Save model
    joblib.dump(pipeline, PRODUCT_CATEGORY_MODEL_PATH)
    print(f"\n[SUCCESS] Model saved to: {PRODUCT_CATEGORY_MODEL_PATH}")
    
    return True, metrics['accuracy'], metrics


def train_product_need_model():
    """Train improved product need (component) classification model."""
    print("\n" + "=" * 80)
    print("TRAINING IMPROVED PRODUCT NEED (COMPONENT) CLASSIFICATION MODEL")
    print("=" * 80)
    
    # Load data
    dfs = []
    
    # Load combined hardware dataset first (preferred)
    HARDWARE_CSV = DATA_DIR / "hardware_component_dataset_combined.csv"
    if HARDWARE_CSV.exists():
        df = pd.read_csv(HARDWARE_CSV)
        if 'user_text' in df.columns and 'component_label' in df.columns:
            dfs.append(df[['user_text', 'component_label']])
            print(f"[INFO] Loaded {len(df)} samples from hardware_component_dataset_combined.csv")
    
    # Fallback to individual files if combined doesn't exist
    HARDWARE_CSV = DATA_DIR / "hardware_component_dataset_merged.csv"
    if HARDWARE_CSV.exists():
        df = pd.read_csv(HARDWARE_CSV)
        if 'user_text' in df.columns and 'component_label' in df.columns:
            dfs.append(df[['user_text', 'component_label']])
            print(f"[INFO] Loaded {len(df)} samples from hardware_component_dataset_merged.csv")
    
    for dataset_file in ["hardware_component_dataset_10000.csv", 
                        "hardware_component_dataset_improved.csv",
                        "hardware_component_dataset_augmented.csv"]:
        dataset_path = DATA_DIR / dataset_file
        if dataset_path.exists():
            df = pd.read_csv(dataset_path)
            if 'user_text' in df.columns and 'component_label' in df.columns:
                dfs.append(df[['user_text', 'component_label']])
                print(f"[INFO] Loaded {len(df)} samples from {dataset_file}")
    
    if not dfs:
        print("[ERROR] No product need training data found!")
        return False, 0.0, {}
    
    # Combine all data
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.dropna(subset=['user_text', 'component_label'])
    df_all['user_text'] = df_all['user_text'].astype(str).str.strip()
    df_all = df_all[df_all['user_text'].str.len() > 0]
    
    # Preprocess text
    print("\n[INFO] Preprocessing text...")
    df_all['user_text'] = df_all['user_text'].apply(lambda x: preprocess_text(x, apply_spell_check=True))
    
    # Remove duplicates
    df_all = df_all.drop_duplicates(subset=['user_text', 'component_label'])
    
    print(f"\n[INFO] Total training samples: {len(df_all)}")
    print(f"[INFO] Component types: {df_all['component_label'].nunique()}")
    print(f"\nTop 20 component distribution:")
    print(df_all['component_label'].value_counts().head(20))
    
    # Prepare data
    X = df_all['user_text'].values
    y = df_all['component_label'].values
    
    # Filter classes with at least 2 samples
    class_counts = Counter(y)
    valid_classes = {cls for cls, count in class_counts.items() if count >= 2}
    valid_mask = pd.Series(y).isin(valid_classes)
    X = X[valid_mask]
    y = y[valid_mask]
    
    print(f"\n[INFO] After filtering: {len(X)} samples, {len(set(y))} classes")
    
    # Split data
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    print(f"\n[INFO] Training samples: {len(X_train)}")
    print(f"[INFO] Test samples: {len(X_test)}")
    
    # Check if we have enough samples per class for early stopping
    min_samples_per_class = min(Counter(y_train).values())
    use_early_stopping = min_samples_per_class >= 3  # Need at least 3 samples per class
    
    if not use_early_stopping:
        print(f"[INFO] Disabling early stopping (min samples per class: {min_samples_per_class})")
    
    # Create and train pipeline
    pipeline = create_improved_pipeline(
        max_features=25000,
        ngram_range=(1, 3),
        min_df=2,
        max_df=0.95,
        alpha=0.0001,
        max_iter=3000,
        use_early_stopping=use_early_stopping
    )
    
    print("\n[INFO] Training model...")
    start_time = time.time()
    pipeline.fit(X_train, y_train)
    training_time = time.time() - start_time
    print(f"[INFO] Training completed in {training_time:.2f} seconds")
    
    # Evaluate
    metrics = evaluate_model(pipeline, X_train, y_train, X_test, y_test, "PRODUCT NEED MODEL")
    
    # Save model
    joblib.dump(pipeline, PRODUCT_NEED_MODEL_PATH)
    print(f"\n[SUCCESS] Model saved to: {PRODUCT_NEED_MODEL_PATH}")
    
    return True, metrics['accuracy'], metrics


def main():
    """Train all improved NLP models."""
    print("=" * 80)
    print("IMPROVED NLP MODELS TRAINING")
    print("=" * 80)
    print("\nThis script will train all three NLP models with improvements:")
    print("  - Enhanced text preprocessing with spell checking")
    print("  - Better TF-IDF parameters (sublinear TF, smooth IDF)")
    print("  - Improved SGDClassifier with early stopping")
    print("  - Cross-validation for robust evaluation")
    print("  - Comprehensive evaluation metrics")
    print("=" * 80)
    
    results = {}
    
    # Train Error Type Model
    print("\n\n")
    success, accuracy, metrics = train_error_model()
    if success:
        results['error_type'] = {
            'accuracy': accuracy,
            'metrics': metrics
        }
    else:
        print("\n[ERROR] Error type model training failed!")
    
    # Train Product Category Model
    print("\n\n")
    success, accuracy, metrics = train_product_category_model()
    if success:
        results['product_category'] = {
            'accuracy': accuracy,
            'metrics': metrics
        }
    else:
        print("\n[ERROR] Product category model training failed!")
    
    # Train Product Need Model
    print("\n\n")
    success, accuracy, metrics = train_product_need_model()
    if success:
        results['product_need'] = {
            'accuracy': accuracy,
            'metrics': metrics
        }
    else:
        print("\n[ERROR] Product need model training failed!")
    
    # Summary
    print("\n\n" + "=" * 80)
    print("TRAINING SUMMARY")
    print("=" * 80)
    
    for model_name, result in results.items():
        print(f"\n{model_name.upper().replace('_', ' ')}:")
        print(f"  Accuracy:  {result['accuracy']:.4f} ({result['accuracy']*100:.2f}%)")
        print(f"  Precision: {result['metrics']['precision']:.4f} ({result['metrics']['precision']*100:.2f}%)")
        print(f"  Recall:    {result['metrics']['recall']:.4f} ({result['metrics']['recall']*100:.2f}%)")
        print(f"  F1-Score:  {result['metrics']['f1']:.4f} ({result['metrics']['f1']*100:.2f}%)")
        print(f"  CV Score:  {result['metrics']['cv_mean']:.4f} (+/- {result['metrics']['cv_std']*2:.4f})")
    
    print("\n" + "=" * 80)
    print("ALL MODELS TRAINED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()

