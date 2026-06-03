from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Convert sync URL to async
DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(DATABASE_URL, echo=settings.ENVIRONMENT == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        from app.models.all_models import Problem, Criterion, Alternative, AlternativeEvaluation, LinguisticScale, LinguisticTerm, Execution, ExecutionResult  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
