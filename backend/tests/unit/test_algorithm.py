import math
import pytest
from app.services.fuzzy.algorithm import (
    AlternativeInfo,
    CriterionInfo,
    FuzzyTOPSIS,
    FuzzyTOPSISInput,
    tfn_add,
    tfn_multiply,
    tfn_scalar_divide,
    tfn_scalar_divide_inv,
    vertex_distance,
)

# ─────────────────────────────────────────────
# Fixtures & Linguistic Scales
# ─────────────────────────────────────────────

SCALE = {
    "VL": (1.0, 1.0, 3.0),
    "L": (1.0, 3.0, 5.0),
    "M": (3.0, 5.0, 7.0),
    "H": (5.0, 7.0, 9.0),
    "VH": (7.0, 9.0, 9.0),
}


@pytest.fixture
def base_criteria():
    return [
        CriterionInfo(id="c1", name="C1", criterion_type="benefit", weight=SCALE["VH"]),
        CriterionInfo(id="c2", name="C2", criterion_type="benefit", weight=SCALE["VH"]),
        CriterionInfo(id="c3", name="C3", criterion_type="benefit", weight=SCALE["VH"]),
        CriterionInfo(id="c4", name="C4", criterion_type="benefit", weight=SCALE["VH"]),
    ]


@pytest.fixture
def base_alternatives():
    return [
        AlternativeInfo(id="a1", name="A1"),
        AlternativeInfo(id="a2", name="A2"),
        AlternativeInfo(id="a3", name="A3"),
        AlternativeInfo(id="a4", name="A4"),
    ]


# ─────────────────────────────────────────────
# Unit Tests: Math Basics
# ─────────────────────────────────────────────

def test_tfn_arithmetic():
    a = (1.0, 2.0, 3.0)
    b = (2.0, 3.0, 4.0)

    # Add
    assert tfn_add(a, b) == (3.0, 5.0, 7.0)

    # Multiply
    assert tfn_multiply(a, b) == (2.0, 6.0, 12.0)

    # Scalar divide
    assert tfn_scalar_divide(a, 2.0) == (0.5, 1.0, 1.5)

    with pytest.raises(ValueError, match="Division by zero"):
        tfn_scalar_divide(a, 0)

    # Scalar divide inv
    assert tfn_scalar_divide_inv(2.0, a) == (2/3, 2/2, 2/1)

    with pytest.raises(ValueError, match="Zero value in TFN"):
        tfn_scalar_divide_inv(2.0, (0.0, 1.0, 2.0))

def test_vertex_distance():
    a = (1.0, 2.0, 3.0)
    b = (2.0, 3.0, 4.0)
    dist = vertex_distance(a, b)
    expected = math.sqrt(1/3 * (1**2 + 1**2 + 1**2))
    assert math.isclose(dist, expected)


# ─────────────────────────────────────────────
# Scenario 1: Total Domination
# ─────────────────────────────────────────────

