from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Document, DocumentStatus


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: int, filename: str):
        doc = Document(user_id=user_id, filename=filename)
        self.session.add(doc)
        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def update_status(self, document_id: int, status: DocumentStatus):
        q = select(Document).where(Document.id == document_id)
        res = await self.session.execute(q)
        doc = res.scalars().first()
        if not doc:
            return None
        doc.status = status
        self.session.add(doc)
        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def list_for_user(self, user_id: int):
        q = select(Document).where(Document.user_id == user_id)
        res = await self.session.execute(q)
        return res.scalars().all()

    async def get_by_id(self, document_id: int):
        q = select(Document).where(Document.id == document_id)
        res = await self.session.execute(q)
        return res.scalars().first()
