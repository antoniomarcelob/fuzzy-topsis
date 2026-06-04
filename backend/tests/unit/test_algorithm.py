"""
Unit tests for the core Fuzzy TOPSIS algorithm.
Uses a simple 3-alternative, 3-criteria example with known outcomes.
"""
import math
import pytest

from app.services.fuzzy.algorithm import (
    AlternativeInfo,
    CriterionInfo,
    FuzzyTOPSIS,
    FuzzyTOPSISInput,
    tfn_add,
    tfn_multiply,
    vertex_distance,
)


# ─────────────────────────────────────────────
# TFN helpers
# ─────────────────────────────────────────────

def test_tfn_add():
    a = (1.0, 2.0, 3.0)
    b = (2.0, 3.0, 4.0)
    assert tfn_add(a, b) == (3.0, 5.0, 7.0)


def test_tfn_multiply():
    a = (2.0, 3.0, 4.0)
    b = (1.0, 2.0, 3.0)
    assert tfn_multiply(a, b) == (2.0, 6.0, 12.0)


def test_vertex_distance_same():
    a = (1.0, 2.0, 3.0)
    assert vertex_distance(a, a) == pytest.approx(0.0)


def test_vertex_distance_known():
    # d((0,0,0), (3,3,3)) = sqrt(1/3 * 27) = 3
    a = (0.0, 0.0, 0.0)
    b = (3.0, 3.0, 3.0)
    assert vertex_distance(a, b) == pytest.approx(3.0)


# ─────────────────────────────────────────────
# Full algorithm
# ─────────────────────────────────────────────

def _make_simple_input() -> FuzzyTOPSISInput:
    """
    3 alternatives (A1, A2, A3), 2 criteria (C1=benefit, C2=cost).
    All weights = (1,1,1) to simplify normalization verification.
    """
    criteria = [
        CriterionInfo("c1", "Quality", "benefit", weight=(1.0, 1.0, 1.0)),
        CriterionInfo("c2", "Cost", "cost", weight=(1.0, 1.0, 1.0)),
    ]
    alternatives = [
        AlternativeInfo("a1", "Option A"),
        AlternativeInfo("a2", "Option B"),
        AlternativeInfo("a3", "Option C"),
    ]
    decision_matrix = {
        "a1": {"c1": (7.0, 9.0, 9.0), "c2": (3.0, 5.0, 7.0)},
        "a2": {"c1": (5.0, 7.0, 9.0), "c2": (5.0, 7.0, 9.0)},
        "a3": {"c1": (3.0, 5.0, 7.0), "c2": (1.0, 3.0, 5.0)},
    }
    return FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=decision_matrix)


def test_run_returns_result():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    assert result.best_alternative_id in {"a1", "a2", "a3"}
    assert 0.0 <= result.best_cc <= 1.0


def test_ranking_is_sorted():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    ccs = [item["cc"] for item in result.steps.ranking]
    assert ccs == sorted(ccs, reverse=True)


def test_all_cc_in_unit_interval():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    for item in result.steps.ranking:
        assert 0.0 <= item["cc"] <= 1.0, f"CC {item['cc']} out of range"


def test_normalized_matrix_keys():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    for alt in data.alternatives:
        assert alt.id in result.steps.normalized_matrix


def test_fpis_fnis_per_criterion():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    for crit in data.criteria:
        assert crit.id in result.steps.fpis
        assert crit.id in result.steps.fnis


def test_distances_positive():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    for alt in data.alternatives:
        assert result.steps.distances_fpis[alt.id] >= 0
        assert result.steps.distances_fnis[alt.id] >= 0


def test_ranking_length():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    assert len(result.steps.ranking) == len(data.alternatives)


def test_ranking_ranks_sequential():
    data = _make_simple_input()
    topsis = FuzzyTOPSIS(data)
    result = topsis.run()
    ranks = [item["rank"] for item in result.steps.ranking]
    assert ranks == list(range(1, len(data.alternatives) + 1))
