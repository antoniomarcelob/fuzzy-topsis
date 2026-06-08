import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

@pytest.mark.asyncio
async def test_run_execution_not_found():
    """Test that running execution on non-existent problem returns 404"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/executions/run/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 400
