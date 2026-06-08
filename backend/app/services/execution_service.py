"""
ExecutionService: orchestrates the full Fuzzy TOPSIS pipeline.
Loads problem data from DB, runs the algorithm, and persists all intermediate steps.
"""
from __future__ import annotations

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.all_models import (
    Alternative,
    AlternativeEvaluation,
    Criterion,
    Execution,
    ExecutionResult,
    Problem,
)
from app.services.fuzzy.algorithm import (
    AlternativeInfo,
    CriterionInfo,
    FuzzyTOPSIS,
    FuzzyTOPSISInput,
    TFN,
)

logger = structlog.get_logger()


class ExecutionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, problem_id: str) -> Execution:
        """
        Full pipeline:
        1. Load problem with criteria, alternatives, evaluations
        2. Build FuzzyTOPSISInput
        3. Run algorithm
        4. Persist Execution + ExecutionResult
        5. Return Execution
        """
        log = logger.bind(problem_id=problem_id)
        log.info("Starting Fuzzy TOPSIS execution")

        # Load problem
        problem = await self._load_problem(problem_id)
        if not problem:
            raise ValueError(f"Problem {problem_id} not found")

        # Create execution record
        execution = Execution(problem_id=problem.id, status="running")
        self.db.add(execution)
        await self.db.flush()

        try:
            topsis_input = self._build_input(problem)
            if len(topsis_input.alternatives) < 2:
                raise ValueError("O problema deve ter pelo menos 2 alternativas para poder ser executado.")
            if len(topsis_input.criteria) < 2:
                raise ValueError("O problema deve ter pelo menos 2 critérios para poder ser executado.")
            log.info("Input built", n_criteria=len(topsis_input.criteria), n_alternatives=len(topsis_input.alternatives))

            # Run algorithm
            topsis = FuzzyTOPSIS(topsis_input)
            result = topsis.run()

            # Persist result
            exec_result = ExecutionResult(
                execution_id=execution.id,
                decision_matrix=self._serialize_matrix(result.steps.decision_matrix),
                normalized_matrix=self._serialize_matrix(result.steps.normalized_matrix),
                weighted_matrix=self._serialize_matrix(result.steps.weighted_matrix),
                fpis=self._serialize_dict_tfn(result.steps.fpis),
                fnis=self._serialize_dict_tfn(result.steps.fnis),
                distances_to_fpis=result.steps.distances_fpis,
                distances_to_fnis=result.steps.distances_fnis,
                closeness_coefficients=result.steps.closeness_coefficients,
                ranking=result.steps.ranking,
                weights={c.id: list(c.weight) for c in topsis_input.criteria},
            )
            self.db.add(exec_result)

            execution.status = "done"
            log.info("Execution complete", best=result.best_alternative_name, cc=result.best_cc)

        except Exception as exc:
            execution.status = "error"
            execution.error_message = str(exc)
            log.error("Execution failed", error=str(exc))
            raise

        await self.db.flush()
        return execution

    # ──────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────

    async def _load_problem(self, problem_id: str) -> Problem | None:
        result = await self.db.execute(
            select(Problem)
            .options(
                selectinload(Problem.criteria).selectinload(Criterion.evaluations),
                selectinload(Problem.alternatives).selectinload(Alternative.evaluations),
            )
            .where(Problem.id == problem_id)
        )
        return result.scalar_one_or_none()

    def _build_input(self, problem: Problem) -> FuzzyTOPSISInput:
        criteria = [
            CriterionInfo(
                id=str(c.id),
                name=c.name,
                criterion_type=c.criterion_type,
                weight=(c.weight_l, c.weight_m, c.weight_u),
            )
            for c in sorted(problem.criteria, key=lambda x: x.position)
        ]
        alternatives = [
            AlternativeInfo(id=str(a.id), name=a.name)
            for a in sorted(problem.alternatives, key=lambda x: x.position)
        ]

        # Build decision matrix: {alt_id: {crit_id: TFN}}
        decision_matrix: dict[str, dict[str, TFN]] = {}
        for alt in problem.alternatives:
            aid = str(alt.id)
            decision_matrix[aid] = {}
            for ev in alt.evaluations:
                decision_matrix[aid][str(ev.criterion_id)] = (ev.rating_l, ev.rating_m, ev.rating_u)
                
            for c in criteria:
                if c.id not in decision_matrix[aid]:
                    raise ValueError(f"A alternativa '{alt.name}' está sem nota para o critério '{c.name}'.")

        return FuzzyTOPSISInput(
            criteria=criteria,
            alternatives=alternatives,
            decision_matrix=decision_matrix,
        )

    @staticmethod
    def _serialize_matrix(matrix: dict) -> dict:
        """Convert TFN tuples to lists for JSON storage."""
        return {
            alt_id: {
                crit_id: list(tfn)
                for crit_id, tfn in crits.items()
            }
            for alt_id, crits in matrix.items()
        }

    @staticmethod
    def _serialize_dict_tfn(d: dict) -> dict:
        return {k: list(v) for k, v in d.items()}
