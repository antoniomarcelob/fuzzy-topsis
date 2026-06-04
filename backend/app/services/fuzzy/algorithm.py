"""
Fuzzy TOPSIS Algorithm — Core Implementation.

References:
  Chen, C.T. (2000). Extensions of the TOPSIS for group decision-making
  under fuzzy environment. Fuzzy Sets and Systems, 114(1), 1-9.

All operations follow Triangular Fuzzy Numbers (TFN) arithmetic.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

TFN = Tuple[float, float, float]  # (lower, modal, upper)


# ─────────────────────────────────────────────
# TFN Arithmetic Helpers
# ─────────────────────────────────────────────

def tfn_add(a: TFN, b: TFN) -> TFN:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def tfn_multiply(a: TFN, b: TFN) -> TFN:
    return (a[0] * b[0], a[1] * b[1], a[2] * b[2])


def tfn_scalar_divide(a: TFN, scalar: float) -> TFN:
    if scalar == 0:
        raise ValueError("Division by zero in TFN scalar division")
    return (a[0] / scalar, a[1] / scalar, a[2] / scalar)


def tfn_scalar_divide_inv(scalar: float, a: TFN) -> TFN:
    """scalar / a = (scalar/u, scalar/m, scalar/l)"""
    if any(v == 0 for v in a):
        raise ValueError("Zero value in TFN for inverse division")
    return (scalar / a[2], scalar / a[1], scalar / a[0])


def vertex_distance(a: TFN, b: TFN) -> float:
    """
    Vertex method distance between two TFNs.
    d(a,b) = sqrt(1/3 * [(a1-b1)^2 + (a2-b2)^2 + (a3-b3)^2])
    """
    return math.sqrt(
        (1 / 3) * (
            (a[0] - b[0]) ** 2 +
            (a[1] - b[1]) ** 2 +
            (a[2] - b[2]) ** 2
        )
    )


# ─────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────

@dataclass
class CriterionInfo:
    id: str
    name: str
    criterion_type: str   # 'benefit' | 'cost'
    weight: TFN


@dataclass
class AlternativeInfo:
    id: str
    name: str


@dataclass
class FuzzyTOPSISInput:
    criteria: List[CriterionInfo]
    alternatives: List[AlternativeInfo]
    # decision_matrix[alt_id][crit_id] = TFN
    decision_matrix: Dict[str, Dict[str, TFN]]


@dataclass
class StepData:
    """Holds all intermediate computation results for transparency."""
    # Step 1: raw decision matrix (same as input)
    decision_matrix: Dict[str, Dict[str, TFN]] = field(default_factory=dict)
    # Step 3: normalized matrix
    normalized_matrix: Dict[str, Dict[str, TFN]] = field(default_factory=dict)
    # Step 4: weighted normalized matrix
    weighted_matrix: Dict[str, Dict[str, TFN]] = field(default_factory=dict)
    # Step 5-6: ideal solutions
    fpis: Dict[str, TFN] = field(default_factory=dict)
    fnis: Dict[str, TFN] = field(default_factory=dict)
    # Step 7-8: distances
    distances_fpis: Dict[str, float] = field(default_factory=dict)
    distances_fnis: Dict[str, float] = field(default_factory=dict)
    # Step 9: closeness coefficients
    closeness_coefficients: Dict[str, float] = field(default_factory=dict)
    # Step 10: ranking
    ranking: List[dict] = field(default_factory=list)


@dataclass
class FuzzyTOPSISResult:
    steps: StepData
    best_alternative_id: str
    best_alternative_name: str
    best_cc: float


# ─────────────────────────────────────────────
# Algorithm
# ─────────────────────────────────────────────

class FuzzyTOPSIS:
    """
    Implements the complete Fuzzy TOPSIS algorithm.

    Usage:
        topsis = FuzzyTOPSIS(input_data)
        result = topsis.run()
    """

    def __init__(self, data: FuzzyTOPSISInput):
        self.data = data
        self.steps = StepData()

    def run(self) -> FuzzyTOPSISResult:
        self.steps.decision_matrix = self.data.decision_matrix
        self._normalize()
        self._apply_weights()
        self._determine_fpis_fnis()
        self._calculate_distances()
        self._calculate_closeness_coefficients()
        self._generate_ranking()

        best = self.steps.ranking[0]
        return FuzzyTOPSISResult(
            steps=self.steps,
            best_alternative_id=best["alt_id"],
            best_alternative_name=best["alt_name"],
            best_cc=best["cc"],
        )

    # ── Step 3: Normalize ──────────────────────────────────────────────

    def _normalize(self):
        """
        Benefit criteria:  r̃ij = (aij/c*j, bij/c*j, cij/c*j)
        Cost criteria:     r̃ij = (a-j/cij, a-j/bij, a-j/aij)
        where c*j = max_i(u_ij) for benefit, a-j = min_i(l_ij) for cost
        """
        criteria = self.data.criteria
        alternatives = self.data.alternatives
        dm = self.data.decision_matrix

        norm: Dict[str, Dict[str, TFN]] = {}

        for crit in criteria:
            cid = crit.id
            values = [dm[a.id][cid] for a in alternatives]

            if crit.criterion_type == "benefit":
                c_star = max(v[2] for v in values)  # max upper bound
                for alt in alternatives:
                    norm.setdefault(alt.id, {})
                    v = dm[alt.id][cid]
                    norm[alt.id][cid] = tfn_scalar_divide(v, c_star) if c_star != 0 else (0.0, 0.0, 0.0)
            else:  # cost
                a_minus = min(v[0] for v in values)  # min lower bound
                for alt in alternatives:
                    norm.setdefault(alt.id, {})
                    v = dm[alt.id][cid]
                    norm[alt.id][cid] = tfn_scalar_divide_inv(a_minus, v)

        self.steps.normalized_matrix = norm

    # ── Step 4: Apply Weights ──────────────────────────────────────────

    def _apply_weights(self):
        """ṽij = r̃ij ⊗ w̃j"""
        weighted: Dict[str, Dict[str, TFN]] = {}
        for alt in self.data.alternatives:
            weighted[alt.id] = {}
            for crit in self.data.criteria:
                r = self.steps.normalized_matrix[alt.id][crit.id]
                w = crit.weight
                weighted[alt.id][crit.id] = tfn_multiply(r, w)
        self.steps.weighted_matrix = weighted

    # ── Steps 5-6: FPIS and FNIS ──────────────────────────────────────

    def _determine_fpis_fnis(self):
        """
        FPIS A* = (ṽ*1, ṽ*2, ..., ṽ*n)
        FNIS A- = (ṽ-1, ṽ-2, ..., ṽ-n)

        For both benefit and cost (already normalized):
          FPIS: max upper bound per criterion
          FNIS: min lower bound per criterion
        """
        for crit in self.data.criteria:
            cid = crit.id
            values = [self.steps.weighted_matrix[a.id][cid] for a in self.data.alternatives]
            self.steps.fpis[cid] = (
                max(v[0] for v in values),
                max(v[1] for v in values),
                max(v[2] for v in values),
            )
            self.steps.fnis[cid] = (
                min(v[0] for v in values),
                min(v[1] for v in values),
                min(v[2] for v in values),
            )

    # ── Steps 7-8: Distances ──────────────────────────────────────────

    def _calculate_distances(self):
        """
        d*i = Σ_j d(ṽij, ṽ*j)
        d-i = Σ_j d(ṽij, ṽ-j)
        """
        for alt in self.data.alternatives:
            aid = alt.id
            d_pos = sum(
                vertex_distance(
                    self.steps.weighted_matrix[aid][crit.id],
                    self.steps.fpis[crit.id]
                )
                for crit in self.data.criteria
            )
            d_neg = sum(
                vertex_distance(
                    self.steps.weighted_matrix[aid][crit.id],
                    self.steps.fnis[crit.id]
                )
                for crit in self.data.criteria
            )
            self.steps.distances_fpis[aid] = d_pos
            self.steps.distances_fnis[aid] = d_neg

    # ── Step 9: Closeness Coefficients ────────────────────────────────

    def _calculate_closeness_coefficients(self):
        """CCi = d-i / (d*i + d-i)"""
        for alt in self.data.alternatives:
            aid = alt.id
            d_pos = self.steps.distances_fpis[aid]
            d_neg = self.steps.distances_fnis[aid]
            denominator = d_pos + d_neg
            self.steps.closeness_coefficients[aid] = (
                d_neg / denominator if denominator != 0 else 0.0
            )

    # ── Step 10: Ranking ──────────────────────────────────────────────

    def _generate_ranking(self):
        """Sort alternatives by CC in descending order."""
        ranked = sorted(
            [
                {
                    "alt_id": alt.id,
                    "alt_name": alt.name,
                    "cc": self.steps.closeness_coefficients[alt.id],
                    "d_pos": self.steps.distances_fpis[alt.id],
                    "d_neg": self.steps.distances_fnis[alt.id],
                }
                for alt in self.data.alternatives
            ],
            key=lambda x: x["cc"],
            reverse=True,
        )
        for i, item in enumerate(ranked):
            item["rank"] = i + 1
        self.steps.ranking = ranked
