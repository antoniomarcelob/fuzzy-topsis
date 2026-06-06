"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateProblem,
  useCreateCriterion,
  useCreateAlternative,
  useRunExecution,
} from "@/hooks/useApi";
import { DEFAULT_WEIGHT_TERMS, DEFAULT_RATING_TERMS } from "@/types";
import type { CreateAlternativePayload, CreateCriterionPayload } from "@/types";

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const problemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  application_area: z.string().optional(),
  author: z.string().optional(),
});

const criterionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  criterion_type: z.enum(["benefit", "cost"]),
  weight_term: z.string().min(1, "Selecione um peso"),
});

const alternativeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

type ProblemForm = {
  name: string;
  description?: string;
  application_area?: string;
  author?: string;
};

type CriterionForm = {
  name: string;
  criterion_type: "benefit" | "cost";
  weight_term: string;
};

type AlternativeForm = {
  name: string;
  description?: string;
};

// ─────────────────────────────────────────────
// Wizard state
// ─────────────────────────────────────────────

type CriterionDraft = CriterionForm & {
  id: string;
  weight_l: number;
  weight_m: number;
  weight_u: number;
};

interface EvalDraft {
  criterion_id: string;
  rating_term: string;
  rating_l: number;
  rating_m: number;
  rating_u: number;
}

type AlternativeDraft = AlternativeForm & {
  id: string;
  evaluations: EvalDraft[];
};

const STEPS = [
  { id: 1, label: "Problema", icon: "📋" },
  { id: 2, label: "Critérios", icon: "⚖️" },
  { id: 3, label: "Alternativas", icon: "🔢" },
  { id: 4, label: "Avaliações", icon: "📊" },
  { id: 5, label: "Executar", icon: "🚀" },
];

// ─────────────────────────────────────────────
// Tooltip helper
// ─────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center ml-1">
      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center cursor-help">?</span>
      <span className="absolute left-5 top-0 z-10 hidden group-hover:block w-56 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-xl">
        {text}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────
