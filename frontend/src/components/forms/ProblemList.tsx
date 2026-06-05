"use client";

import Link from "next/link";
import { useProblems, useDeleteProblem, useRunExecution } from "@/hooks/useApi";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProblemListItem } from "@/types";

function ProblemCard({ problem }: { problem: ProblemListItem }) {
  const router = useRouter();
  const deleteProblem = useDeleteProblem();
  const runExecution = useRunExecution(problem.id);
  const [isRunning, setIsRunning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleRun() {
    setIsRunning(true);
    try {
      const exec = await runExecution.mutateAsync();
      router.push(`/executions/${exec.id}`);
    } catch {
      setIsRunning(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteProblem.mutateAsync(problem.id);
    setConfirmDelete(false);
  }

  return (
    <div className="card p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/problems/${problem.id}`} className="hover:text-blue-600 transition-colors">
            <h3 className="font-semibold text-gray-900 text-base truncate">{problem.name}</h3>
          </Link>
          {problem.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{problem.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {problem.application_area && <span>📂 {problem.application_area}</span>}
            {problem.author && <span>👤 {problem.author}</span>}
            <span>🕒 {new Date(problem.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isRunning ? "▶ Executando..." : "▶ Executar"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteProblem.isPending}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${
              confirmDelete
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600"
            }`}
          >
            {confirmDelete ? "Confirmar exclusão" : "✕"}
          </button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProblemList() {
  const { data: problems, isLoading, error } = useProblems();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-72" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-gray-500">
        <p>Erro ao carregar problemas. Verifique a conexão com a API.</p>
      </div>
    );
  }

  if (!problems || problems.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum problema criado ainda</h3>
        <p className="text-gray-500 text-sm mb-6">
          Comece criando seu primeiro problema de decisão multicritério.
        </p>
        <Link href="/wizard" className="btn-primary inline-block">
          + Criar primeiro problema
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {problems.map((problem) => (
        <ProblemCard key={problem.id} problem={problem} />
      ))}
    </div>
  );
}
