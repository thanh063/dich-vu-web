from sqlalchemy import select
from app.models.models import User
from sqlalchemy.ext.asyncio import AsyncSession


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str):
        q = select(User).where(User.email == email)
        res = await self.session.execute(q)
        return res.scalars().first()

    async def create(self, email: str, hashed_password: str, role: str = "user"):
        user = User(email=email, hashed_password=hashed_password, role=role)
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_by_id(self, user_id: int):
        q = select(User).where(User.id == user_id)
        res = await self.session.execute(q)
        return res.scalars().first()
