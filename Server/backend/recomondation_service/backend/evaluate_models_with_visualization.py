"""
Comprehensive Model Evaluation Script with Graphical Visualizations
Evaluates all models and generates charts for:
- Accuracy
- F1 Score
- Precision
- MAP (Mean Average Precision)
"""

from pathlib import Path
import pandas as pd
import sys
import io
import joblib
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, 
    f1_score, 
    precision_score, 
    recall_score,
    average_precision_score,
    classification_report,
    confusion_matrix
)
from sklearn.preprocessing import label_binarize
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Set style for better-looking plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (14, 8)
plt.rcParams['font.size'] = 10

HERE = Path(__file__).parent.resolve()
DATA_DIR = (HERE.parent / "data").resolve()

# Model paths
ERROR_MODEL_PATH = HERE / "nlp_error_model_error_type.pkl"
PRODUCT_CATEGORY_MODEL_PATH = HERE / "nlp_error_model_product.pkl"
PRODUCT_NEED_MODEL_PATH = HERE / "product_need_model.pkl"
SHOP_RANKING_MODEL_PATH = HERE / "reco_model.pkl"

# Output directory for visualizations
OUTPUT_DIR = HERE / "model_evaluations"
OUTPUT_DIR.mkdir(exist_ok=True)


def preprocess_text(text: str) -> str:
    """Simple text preprocessing."""
    if not text or not isinstance(text, str):
        return ""
    return text.lower().strip()


def calculate_map_multiclass(y_true, y_pred_proba, classes):
    """
    Calculate Mean Average Precision (MAP) for multiclass classification.
    
    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities (shape: [n_samples, n_classes])
        classes: List of class labels
    
    Returns:
        MAP score
    """
    try:
        # Binarize labels for multilabel format
        y_true_bin = label_binarize(y_true, classes=classes)
        
        # Calculate AP for each class and average
        ap_scores = []
        for i, class_label in enumerate(classes):
            if y_true_bin[:, i].sum() > 0:  # Only if class exists in test set
                ap = average_precision_score(
                    y_true_bin[:, i], 
                    y_pred_proba[:, i],
                    average='macro'
                )
                ap_scores.append(ap)
        
        return np.mean(ap_scores) if ap_scores else 0.0
    except Exception as e:
        print(f"[WARNING] MAP calculation failed: {e}")
        return 0.0


