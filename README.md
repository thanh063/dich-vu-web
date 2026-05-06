# Ebook2LaTeX

Ebook2LaTeX is a small production-like platform to convert mathematics in PDFs to LaTeX, edit results in a realtime editor, and store versions.

**Architecture**

```
[Browser] <---> [Frontend (Vite + React + Tailwind + MathLive)]
                     |
                     v
                 [Backend (FastAPI, async)]
                     |
               [Postgres 15 (asyncpg)]
```

**Tech**

- Frontend: React 18, Vite, TypeScript, Tailwind, MathLive
- Backend: FastAPI (async), SQLAlchemy 2.0, Pydantic
- DB: PostgreSQL 15
- DevOps: Docker Compose

## Quick start (Docker Compose)

1. Copy environment file

```bash
cp .env.example .env
```

2. Build and run (development-friendly with backend reload)

```bash
docker-compose up --build
```

3. Open services

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs

## Local dev (frontend)

```bash
cd frontend
npm install
npm run dev
```

## Local dev (backend)

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API endpoints (high level)

- `POST /api/auth/register` — register
- `POST /api/auth/login` — login, returns `access_token`
- `POST /api/upload` — upload PDF (multipart)
- `POST /api/process/{id}` — trigger processing (background)
- `GET /api/documents` — list user docs
- `PUT /api/formulas/{id}` — update formula
- `GET /api/formulas/{id}/versions` — versions

## Demo flow

1. Register/login
2. Upload PDF via frontend upload UI
3. Background OCR runs (mocked by default) and saves formulas
4. Open Editor, tweak LaTeX with MathLive, save versions

## Notes & next steps

- OCR is a mock by default (`app/ocr/mock_ocr.py`). Integrate `pix2tex` or other models for production.
- Add proper secrets management for `SECRET_KEY` and DB credentials.
- Add production-ready server (gunicorn/uvicorn workers) and SSL/proxy.
