// ─────────────────────────────────────────────
// Core Fuzzy Types
// ─────────────────────────────────────────────

export type TFN = [number, number, number]; // [lower, modal, upper]

export type CriterionType = "benefit" | "cost";

export type ExecutionStatus = "pending" | "running" | "done" | "error";

// ─────────────────────────────────────────────
// Linguistic Scale
// ─────────────────────────────────────────────

export interface LinguisticTerm {
  id: string;
  term: string;
  l: number;
  m: number;
  u: number;
}

export interface LinguisticScale {
  id: string;
  name: string;
  scale_type: "weight" | "rating";
  is_default: boolean;
  terms: LinguisticTerm[];
}

// ─────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────

export interface Criterion {
  id: string;
  problem_id: string;
  name: string;
  criterion_type: CriterionType;
  weight_term: string;
  weight_l: number;
  weight_m: number;
  weight_u: number;
  position: number;
}

export interface AlternativeEvaluation {
  id: string;
  criterion_id: string;
  rating_term: string;
  rating_l: number;
  rating_m: number;
  rating_u: number;
}

export interface Alternative {
  id: string;
  problem_id: string;
  name: string;
  description?: string;
  position: number;
  evaluations: AlternativeEvaluation[];
}

export interface Problem {
  id: string;
  name: string;
  description?: string;
  application_area?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  criteria: Criterion[];
  alternatives: Alternative[];
}

export interface ProblemListItem {
  id: string;
  name: string;
  description?: string;
  application_area?: string;
  author?: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Execution & Results
// ─────────────────────────────────────────────

export interface RankingItem {
  rank: number;
  alt_id: string;
  alt_name: string;
  cc: number;
  d_pos: number;
  d_neg: number;
}

export interface ExecutionResult {
  id: string;
  execution_id: string;
  decision_matrix: Record<string, Record<string, number[]>>;
  normalized_matrix: Record<string, Record<string, number[]>>;
  weighted_matrix: Record<string, Record<string, number[]>>;
  fpis: Record<string, number[]>;
  fnis: Record<string, number[]>;
  distances_to_fpis: Record<string, number>;
  distances_to_fnis: Record<string, number>;
  closeness_coefficients: Record<string, number>;
  ranking: RankingItem[];
  weights: Record<string, number[]>;
  created_at: string;
}

export interface Execution {
  id: string;
  problem_id: string;
  status: ExecutionStatus;
  error_message?: string;
  executed_at: string;
  result?: ExecutionResult;
}

// ─────────────────────────────────────────────
// Form Payloads
// ─────────────────────────────────────────────

export interface CreateProblemPayload {
  name: string;
  description?: string;
  application_area?: string;
  author?: string;
}

export interface CreateCriterionPayload {
  problem_id: string;
  name: string;
  criterion_type: CriterionType;
  weight_term: string;
  weight_l: number;
  weight_m: number;
  weight_u: number;
  position?: number;
}

export interface EvaluationPayload {
  criterion_id: string;
  rating_term: string;
  rating_l: number;
  rating_m: number;
  rating_u: number;
}

export interface CreateAlternativePayload {
  problem_id: string;
  name: string;
  description?: string;
  evaluations: EvaluationPayload[];
  position?: number;
}

// ─────────────────────────────────────────────
// Default Linguistic Scales
// ─────────────────────────────────────────────

export const DEFAULT_WEIGHT_TERMS: LinguisticTerm[] = [
  { id: "vl", term: "Muito Baixo", l: 1, m: 1, u: 3 },
  { id: "l",  term: "Baixo",       l: 1, m: 3, u: 5 },
  { id: "m",  term: "Médio",       l: 3, m: 5, u: 7 },
  { id: "h",  term: "Alto",        l: 5, m: 7, u: 9 },
  { id: "vh", term: "Muito Alto",  l: 7, m: 9, u: 9 },
];

export const DEFAULT_RATING_TERMS: LinguisticTerm[] = [
  { id: "vp", term: "Muito Ruim", l: 1, m: 1, u: 3 },
  { id: "p",  term: "Ruim",       l: 1, m: 3, u: 5 },
  { id: "f",  term: "Regular",    l: 3, m: 5, u: 7 },
  { id: "g",  term: "Bom",        l: 5, m: 7, u: 9 },
  { id: "vg", term: "Muito Bom",  l: 7, m: 9, u: 9 },
];

export const DEFAULT_COST_TERMS: LinguisticTerm[] = [
  { id: "vl", term: "Muito Bom (Custo Baixo)",       l: 1, m: 1, u: 3 },
  { id: "l",  term: "Bom (Custo Baixo)",             l: 1, m: 3, u: 5 },
  { id: "m",  term: "Regular (Custo Médio)",         l: 3, m: 5, u: 7 },
  { id: "h",  term: "Ruim (Custo Alto)",             l: 5, m: 7, u: 9 },
  { id: "vh", term: "Muito Ruim (Custo Muito Alto)", l: 7, m: 9, u: 9 },
];