def evaluate_error_type_model():
    """Evaluate Error Type Classification Model."""
    print("\n" + "=" * 80)
    print("EVALUATING ERROR TYPE CLASSIFICATION MODEL")
    print("=" * 80)
    
    # Load model
    if not ERROR_MODEL_PATH.exists():
        print(f"[ERROR] Model not found: {ERROR_MODEL_PATH}")
        return None
    
    model = joblib.load(ERROR_MODEL_PATH)
    print(f"[INFO] Model loaded from: {ERROR_MODEL_PATH}")
    
    # Load test data
    dfs = []
    # Prefer combined file first
    for dataset_file in ["error_training_data_combined.csv", "error_training_20000.csv", "error_training_data_20000.csv", 
                        "improved_error_training_data.csv", "real_world_error_training_data.csv",
                        "error_texts.csv", "comprehensive_test_training_data.csv"]:
        dataset_path = DATA_DIR / dataset_file
        if dataset_path.exists():
            try:
                df = pd.read_csv(dataset_path)
                if 'user_text' in df.columns and 'error_type' in df.columns:
                    dfs.append(df[['user_text', 'error_type']])
            except Exception as e:
                print(f"[WARNING] Failed to load {dataset_file}: {e}")
                continue
    
    if not dfs:
        print("[ERROR] No test data found!")
        return None
    
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.dropna(subset=['user_text', 'error_type'])
    df_all['user_text'] = df_all['user_text'].astype(str).apply(preprocess_text)
    df_all = df_all[df_all['user_text'].str.len() > 0]
    df_all = df_all.drop_duplicates(subset=['user_text', 'error_type'])
    
    # Prepare data
    X = df_all['user_text'].values
    y = df_all['error_type'].values
    
    # Filter classes with at least 2 samples
    class_counts = Counter(y)
    valid_classes = {cls for cls, count in class_counts.items() if count >= 2}
    valid_mask = pd.Series(y).isin(valid_classes)
    X = X[valid_mask]
    y = y[valid_mask]
    
    # Split data (use same random_state as training)
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    print(f"[INFO] Test samples: {len(X_test)}")
    print(f"[INFO] Number of classes: {len(set(y_test))}")
    
    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)
    classes = model.classes_
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    map_score = calculate_map_multiclass(y_test, y_pred_proba, classes)
    
    print(f"\n[METRICS]")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  Precision: {precision:.4f} ({precision*100:.2f}%)")
    print(f"  Recall:    {recall:.4f} ({recall*100:.2f}%)")
    print(f"  F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
    print(f"  MAP:       {map_score:.4f} ({map_score*100:.2f}%)")
    
    # Calculate confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=classes)
    
    return {
        'model_name': 'Error Type Classification',
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'map': map_score,
        'n_samples': len(X_test),
        'n_classes': len(set(y_test)),
        'confusion_matrix': cm,
        'y_test': y_test,
        'y_pred': y_pred,
        'classes': classes
    }


def evaluate_product_category_model():
    """Evaluate Product Category Classification Model."""
    print("\n" + "=" * 80)
    print("EVALUATING PRODUCT CATEGORY CLASSIFICATION MODEL")
    print("=" * 80)
    
    # Load model
    if not PRODUCT_CATEGORY_MODEL_PATH.exists():
        print(f"[ERROR] Model not found: {PRODUCT_CATEGORY_MODEL_PATH}")
        return None
    
    model = joblib.load(PRODUCT_CATEGORY_MODEL_PATH)
    print(f"[INFO] Model loaded from: {PRODUCT_CATEGORY_MODEL_PATH}")
    
    # Load test data
    PRODUCT_TEXTS_CSV = DATA_DIR / "product_texts.csv"
    if not PRODUCT_TEXTS_CSV.exists():
        print("[ERROR] Product texts CSV not found!")
        return None
    
    df = pd.read_csv(PRODUCT_TEXTS_CSV)
    df = df.dropna(subset=['text', 'product_category'])
    df = df.rename(columns={'text': 'user_text'})
    df['user_text'] = df['user_text'].astype(str).apply(preprocess_text)
    df = df[df['user_text'].str.len() > 0]
    df = df.drop_duplicates(subset=['user_text', 'product_category'])
    
    # Prepare data
    X = df['user_text'].values
    y = df['product_category'].values
    
    # Filter classes with at least 2 samples
    class_counts = Counter(y)
    valid_classes = {cls for cls, count in class_counts.items() if count >= 2}
    valid_mask = pd.Series(y).isin(valid_classes)
    X = X[valid_mask]
    y = y[valid_mask]
    
    # Split data
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    print(f"[INFO] Test samples: {len(X_test)}")
    print(f"[INFO] Number of classes: {len(set(y_test))}")
    
    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)
    classes = model.classes_
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    map_score = calculate_map_multiclass(y_test, y_pred_proba, classes)
    
    print(f"\n[METRICS]")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  Precision: {precision:.4f} ({precision*100:.2f}%)")
    print(f"  Recall:    {recall:.4f} ({recall*100:.2f}%)")
    print(f"  F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
    print(f"  MAP:       {map_score:.4f} ({map_score*100:.2f}%)")
    
    # Calculate confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=classes)
    
    return {
        'model_name': 'Product Category Classification',
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'map': map_score,
        'n_samples': len(X_test),
        'n_classes': len(set(y_test)),
        'confusion_matrix': cm,
        'y_test': y_test,
        'y_pred': y_pred,
        'classes': classes
    }


def evaluate_product_need_model():
    """Evaluate Product Need (Component) Classification Model."""
    print("\n" + "=" * 80)
    print("EVALUATING PRODUCT NEED (COMPONENT) CLASSIFICATION MODEL")
    print("=" * 80)
    
    # Load model
    if not PRODUCT_NEED_MODEL_PATH.exists():
        print(f"[ERROR] Model not found: {PRODUCT_NEED_MODEL_PATH}")
        return None
    
    model = joblib.load(PRODUCT_NEED_MODEL_PATH)
    print(f"[INFO] Model loaded from: {PRODUCT_NEED_MODEL_PATH}")
    
    # Load test data
    dfs = []
    # Prefer combined file
    HARDWARE_CSV = DATA_DIR / "hardware_component_dataset_combined.csv"
    if HARDWARE_CSV.exists():
        df = pd.read_csv(HARDWARE_CSV)
        if 'user_text' in df.columns and 'component_label' in df.columns:
            dfs.append(df[['user_text', 'component_label']])
    
    # Fallback to individual files
    HARDWARE_CSV = DATA_DIR / "hardware_component_dataset_merged.csv"
    if HARDWARE_CSV.exists():
        df = pd.read_csv(HARDWARE_CSV)
        if 'user_text' in df.columns and 'component_label' in df.columns:
            dfs.append(df[['user_text', 'component_label']])
    
    for dataset_file in ["hardware_component_dataset_10000.csv", 
                        "hardware_component_dataset_improved.csv",
                        "hardware_component_dataset_augmented.csv"]:
        dataset_path = DATA_DIR / dataset_file
        if dataset_path.exists():
            df = pd.read_csv(dataset_path)
            if 'user_text' in df.columns and 'component_label' in df.columns:
                dfs.append(df[['user_text', 'component_label']])
    
    if not dfs:
        print("[ERROR] No test data found!")
        return None
    
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.dropna(subset=['user_text', 'component_label'])
    df_all['user_text'] = df_all['user_text'].astype(str).apply(preprocess_text)
    df_all = df_all[df_all['user_text'].str.len() > 0]
    df_all = df_all.drop_duplicates(subset=['user_text', 'component_label'])
    
    # Prepare data
    X = df_all['user_text'].values
    y = df_all['component_label'].values
    
    # Filter classes with at least 2 samples
    class_counts = Counter(y)
    valid_classes = {cls for cls, count in class_counts.items() if count >= 2}
    valid_mask = pd.Series(y).isin(valid_classes)
    X = X[valid_mask]
    y = y[valid_mask]
    
    # Split data
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    print(f"[INFO] Test samples: {len(X_test)}")
    print(f"[INFO] Number of classes: {len(set(y_test))}")
    
    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)
    classes = model.classes_
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    map_score = calculate_map_multiclass(y_test, y_pred_proba, classes)
    
    print(f"\n[METRICS]")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  Precision: {precision:.4f} ({precision*100:.2f}%)")
    print(f"  Recall:    {recall:.4f} ({recall*100:.2f}%)")
    print(f"  F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
    print(f"  MAP:       {map_score:.4f} ({map_score*100:.2f}%)")
    
    # Calculate confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=classes)
    
    return {
        'model_name': 'Product Need (Component) Classification',
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'map': map_score,
        'n_samples': len(X_test),
        'n_classes': len(set(y_test)),
        'confusion_matrix': cm,
        'y_test': y_test,
        'y_pred': y_pred,
        'classes': classes
    }


def create_visualizations(results):
    """Create comprehensive visualizations for all models."""
    if not results:
        print("[ERROR] No results to visualize!")
        return
    
    # Filter out None results
    results = [r for r in results if r is not None]
    
    if not results:
        print("[ERROR] No valid results to visualize!")
        return
    
    print("\n" + "=" * 80)
    print("GENERATING VISUALIZATIONS")
    print("=" * 80)
    
    # Prepare data for plotting
    model_names = [r['model_name'] for r in results]
    accuracies = [r['accuracy'] * 100 for r in results]
    precisions = [r['precision'] * 100 for r in results]
    recalls = [r['recall'] * 100 for r in results]
    f1_scores = [r['f1'] * 100 for r in results]
    map_scores = [r['map'] * 100 for r in results]
    
    # 1. Comprehensive Metrics Comparison (Bar Chart)
    fig, ax = plt.subplots(figsize=(14, 8))
    x = np.arange(len(model_names))
    width = 0.15
    
    bars1 = ax.bar(x - 2*width, accuracies, width, label='Accuracy', color='#2ecc71', alpha=0.8)
    bars2 = ax.bar(x - width, precisions, width, label='Precision', color='#3498db', alpha=0.8)
    bars3 = ax.bar(x, recalls, width, label='Recall', color='#9b59b6', alpha=0.8)
    bars4 = ax.bar(x + width, f1_scores, width, label='F1-Score', color='#e74c3c', alpha=0.8)
    bars5 = ax.bar(x + 2*width, map_scores, width, label='MAP', color='#f39c12', alpha=0.8)
    
    ax.set_xlabel('Models', fontsize=12, fontweight='bold')
    ax.set_ylabel('Score (%)', fontsize=12, fontweight='bold')
    ax.set_title('Comprehensive Model Performance Metrics', fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(model_names, rotation=15, ha='right', fontsize=10)
    ax.legend(loc='upper left', fontsize=10)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_ylim([0, 105])
    
    # Add value labels on bars
    for bars in [bars1, bars2, bars3, bars4, bars5]:
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.1f}%',
                   ha='center', va='bottom', fontsize=8)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'comprehensive_metrics_comparison.png', dpi=300, bbox_inches='tight')
    print(f"[SUCCESS] Saved: comprehensive_metrics_comparison.png")
    plt.close()
    
    # 2. Individual Metric Comparison (Grouped Bar Chart)
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    axes = axes.flatten()
    
    metrics_data = {
        'Accuracy': accuracies,
        'Precision': precisions,
        'Recall': recalls,
        'F1-Score': f1_scores,
        'MAP': map_scores
    }
    
    colors = ['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12']
    
    for idx, (metric_name, values) in enumerate(metrics_data.items()):
        ax = axes[idx]
        bars = ax.bar(model_names, values, color=colors[idx], alpha=0.8, edgecolor='black', linewidth=1.5)
        ax.set_title(f'{metric_name} Comparison', fontsize=12, fontweight='bold')
        ax.set_ylabel('Score (%)', fontsize=10)
        ax.set_xticklabels(model_names, rotation=15, ha='right', fontsize=9)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.set_ylim([0, 105])
        
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.1f}%',
                   ha='center', va='bottom', fontsize=9, fontweight='bold')
    
    # Remove empty subplot
    axes[5].axis('off')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'individual_metrics_comparison.png', dpi=300, bbox_inches='tight')
    print(f"[SUCCESS] Saved: individual_metrics_comparison.png")
    plt.close()
    
    # 3. Radar/Spider Chart for each model
    from math import pi
    
    # Number of metrics
    categories = ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'MAP']
    N = len(categories)
    
    # Compute angle for each metric
    angles = [n / float(N) * 2 * pi for n in range(N)]
    angles += angles[:1]  # Complete the circle
    
    fig, axes = plt.subplots(1, len(results), figsize=(6*len(results), 6), subplot_kw=dict(projection='polar'))
    if len(results) == 1:
        axes = [axes]
    
    for idx, result in enumerate(results):
        ax = axes[idx]
        
        # Values for this model
        values = [
            result['accuracy'] * 100,
            result['precision'] * 100,
            result['recall'] * 100,
            result['f1'] * 100,
            result['map'] * 100
        ]
        values += values[:1]  # Complete the circle
        
        # Plot
        ax.plot(angles, values, 'o-', linewidth=2, label=result['model_name'], color='#3498db')
        ax.fill(angles, values, alpha=0.25, color='#3498db')
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, fontsize=10)
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20%', '40%', '60%', '80%', '100%'], fontsize=8)
        ax.grid(True, linestyle='--', alpha=0.5)
        ax.set_title(result['model_name'], size=12, fontweight='bold', pad=20)
        
        # Add value labels
        for angle, value, label in zip(angles[:-1], values[:-1], categories):
            ax.text(angle, value + 5, f'{value:.1f}%', ha='center', va='center', fontsize=9, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'radar_chart_comparison.png', dpi=300, bbox_inches='tight')
    print(f"[SUCCESS] Saved: radar_chart_comparison.png")
    plt.close()
    
    # 4. Heatmap of all metrics
    fig, ax = plt.subplots(figsize=(10, 6))
    
    metrics_matrix = np.array([
        accuracies,
        precisions,
        recalls,
        f1_scores,
        map_scores
    ])
    
    im = ax.imshow(metrics_matrix, cmap='YlOrRd', aspect='auto', vmin=0, vmax=100)
    
    # Set ticks and labels
    ax.set_xticks(np.arange(len(model_names)))
    ax.set_yticks(np.arange(len(categories)))
    ax.set_xticklabels(model_names, rotation=15, ha='right')
    ax.set_yticklabels(categories)
    
    # Add text annotations
    for i in range(len(categories)):
        for j in range(len(model_names)):
            text = ax.text(j, i, f'{metrics_matrix[i, j]:.1f}%',
                          ha="center", va="center", color="black", fontweight='bold', fontsize=9)
    
    ax.set_title('Model Performance Heatmap', fontsize=14, fontweight='bold', pad=20)
    plt.colorbar(im, ax=ax, label='Score (%)')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'metrics_heatmap.png', dpi=300, bbox_inches='tight')
    print(f"[SUCCESS] Saved: metrics_heatmap.png")
    plt.close()
    
    # 5. Summary Table Visualization
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.axis('tight')
    ax.axis('off')
    
    table_data = []
    for result in results:
        table_data.append([
            result['model_name'],
            f"{result['accuracy']*100:.2f}%",
            f"{result['precision']*100:.2f}%",
            f"{result['recall']*100:.2f}%",
            f"{result['f1']*100:.2f}%",
            f"{result['map']*100:.2f}%",
            f"{result['n_samples']:,}",
            f"{result['n_classes']}"
        ])
    
    table = ax.table(cellText=table_data,
                    colLabels=['Model', 'Accuracy', 'Precision', 'Recall', 'F1-Score', 'MAP', 'Test Samples', 'Classes'],
                    cellLoc='center',
                    loc='center',
                    bbox=[0, 0, 1, 1])
    
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 2)
    
    # Style header
    for i in range(8):
        table[(0, i)].set_facecolor('#34495e')
        table[(0, i)].set_text_props(weight='bold', color='white')
    
    # Style data rows
    for i in range(1, len(table_data) + 1):
        for j in range(8):
            if i % 2 == 0:
                table[(i, j)].set_facecolor('#ecf0f1')
            else:
                table[(i, j)].set_facecolor('#ffffff')
    
    plt.title('Model Evaluation Summary Table', fontsize=14, fontweight='bold', pad=20)
    plt.savefig(OUTPUT_DIR / 'summary_table.png', dpi=300, bbox_inches='tight')
    print(f"[SUCCESS] Saved: summary_table.png")
    plt.close()
    
    print(f"\n[SUCCESS] All visualizations saved to: {OUTPUT_DIR}")
    
    # Create confusion matrices
    create_confusion_matrices(results)


