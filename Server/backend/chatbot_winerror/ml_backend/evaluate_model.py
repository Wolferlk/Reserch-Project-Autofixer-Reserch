"""
Evaluate the machine learning model and generate performance metrics and charts
"""
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path
import os
import sys
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
from sklearn.model_selection import train_test_split
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter

def load_model_and_data():
    """Load the trained model and database"""
    models_path = Path('models')
    
    if not models_path.exists():
        raise FileNotFoundError(
            "Models not found! Please run train_model.py first to train the model."
        )
    
    print("Loading sentence transformer model...")
    model = SentenceTransformer(str(models_path / 'sentence_transformer'))
    
    print("Loading error database...")
    error_database = pd.read_pickle(models_path / 'error_database_no_emb.pkl')
    
    print("Loading embeddings...")
    embeddings = np.load(models_path / 'embeddings.npy')
    
    print(f"Loaded {len(error_database)} error records")
    return model, error_database, embeddings

def find_best_match(user_error_text: str, model, error_database, embeddings, top_k: int = 1):
    """Find the best matching error using semantic similarity"""
    user_embedding = model.encode([user_error_text], show_progress_bar=False)[0]
    
    user_embedding_norm = user_embedding / np.linalg.norm(user_embedding)
    embeddings_norm = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    
    similarities = np.dot(embeddings_norm, user_embedding_norm)
    
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    if top_k == 1:
        idx = top_indices[0]
        return error_database.iloc[idx]['category'], error_database.iloc[idx]['error_name'], float(similarities[idx])
    else:
        results = []
        for idx in top_indices:
            results.append({
                'category': error_database.iloc[idx]['category'],
                'error_name': error_database.iloc[idx]['error_name'],
                'similarity': float(similarities[idx])
            })
        return results

