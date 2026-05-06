from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import os

from app.core.deps import get_current_user
from app.db.session import get_db
from app.repositories.document_repository import DocumentRepository
from app.repositories.formula_repository import FormulaRepository
from app.ocr.mock_ocr import run_ocr
from app.schemas.schemas import FormulaUpdate
from app.utils.response import success_response

router = APIRouter()


@router.put("/formulas/{id}")
async def update_formula(
    id: int,
    payload: FormulaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    formula_repo = FormulaRepository(db)
    doc_repo = DocumentRepository(db)

    formula = await formula_repo.get_by_id(id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    doc = await doc_repo.get_by_id(formula.document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    await formula_repo.create_version(id, formula.latex, payload.note)
    updated = await formula_repo.update_formula(formula, payload.latex)
    return success_response({"id": updated.id, "latex": updated.latex}, "Updated")


@router.get("/formulas/{id}/versions")
async def get_formula_versions(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    formula_repo = FormulaRepository(db)
    doc_repo = DocumentRepository(db)

    formula = await formula_repo.get_by_id(id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    doc = await doc_repo.get_by_id(formula.document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    versions = await formula_repo.list_versions(id)
    payload = [
        {
            "id": v.id,
            "formula_id": v.formula_id,
            "latex": v.latex,
            "note": v.note,
            "created_at": v.created_at.isoformat(),
        }
        for v in versions
    ]
    return success_response(payload)


@router.get("/images/{formula_id}")
async def get_formula_image(
    formula_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    formula_repo = FormulaRepository(db)
    doc_repo = DocumentRepository(db)

    formula = await formula_repo.get_by_id(formula_id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    doc = await doc_repo.get_by_id(formula.document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not formula.image_path or not os.path.exists(formula.image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    media_type = "image/png"
    if formula.image_path.lower().endswith(".jpg") or formula.image_path.lower().endswith(".jpeg"):
        media_type = "image/jpeg"
    return FileResponse(path=formula.image_path, media_type=media_type)


@router.post("/process/formula/{id}/reprocess")
async def reprocess_formula(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    formula_repo = FormulaRepository(db)
    doc_repo = DocumentRepository(db)

    formula = await formula_repo.get_by_id(id)
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    doc = await doc_repo.get_by_id(formula.document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not formula.image_path:
        raise HTTPException(status_code=404, detail="Formula has no image_path")

    result = await run_ocr(formula.image_path)
    updated = await formula_repo.update_formula_from_ocr(
        formula=formula,
        latex=result.get("latex", formula.latex),
        confidence_score=result.get("confidence_score", formula.confidence_score),
    )

    return success_response(
        {
            "id": updated.id,
            "document_id": updated.document_id,
            "latex": updated.latex,
            "page": updated.page,
            "image_path": updated.image_path,
            "confidence_score": updated.confidence_score,
        },
        "Reprocessed",
    )
