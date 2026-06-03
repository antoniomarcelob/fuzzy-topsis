from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import alternatives, criteria, executions, exports, problems
from app.core.config import settings
from app.db.base import init_db

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Fuzzy TOPSIS API", environment=settings.ENVIRONMENT)
    await init_db()
    yield
    logger.info("Shutting down Fuzzy TOPSIS API")


app = FastAPI(
    title="Fuzzy TOPSIS API",
    description="API para resolução de problemas de decisão multicritério usando Fuzzy TOPSIS",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problems.router, prefix="/problems", tags=["Problemas"])
app.include_router(criteria.router, prefix="/criteria", tags=["Critérios"])
app.include_router(alternatives.router, prefix="/alternatives", tags=["Alternativas"])
app.include_router(executions.router, prefix="/executions", tags=["Execuções"])
app.include_router(exports.router, prefix="/exports", tags=["Exportação"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
