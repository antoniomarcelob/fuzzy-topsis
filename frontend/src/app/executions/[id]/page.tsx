"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useExecution, useProblem } from "@/hooks/useApi";
import { ExecutionStepper } from "@/components/stepper/ExecutionStepper";
import { ResultCharts } from "@/components/charts/ResultCharts";
import { api } from "@/lib/api";

type Tab = "dashboard" | "stepper" | "matrices";

export default function ExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const { data: execution, isLoading: execLoading } = useExecution(id);
  const { data: problem, isLoading: probLoading } = useProblem(
    execution?.problem_id ?? ""
  );

  if (execLoading || probLoading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <span>Carregando resultados...</span>
        </div>
      </main>
    );
  }

  if (!execution || !problem) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Execução não encontrada.</p>
        <Link href="/problems" className="btn-primary inline-block mt-4">← Voltar</Link>
      </main>
    );
  }

  if (execution.status === "error") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="card p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro na execução</h2>
          <p className="text-gray-600 text-sm">{execution.error_message}</p>
          <Link href="/problems" className="btn-secondary inline-block mt-6">← Voltar aos problemas</Link>
        </div>
      </main>
    );
  }

  const result = execution.result;
  const best = result?.ranking?.[0];

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/problems" className="hover:text-gray-700">Problemas</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">{problem.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Resultado da Análise</h1>
          <p className="text-gray-500 text-sm mt-1">
            Executado em {new Date(execution.executed_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={api.exports.csvUrl(problem.id)}
            download
            className="btn-secondary text-sm"
          >
            ↓ CSV
          </a>
          <a
            href={api.exports.pdfUrl(problem.id)}
            download
            className="btn-secondary text-sm"
          >
            ↓ PDF
          </a>
        </div>
      </div>

      {/* Best alternative card */}
      {best && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
            <div className="flex-1">
              <p className="text-green-100 text-sm font-medium">Alternativa Recomendada</p>
              <h2 className="text-2xl font-bold">{best.alt_name}</h2>
              <p className="text-green-100 text-sm mt-0.5">
                {problem.criteria.length} critérios · {problem.alternatives.length} alternativas avaliadas
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{best.cc.toFixed(4)}</div>
              <div className="text-green-100 text-sm">Closeness Coefficient</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick ranking cards */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {result.ranking.slice(0, 3).map((item, i) => (
            <div
              key={item.alt_id}
              className={`card p-4 flex items-center gap-3 ${i === 0 ? "border-green-300 bg-green-50/40" : ""}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                i === 0 ? "bg-green-500 text-white" : i === 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
              }`}>
                {item.rank}º
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{item.alt_name}</div>
                <div className="text-xs text-gray-500">CC = {item.cc.toFixed(4)}</div>
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${i === 0 ? "bg-green-500" : "bg-blue-400"}`}
                  style={{ width: `${item.cc * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["dashboard", "stepper", "matrices"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "dashboard" && "📊 Dashboard"}
            {tab === "stepper" && "📖 Passo a Passo (11 etapas)"}
            {tab === "matrices" && "🔢 Matrizes"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && result && (
        <ResultCharts result={result} problem={problem} />
      )}

      {activeTab === "stepper" && result && (
        <ExecutionStepper execution={execution} problem={problem} />
      )}

      {activeTab === "matrices" && result && (
        <div className="space-y-6">
          <MatrixTable
            title="Closeness Coefficients — Ranking Final"
            headers={["Posição", "Alternativa", "CC", "d* (FPIS)", "d⁻ (FNIS)"]}
            rows={result.ranking.map((r) => [
              r.rank.toString(),
              r.alt_name,
              r.cc.toFixed(6),
              r.d_pos.toFixed(6),
              r.d_neg.toFixed(6),
            ])}
          />
          <RawMatrixTable
            title="Matriz de Decisão Fuzzy (TFN)"
            matrix={result.decision_matrix}
            criteria={problem.criteria}
            alternatives={problem.alternatives}
          />
          <RawMatrixTable
            title="Matriz Normalizada"
            matrix={result.normalized_matrix}
            criteria={problem.criteria}
            alternatives={problem.alternatives}
          />
          <RawMatrixTable
            title="Matriz Ponderada"
            matrix={result.weighted_matrix}
            criteria={problem.criteria}
            alternatives={problem.alternatives}
          />
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function MatrixTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {headers.map((h, i) => (
                <th key={i} className="border border-gray-100 px-3 py-2 text-left font-medium text-gray-600 text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-100 px-3 py-2 font-mono text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RawMatrixTable({
  title,
  matrix,
  criteria,
  alternatives,
}: {
  title: string;
  matrix: Record<string, Record<string, number[]>>;
  criteria: { id: string; name: string }[];
  alternatives: { id: string; name: string }[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-100 px-3 py-2 text-left font-medium text-xs text-gray-600">Alternativa</th>
              {criteria.map((c) => (
                <th key={c.id} className="border border-gray-100 px-3 py-2 text-center font-medium text-xs text-gray-600">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alternatives.map((alt) => (
              <tr key={alt.id} className="hover:bg-gray-50">
                <td className="border border-gray-100 px-3 py-2 font-medium text-xs">{alt.name}</td>
                {criteria.map((c) => {
                  const vals = matrix[alt.id]?.[c.id];
                  return (
                    <td key={c.id} className="border border-gray-100 px-3 py-2 text-center">
                      {vals ? (
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                          ({vals[0]?.toFixed(3)}, {vals[1]?.toFixed(3)}, {vals[2]?.toFixed(3)})
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
