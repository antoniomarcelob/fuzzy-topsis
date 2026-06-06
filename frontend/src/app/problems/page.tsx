import Link from "next/link";

export default function ProblemsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Problemas de Decisão</h1>
          <p className="text-gray-500 mt-1">
            Gerencie suas análises Fuzzy TOPSIS
          </p>
        </div>
        <Link
          href="/wizard"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          + Novo Problema
        </Link>
      </div>

      {/* Problem list is a client component — see ProblemList.tsx */}
      <div id="problem-list-placeholder" className="text-gray-400 text-sm">
        {/* Client component (ProblemList) renders here */}
        Carregando problemas...
      </div>
    </main>
  );
}