def create_confusion_matrices(results):
    """Create confusion matrix visualizations for each model."""
    print("\n" + "=" * 80)
    print("GENERATING CONFUSION MATRICES")
    print("=" * 80)
    
    for result in results:
        if 'confusion_matrix' not in result or result['confusion_matrix'] is None:
            continue
        
        model_name = result['model_name']
        cm = result['confusion_matrix']
        classes = result['classes']
        y_test = result['y_test']
        y_pred = result['y_pred']
        
        # Normalize confusion matrix for percentage view
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        cm_normalized = np.nan_to_num(cm_normalized)  # Replace NaN with 0
        
        # Create figure with two subplots: raw counts and normalized
        fig, axes = plt.subplots(1, 2, figsize=(20, 8))
        
        # Limit number of classes shown if too many (for readability)
        max_classes_to_show = 20
        if len(classes) > max_classes_to_show:
            # Show only classes that appear in test set
            test_classes = set(y_test)
            pred_classes = set(y_pred)
            all_test_classes = sorted(list(test_classes | pred_classes))
            
            if len(all_test_classes) > max_classes_to_show:
                # Get top N most frequent classes in test set
                from collections import Counter
                class_counts = Counter(y_test)
                top_classes = [cls for cls, _ in class_counts.most_common(max_classes_to_show)]
                top_classes = sorted(top_classes)
            else:
                top_classes = sorted(all_test_classes)
            
            # Filter confusion matrix
            class_indices = [i for i, cls in enumerate(classes) if cls in top_classes]
            cm_filtered = cm[np.ix_(class_indices, class_indices)]
            cm_normalized_filtered = cm_normalized[np.ix_(class_indices, class_indices)]
            classes_filtered = [classes[i] for i in class_indices]
            
            # Truncate class names for display
            classes_display = [cls[:30] + '...' if len(cls) > 30 else cls for cls in classes_filtered]
        else:
            cm_filtered = cm
            cm_normalized_filtered = cm_normalized
            classes_display = [cls[:30] + '...' if len(cls) > 30 else cls for cls in classes]
        
        # Plot 1: Raw confusion matrix (counts)
        sns.heatmap(cm_filtered, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=classes_display, yticklabels=classes_display,
                   ax=axes[0], cbar_kws={'label': 'Count'}, linewidths=0.5)
        axes[0].set_title(f'{model_name}\nConfusion Matrix (Counts)', 
                         fontsize=14, fontweight='bold', pad=20)
        axes[0].set_xlabel('Predicted Label', fontsize=11, fontweight='bold')
        axes[0].set_ylabel('True Label', fontsize=11, fontweight='bold')
        axes[0].tick_params(axis='x', rotation=45, labelsize=8)
        axes[0].tick_params(axis='y', rotation=0, labelsize=8)
        
        # Plot 2: Normalized confusion matrix (percentages)
        sns.heatmap(cm_normalized_filtered, annot=True, fmt='.2f', cmap='Oranges',
                   xticklabels=classes_display, yticklabels=classes_display,
                   ax=axes[1], cbar_kws={'label': 'Percentage'}, linewidths=0.5)
        axes[1].set_title(f'{model_name}\nConfusion Matrix (Normalized)', 
                         fontsize=14, fontweight='bold', pad=20)
        axes[1].set_xlabel('Predicted Label', fontsize=11, fontweight='bold')
        axes[1].set_ylabel('True Label', fontsize=11, fontweight='bold')
        axes[1].tick_params(axis='x', rotation=45, labelsize=8)
        axes[1].tick_params(axis='y', rotation=0, labelsize=8)
        
        plt.tight_layout()
        
        # Save with sanitized filename
        filename = model_name.lower().replace(' ', '_').replace('(', '').replace(')', '')
        filename = filename.replace('/', '_')
        plt.savefig(OUTPUT_DIR / f'confusion_matrix_{filename}.png', dpi=300, bbox_inches='tight')
        print(f"[SUCCESS] Saved: confusion_matrix_{filename}.png")
        plt.close()
        
        # Also create a single large normalized confusion matrix for better readability
        if len(classes) <= 15:  # Only for models with reasonable number of classes
            fig, ax = plt.subplots(figsize=(14, 12))
            sns.heatmap(cm_normalized, annot=True, fmt='.2f', cmap='YlOrRd',
                       xticklabels=[cls[:25] + '...' if len(cls) > 25 else cls for cls in classes],
                       yticklabels=[cls[:25] + '...' if len(cls) > 25 else cls for cls in classes],
                       ax=ax, cbar_kws={'label': 'Percentage'}, linewidths=0.5, 
                       annot_kws={'size': 9})
            ax.set_title(f'{model_name}\nNormalized Confusion Matrix', 
                        fontsize=16, fontweight='bold', pad=20)
            ax.set_xlabel('Predicted Label', fontsize=12, fontweight='bold')
            ax.set_ylabel('True Label', fontsize=12, fontweight='bold')
            ax.tick_params(axis='x', rotation=45, labelsize=9)
            ax.tick_params(axis='y', rotation=0, labelsize=9)
            
            plt.tight_layout()
            plt.savefig(OUTPUT_DIR / f'confusion_matrix_{filename}_normalized.png', 
                       dpi=300, bbox_inches='tight')
            print(f"[SUCCESS] Saved: confusion_matrix_{filename}_normalized.png")
            plt.close()


