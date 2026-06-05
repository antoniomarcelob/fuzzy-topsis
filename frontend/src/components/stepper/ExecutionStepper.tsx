"use client";

/**
 * ExecutionStepper — displays all 11 Fuzzy TOPSIS steps interactively.
 * Each step shows: description, formula, input table, output table.
 */

import { useState } from "react";
import type { Execution, Problem } from "@/types";

interface Props {
  execution: Execution;
  problem: Problem;
}

const STEPS = [
  {
    id: 1,
    label: "Matriz de Decisão",
    description: "Avaliações linguísticas originais fornecidas pelos decisores para cada alternativa e critério.",
    formula: null,
    what: "Estes são os dados brutos que você forneceu. Cada célula contém uma avaliação linguística (ex: Bom, Muito Bom) para uma alternativa em relação a um critério.",
  },
  {
    id: 2,
    label: "Conversão para TFN",
    description: "As avaliações linguísticas são convertidas para Números Fuzzy Triangulares (TFN).",
    formula: "\"Bom\" → (5, 7, 9)   |   \"Muito Bom\" → (7, 9, 9)",
    what: "Cada termo linguístico corresponde a três números (l, m, u): o valor mínimo, o mais provável e o máximo. Isso permite tratar incertezas matematicamente.",
  },
  {
    id: 3,
    label: "Normalização",
    description: "Elimina diferenças de escala entre critérios.",
    formula: "Benefício: r̃ij = (aij/c*j, bij/c*j, cij/c*j) | Custo: r̃ij = (a⁻j/cij, a⁻j/bij, a⁻j/aij)",
    what: "A normalização garante que todos os critérios estejam na mesma escala [0,1], independente da unidade original.",
  },
  {
    id: 4,
    label: "Pesos Fuzzy",
    description: "Aplica a importância (peso) de cada critério na matriz normalizada.",
    formula: "ṽij = r̃ij ⊗ w̃j",
    what: "Critérios mais importantes recebem maior influência. A multiplicação é feita componente a componente nos números fuzzy.",
  },
  {
    id: 5,
    label: "Matriz Ponderada",
    description: "Resultado completo da multiplicação normalização × pesos.",
    formula: "ṽij = (r̃ij_l × w̃j_l, r̃ij_m × w̃j_m, r̃ij_u × w̃j_u)",
    what: "Esta é a matriz que combina a avaliação relativa com a importância de cada critério.",
  },
  {
    id: 6,
    label: "FPIS — Solução Ideal",
    description: "Fuzzy Positive Ideal Solution: a melhor alternativa hipotética possível.",
    formula: "A* = (ṽ*₁, ṽ*₂, ..., ṽ*ₙ) onde ṽ*j = max_i(ṽij)",
    what: "Representa uma alternativa fictícia que seria perfeita em todos os critérios. Nenhuma alternativa real atinge esse ponto — mas quanto mais próxima, melhor.",
  },
  {
    id: 7,
    label: "FNIS — Solução Anti-ideal",
    description: "Fuzzy Negative Ideal Solution: a pior alternativa hipotética possível.",
    formula: "A⁻ = (ṽ⁻₁, ṽ⁻₂, ..., ṽ⁻ₙ) onde ṽ⁻j = min_i(ṽij)",
    what: "Representa a pior solução imaginável. Quanto mais distante uma alternativa estiver daqui, melhor.",
  },
  {
    id: 8,
    label: "Distâncias para FPIS",
    description: "Mede o quão longe cada alternativa está da solução ideal.",
    formula: "d*i = Σj d(ṽij, ṽ*j)   onde d(a,b) = √(⅓[(a₁−b₁)²+(a₂−b₂)²+(a₃−b₃)²])",
    what: "Quanto menor essa distância, mais próxima a alternativa está da solução perfeita. Boa sinal: d* pequeno.",
  },
  {
    id: 9,
    label: "Distâncias para FNIS",
    description: "Mede o quão longe cada alternativa está da pior solução.",
    formula: "d⁻i = Σj d(ṽij, ṽ⁻j)",
    what: "Quanto maior essa distância, mais longe a alternativa está da pior opção. Bom sinal: d⁻ grande.",
  },
  {
    id: 10,
    label: "Closeness Coefficient",
    description: "Índice final que combina as duas distâncias em um único número [0,1].",
    formula: "CCi = d⁻i / (d*i + d⁻i)",
    what: "Quanto mais próximo de 1, melhor a alternativa. CC=1 seria a solução ideal perfeita; CC=0 seria a pior solução possível.",
  },
  {
    id: 11,
    label: "Ranking Final",
    description: "Ordenação das alternativas do melhor para o pior CC.",
    formula: "Rank: ordenação decrescente por CCi",
    what: "A alternativa com maior CC é a recomendada. O ranking permite comparar todas as opções de forma objetiva.",
  },
];

