"""Pydantic schemas — request/response models."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────
# Linguistic Scale
# ─────────────────────────────────────────────

class LinguisticTermBase(BaseModel):
    term: str
    l: float = Field(..., ge=0, le=10)
    m: float = Field(..., ge=0, le=10)
    u: float = Field(..., ge=0, le=10)


class LinguisticTermRead(LinguisticTermBase):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class LinguisticScaleRead(BaseModel):
    id: uuid.UUID
    name: str
    scale_type: str
    is_default: bool
    terms: List[LinguisticTermRead] = []
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Criterion
# ─────────────────────────────────────────────

class CriterionCreate(BaseModel):
    problem_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=200)
    criterion_type: str = Field(..., pattern="^(benefit|cost)$")
    weight_term: str
    weight_l: float = Field(..., ge=0)
    weight_m: float = Field(..., ge=0)
    weight_u: float = Field(..., ge=0)
    position: int = 0


class CriterionUpdate(BaseModel):
    name: Optional[str] = None
    criterion_type: Optional[str] = None
    weight_term: Optional[str] = None
    weight_l: Optional[float] = None
    weight_m: Optional[float] = None
    weight_u: Optional[float] = None
    position: Optional[int] = None


class CriterionRead(BaseModel):
    id: uuid.UUID
    problem_id: uuid.UUID
    name: str
    criterion_type: str
    weight_term: str
    weight_l: float
    weight_m: float
    weight_u: float
    position: int
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Alternative Evaluation
# ─────────────────────────────────────────────

class EvaluationCreate(BaseModel):
    criterion_id: uuid.UUID
    rating_term: str
    rating_l: float = Field(..., ge=0)
    rating_m: float = Field(..., ge=0)
    rating_u: float = Field(..., ge=0)


class EvaluationRead(BaseModel):
    id: uuid.UUID
    criterion_id: uuid.UUID
    rating_term: str
    rating_l: float
    rating_m: float
    rating_u: float
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Alternative
# ─────────────────────────────────────────────

class AlternativeCreate(BaseModel):
    problem_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    evaluations: List[EvaluationCreate] = []
    position: int = 0


class AlternativeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    evaluations: Optional[List[EvaluationCreate]] = None
    position: Optional[int] = None


class AlternativeRead(BaseModel):
    id: uuid.UUID
    problem_id: uuid.UUID
    name: str
    description: Optional[str]
    position: int
    evaluations: List[EvaluationRead] = []
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Problem
# ─────────────────────────────────────────────

class ProblemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    application_area: Optional[str] = None
    author: Optional[str] = None


class ProblemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    application_area: Optional[str] = None
    author: Optional[str] = None


class ProblemRead(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    application_area: Optional[str]
    author: Optional[str]
    created_at: datetime
    updated_at: datetime
    criteria: List[CriterionRead] = []
    alternatives: List[AlternativeRead] = []
    model_config = {"from_attributes": True}


class ProblemListItem(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    application_area: Optional[str]
    author: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Execution
# ─────────────────────────────────────────────

class ExecutionRead(BaseModel):
    id: uuid.UUID
    problem_id: uuid.UUID
    status: str
    error_message: Optional[str]
    executed_at: datetime
    model_config = {"from_attributes": True}


class RankingItem(BaseModel):
    rank: int
    alt_id: str
    alt_name: str
    cc: float
    d_pos: float
    d_neg: float


class ExecutionResultRead(BaseModel):
    id: uuid.UUID
    execution_id: uuid.UUID
    decision_matrix: dict
    normalized_matrix: dict
    weighted_matrix: dict
    fpis: dict
    fnis: dict
    distances_to_fpis: dict
    distances_to_fnis: dict
    closeness_coefficients: dict
    ranking: List[RankingItem]
    weights: dict
    created_at: datetime
    model_config = {"from_attributes": True}


class ExecutionWithResult(ExecutionRead):
    result: Optional[ExecutionResultRead] = None