def test_total_domination(base_criteria, base_alternatives):
    """
    A1 is VH in all, A2 is H, A3 is M, A4 is L.
    A1 should have CC=1.0 and distance to FPIS = 0.
    A4 should have CC=0.0 and distance to FNIS = 0.
    """
    dm = {
        "a1": {"c1": SCALE["VH"], "c2": SCALE["VH"], "c3": SCALE["VH"], "c4": SCALE["VH"]},
        "a2": {"c1": SCALE["H"], "c2": SCALE["H"], "c3": SCALE["H"], "c4": SCALE["H"]},
        "a3": {"c1": SCALE["M"], "c2": SCALE["M"], "c3": SCALE["M"], "c4": SCALE["M"]},
        "a4": {"c1": SCALE["L"], "c2": SCALE["L"], "c3": SCALE["L"], "c4": SCALE["L"]},
    }
    topsis_input = FuzzyTOPSISInput(criteria=base_criteria, alternatives=base_alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()

    # Ranking assertions
    assert result.steps.ranking[0]["alt_id"] == "a1"
    assert result.steps.ranking[1]["alt_id"] == "a2"
    assert result.steps.ranking[2]["alt_id"] == "a3"
    assert result.steps.ranking[3]["alt_id"] == "a4"

    # CC assertions (A1 should be the highest, A4 the lowest)
    assert result.steps.closeness_coefficients["a1"] > 0.8
    assert result.steps.closeness_coefficients["a4"] < 0.4

    # Distance assertions (A1 should be closer to FPIS than A4)
    assert result.steps.distances_fpis["a1"] < result.steps.distances_fpis["a4"]
    assert result.steps.distances_fnis["a1"] > result.steps.distances_fnis["a4"]

    # FPIS/FNIS structural check (Chen 2000 purist variant)
    for crit in base_criteria:
        assert topsis.steps.fpis[crit.id] == crit.weight
        assert topsis.steps.fnis[crit.id] == (0.0, 0.0, 0.0)


# ─────────────────────────────────────────────
# Scenario 2: Cost Dominant
# ─────────────────────────────────────────────

def test_cost_dominant():
    criteria = [
        CriterionInfo(id="c_cost", name="Custo", criterion_type="cost", weight=SCALE["VH"]),
        CriterionInfo(id="c_qual", name="Qualidade", criterion_type="benefit", weight=SCALE["M"]),
    ]
    alternatives = [
        AlternativeInfo(id="a1", name="A1"),
        AlternativeInfo(id="a2", name="A2"),
        AlternativeInfo(id="a3", name="A3"),
        AlternativeInfo(id="a4", name="A4"),
    ]
    dm = {
        "a1": {"c_cost": SCALE["VH"], "c_qual": SCALE["VH"]},  # High cost (bad), High quality
        "a2": {"c_cost": SCALE["H"], "c_qual": SCALE["H"]},
        "a3": {"c_cost": SCALE["L"], "c_qual": SCALE["M"]},
        "a4": {"c_cost": SCALE["VL"], "c_qual": SCALE["L"]},   # Very low cost (good), Low quality
    }
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()

    # Cost has higher weight, so A4 (Very low cost) should dominate
    assert result.steps.ranking[0]["alt_id"] == "a4"
    assert result.steps.ranking[1]["alt_id"] == "a3"


# ─────────────────────────────────────────────
# Scenario 3: Benefit Dominant
# ─────────────────────────────────────────────

def test_benefit_dominant():
    criteria = [
        CriterionInfo(id="c_cost", name="Custo", criterion_type="cost", weight=SCALE["L"]),
        CriterionInfo(id="c_qual", name="Qualidade", criterion_type="benefit", weight=SCALE["VH"]),
    ]
    alternatives = [
        AlternativeInfo(id="a1", name="A1"),
        AlternativeInfo(id="a2", name="A2"),
        AlternativeInfo(id="a3", name="A3"),
        AlternativeInfo(id="a4", name="A4"),
    ]
    dm = {
        "a1": {"c_cost": SCALE["VH"], "c_qual": SCALE["VH"]},  # High cost, High quality (wins because quality dominates)
        "a2": {"c_cost": SCALE["H"], "c_qual": SCALE["H"]},
        "a3": {"c_cost": SCALE["L"], "c_qual": SCALE["M"]},
        "a4": {"c_cost": SCALE["VL"], "c_qual": SCALE["L"]},   # Low cost, Low quality
    }
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()

    # Quality has higher weight, so A1 should dominate
    assert result.steps.ranking[0]["alt_id"] == "a1"


# ─────────────────────────────────────────────
# Scenario 4: Conflict Benefit x Cost
# ─────────────────────────────────────────────

def test_conflict_benefit_cost():
    criteria = [
        CriterionInfo(id="c_cost", name="Custo", criterion_type="cost", weight=SCALE["VH"]),
        CriterionInfo(id="c_qual", name="Qualidade", criterion_type="benefit", weight=SCALE["VH"]),
    ]
    alternatives = [
        AlternativeInfo(id="a1", name="A1"),
        AlternativeInfo(id="a2", name="A2"),
        AlternativeInfo(id="a3", name="A3"),
        AlternativeInfo(id="a4", name="A4"),
    ]
    dm = {
        "a1": {"c_cost": SCALE["VH"], "c_qual": SCALE["VH"]},
        "a2": {"c_cost": SCALE["H"], "c_qual": SCALE["H"]},
        "a3": {"c_cost": SCALE["M"], "c_qual": SCALE["M"]},
        "a4": {"c_cost": SCALE["VL"], "c_qual": SCALE["VL"]},
    }
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()

    # No alternative is perfect (none has both VL cost and VH quality)
    # Therefore, CC must be < 1.0 and > 0.0 for all
    for cc in result.steps.closeness_coefficients.values():
        assert 0.0 < cc < 1.0


# ─────────────────────────────────────────────
# Scenario 5: Best Supplier
# ─────────────────────────────────────────────

def test_best_supplier():
    criteria = [
        CriterionInfo(id="c1", name="Qualidade", criterion_type="benefit", weight=SCALE["VH"]),
        CriterionInfo(id="c2", name="Prazo", criterion_type="benefit", weight=SCALE["H"]),
        CriterionInfo(id="c3", name="Custo", criterion_type="cost", weight=SCALE["H"]),
        CriterionInfo(id="c4", name="Suporte", criterion_type="benefit", weight=SCALE["M"]),
    ]
    alternatives = [
        AlternativeInfo(id="a1", name="A1"),
        AlternativeInfo(id="a2", name="A2"),
        AlternativeInfo(id="a3", name="A3"),
        AlternativeInfo(id="a4", name="A4"),
    ]
    dm = {
        "a1": {"c1": SCALE["VH"], "c2": SCALE["H"], "c3": SCALE["M"], "c4": SCALE["H"]},
        "a2": {"c1": SCALE["H"], "c2": SCALE["VH"], "c3": SCALE["VH"], "c4": SCALE["M"]},
        "a3": {"c1": SCALE["VH"], "c2": SCALE["M"], "c3": SCALE["L"], "c4": SCALE["VH"]},
        "a4": {"c1": SCALE["M"], "c2": SCALE["H"], "c3": SCALE["H"], "c4": SCALE["H"]},
    }
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()

    # A3 is VH in Qual, L in Cost (very good), and VH in Support. It should be first.
    assert result.steps.ranking[0]["alt_id"] == "a3"


# ─────────────────────────────────────────────
# Edge Cases & Numerical Stability
# ─────────────────────────────────────────────

def test_missing_evaluation():
    criteria = [CriterionInfo(id="c1", name="C1", criterion_type="benefit", weight=SCALE["VH"])]
    alternatives = [AlternativeInfo(id="a1", name="A1")]
    # dm is missing evaluation for a1->c1
    dm = {"a1": {}}
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    
    with pytest.raises(KeyError):
        topsis.run()


def test_zero_division_protection():
    # If all values are 0, c_star is 0.
    # The algorithm uses: tfn_scalar_divide(v, c_star) if c_star != 0 else (0.0, 0.0, 0.0)
    criteria = [CriterionInfo(id="c1", name="C1", criterion_type="benefit", weight=SCALE["VH"])]
    alternatives = [AlternativeInfo(id="a1", name="A1")]
    dm = {"a1": {"c1": (0.0, 0.0, 0.0)}}
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()
    
    # Should safely return 0 without division by zero errors
    assert result.steps.normalized_matrix["a1"]["c1"] == (0.0, 0.0, 0.0)

def test_empty_alternatives():
    topsis_input = FuzzyTOPSISInput(criteria=[], alternatives=[], decision_matrix={})
    topsis = FuzzyTOPSIS(topsis_input)
    
    with pytest.raises(ValueError, match="No alternatives found to rank."):
        topsis.run()

def test_identical_alternatives():
    # If two alternatives have identical evaluations, their CCs should be identical
    criteria = [CriterionInfo(id="c1", name="C1", criterion_type="benefit", weight=SCALE["VH"])]
    alternatives = [AlternativeInfo(id="a1", name="A1"), AlternativeInfo(id="a2", name="A2")]
    dm = {
        "a1": {"c1": SCALE["M"]},
        "a2": {"c1": SCALE["M"]},
    }
    
    topsis_input = FuzzyTOPSISInput(criteria=criteria, alternatives=alternatives, decision_matrix=dm)
    topsis = FuzzyTOPSIS(topsis_input)
    result = topsis.run()
    
    assert math.isclose(result.steps.closeness_coefficients["a1"], result.steps.closeness_coefficients["a2"])
