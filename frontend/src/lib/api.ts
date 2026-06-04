/**
 * Typed API client for the Fuzzy TOPSIS backend.
 */

import type {
  CreateAlternativePayload,
  CreateCriterionPayload,
  CreateProblemPayload,
  Execution,
  Problem,
  ProblemListItem,
  Criterion,
  Alternative,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─────────────────────────────────────────────
// Problems
// ─────────────────────────────────────────────

export const api = {
  problems: {
    list: () => apiFetch<ProblemListItem[]>("/problems/"),
    get: (id: string) => apiFetch<Problem>(`/problems/${id}`),
    create: (payload: CreateProblemPayload) =>
      apiFetch<Problem>("/problems/", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<CreateProblemPayload>) =>
      apiFetch<Problem>(`/problems/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id: string) => apiFetch<void>(`/problems/${id}`, { method: "DELETE" }),
  },

  criteria: {
    create: (payload: CreateCriterionPayload) =>
      apiFetch<Criterion>("/criteria/", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<CreateCriterionPayload>) =>
      apiFetch<Criterion>(`/criteria/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id: string) => apiFetch<void>(`/criteria/${id}`, { method: "DELETE" }),
  },

  alternatives: {
    create: (payload: CreateAlternativePayload) =>
      apiFetch<Alternative>("/alternatives/", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<CreateAlternativePayload>) =>
      apiFetch<Alternative>(`/alternatives/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id: string) => apiFetch<void>(`/alternatives/${id}`, { method: "DELETE" }),
  },

  executions: {
    run: (problemId: string) =>
      apiFetch<Execution>(`/executions/run/${problemId}`, { method: "POST" }),
    get: (executionId: string) => apiFetch<Execution>(`/executions/${executionId}`),
  },

  exports: {
    pdfUrl: (problemId: string) => `${BASE_URL}/exports/pdf/${problemId}`,
    csvUrl: (problemId: string) => `${BASE_URL}/exports/csv/${problemId}`,
  },
};