def evaluate_model(model, error_database, embeddings, test_size=0.2, random_state=42):
    """Evaluate the model on test data"""
    print("\n" + "="*60)
    print("MODEL EVALUATION")
    print("="*60)
    
    # Prepare data
    print("\nPreparing evaluation data...")
    df = error_database.copy()
    
    # Remove rows with NaN categories
    initial_count = len(df)
    df = df[df['category'].notna()].copy()
    
    if len(df) < initial_count:
        print(f"  Removed {initial_count - len(df)} rows with missing categories")
    
    # Create combined text for matching (same as in training)
    df['combined_text'] = (
        df['user_error_text'].fillna('') + ' ' +
        df['symptoms'].fillna('') + ' ' +
        df['error_name'].fillna('')
    ).str.strip()
    
    # Reset index to ensure alignment with embeddings array
    # The embeddings array should match the error_database length
    df = df.reset_index(drop=True)
    
    # Verify embeddings length matches dataframe length
    if len(embeddings) != len(error_database):
        print(f"  Warning: Embeddings length ({len(embeddings)}) doesn't match database length ({len(error_database)})")
        print(f"  Using first {min(len(embeddings), len(df))} embeddings")
        embeddings = embeddings[:len(df)]
    
    # Split into train and test sets
    print(f"Splitting data: {int((1-test_size)*100)}% train, {int(test_size*100)}% test...")
    
    # Check if we have enough samples per category for stratification
    category_counts = df['category'].value_counts()
    min_samples = category_counts.min()
    
    if min_samples < 2:
        print(f"  Warning: Some categories have less than 2 samples. Stratification may fail.")
        print(f"  Using random split without stratification...")
        stratify = None
    else:
        stratify = df['category']
    
    # Split the dataframe indices (these now match embeddings array indices)
    df_indices = np.arange(len(df))
    train_indices, test_indices = train_test_split(
        df_indices,
        test_size=test_size, 
        random_state=random_state,
        stratify=stratify
    )
    
    train_df = df.iloc[train_indices].reset_index(drop=True)
    test_df = df.iloc[test_indices].reset_index(drop=True)
    
    print(f"Training set: {len(train_df)} samples")
    print(f"Test set: {len(test_df)} samples")
    
    # Create embeddings for test queries
    print("\nCreating embeddings for test queries...")
    test_embeddings = model.encode(
        test_df['combined_text'].tolist(),
        show_progress_bar=True,
        batch_size=32
    )
    
    # Get training embeddings using indices (now aligned with embeddings array)
    train_embeddings = embeddings[train_indices]
    
    # Normalize embeddings
    test_embeddings_norm = test_embeddings / np.linalg.norm(test_embeddings, axis=1, keepdims=True)
    train_embeddings_norm = train_embeddings / np.linalg.norm(train_embeddings, axis=1, keepdims=True)
    
    # Make predictions
    print("\nMaking predictions...")
    y_true = test_df['category'].values
    y_pred = []
    similarities_list = []
    
    for i, test_emb in enumerate(test_embeddings_norm):
        # Calculate similarities with all training samples
        similarities = np.dot(train_embeddings_norm, test_emb)
        
        # Find best match
        best_idx = np.argmax(similarities)
        best_similarity = similarities[best_idx]
        predicted_category = train_df.iloc[best_idx]['category']
        
        y_pred.append(predicted_category)
        similarities_list.append(best_similarity)
        
        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(test_df)} samples...")
    
    # Calculate metrics
    print("\n" + "="*60)
    print("CALCULATING METRICS")
    print("="*60)
    
    # Overall accuracy
    accuracy = accuracy_score(y_true, y_pred)
    print(f"\nOverall Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    
    # Per-category metrics
    categories = sorted(set(y_true) | set(y_pred))
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=categories, average=None, zero_division=0
    )
    
    # Macro averages
    macro_precision = np.mean(precision)
    macro_recall = np.mean(recall)
    macro_f1 = np.mean(f1)
    
    # Weighted averages
    weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=categories, average='weighted', zero_division=0
    )
    
    print(f"\nMacro Averages:")
    print(f"  Precision: {macro_precision:.4f} ({macro_precision*100:.2f}%)")
    print(f"  Recall: {macro_recall:.4f} ({macro_recall*100:.2f}%)")
    print(f"  F1-Score: {macro_f1:.4f} ({macro_f1*100:.2f}%)")
    
    print(f"\nWeighted Averages:")
    print(f"  Precision: {weighted_precision:.4f} ({weighted_precision*100:.2f}%)")
    print(f"  Recall: {weighted_recall:.4f} ({weighted_recall*100:.2f}%)")
    print(f"  F1-Score: {weighted_f1:.4f} ({weighted_f1*100:.2f}%)")
    
    # Per-category breakdown
    print("\n" + "="*60)
    print("PER-CATEGORY METRICS")
    print("="*60)
    print(f"\n{'Category':<20} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Support':<10}")
    print("-" * 70)
    for i, cat in enumerate(categories):
        print(f"{cat:<20} {precision[i]:<12.4f} {recall[i]:<12.4f} {f1[i]:<12.4f} {support[i]:<10}")
    
    # Create metrics dataframe
    metrics_df = pd.DataFrame({
        'Category': categories,
        'Precision': precision,
        'Recall': recall,
        'F1-Score': f1,
        'Support': support
    })
    
    # Add overall metrics
    overall_metrics = pd.DataFrame({
        'Category': ['Overall (Macro)', 'Overall (Weighted)'],
        'Precision': [macro_precision, weighted_precision],
        'Recall': [macro_recall, weighted_recall],
        'F1-Score': [macro_f1, weighted_f1],
        'Support': [len(test_df), len(test_df)]
    })
    metrics_df = pd.concat([metrics_df, overall_metrics], ignore_index=True)
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=categories)
    
    # Similarity statistics
    avg_similarity = np.mean(similarities_list)
    min_similarity = np.min(similarities_list)
    max_similarity = np.max(similarities_list)
    
    print("\n" + "="*60)
    print("SIMILARITY STATISTICS")
    print("="*60)
    print(f"Average Similarity: {avg_similarity:.4f}")
    print(f"Min Similarity: {min_similarity:.4f}")
    print(f"Max Similarity: {max_similarity:.4f}")
    
    return {
        'y_true': y_true,
        'y_pred': y_pred,
        'categories': categories,
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'support': support,
        'macro_precision': macro_precision,
        'macro_recall': macro_recall,
        'macro_f1': macro_f1,
        'weighted_precision': weighted_precision,
        'weighted_recall': weighted_recall,
        'weighted_f1': weighted_f1,
        'confusion_matrix': cm,
        'metrics_df': metrics_df,
        'similarities': similarities_list
    }

