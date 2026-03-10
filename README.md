# Auto Fixer Research Project

Auto Fixer is a full-stack AI troubleshooting platform for computer issues.  
It combines screenshot analysis, OCR, error diagnosis, and recommendation engines to help users:

- identify software and hardware issues,
- get guided fix steps,
- and discover suitable repair shops or replacement parts.

This repository contains:

- a Next.js frontend (`Frontend/`)
- a Python/FastAPI backend (`Server/`)
- sub-services for error chatbot and recommendation logic mounted under one API.

## Project Structure

```text
Frontend/                              # Next.js frontend
Server/
  backend/
    app.py                             # Main API (mounts chatbot + recommendation services)
    chatbot_winerror/ml_backend/app.py # Error detection/chatbot service
    recomondation_service/backend/app.py # Repair/product recommendation service
  requirements.txt                     # Python dependencies
```

## Prerequisites

- Node.js 20+ and npm
- Python 3.10+ (3.11 recommended)
- Git
- Tesseract OCR installed on your OS (required for screenshot text extraction)

## 1) Backend Setup

Run these commands from project root:

```bash
cd Server
python -m venv .venv
```

Activate virtual environment:

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## 2) Backend `.env` Setup

Main backend works without secrets, but recommendation service can use Supabase if configured.

Create file:

`Server/backend/recomondation_service/backend/.env`

Add:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_service_key
```

Notes:

- If these values are missing, the recommendation service falls back to CSV data when available.
- Do not commit real keys to Git.

## 3) Run Backend

From `Server/` directory:

```bash
uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload

 .\venv\Scripts\python.exe -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8001
```

Backend URLs:

- Main API: `http://localhost:8001`
- Swagger docs: `http://localhost:8001/docs`
- Chatbot service: `http://localhost:8001/chatbot/...`
- Recommendation service: `http://localhost:8001/recommendation/...`

## 4) Frontend Setup

In a new terminal:

```bash
cd Frontend
npm install
```

Create file:

`Frontend/.env.local`

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_RECO_API_URL=http://localhost:8001
```

Then run frontend:

```bash
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## 5) Full Run Steps (Quick Start)

Terminal 1:

```bash
cd Server
.\.venv\Scripts\Activate.ps1
uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 2:

```bash
cd Frontend
npm run dev
```

Open `http://localhost:3000`.

## Troubleshooting

- `ModuleNotFoundError`: activate backend virtual env and reinstall `Server/requirements.txt`.
- Frontend cannot call API: verify `Frontend/.env.local` points to the correct backend port.
- OCR returns empty text: verify Tesseract OCR is installed and available in PATH.
- Recommendation data missing: check Supabase keys or fallback CSV availability under `Server/backend/recomondation_service/data/`.

