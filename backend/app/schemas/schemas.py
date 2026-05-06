from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

    class Config:
        orm_mode = True


class DocumentCreate(BaseModel):
    filename: str


class DocumentOut(BaseModel):
    id: int
    filename: str
    status: str
    created_at: datetime

    class Config:
        orm_mode = True


class FormulaOut(BaseModel):
    id: int
    latex: str
    page: Optional[int]

    class Config:
        orm_mode = True


class FormulaUpdate(BaseModel):
    latex: str
    note: Optional[str] = None


class FormulaVersionOut(BaseModel):
    id: int
    formula_id: int
    latex: str
    note: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True
