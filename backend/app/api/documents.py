from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import aiofiles
import os
from app.db.session import get_db
from app.core.deps import get_current_user
from app.services.document_service import DocumentService
from app.repositories.document_repository import DocumentRepository
from app.repositories.formula_repository import FormulaRepository
from app.utils.response import success_response

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filename = file.filename
    dest = os.path.join(UPLOAD_DIR, filename)
    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)

    svc = DocumentService(db)
    doc = await svc.create_and_process(
        user_id=current_user.id,
        filename=filename,
        file_path=dest,
        background_tasks=background_tasks,
    )
    return success_response({"id": doc.id, "filename": doc.filename}, "Uploaded")


@router.get("/documents")
async def get_documents(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    repo = DocumentRepository(db)
    docs = await repo.list_for_user(current_user.id)
    payload = [
        {
            "id": d.id,
            "filename": d.filename,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]
    return success_response(payload)


@router.post("/process/{id}")
async def process_document(
    id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    svc = DocumentService(db)
    await svc.process_existing(id, file_path, background_tasks)
    return success_response({"id": id}, "Processing started")


@router.get("/process/{id}/formulas")
async def get_document_formulas(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc_repo = DocumentRepository(db)
    formula_repo = FormulaRepository(db)

    doc = await doc_repo.get_by_id(id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    formulas = await formula_repo.list_by_document(id)
    payload = [
        {
            "id": f.id,
            "document_id": f.document_id,
            "latex": f.latex,
            "page": f.page,
            "image_path": f.image_path,
            "confidence_score": f.confidence_score,
        }
        for f in formulas
    ]
    return success_response(payload)
