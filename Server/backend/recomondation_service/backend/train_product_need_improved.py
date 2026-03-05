"""
Improved training script for product need model with 50,000 cases.
Includes multiple training iterations and comprehensive evaluation.
"""

from pathlib import Path
import pandas as pd
import sys
import io
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import time

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = Path(__file__).parent.resolve()
DATA_DIR = (HERE.parent / "data").resolve()
MODEL_PATH = HERE / "product_need_model.pkl"

def load_all_training_data():
    """Load all available product need training data."""
    dfs = []
    
    # Load combined hardware dataset first (preferred)
    HARDWARE_CSV = DATA_DIR / "hardware_component_dataset_combined.csv"
    if HARDWARE_CSV.exists():
        df = pd.read_csv(HARDWARE_CSV)
        if 'user_text' in df.columns and 'component_label' in df.columns:
            dfs.append(df[['user_text', 'component_label']])
            print(f"[INFO] Loaded {len(df)} samples from hardware_component_dataset_combined.csv")
    
    # Fallback to individual files if combined doesn't exist
    LARGE_DATASET = DATA_DIR / "hardware_component_dataset_50000.csv"
    if LARGE_DATASET.exists():
        df = pd.read_csv(LARGE_DATASET)
        if 'user_text' in df.columns and 'component_label' in df.columns:
            dfs.append(df[['user_text', 'component_label']])
            print(f"[INFO] Loaded {len(df)} samples from hardware_component_dataset_50000.csv")
    
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
        print("[ERROR] No training data found!")
        return None
    
    # Combine all data
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.dropna(subset=['user_text', 'component_label'])
    df_all['user_text'] = df_all['user_text'].astype(str).str.strip()
    df_all = df_all[df_all['user_text'].str.len() > 0]
    
    # Remove duplicates
    df_all = df_all.drop_duplicates(subset=['user_text', 'component_label'])
    
    print(f"\n[INFO] Total training samples: {len(df_all)}")
    print(f"[INFO] Component types: {df_all['component_label'].nunique()}")
    print(f"\nComponent distribution:")
    print(df_all['component_label'].value_counts())
    
    return df_all

def train_model(iteration=1, max_iterations=3):
    """Train the product need classification model with iterative improvement."""
    print("\n" + "=" * 80)
    print(f"TRAINING ITERATION {iteration}/{max_iterations}")
    print("=" * 80)
    
    # Load data
    df = load_all_training_data()
    if df is None:
        return False, 0.0, {}
    
    # Prepare data
    X = df['user_text'].values
    y = df['component_label'].values
    
    # Filter classes with at least 2 samples
    from collections import Counter
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
    
    # Create pipeline with optimized parameters
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=30000,  # Increased for better feature coverage
            min_df=2,
            max_df=0.95,
            sublinear_tf=True  # Apply sublinear tf scaling
        )),
        ('classifier', SGDClassifier(
            loss='log_loss',
            alpha=0.0001,
            max_iter=3000,  # Increased iterations
            random_state=42,
            n_jobs=-1,
            learning_rate='adaptive',
            eta0=0.01
        ))
    ])
    
    # Train model
    print("\n[INFO] Training model...")
    start_time = time.time()
    pipeline.fit(X_train, y_train)
    training_time = time.time() - start_time
    print(f"[INFO] Training completed in {training_time:.2f} seconds")
    
    # Evaluate on test set
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n[INFO] Test Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    
    # Cross-validation score
    print("\n[INFO] Computing cross-validation score...")
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, n_jobs=-1)
    cv_mean = cv_scores.mean()
    cv_std = cv_scores.std()
    print(f"[INFO] Cross-validation: {cv_mean:.4f} (+/- {cv_std*2:.4f})")
    
    # Classification report for top classes
    print("\n[INFO] Classification Report (top 20 classes):")
    top_classes = pd.Series(y_test).value_counts().head(20).index
    y_test_filtered = [y for y in y_test if y in top_classes]
    y_pred_filtered = [y_pred[i] for i, y in enumerate(y_test) if y in top_classes]
    if y_test_filtered:
        print(classification_report(y_test_filtered, y_pred_filtered, zero_division=0))
    
    # Calculate per-class accuracy
    class_accuracy = {}
    for cls in set(y_test):
        mask = y_test == cls
        if mask.sum() > 0:
            class_acc = accuracy_score(y_test[mask], y_pred[mask])
            class_accuracy[cls] = class_acc
    
    # Save model
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\n[SUCCESS] Model saved to: {MODEL_PATH}")
    
    metrics = {
        'accuracy': accuracy,
        'cv_mean': cv_mean,
        'cv_std': cv_std,
        'training_time': training_time,
        'class_accuracy': class_accuracy,
        'n_samples': len(X_train),
        'n_classes': len(set(y))
    }
    
    return True, accuracy, metrics

def main():
    """Main training loop with multiple iterations."""
    print("=" * 80)
    print("IMPROVED PRODUCT NEED MODEL TRAINING")
    print("=" * 80)
    
    max_iterations = 3
    best_accuracy = 0.0
    best_metrics = {}
    all_results = []
    
    for iteration in range(1, max_iterations + 1):
        success, accuracy, metrics = train_model(iteration, max_iterations)
        
        if not success:
            print(f"\n[ERROR] Training iteration {iteration} failed!")
            continue
        
        all_results.append({
            'iteration': iteration,
            'accuracy': accuracy,
            'cv_mean': metrics['cv_mean'],
            'cv_std': metrics['cv_std'],
            'training_time': metrics['training_time']
        })
        
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_metrics = metrics
        
        print(f"\n{'='*80}")
        print(f"ITERATION {iteration} RESULTS")
        print(f"{'='*80}")
        print(f"Accuracy: {accuracy:.2%}")
        print(f"CV Score: {metrics['cv_mean']:.2%} (+/- {metrics['cv_std']*2:.2%})")
        print(f"Training Time: {metrics['training_time']:.2f}s")
        print(f"{'='*80}\n")
    
    # Final summary
    print("\n" + "=" * 80)
    print("FINAL TRAINING SUMMARY")
    print("=" * 80)
    print(f"Best Accuracy: {best_accuracy:.2%}")
    print(f"Best CV Score: {best_metrics.get('cv_mean', 0):.2%} (+/- {best_metrics.get('cv_std', 0)*2:.2%})")
    print(f"Total Samples: {best_metrics.get('n_samples', 0):,}")
    print(f"Total Classes: {best_metrics.get('n_classes', 0)}")
    print(f"\nAll Iterations:")
    for result in all_results:
        print(f"  Iteration {result['iteration']}: {result['accuracy']:.2%} (CV: {result['cv_mean']:.2%})")
    print(f"\nModel saved to: {MODEL_PATH}")
    print("=" * 80)

if __name__ == "__main__":
    main()