function TFNBadge({ values }: { values: number[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
      ({values[0]?.toFixed(2)}, {values[1]?.toFixed(2)}, {values[2]?.toFixed(2)})
    </span>
  );
}

export function ExecutionStepper({ execution, problem }: Props) {
  const [activeStep, setActiveStep] = useState(1);
  const result = execution.result;

  if (!result) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum resultado disponível. Execute a análise primeiro.
      </div>
    );
  }

  const step = STEPS[activeStep - 1];
  const criteria = problem.criteria;
  const alternatives = problem.alternatives;

  function renderStepContent() {
    switch (activeStep) {
      case 1:
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium">Alternativa</th>
                  {criteria.map((c) => (
                    <th key={c.id} className="border border-gray-200 px-3 py-2 text-center font-medium">
                      {c.name}
                      <span className={`ml-1 text-xs px-1 rounded ${c.criterion_type === "benefit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {c.criterion_type === "benefit" ? "↑ ben." : "↓ cust."}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alternatives.map((alt) => (
                  <tr key={alt.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 font-medium">{alt.name}</td>
                    {criteria.map((c) => {
                      const ev = alt.evaluations.find((e) => e.criterion_id === c.id);
                      return (
                        <td key={c.id} className="border border-gray-200 px-3 py-2 text-center">
                          {ev ? (
                            <div>
                              <div className="font-medium text-gray-800">{ev.rating_term}</div>
                              <div className="text-gray-500 text-xs">({ev.rating_l}, {ev.rating_m}, {ev.rating_u})</div>
                            </div>
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
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Escala utilizada para conversão:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { term: "Muito Ruim", tfn: "(1, 1, 3)" },
                { term: "Ruim", tfn: "(1, 3, 5)" },
                { term: "Regular", tfn: "(3, 5, 7)" },
                { term: "Bom", tfn: "(5, 7, 9)" },
                { term: "Muito Bom", tfn: "(7, 9, 9)" },
              ].map((item) => (
                <div key={item.term} className="border border-gray-200 rounded-lg p-3 text-center">
                  <div className="font-medium text-sm text-gray-800">{item.term}</div>
                  <div className="font-mono text-xs text-blue-600 mt-1">{item.tfn}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-4">Matriz de Decisão Fuzzy resultante:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Alternativa</th>
                    {criteria.map((c) => (
                      <th key={c.id} className="border border-gray-200 px-3 py-2 text-center">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt) => (
                    <tr key={alt.id}>
                      <td className="border border-gray-200 px-3 py-2 font-medium">{alt.name}</td>
                      {criteria.map((c) => {
                        const vals = result.decision_matrix[alt.id]?.[c.id];
                        return (
                          <td key={c.id} className="border border-gray-200 px-3 py-2 text-center">
                            {vals ? <TFNBadge values={vals} /> : "—"}
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

      case 3:
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <p className="text-xs text-gray-500 mb-2">Matriz normalizada r̃ij:</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Alternativa</th>
                    {criteria.map((c) => (
                      <th key={c.id} className="border border-gray-200 px-3 py-2 text-center">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt) => (
                    <tr key={alt.id}>
                      <td className="border border-gray-200 px-3 py-2 font-medium">{alt.name}</td>
                      {criteria.map((c) => {
                        const vals = result.normalized_matrix[alt.id]?.[c.id];
                        return (
                          <td key={c.id} className="border border-gray-200 px-3 py-2 text-center">
                            {vals ? <TFNBadge values={vals} /> : "—"}
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

      case 4:
      case 5:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {criteria.map((c) => {
                const w = result.weights[c.id];
                return (
                  <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-xs text-amber-700 font-medium">{c.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{c.weight_term}</div>
                    {w && <TFNBadge values={w} />}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">Matriz ponderada ṽij = r̃ij ⊗ w̃j:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-amber-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Alternativa</th>
                    {criteria.map((c) => (
                      <th key={c.id} className="border border-gray-200 px-3 py-2 text-center">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt) => (
                    <tr key={alt.id}>
                      <td className="border border-gray-200 px-3 py-2 font-medium">{alt.name}</td>
                      {criteria.map((c) => {
                        const vals = result.weighted_matrix[alt.id]?.[c.id];
                        return (
                          <td key={c.id} className="border border-gray-200 px-3 py-2 text-center">
                            {vals ? <TFNBadge values={vals} /> : "—"}
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

      case 6:
      case 7:
        const data = activeStep === 6 ? result.fpis : result.fnis;
        const label = activeStep === 6 ? "FPIS (A*)" : "FNIS (A⁻)";
        const colorClass = activeStep === 6 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={`${colorClass}`}>
                  <th className="border border-gray-200 px-3 py-2 text-left">{label}</th>
                  {criteria.map((c) => (
                    <th key={c.id} className="border border-gray-200 px-3 py-2 text-center">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-3 py-2 font-medium">{label}</td>
                  {criteria.map((c) => {
                    const vals = data[c.id];
                    return (
                      <td key={c.id} className="border border-gray-200 px-3 py-2 text-center">
                        {vals ? <TFNBadge values={vals} /> : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 8:
      case 9:
        const dists = activeStep === 8 ? result.distances_to_fpis : result.distances_to_fnis;
        const distLabel = activeStep === 8 ? "Distância para FPIS (d*)" : "Distância para FNIS (d⁻)";
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left">Alternativa</th>
                <th className="border border-gray-200 px-3 py-2 text-center">{distLabel}</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => (
                <tr key={alt.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium">{alt.name}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono">
                    {dists[alt.id]?.toFixed(6) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 10:
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-200 px-3 py-2 text-left">Alternativa</th>
                <th className="border border-gray-200 px-3 py-2 text-center">d* (FPIS)</th>
                <th className="border border-gray-200 px-3 py-2 text-center">d⁻ (FNIS)</th>
                <th className="border border-gray-200 px-3 py-2 text-center font-bold">CC</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => (
                <tr key={alt.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium">{alt.name}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono text-sm">
                    {result.distances_to_fpis[alt.id]?.toFixed(4)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-mono text-sm">
                    {result.distances_to_fnis[alt.id]?.toFixed(4)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-bold text-blue-700">
                    {result.closeness_coefficients[alt.id]?.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 11:
        return (
          <div className="space-y-4">
            {result.ranking.map((item, i) => (
              <div
                key={item.alt_id}
                className={`flex items-center gap-4 p-4 rounded-xl border ${i === 0 ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${i === 0 ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {item.rank}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{item.alt_name}</div>
                  {i === 0 && (
                    <div className="text-xs text-green-700 mt-0.5">
                      ✓ Alternativa recomendada com maior proximidade à solução ideal
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-700">{item.cc.toFixed(4)}</div>
                  <div className="text-xs text-gray-500">CC</div>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${i === 0 ? "bg-green-500" : "bg-blue-400"}`}
                    style={{ width: `${item.cc * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              <strong>Interpretação automática:</strong>{" "}
              {result.ranking[0] && (
                <>
                  A alternativa <strong>{result.ranking[0].alt_name}</strong> apresentou o maior Closeness Coefficient
                  ({result.ranking[0].cc.toFixed(4)}), indicando maior proximidade à Solução Ideal Fuzzy (FPIS) e
                  maior distância da Solução Anti-Ideal Fuzzy (FNIS). Esta é a alternativa recomendada pelo método
                  Fuzzy TOPSIS.
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Step navigation pills */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveStep(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeStep === s.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${activeStep === s.id ? "bg-white/20" : "bg-white"}`}>
              {s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Active step card */}
      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {step.id}
            </span>
            <div>
              <h3 className="text-white font-semibold">{step.label}</h3>
              <p className="text-blue-100 text-sm">{step.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Plain language explanation */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            💡 {step.what}
          </div>

          {/* Formula */}
          {step.formula && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Fórmula:</p>
              <code className="text-sm font-mono text-gray-800">{step.formula}</code>
            </div>
          )}

          {/* Step content */}
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
          disabled={activeStep === 1}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Etapa anterior
        </button>
        <span className="text-sm text-gray-500 self-center">
          Etapa {activeStep} de {STEPS.length}
        </span>
        <button
          onClick={() => setActiveStep((s) => Math.min(STEPS.length, s + 1))}
          disabled={activeStep === STEPS.length}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próxima etapa →
        </button>
      </div>
    </div>
  );
}
