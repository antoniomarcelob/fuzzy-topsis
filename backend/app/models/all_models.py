"""
Database models for Fuzzy TOPSIS Platform.
All models in one file for clarity — split per domain if project grows.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def now_utc() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────
# Linguistic Scales
# ─────────────────────────────────────────────
class LinguisticScale(Base):
    __tablename__ = "linguistic_scales"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(100))
    scale_type: Mapped[str] = mapped_column(String(20))  # 'weight' | 'rating'
    is_default: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = now_utc()

    terms: Mapped[List["LinguisticTerm"]] = relationship(
        back_populates="scale", cascade="all, delete-orphan"
    )


class LinguisticTerm(Base):
    __tablename__ = "linguistic_terms"

    id: Mapped[uuid.UUID] = uuid_pk()
    scale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("linguistic_scales.id"))
    term: Mapped[str] = mapped_column(String(100))
    l: Mapped[float] = mapped_column(Float)   # lower bound
    m: Mapped[float] = mapped_column(Float)   # modal value
    u: Mapped[float] = mapped_column(Float)   # upper bound

    scale: Mapped["LinguisticScale"] = relationship(back_populates="terms")


# ─────────────────────────────────────────────
# Problem
# ─────────────────────────────────────────────
class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    application_area: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = now_utc()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    criteria: Mapped[List["Criterion"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )
    alternatives: Mapped[List["Alternative"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )
    executions: Mapped[List["Execution"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────
# Criterion
# ─────────────────────────────────────────────
class Criterion(Base):
    __tablename__ = "criteria"

    id: Mapped[uuid.UUID] = uuid_pk()
    problem_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("problems.id"))
    name: Mapped[str] = mapped_column(String(200))
    criterion_type: Mapped[str] = mapped_column(String(10))  # 'benefit' | 'cost'
    weight_term: Mapped[str] = mapped_column(String(100))    # linguistic term
    weight_l: Mapped[float] = mapped_column(Float)
    weight_m: Mapped[float] = mapped_column(Float)
    weight_u: Mapped[float] = mapped_column(Float)
    position: Mapped[int] = mapped_column(default=0)

    problem: Mapped["Problem"] = relationship(back_populates="criteria")
    evaluations: Mapped[List["AlternativeEvaluation"]] = relationship(
        back_populates="criterion", cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────
# Alternative
# ─────────────────────────────────────────────
class Alternative(Base):
    __tablename__ = "alternatives"

    id: Mapped[uuid.UUID] = uuid_pk()
    problem_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("problems.id"))
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(default=0)

    problem: Mapped["Problem"] = relationship(back_populates="alternatives")
    evaluations: Mapped[List["AlternativeEvaluation"]] = relationship(
        back_populates="alternative", cascade="all, delete-orphan"
    )


class AlternativeEvaluation(Base):
    """Stores a linguistic evaluation of an alternative for a specific criterion."""
    __tablename__ = "alternative_evaluations"

    id: Mapped[uuid.UUID] = uuid_pk()
    alternative_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("alternatives.id"))
    criterion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("criteria.id"))
    rating_term: Mapped[str] = mapped_column(String(100))   # linguistic term
    rating_l: Mapped[float] = mapped_column(Float)
    rating_m: Mapped[float] = mapped_column(Float)
    rating_u: Mapped[float] = mapped_column(Float)

    alternative: Mapped["Alternative"] = relationship(back_populates="evaluations")
    criterion: Mapped["Criterion"] = relationship(back_populates="evaluations")


# ─────────────────────────────────────────────
# Execution + Results
# ─────────────────────────────────────────────
class Execution(Base):
    __tablename__ = "executions"

    id: Mapped[uuid.UUID] = uuid_pk()
    problem_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("problems.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|running|done|error
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    executed_at: Mapped[datetime] = now_utc()

    problem: Mapped["Problem"] = relationship(back_populates="executions")
    result: Mapped[Optional["ExecutionResult"]] = relationship(
        back_populates="execution", cascade="all, delete-orphan", uselist=False
    )


class ExecutionResult(Base):
    """Stores all intermediate matrices for full transparency/audit."""
    __tablename__ = "execution_results"

    id: Mapped[uuid.UUID] = uuid_pk()
    execution_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("executions.id"), unique=True)

    # Step 1-2: Decision matrix (linguistic + TFN)
    decision_matrix: Mapped[dict] = mapped_column(JSON)          # {alt_id: {crit_id: [l,m,u]}}

    # Step 3: Normalized matrix
    normalized_matrix: Mapped[dict] = mapped_column(JSON)

    # Step 4: Weighted normalized matrix
    weighted_matrix: Mapped[dict] = mapped_column(JSON)

    # Step 5-6: FPIS and FNIS
    fpis: Mapped[dict] = mapped_column(JSON)                     # {crit_id: [l,m,u]}
    fnis: Mapped[dict] = mapped_column(JSON)

    # Step 7-8: Distances
    distances_to_fpis: Mapped[dict] = mapped_column(JSON)        # {alt_id: float}
    distances_to_fnis: Mapped[dict] = mapped_column(JSON)

    # Step 9: Closeness Coefficients
    closeness_coefficients: Mapped[dict] = mapped_column(JSON)   # {alt_id: float}

    # Step 10: Final ranking
    ranking: Mapped[list] = mapped_column(JSON)                  # [{alt_id, alt_name, cc, rank}]

    # Weights used
    weights: Mapped[dict] = mapped_column(JSON)                  # {crit_id: [l,m,u]}

    created_at: Mapped[datetime] = now_utc()

    execution: Mapped["Execution"] = relationship(back_populates="result")
