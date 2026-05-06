from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import FormulaEntry, FormulaVersion


class FormulaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_many(self, document_id: int, entries: list[dict]):
        formulas: list[FormulaEntry] = []
        for item in entries:
            formula = FormulaEntry(
                document_id=document_id,
                latex=item["latex"],
                page=item.get("page"),
                image_path=item.get("image_path"),
                confidence_score=item.get("confidence_score"),
            )
            self.session.add(formula)
            formulas.append(formula)
        await self.session.commit()
        for formula in formulas:
            await self.session.refresh(formula)
        return formulas

    async def get_by_id(self, formula_id: int):
        q = select(FormulaEntry).where(FormulaEntry.id == formula_id)
        res = await self.session.execute(q)
        return res.scalars().first()

    async def list_by_document(self, document_id: int):
        q = (
            select(FormulaEntry)
            .where(FormulaEntry.document_id == document_id)
            .order_by(FormulaEntry.id)
        )
        res = await self.session.execute(q)
        return res.scalars().all()

    async def update_formula(self, formula: FormulaEntry, latex: str):
        formula.latex = latex
        self.session.add(formula)
        await self.session.commit()
        await self.session.refresh(formula)
        return formula

    async def update_formula_from_ocr(self, formula: FormulaEntry, latex: str, confidence_score: float | None = None):
        formula.latex = latex
        formula.confidence_score = confidence_score
        self.session.add(formula)
        await self.session.commit()
        await self.session.refresh(formula)
        return formula

    async def create_version(self, formula_id: int, latex: str, note: str | None = None):
        version = FormulaVersion(formula_id=formula_id, latex=latex, note=note)
        self.session.add(version)
        await self.session.commit()
        await self.session.refresh(version)
        return version

    async def list_versions(self, formula_id: int):
        q = select(FormulaVersion).where(FormulaVersion.formula_id == formula_id)
        res = await self.session.execute(q)
        return res.scalars().all()
