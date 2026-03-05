# Computer Error Detection Bot

## Overview

The Computer Error Detection Bot is an intelligent system that uses machine learning to automatically detect and diagnose computer errors. The system analyzes user-reported error messages and provides categorized solutions with step-by-step troubleshooting guides, risk assessments, and estimated resolution times.

### Key Features
- **Multi-Category Error Detection**: Supports various error types including BSOD, hardware failures, network issues, driver problems, and software errors
- **Intelligent Classification**: Uses sentence transformer models to match user errors against a comprehensive database
- **Structured Solutions**: Provides detailed, actionable steps with difficulty ratings and risk warnings
- **Real-time API**: FastAPI backend for quick error analysis
- **Modern Web Interface**: Next.js frontend with responsive design

## Architecture

```
┌─────────────────┐    HTTP Requests    ┌─────────────────┐
│   Next.js       │ ──────────────────► │    FastAPI      │
│   Frontend      │                     │    Backend      │
│   (React)       │ ◄────────────────── │                 │
└─────────────────┘    JSON Response     └─────────────────┘
                                                │
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  ML Model       │
                                       │ (Sentence       │
                                       │  Transformer)   │
                                       └─────────────────┘
                                                │
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Error Database │
                                       │   (CSV Files)   │
                                       └─────────────────┘
```

### Components

1. **Frontend (Next.js + React)**
   - User interface for error input and solution display
   - Responsive design with Tailwind CSS
   - Axios for API communication

2. **Backend (FastAPI)**
   - RESTful API endpoints for error detection
   - CORS enabled for frontend communication
   - Model loading and inference

3. **Machine Learning Model**
   - Sentence Transformer for semantic similarity matching
   - Pre-trained embeddings for error classification
   - Cosine similarity for error matching

4. **Data Layer**
   - CSV datasets containing error patterns and solutions
   - Categorized by error type (BSOD, Hardware, Network, etc.)
   - Training data for model fine-tuning

## Dependencies

### Frontend Dependencies
```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.8.9",
    "@types/react": "^18.2.33",
    "@types/react-dom": "^18.2.14",
    "autoprefixer": "^10.0.1",
    "eslint": "^8.52.0",
    "eslint-config-next": "14.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0"
  }
}
```

### Backend Dependencies
```
fastapi
uvicorn
pandas
numpy
scikit-learn
sentence-transformers
torch
python-multipart
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Quick Start
1. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies**
   ```bash
   cd ml_backend
   pip install fastapi uvicorn pandas numpy scikit-learn sentence-transformers torch python-multipart
   ```

3. **Train the Model** (First time only)
   ```bash
   cd ml_backend
   python train_model.py
   ```

4. **Start Backend Server**
   ```bash
   cd ml_backend
   python app.py
   ```
   Backend will be available at `http://localhost:8000`

5. **Start Frontend Server** (in a new terminal)
   ```bash
   npm run dev
   ```
   Frontend will be available at `http://localhost:3000`

## API Endpoints

### Single Error Detection
- **Endpoint**: `POST /api/ml/detect-error`
- **Input**: `{"user_error": "string"}`
- **Output**: Detailed error analysis with solution steps

### Multi-Solution Detection
- **Endpoint**: `POST /api/ml/detect-error-multi`
- **Input**: `{"user_error": "string"}`
- **Output**: Multiple potential solutions ranked by confidence

## Project Structure
```
├── app/                    # Next.js frontend
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── ml_backend/            # Python backend
│   ├── app.py            # FastAPI application
│   ├── train_model.py    # Model training script
│   ├── models/           # Trained models and embeddings
│   └── venv/             # Python virtual environment
├── Datasets/             # Training data (CSV files)
├── package.json          # Frontend dependencies
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
