from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.base import get_db
from app.models.all_models import Criterion
from app.schemas.schemas import CriterionCreate, CriterionRead, CriterionUpdate

router = APIRouter()


@router.post("/", response_model=CriterionRead, status_code=status.HTTP_201_CREATED)
async def create_criterion(payload: CriterionCreate, db: AsyncSession = Depends(get_db)):
    criterion = Criterion(**payload.model_dump())
    db.add(criterion)
    await db.flush()
    await db.refresh(criterion)
    return criterion


@router.put("/{criterion_id}", response_model=CriterionRead)
async def update_criterion(
    criterion_id: str,
    payload: CriterionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Criterion).where(Criterion.id == criterion_id))
    criterion = result.scalar_one_or_none()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(criterion, field, value)

    await db.flush()
    await db.refresh(criterion)
    return criterion


@router.delete("/{criterion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_criterion(criterion_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Criterion).where(Criterion.id == criterion_id))
    criterion = result.scalar_one_or_none()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found")
    await db.delete(criterion)
