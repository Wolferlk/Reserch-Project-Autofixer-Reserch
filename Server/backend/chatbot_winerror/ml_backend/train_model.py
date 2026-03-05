"""
Train the sentence transformer model on error datasets
"""
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
import joblib
import os
from pathlib import Path
import sys
from solution_formatter import format_solution_steps

def load_datasets():
    """Load and combine all relevant datasets"""
    datasets_path = Path('../Datasets')
    datasets_to_load = []

    # Primary datasets
    primary_files = [
        'IT22002792_AllCategories_V2_1000.csv',
        'IT22002792_ERRORCODES_2000.csv'
    ]
    
    # Training datasets
    training_files = [
        'IT22002792_Audio_training.csv',
        'IT22002792_Boot_training.csv',
        'IT22002792_BSOD_training.csv',
        'IT22002792_Display_training.csv',
        'IT22002792_Driver_training.csv',
        'IT22002792_Hardware_training.csv',
        'IT22002792_Network_training.csv',
        'IT22002792_Performance_training.csv',
        'IT22002792_Storage_training.csv',
        'IT22002792_WindowUpdate_training.csv',
        'IT22002792_NewErrors_training.csv'  # New dataset
    ]

    # Load primary datasets
    print("Loading primary datasets...")
    for filename in primary_files:
        filepath = datasets_path / filename
        if filepath.exists():
            df = pd.read_csv(filepath, encoding='utf-8')
            datasets_to_load.append(df)
            sys.stdout.buffer.write(f"  [OK] Loaded {filename}: {len(df)} records\n".encode('utf-8'))
        else:
            sys.stdout.buffer.write(f"  [WARN] Warning: {filename} not found, skipping...\n".encode('utf-8'))

    # Load training datasets
    print("Loading training datasets...")
    for filename in training_files:
        filepath = datasets_path / filename
        if filepath.exists():
            df = pd.read_csv(filepath, encoding='utf-8')
            datasets_to_load.append(df)
            sys.stdout.buffer.write(f"  [OK] Loaded {filename}: {len(df)} records\n".encode('utf-8'))
        else:
            sys.stdout.buffer.write(f"  [WARN] Warning: {filename} not found, skipping...\n".encode('utf-8'))

    if not datasets_to_load:
        raise FileNotFoundError("No datasets found in Datasets folder!")

    # Combine all datasets
    print("Combining datasets...")
    combined = pd.concat(datasets_to_load, ignore_index=True)
    print(f"  Total records before deduplication: {len(combined)}")

    # Remove duplicates based on error_name and user_error_text
    combined = combined.drop_duplicates(subset=['error_name', 'user_error_text'], keep='first')

    sys.stdout.buffer.write(f"  [OK] Loaded {len(combined)} unique error records after deduplication\n".encode('utf-8'))
    return combined

def prepare_data(df):
    """Prepare data for model training"""
    # Create a comprehensive text representation for each error
    df['combined_text'] = (
        df['user_error_text'].fillna('') + ' ' +
        df['symptoms'].fillna('') + ' ' +
        df['error_name'].fillna('')
    ).str.strip()

    print("Formatting solution steps...")
    df['solution_steps'] = df.apply(
        lambda row: format_solution_steps(
            row.get('step_1', ''),
            row.get('step_2', ''),
            row.get('step_3', ''),
            row.get('step_4', ''),
            row.get('step_5', ''),
            row.get('error_name', ''),
            row.get('category', '')
        ),
        axis=1
    )

    # Select relevant columns
    result_df = df[[
        'id', 'error_name', 'category', 'user_error_text',
        'symptoms', 'cause', 'solution_steps', 'verification',
        'risk', 'combined_text'
    ]].copy()

    return result_df

def train_model():
    """Train the transformer model"""
    print("Loading datasets...")
    df = load_datasets()

    print("Preparing data...")
    df = prepare_data(df)

    print("Initializing transformer model...")
    # Using a lightweight but effective model for semantic similarity
    # all-MiniLM-L6-v2 is fast and provides good accuracy
    print("  Downloading pre-trained model (first time only, ~80MB)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    sys.stdout.buffer.write(b"  [OK] Model loaded successfully\n")

    print("Creating embeddings for error descriptions...")
    # Create embeddings for all error descriptions
    embeddings = model.encode(
        df['combined_text'].tolist(),
        show_progress_bar=True,
        batch_size=32
    )

    print("Saving model and data...")
    # Create models directory
    os.makedirs('models', exist_ok=True)

    # Save the sentence transformer model
    model.save('models/transformer')

    # Save the dataframe with embeddings
    df['embedding'] = list(embeddings)
    df.to_pickle('models/error_database.pkl')

    # Also save a version without embeddings for easier loading
    df_no_emb = df.drop('embedding', axis=1)
    df_no_emb.to_pickle('models/error_database_no_emb.pkl')

    # Save embeddings separately as numpy array for faster loading
    np.save('models/embeddings.npy', embeddings)

    print(f"Model training complete!")
    print(f"Total errors in database: {len(df)}")
    print(f"Embedding dimension: {embeddings.shape[1]}")

    return model, df, embeddings

if __name__ == '__main__':
    train_model()

