// Main Wizard
// ─────────────────────────────────────────────

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [alternatives, setAlternatives] = useState<AlternativeDraft[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const createProblem = useCreateProblem();
  const createCriterion = useCreateCriterion(problemId ?? "");
  const createAlternative = useCreateAlternative(problemId ?? "");
  const runExecution = useRunExecution(problemId ?? "");

  // ── Step 1: Problem form ──────────────────────────────────────────

  const problemForm = useForm<ProblemForm>({ resolver: zodResolver(problemSchema) });
  const [criterionForm, setCriterionForm] = useState<Partial<CriterionForm>>({
    criterion_type: "benefit",
  });
  const [alternativeForm, setAlternativeForm] = useState<Partial<AlternativeForm>>({});

  async function handleCreateProblem(data: ProblemForm) {
    setError(null);
    try {
      const problem = await createProblem.mutateAsync(data);
      setProblemId(problem.id);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar problema");
    }
  }

  // ── Step 2: Add criterion ─────────────────────────────────────────

  function addCriterion() {
    if (!criterionForm.name || !criterionForm.weight_term) return;
    const term = DEFAULT_WEIGHT_TERMS.find((t) => t.term === criterionForm.weight_term);
    if (!term) return;
    const draft: CriterionDraft = {
      id: crypto.randomUUID(),
      name: criterionForm.name!,
      criterion_type: criterionForm.criterion_type as "benefit" | "cost",
      weight_term: criterionForm.weight_term!,
      weight_l: term.l,
      weight_m: term.m,
      weight_u: term.u,
    };
    setCriteria((prev) => [...prev, draft]);
    setCriterionForm({ criterion_type: "benefit" });
  }

  async function handleSaveCriteria() {
    if (criteria.length < 2) {
      setError("Adicione pelo menos 2 critérios");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const savedCriteria = [];
      for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i];
        const payload: CreateCriterionPayload = {
          problem_id: problemId!,
          name: c.name,
          criterion_type: c.criterion_type,
          weight_term: c.weight_term,
          weight_l: c.weight_l,
          weight_m: c.weight_m,
          weight_u: c.weight_u,
          position: i,
        };
        const saved = await createCriterion.mutateAsync(payload);
        savedCriteria.push({ ...c, id: saved.id });
      }
      setCriteria(savedCriteria);
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar critérios");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Step 3: Add alternative (names only) ─────────────────────────

  function addAlternative() {
    if (!alternativeForm.name) return;
    const draft: AlternativeDraft = {
      id: crypto.randomUUID(),
      name: alternativeForm.name!,
      description: alternativeForm.description,
      evaluations: criteria.map((c) => ({
        criterion_id: c.id,
        rating_term: DEFAULT_RATING_TERMS[2].term,
        rating_l: DEFAULT_RATING_TERMS[2].l,
        rating_m: DEFAULT_RATING_TERMS[2].m,
        rating_u: DEFAULT_RATING_TERMS[2].u,
      })),
    };
    setAlternatives((prev) => [...prev, draft]);
    setAlternativeForm({});
  }

  // ── Step 4: Edit evaluations ──────────────────────────────────────

  function updateEvaluation(altIdx: number, critId: string, term: string) {
    const t = DEFAULT_RATING_TERMS.find((r) => r.term === term);
    if (!t) return;
    setAlternatives((prev) =>
      prev.map((alt, i) =>
        i !== altIdx
          ? alt
          : {
              ...alt,
              evaluations: alt.evaluations.map((ev) =>
                ev.criterion_id === critId
                  ? { ...ev, rating_term: term, rating_l: t.l, rating_m: t.m, rating_u: t.u }
                  : ev
              ),
            }
      )
    );
  }

  async function handleSaveAlternatives() {
    if (alternatives.length < 2) {
      setError("Adicione pelo menos 2 alternativas");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      for (let i = 0; i < alternatives.length; i++) {
        const alt = alternatives[i];
        const payload: CreateAlternativePayload = {
          problem_id: problemId!,
          name: alt.name,
          description: alt.description,
          evaluations: alt.evaluations,
          position: i,
        };
        await createAlternative.mutateAsync(payload);
      }
      setStep(5);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar alternativas");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Step 5: Run ───────────────────────────────────────────────────

  async function handleRun() {
    setError(null);
    try {
      const execution = await runExecution.mutateAsync();
      setExecutionId(execution.id);
      router.push(`/executions/${execution.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na execução");
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${step === s.id ? "opacity-100" : step > s.id ? "opacity-70" : "opacity-40"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  step > s.id
                    ? "bg-green-500 border-green-500 text-white"
                    : step === s.id
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {step > s.id ? "✓" : s.id}
              </div>
              <span className={`text-sm font-medium hidden sm:inline ${step === s.id ? "text-blue-700" : "text-gray-500"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-2 ${step > s.id ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Step 1: Problem Info ── */}
      {step === 1 && (
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 Descreva o seu problema</h2>
          <p className="text-gray-500 text-sm mb-6">
            Dê um nome e contexto para a decisão que você precisa tomar.
          </p>
          <form onSubmit={problemForm.handleSubmit(handleCreateProblem)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do problema *
                <Tooltip text="Ex: 'Seleção de fornecedor de TI' ou 'Escolha de localização da fábrica'" />
              </label>
              <input
                {...problemForm.register("name")}
                className="form-input"
                placeholder="Ex: Seleção de fornecedor de software"
              />
              {problemForm.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{problemForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                {...problemForm.register("description")}
                className="form-input min-h-[80px] resize-none"
                placeholder="Descreva o contexto da sua decisão..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área de aplicação</label>
                <input
                  {...problemForm.register("application_area")}
                  className="form-input"
                  placeholder="Ex: Logística, RH, TI..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
                <input
                  {...problemForm.register("author")}
                  className="form-input"
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <button type="submit" disabled={createProblem.isPending} className="btn-primary w-full mt-2">
              {createProblem.isPending ? "Criando..." : "Continuar →"}
            </button>
          </form>
        </div>
      )}

      {/* ── Step 2: Criteria ── */}
      {step === 2 && (
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">⚖️ Defina os critérios</h2>
            <p className="text-gray-500 text-sm">
              Critérios são os fatores que influenciam a sua decisão. Adicione pelo menos 2.
            </p>
          </div>

          {/* Criteria list */}
          {criteria.length > 0 && (
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-gray-400 text-sm w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm text-gray-800">{c.name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${c.criterion_type === "benefit" ? "badge-benefit" : "badge-cost"}`}>
                      {c.criterion_type === "benefit" ? "↑ Benefício" : "↓ Custo"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{c.weight_term}</span>
                  <span className="tfn-badge">({c.weight_l},{c.weight_m},{c.weight_u})</span>
                  <button
                    onClick={() => setCriteria((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add criterion form */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-600">+ Adicionar critério</p>
            <input
              value={criterionForm.name ?? ""}
              onChange={(e) => setCriterionForm((f) => ({ ...f, name: e.target.value }))}
              className="form-input"
              placeholder="Nome do critério (ex: Custo, Qualidade, Prazo...)"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Tipo
                  <Tooltip text="Benefício: quanto maior, melhor. Custo: quanto menor, melhor." />
                </label>
                <select
                  value={criterionForm.criterion_type ?? "benefit"}
                  onChange={(e) => setCriterionForm((f) => ({ ...f, criterion_type: e.target.value as "benefit" | "cost" }))}
                  className="form-input"
                >
                  <option value="benefit">↑ Benefício (maior = melhor)</option>
                  <option value="cost">↓ Custo (menor = melhor)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Importância
                  <Tooltip text="Quão importante este critério é para a sua decisão?" />
                </label>
                <select
                  value={criterionForm.weight_term ?? ""}
                  onChange={(e) => setCriterionForm((f) => ({ ...f, weight_term: e.target.value }))}
                  className="form-input"
                >
                  <option value="">Selecione...</option>
                  {DEFAULT_WEIGHT_TERMS.map((t) => (
                    <option key={t.id} value={t.term}>{t.term} ({t.l},{t.m},{t.u})</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={addCriterion}
              disabled={!criterionForm.name || !criterionForm.weight_term}
              className="btn-secondary w-full"
            >
              Adicionar critério
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Voltar</button>
            <button
              onClick={handleSaveCriteria}
              disabled={criteria.length < 2 || isSaving}
              className="btn-primary flex-1"
            >
              {isSaving ? "Salvando..." : `Salvar ${criteria.length} critério(s) →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Alternatives ── */}
      {step === 3 && (
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">🔢 Defina as alternativas</h2>
            <p className="text-gray-500 text-sm">
              Alternativas são as opções que você está considerando. Adicione pelo menos 2.
            </p>
          </div>

          {alternatives.length > 0 && (
            <div className="space-y-2">
              {alternatives.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-gray-400 text-sm w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm text-gray-800">{a.name}</span>
                    {a.description && <p className="text-xs text-gray-500">{a.description}</p>}
                  </div>
                  <button
                    onClick={() => setAlternatives((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-600">+ Adicionar alternativa</p>
            <input
              value={alternativeForm.name ?? ""}
              onChange={(e) => setAlternativeForm((f) => ({ ...f, name: e.target.value }))}
              className="form-input"
              placeholder="Nome da alternativa (ex: Fornecedor A, Opção 1...)"
            />
            <input
              value={alternativeForm.description ?? ""}
              onChange={(e) => setAlternativeForm((f) => ({ ...f, description: e.target.value }))}
              className="form-input"
              placeholder="Descrição (opcional)"
            />
            <button
              onClick={addAlternative}
              disabled={!alternativeForm.name}
              className="btn-secondary w-full"
            >
              Adicionar alternativa
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">← Voltar</button>
            <button
              onClick={() => {
                if (alternatives.length < 2) { setError("Adicione pelo menos 2 alternativas"); return; }
                
                setAlternatives(prev => prev.map(alt => {
                  const newEvals = criteria.map(c => {
                    const existing = alt.evaluations.find(e => e.criterion_id === c.id);
                    if (existing) return existing;
                    return {
                      criterion_id: c.id,
                      rating_term: DEFAULT_RATING_TERMS[2].term,
                      rating_l: DEFAULT_RATING_TERMS[2].l,
                      rating_m: DEFAULT_RATING_TERMS[2].m,
                      rating_u: DEFAULT_RATING_TERMS[2].u,
                    };
                  });
                  return { ...alt, evaluations: newEvals };
                }));

                setError(null);
                setStep(4);
              }}
              disabled={alternatives.length < 2}
              className="btn-primary flex-1"
            >
              {`Avaliar ${alternatives.length} alternativa(s) →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Evaluations ── */}
      {step === 4 && (
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">📊 Avalie cada alternativa</h2>
            <p className="text-gray-500 text-sm">
              Para cada combinação alternativa × critério, escolha o desempenho linguístico.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium">Alternativa</th>
                  {criteria.map((c) => (
                    <th key={c.id} className="border border-gray-200 px-3 py-2 text-center font-medium min-w-[140px]">
                      <div>{c.name}</div>
                      <div className={`text-xs mt-0.5 ${c.criterion_type === "benefit" ? "text-green-600" : "text-red-600"}`}>
                        {c.criterion_type === "benefit" ? "↑ Benefício" : "↓ Custo"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alternatives.map((alt, altIdx) => (
                  <tr key={alt.id}>
                    <td className="border border-gray-200 px-3 py-2 font-medium bg-gray-50">{alt.name}</td>
                    {criteria.map((c) => {
                      const ev = alt.evaluations.find((e) => e.criterion_id === c.id);
                      return (
                        <td key={c.id} className="border border-gray-200 px-2 py-1.5">
                          <select
                            value={ev?.rating_term ?? "Regular"}
                            onChange={(e) => updateEvaluation(altIdx, c.id, e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            {DEFAULT_RATING_TERMS.map((t) => (
                              <option key={t.id} value={t.term}>{t.term}</option>
                            ))}
                          </select>
                          <div className="text-center mt-1 font-mono text-xs text-gray-400">
                            ({ev?.rating_l ?? 3},{ev?.rating_m ?? 5},{ev?.rating_u ?? 7})
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-secondary flex-1">← Voltar</button>
            <button
              onClick={handleSaveAlternatives}
              disabled={isSaving}
              className="btn-primary flex-1"
            >
              {isSaving ? "Salvando..." : "Salvar avaliações →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Run ── */}
      {step === 5 && (
        <div className="card p-8 text-center space-y-6">
          <div className="text-5xl">🚀</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pronto para executar!</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              O sistema irá processar todas as etapas do método Fuzzy TOPSIS e apresentar o ranking final com todos os cálculos intermediários.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center py-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="text-2xl font-bold text-blue-700">{criteria.length}</div>
              <div className="text-xs text-blue-600">Critérios</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-2xl font-bold text-green-700">{alternatives.length}</div>
              <div className="text-xs text-green-600">Alternativas</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="text-2xl font-bold text-purple-700">11</div>
              <div className="text-xs text-purple-600">Etapas</div>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={runExecution.isPending}
            className="btn-primary text-base px-8 py-3 w-full"
          >
            {runExecution.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                Executando Fuzzy TOPSIS...
              </span>
            ) : "▶ Executar Fuzzy TOPSIS"}
          </button>
        </div>
      )}
    </main>
  );
}