def create_charts(results, output_dir='charts'):
    """Create visualization charts"""
    print("\n" + "="*60)
    print("GENERATING CHARTS")
    print("="*60)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Set style
    try:
        plt.style.use('seaborn-v0_8-darkgrid')
    except:
        try:
            plt.style.use('seaborn-darkgrid')
        except:
            plt.style.use('default')
    sns.set_palette("husl")
    
    categories = results['categories']
    metrics_df = results['metrics_df']
    
    # 1. Metrics Bar Chart (Accuracy, Precision, Recall, F1)
    print("\n1. Creating Metrics Bar Chart...")
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Filter out overall metrics for category chart
    category_metrics = metrics_df[~metrics_df['Category'].str.contains('Overall', na=False)]
    
    x = np.arange(len(category_metrics))
    width = 0.2
    
    ax.bar(x - 1.5*width, category_metrics['Precision'], width, label='Precision', alpha=0.8)
    ax.bar(x - 0.5*width, category_metrics['Recall'], width, label='Recall', alpha=0.8)
    ax.bar(x + 0.5*width, category_metrics['F1-Score'], width, label='F1-Score', alpha=0.8)
    ax.bar(x + 1.5*width, [results['accuracy']] * len(category_metrics), width, label='Accuracy', alpha=0.8)
    
    ax.set_xlabel('Category', fontsize=12, fontweight='bold')
    ax.set_ylabel('Score', fontsize=12, fontweight='bold')
    ax.set_title('Model Performance Metrics by Category', fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(category_metrics['Category'], rotation=45, ha='right')
    ax.legend(loc='upper right', fontsize=10)
    ax.set_ylim([0, 1.1])
    ax.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for i, (prec, rec, f1, acc) in enumerate(zip(
        category_metrics['Precision'],
        category_metrics['Recall'],
        category_metrics['F1-Score'],
        [results['accuracy']] * len(category_metrics)
    )):
        ax.text(i - 1.5*width, prec + 0.01, f'{prec:.2f}', ha='center', va='bottom', fontsize=8)
        ax.text(i - 0.5*width, rec + 0.01, f'{rec:.2f}', ha='center', va='bottom', fontsize=8)
        ax.text(i + 0.5*width, f1 + 0.01, f'{f1:.2f}', ha='center', va='bottom', fontsize=8)
        ax.text(i + 1.5*width, acc + 0.01, f'{acc:.2f}', ha='center', va='bottom', fontsize=8)
    
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'metrics_by_category.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    print(f"   Saved: {chart_path}")
    plt.close()
    
    # 2. Overall Metrics Comparison Chart
    print("2. Creating Overall Metrics Chart...")
    fig, ax = plt.subplots(figsize=(10, 6))
    
    overall_metrics = ['Accuracy', 'Precision\n(Macro)', 'Recall\n(Macro)', 'F1-Score\n(Macro)']
    overall_values = [
        results['accuracy'],
        results['macro_precision'],
        results['macro_recall'],
        results['macro_f1']
    ]
    
    colors = ['#2ecc71', '#3498db', '#e74c3c', '#f39c12']
    bars = ax.bar(overall_metrics, overall_values, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
    
    ax.set_ylabel('Score', fontsize=12, fontweight='bold')
    ax.set_title('Overall Model Performance Metrics', fontsize=14, fontweight='bold', pad=20)
    ax.set_ylim([0, 1.1])
    ax.grid(axis='y', alpha=0.3)
    
    # Add value labels
    for bar, val in zip(bars, overall_values):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 0.02,
                f'{val:.4f}\n({val*100:.2f}%)',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'overall_metrics.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    print(f"   Saved: {chart_path}")
    plt.close()
    
    # 3. Confusion Matrix
    print("3. Creating Confusion Matrix...")
    fig, ax = plt.subplots(figsize=(14, 12))
    
    cm = results['confusion_matrix']
    
    # Normalize confusion matrix
    cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    
    # Create heatmap
    sns.heatmap(cm_normalized, annot=True, fmt='.2f', cmap='Blues', 
                xticklabels=categories, yticklabels=categories,
                cbar_kws={'label': 'Normalized Count'}, ax=ax, 
                linewidths=0.5, linecolor='gray')
    
    ax.set_xlabel('Predicted Category', fontsize=12, fontweight='bold')
    ax.set_ylabel('Actual Category', fontsize=12, fontweight='bold')
    ax.set_title('Confusion Matrix (Normalized)', fontsize=14, fontweight='bold', pad=20)
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'confusion_matrix_normalized.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    print(f"   Saved: {chart_path}")
    plt.close()
    
    # 4. Confusion Matrix (Absolute Counts)
    print("4. Creating Confusion Matrix (Absolute Counts)...")
    fig, ax = plt.subplots(figsize=(14, 12))
    
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=categories, yticklabels=categories,
                cbar_kws={'label': 'Count'}, ax=ax,
                linewidths=0.5, linecolor='gray')
    
    ax.set_xlabel('Predicted Category', fontsize=12, fontweight='bold')
    ax.set_ylabel('Actual Category', fontsize=12, fontweight='bold')
    ax.set_title('Confusion Matrix (Absolute Counts)', fontsize=14, fontweight='bold', pad=20)
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'confusion_matrix_absolute.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    print(f"   Saved: {chart_path}")
    plt.close()
    
    # 5. F1-Score by Category
    print("5. Creating F1-Score by Category Chart...")
    fig, ax = plt.subplots(figsize=(12, 7))
    
    category_metrics = metrics_df[~metrics_df['Category'].str.contains('Overall', na=False)]
    category_metrics = category_metrics.sort_values('F1-Score', ascending=True)
    
    bars = ax.barh(category_metrics['Category'], category_metrics['F1-Score'], 
                   color=plt.cm.viridis(category_metrics['F1-Score']), alpha=0.8, edgecolor='black', linewidth=1)
    
    ax.set_xlabel('F1-Score', fontsize=12, fontweight='bold')
    ax.set_title('F1-Score by Category', fontsize=14, fontweight='bold', pad=20)
    ax.set_xlim([0, 1.1])
    ax.grid(axis='x', alpha=0.3)
    
    # Add value labels
    for i, (bar, val) in enumerate(zip(bars, category_metrics['F1-Score'])):
        width = bar.get_width()
        ax.text(width + 0.01, bar.get_y() + bar.get_height()/2,
                f'{val:.3f}',
                ha='left', va='center', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'f1_score_by_category.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    print(f"   Saved: {chart_path}")
    plt.close()
    
    # 6. Precision, Recall, F1 Comparison
    print("6. Creating Precision-Recall-F1 Comparison Chart...")
    fig, ax = plt.subplots(figsize=(14, 8))
    
    category_metrics = metrics_df[~metrics_df['Category'].str.contains('Overall', na=False)]
    category_metrics = category_metrics.sort_values('F1-Score', ascending=False)
    
    x = np.arange(len(category_metrics))
    width = 0.25
    
    ax.bar(x - width, category_metrics['Precision'], width, label='Precision', alpha=0.8, color='#3498db')
    ax.bar(x, category_metrics['Recall'], width, label='Recall', alpha=0.8, color='#e74c3c')
    ax.bar(x + width, category_metrics['F1-Score'], width, label='F1-Score', alpha=0.8, color='#2ecc71')
    
    ax.set_xlabel('Category', fontsize=12, fontweight='bold')
    ax.set_ylabel('Score', fontsize=12, fontweight='bold')
    ax.set_title('Precision, Recall, and F1-Score by Category', fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(category_metrics['Category'], rotation=45, ha='right')
    ax.legend(loc='lower right', fontsize=10)
    ax.set_ylim([0, 1.1])
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'precision_recall_f1_comparison.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    print(f"   Saved: {chart_path}")
    plt.close()
    
    print(f"\n[OK] All charts saved to: {output_dir}")

def main():
    """Main evaluation function"""
    try:
        # Load model and data
        model, error_database, embeddings = load_model_and_data()
        
        # Evaluate model
        results = evaluate_model(model, error_database, embeddings, test_size=0.2)
        
        # Create charts
        create_charts(results)
        
        # Save metrics to CSV
        output_dir = 'charts'
        os.makedirs(output_dir, exist_ok=True)
        metrics_path = os.path.join(output_dir, 'evaluation_metrics.csv')
        results['metrics_df'].to_csv(metrics_path, index=False)
        print(f"\n[OK] Metrics saved to: {metrics_path}")
        
        print("\n" + "="*60)
        print("EVALUATION COMPLETE!")
        print("="*60)
        
    except Exception as e:
        print(f"\n[ERROR] Error during evaluation: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

