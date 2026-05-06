import logging
import base64
import os
from fastapi import BackgroundTasks
from app.repositories.document_repository import DocumentRepository
from app.repositories.formula_repository import FormulaRepository
from app.ocr.mock_ocr import process_pdf_to_latex
from app.models.models import DocumentStatus
from app.db.session import async_session

logger = logging.getLogger(__name__)

_PLACEHOLDER_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2W5k0AAAAASUVORK5CYII="
)


def _ensure_placeholder_png(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        return
    with open(path, "wb") as f:
        f.write(base64.b64decode(_PLACEHOLDER_PNG_B64))


class DocumentService:
    def __init__(self, session):
        self.repo = DocumentRepository(session)
        self.formula_repo = FormulaRepository(session)

    async def create_and_process(self, user_id: int, filename: str, file_path: str, background_tasks: BackgroundTasks):
        doc = await self.repo.create(user_id=user_id, filename=filename)
        # schedule background processing
        background_tasks.add_task(self._process, doc.id, file_path)
        return doc

    async def process_existing(self, document_id: int, file_path: str, background_tasks: BackgroundTasks):
        background_tasks.add_task(self._process, document_id, file_path)

    async def _process(self, document_id: int, file_path: str):
        async with async_session() as session:
            doc_repo = DocumentRepository(session)
            formula_repo = FormulaRepository(session)
            try:
                logger.info("Start processing document %s", document_id)
                await doc_repo.update_status(document_id, DocumentStatus.processing)
                results = await process_pdf_to_latex(file_path)

                image_root = os.path.join("uploads", "formula_images", str(document_id))
                for idx, item in enumerate(results, start=1):
                    if item.get("image_path"):
                        continue
                    image_path = os.path.join(image_root, f"formula_{idx}.png")
                    _ensure_placeholder_png(image_path)
                    item["image_path"] = image_path

                await formula_repo.create_many(document_id, results)
                await doc_repo.update_status(document_id, DocumentStatus.done)
                logger.info("Finished processing document %s", document_id)
            except Exception as e:
                logger.exception("Error processing document %s: %s", document_id, e)
                await doc_repo.update_status(document_id, DocumentStatus.error)
