"""
Integration tests: full HTTP round-trip for execution flow.
Requires a running test database (set via DATABASE_URL env var).
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.base import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.anyio
async def test_create_and_run_problem():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create problem
        resp = await client.post("/problems/", json={
            "name": "Test Problem Integration",
            "description": "Automated test",
            "author": "pytest",
        })
        assert resp.status_code == 201
        problem_id = resp.json()["id"]

        # 2. Create criteria
        c1 = await client.post("/criteria/", json={
            "problem_id": problem_id,
            "name": "Quality",
            "criterion_type": "benefit",
            "weight_term": "Alto",
            "weight_l": 5, "weight_m": 7, "weight_u": 9,
            "position": 0,
        })
        assert c1.status_code == 201
        crit1_id = c1.json()["id"]

        c2 = await client.post("/criteria/", json={
            "problem_id": problem_id,
            "name": "Cost",
            "criterion_type": "cost",
            "weight_term": "Médio",
            "weight_l": 3, "weight_m": 5, "weight_u": 7,
            "position": 1,
        })
        assert c2.status_code == 201
        crit2_id = c2.json()["id"]

        # 3. Create alternatives with evaluations
        for i, (r1_l, r1_m, r1_u, r2_l, r2_m, r2_u) in enumerate([
            (7, 9, 9, 1, 3, 5),   # A1: very good quality, low cost
            (5, 7, 9, 5, 7, 9),   # A2: good quality, high cost
            (3, 5, 7, 3, 5, 7),   # A3: fair quality, medium cost
        ]):
            a = await client.post("/alternatives/", json={
                "problem_id": problem_id,
                "name": f"Alternative {i+1}",
                "position": i,
                "evaluations": [
                    {"criterion_id": crit1_id, "rating_term": "Muito Bom", "rating_l": r1_l, "rating_m": r1_m, "rating_u": r1_u},
                    {"criterion_id": crit2_id, "rating_term": "Bom", "rating_l": r2_l, "rating_m": r2_m, "rating_u": r2_u},
                ],
            })
            assert a.status_code == 201

        # 4. Run execution
        run = await client.post(f"/executions/run/{problem_id}")
        assert run.status_code == 201
        execution = run.json()
        assert execution["status"] == "done"
        assert execution["result"] is not None

        result = execution["result"]
        ranking = result["ranking"]

        # 5. Validate result structure
        assert len(ranking) == 3
        assert all(0 <= r["cc"] <= 1 for r in ranking)
        ccs = [r["cc"] for r in ranking]
        assert ccs == sorted(ccs, reverse=True), "Ranking should be in descending CC order"

        # A1 should rank first (best quality, lowest cost)
        assert ranking[0]["alt_name"] == "Alternative 1"

        # 6. Cleanup
        await client.delete(f"/problems/{problem_id}")
