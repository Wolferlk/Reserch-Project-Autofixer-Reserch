"""
FastAPI backend for error detection using ML model
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from pathlib import Path
import os
import sys
from typing import Optional

HERE = Path(__file__).parent.resolve()
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from step_analyzer import get_step_difficulty, extract_commands, get_risk_warning

app = FastAPI(title="Error Detection API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and data
model = None
error_database = None
embeddings = None
model_load_error: Optional[str] = None

class ErrorRequest(BaseModel):
    user_error: str

class ErrorResponse(BaseModel):
    error_name: str
    category: str
    confidence: float
    steps: list[str]
    symptoms: str
    cause: str
    risk: str
    verification: str
    estimated_time: str = "5-10 minutes"
    issue_type: str = "software"  # software, hardware, network, driver

class MultiSolutionResponse(BaseModel):
    solutions: list[ErrorResponse]
    total_found: int

def load_model():
    """Load the trained model and database"""
    global model, error_database, embeddings, model_load_error
    
    models_path = HERE / 'models'
    
    if not models_path.exists():
        raise FileNotFoundError(
            "Models not found! Please run train_model.py first to train the model."
        )

    try:
        from sentence_transformers import SentenceTransformer
    except Exception as exc:
        raise RuntimeError(
            "Missing dependency 'sentence-transformers'. Install it in the active environment."
        ) from exc
    
    print("Loading sentence transformer model...")
    model = SentenceTransformer(str(models_path / 'sentence_transformer'))
    
    print("Loading error database...")
    error_database = pd.read_pickle(models_path / 'error_database_no_emb.pkl')
    
    print("Loading embeddings...")
    embeddings = np.load(models_path / 'embeddings.npy')
    
    print(f"Model loaded successfully! {len(error_database)} errors in database.")
    model_load_error = None

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    global model_load_error
    try:
        load_model()
    except Exception as e:
        model_load_error = str(e)
        print(f"Warning: {e}")
        print("The API will not fully work until the model and dependencies are available.")

@app.get("/")
async def root():
    return {
        "message": "Error Detection API",
        "status": "running",
        "model_loaded": model is not None,
        "model_load_error": model_load_error,
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "database_size": len(error_database) if error_database is not None else 0,
        "model_load_error": model_load_error,
    }

def find_best_match(user_error_text: str, top_k: int = 1):
    """Find the best matching error using semantic similarity"""
    if model is None or error_database is None or embeddings is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train the model first."
        )
    
    user_embedding = model.encode([user_error_text], show_progress_bar=False)[0]
    
    user_embedding_norm = user_embedding / np.linalg.norm(user_embedding)
    embeddings_norm = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    
    similarities = np.dot(embeddings_norm, user_embedding_norm)
    
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        error_row = error_database.iloc[idx]
        results.append({
            'index': idx,
            'similarity': float(similarities[idx]),
            'error_name': error_row['error_name'],
            'category': error_row['category'],
            'user_error_text': error_row['user_error_text'],
            'symptoms': error_row['symptoms'] if pd.notna(error_row['symptoms']) else '',
            'cause': error_row['cause'] if pd.notna(error_row['cause']) else '',
            'solution_steps': error_row['solution_steps'],
            'verification': error_row['verification'] if pd.notna(error_row['verification']) else '',
            'risk': error_row['risk'] if pd.notna(error_row['risk']) else 'medium',
        })
    
    return results

def get_issue_type(category: str, error_name: str) -> str:
    """Determine if issue is software, hardware, network, or driver"""
    category_lower = category.lower()
    error_lower = error_name.lower()
    
    if 'hardware' in category_lower or 'overheating' in error_lower or 'shutdown' in error_lower:
        return 'hardware'
    elif 'network' in category_lower or 'internet' in category_lower or 'connection' in error_lower:
        return 'network'
    elif 'driver' in category_lower or 'device' in error_lower:
        return 'driver'
    else:
        return 'software'

def estimate_time(category: str, risk: str, num_steps: int) -> str:
    """Estimate time to fix based on category, risk, and steps"""
    base_times = {
        'boot': '10-15 minutes',
        'audio': '5-10 minutes',
        'network': '5-15 minutes',
        'display': '10-20 minutes',
        'storage': '15-30 minutes',
        'performance': '10-20 minutes',
        'driver': '10-15 minutes',
        'update': '20-30 minutes',
        'bsod': '15-25 minutes',
        'hardware': '30-60 minutes',
    }
    
    category_lower = category.lower()
    for key, time in base_times.items():
        if key in category_lower:
            return time
    
    # Default based on risk and steps
    if risk == 'high':
        return '20-30 minutes'
    elif risk == 'medium':
        return '10-20 minutes'
    else:
        return '5-10 minutes'

@app.post("/detect-error", response_model=ErrorResponse)
async def detect_error(request: ErrorRequest):
    """Detect error and return solution steps"""
    if not request.user_error or not request.user_error.strip():
        raise HTTPException(status_code=400, detail="user_error cannot be empty")
    
    try:
        matches = find_best_match(request.user_error.strip(), top_k=1)
        
        if not matches:
            raise HTTPException(
                status_code=404,
                detail="No matching error found in database"
            )
        
        best_match = matches[0]
        issue_type = get_issue_type(best_match['category'], best_match['error_name'])
        estimated_time = estimate_time(best_match['category'], best_match['risk'], len(best_match['solution_steps']))
        
        return ErrorResponse(
            error_name=best_match['error_name'],
            category=best_match['category'],
            confidence=best_match['similarity'],
            steps=best_match['solution_steps'],
            symptoms=best_match['symptoms'],
            cause=best_match['cause'],
            risk=best_match['risk'],
            verification=best_match['verification'],
            estimated_time=estimated_time,
            issue_type=issue_type
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )

@app.post("/detect-error-multi", response_model=MultiSolutionResponse)
async def detect_error_multi(request: ErrorRequest, limit: int = 3):
    """Detect error and return top N solutions"""
    if not request.user_error or not request.user_error.strip():
        raise HTTPException(status_code=400, detail="user_error cannot be empty")
    
    try:
        matches = find_best_match(request.user_error.strip(), top_k=limit)
        
        if not matches:
            raise HTTPException(
                status_code=404,
                detail="No matching error found in database"
            )
        
        solutions = []
        for match in matches:
            issue_type = get_issue_type(match['category'], match['error_name'])
            estimated_time = estimate_time(match['category'], match['risk'], len(match['solution_steps']))
            
            solutions.append(ErrorResponse(
                error_name=match['error_name'],
                category=match['category'],
                confidence=match['similarity'],
                steps=match['solution_steps'],
                symptoms=match['symptoms'],
                cause=match['cause'],
                risk=match['risk'],
                verification=match['verification'],
                estimated_time=estimated_time,
                issue_type=issue_type
            ))
        
        return MultiSolutionResponse(
            solutions=solutions,
            total_found=len(solutions)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

