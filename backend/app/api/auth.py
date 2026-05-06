from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import UserCreate, Token
from app.services.auth_service import AuthService
from app.utils.response import success_response, error_response

router = APIRouter()


@router.post("/register", response_model=dict)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    try:
        user = await svc.register(payload.email, payload.password)
        return success_response({"id": user.id, "email": user.email}, "Registered")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/login", response_model=dict)
async def login(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    token = await svc.authenticate(payload.email, payload.password)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return success_response(token, "Authenticated")
