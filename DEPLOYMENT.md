# Deployment Guide

This project is best deployed as two services:

- Frontend: Vercel, using the `Frontend/` directory.
- Backend: Railway, using the `Server/` directory.

Do not deploy the Python backend to Vercel. It uses FastAPI, OCR, PyTorch, scikit-learn, and local ML assets, which are better suited to a long-running container service.

## Required Repository Check

Railway and Vercel only receive files committed to GitHub. This repo currently ignores local model/data artifacts such as `models/`, `*.pkl`, `*.pt`, and `data/`.

Before deploying the complete ML features, either:

1. Move the required model/data files to external storage and download them during startup/build, or
2. Commit them with Git LFS, then configure Railway to fetch Git LFS files.

The backend has been made tolerant of missing ML artifacts so it can still start, but screenshot analysis and model-based recommendations need those artifacts to produce full results.

## Backend: Railway

1. Push this repository to GitHub.
2. In Railway, create a new project and choose **Deploy from GitHub repo**.
3. Select this repository.
4. Set the service root directory to `Server`.
5. Railway will use `Server/Dockerfile` through `Server/railway.json`.
6. After the first deploy, open the service settings and generate a public domain.
7. Add environment variables:

```env
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_key
```

8. Test the backend:

```text
https://your-railway-domain.railway.app/
https://your-railway-domain.railway.app/docs
```

## Frontend: Vercel

1. In Vercel, import the same GitHub repository.
2. Set the project root directory to `Frontend`.
3. Keep the framework preset as **Next.js**.
4. Add environment variables:

```env
NEXT_PUBLIC_API_URL=https://reserch-project-autofixer-reserch-production-f66f.up.railway.app
NEXT_PUBLIC_RECO_API_URL=https://reserch-project-autofixer-reserch-production-f66f.up.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_optional
```

5. Deploy.
6. Copy the deployed Vercel URL back into Railway as `FRONTEND_URL` and `CORS_ORIGINS`, then redeploy the Railway backend.

## Local Production Test

Backend:

```bash
cd Server
docker build -t auto-fixer-api .
docker run --rm -p 8001:8001 --env-file .env.example auto-fixer-api
```

Frontend:

```bash
cd Frontend
npm install
npm run build
npm run start
```

Open `http://localhost:3000`.
