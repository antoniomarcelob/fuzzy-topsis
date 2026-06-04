from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.all_models import Alternative, Criterion, Problem
from app.schemas.schemas import ProblemCreate, ProblemListItem, ProblemRead, ProblemUpdate

router = APIRouter()


@router.post("/", response_model=ProblemRead, status_code=status.HTTP_201_CREATED)
async def create_problem(payload: ProblemCreate, db: AsyncSession = Depends(get_db)):
    problem = Problem(**payload.model_dump())
    db.add(problem)
    await db.flush()
    return await _load_full(db, str(problem.id))


@router.get("/", response_model=List[ProblemListItem])
async def list_problems(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).order_by(Problem.created_at.desc()))
    return result.scalars().all()


@router.get("/{problem_id}", response_model=ProblemRead)
async def get_problem(problem_id: str, db: AsyncSession = Depends(get_db)):
    problem = await _load_full(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.put("/{problem_id}", response_model=ProblemRead)
async def update_problem(
    problem_id: str,
    payload: ProblemUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(problem, field, value)

    await db.flush()
    return await _load_full(db, problem_id)


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(problem_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    await db.delete(problem)


async def _load_full(db: AsyncSession, problem_id: str) -> Problem | None:
    result = await db.execute(
        select(Problem)
        .options(
            selectinload(Problem.criteria),
            selectinload(Problem.alternatives).selectinload(Alternative.evaluations),
        )
        .where(Problem.id == problem_id)
    )
    return result.scalar_one_or_none()
