from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.all_models import Execution, ExecutionResult
from app.schemas.schemas import ExecutionWithResult
from app.services.execution_service import ExecutionService

router = APIRouter()


@router.post("/run/{problem_id}", response_model=ExecutionWithResult, status_code=201)
async def run_execution(problem_id: str, db: AsyncSession = Depends(get_db)):
    service = ExecutionService(db)
    try:
        execution = await service.run(problem_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

    return await _load_full(db, str(execution.id))


@router.get("/{execution_id}", response_model=ExecutionWithResult)
async def get_execution(execution_id: str, db: AsyncSession = Depends(get_db)):
    execution = await _load_full(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


async def _load_full(db: AsyncSession, execution_id: str) -> Execution | None:
    result = await db.execute(
        select(Execution)
        .options(selectinload(Execution.result))
        .where(Execution.id == execution_id)
    )
    return result.scalar_one_or_none()
