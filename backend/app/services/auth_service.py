from datetime import timedelta
from app.repositories.user_repository import UserRepository
from app.utils.security import hash_password, verify_password, create_access_token
from app.models.models import RoleEnum


class AuthService:
    def __init__(self, session):
        self.repo = UserRepository(session)

    async def register(self, email: str, password: str):
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")
        hashed = hash_password(password)
        user = await self.repo.create(email=email, hashed_password=hashed, role=RoleEnum.user)
        return user

    async def authenticate(self, email: str, password: str):
        user = await self.repo.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer"}
