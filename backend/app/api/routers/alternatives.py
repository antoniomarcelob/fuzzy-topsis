from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.all_models import Alternative, AlternativeEvaluation
from app.schemas.schemas import AlternativeCreate, AlternativeRead, AlternativeUpdate

router = APIRouter()


@router.post("/", response_model=AlternativeRead, status_code=status.HTTP_201_CREATED)
async def create_alternative(payload: AlternativeCreate, db: AsyncSession = Depends(get_db)):
    evaluations_data = payload.evaluations
    alt_data = payload.model_dump(exclude={"evaluations"})

    alternative = Alternative(**alt_data)
    db.add(alternative)
    await db.flush()

    for ev in evaluations_data:
        evaluation = AlternativeEvaluation(
            alternative_id=alternative.id,
            **ev.model_dump(),
        )
        db.add(evaluation)

    await db.flush()
    return await _load_full(db, str(alternative.id))


@router.put("/{alternative_id}", response_model=AlternativeRead)
async def update_alternative(
    alternative_id: str,
    payload: AlternativeUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alternative)
        .options(selectinload(Alternative.evaluations))
        .where(Alternative.id == alternative_id)
    )
    alternative = result.scalar_one_or_none()
    if not alternative:
        raise HTTPException(status_code=404, detail="Alternative not found")

    update_data = payload.model_dump(exclude_unset=True)
    evaluations_data = update_data.pop("evaluations", None)

    for field, value in update_data.items():
        setattr(alternative, field, value)

    if evaluations_data is not None:
        # Replace all evaluations
        for ev in alternative.evaluations:
            await db.delete(ev)
        await db.flush()

        for ev in evaluations_data:
            evaluation = AlternativeEvaluation(
                alternative_id=alternative.id,
                **ev,
            )
            db.add(evaluation)

    await db.flush()
    return await _load_full(db, alternative_id)


@router.delete("/{alternative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alternative(alternative_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alternative).where(Alternative.id == alternative_id))
    alternative = result.scalar_one_or_none()
    if not alternative:
        raise HTTPException(status_code=404, detail="Alternative not found")
    await db.delete(alternative)


async def _load_full(db: AsyncSession, alt_id: str) -> Alternative | None:
    result = await db.execute(
        select(Alternative)
        .options(selectinload(Alternative.evaluations))
        .where(Alternative.id == alt_id)
    )
    return result.scalar_one_or_none()
