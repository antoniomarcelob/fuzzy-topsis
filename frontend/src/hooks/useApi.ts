"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CreateAlternativePayload,
  CreateCriterionPayload,
  CreateProblemPayload,
} from "@/types";

// ─────────────────────────────────────────────
// Query keys factory
// ─────────────────────────────────────────────

export const keys = {
  problems: {
    all: () => ["problems"] as const,
    detail: (id: string) => ["problems", id] as const,
  },
  executions: {
    detail: (id: string) => ["executions", id] as const,
  },
};

// ─────────────────────────────────────────────
// Problems
// ─────────────────────────────────────────────

export function useProblems() {
  return useQuery({
    queryKey: keys.problems.all(),
    queryFn: api.problems.list,
  });
}

export function useProblem(id: string) {
  return useQuery({
    queryKey: keys.problems.detail(id),
    queryFn: () => api.problems.get(id),
    enabled: !!id,
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProblemPayload) => api.problems.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.problems.all() }),
  });
}

export function useUpdateProblem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateProblemPayload>) => api.problems.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.problems.all() });
      qc.invalidateQueries({ queryKey: keys.problems.detail(id) });
    },
  });
}

export function useDeleteProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.problems.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.problems.all() }),
  });
}

// ─────────────────────────────────────────────
// Criteria
// ─────────────────────────────────────────────

export function useCreateCriterion(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCriterionPayload) => api.criteria.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.problems.detail(problemId) }),
  });
}

export function useDeleteCriterion(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.criteria.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.problems.detail(problemId) }),
  });
}

// ─────────────────────────────────────────────
// Alternatives
// ─────────────────────────────────────────────

export function useCreateAlternative(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlternativePayload) => api.alternatives.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.problems.detail(problemId) }),
  });
}

export function useDeleteAlternative(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.alternatives.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.problems.detail(problemId) }),
  });
}

// ─────────────────────────────────────────────
// Executions
// ─────────────────────────────────────────────

export function useRunExecution(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.executions.run(problemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.problems.detail(problemId) });
    },
  });
}

export function useExecution(executionId: string) {
  return useQuery({
    queryKey: keys.executions.detail(executionId),
    queryFn: () => api.executions.get(executionId),
    enabled: !!executionId,
  });
}
