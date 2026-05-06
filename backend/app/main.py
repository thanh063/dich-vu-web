from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core import logging_config
from app.api import auth, documents, formulas
from app.utils.response import api_exception_handler
from app.db.session import engine
from app.models.models import Base

logging_config.configure_logging()

app = FastAPI(title="Ebook2LaTeX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(formulas.router, prefix="/api", tags=["formulas"])


@app.get("/api/health")
async def health():
    return {"success": True, "data": {"status": "ok"}, "message": ""}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return await api_exception_handler(request, exc)


@app.on_event("startup")
async def on_startup():
    # create DB tables if missing (development convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # lightweight migration for existing databases
        await conn.execute(text("ALTER TABLE formula_entries ADD COLUMN IF NOT EXISTS image_path VARCHAR(1024)"))
        await conn.execute(text("ALTER TABLE formula_entries ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION"))

