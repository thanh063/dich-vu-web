from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Float
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class RoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.user)
    created_at = Column(DateTime, default=datetime.utcnow)


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    error = "error"


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(512), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
    formulas = relationship("FormulaEntry", back_populates="document")


class FormulaEntry(Base):
    __tablename__ = "formula_entries"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    latex = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    image_path = Column(String(1024), nullable=True)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    versions = relationship("FormulaVersion", back_populates="formula")
    document = relationship("Document", back_populates="formulas")


class FormulaVersion(Base):
    __tablename__ = "formula_versions"
    id = Column(Integer, primary_key=True)
    formula_id = Column(Integer, ForeignKey("formula_entries.id"), nullable=False)
    latex = Column(Text, nullable=False)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    formula = relationship("FormulaEntry", back_populates="versions")


class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True)
    level = Column(String(50))
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