def main():
    """Main evaluation function."""
    print("=" * 80)
    print("COMPREHENSIVE MODEL EVALUATION WITH VISUALIZATIONS")
    print("=" * 80)
    print("\nThis script will evaluate all models and generate graphical representations.")
    print("=" * 80)
    
    results = []
    
    # Evaluate Error Type Model
    result = evaluate_error_type_model()
    if result:
        results.append(result)
    
    # Evaluate Product Category Model
    result = evaluate_product_category_model()
    if result:
        results.append(result)
    
    # Evaluate Product Need Model
    result = evaluate_product_need_model()
    if result:
        results.append(result)
    
    # Create visualizations
    if results:
        create_visualizations(results)
        
        # Print summary
        print("\n" + "=" * 80)
        print("EVALUATION SUMMARY")
        print("=" * 80)
        for result in results:
            print(f"\n{result['model_name']}:")
            print(f"  Accuracy:  {result['accuracy']*100:.2f}%")
            print(f"  Precision: {result['precision']*100:.2f}%")
            print(f"  Recall:    {result['recall']*100:.2f}%")
            print(f"  F1-Score:  {result['f1']*100:.2f}%")
            print(f"  MAP:       {result['map']*100:.2f}%")
            print(f"  Test Samples: {result['n_samples']:,}")
            print(f"  Classes: {result['n_classes']}")
        
        print(f"\n[SUCCESS] All visualizations saved to: {OUTPUT_DIR}")
    else:
        print("\n[ERROR] No models were successfully evaluated!")


if __name__ == "__main__":
    main()

