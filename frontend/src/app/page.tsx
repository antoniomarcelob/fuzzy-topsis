import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-20 text-center">
      {/* Hero */}
      <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-sm text-blue-700 font-medium mb-8">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        Método Fuzzy TOPSIS — Decisão Multicritério
      </div>

      <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
        Tome decisões complexas com<br />
        <span className="text-blue-600">confiança matemática</span>
      </h1>

      <p className="text-gray-500 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
        Resolva problemas de decisão multicritério usando o método científico
        Fuzzy TOPSIS — sem precisar conhecer a matemática por trás.
      </p>

      <div className="flex items-center justify-center gap-4 mb-20">
        <Link href="/wizard" className="btn-primary text-base px-8 py-3">
          Criar análise agora
        </Link>
        <Link href="/problems" className="btn-secondary text-base px-8 py-3">
          Ver problemas existentes
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {[
          {
            icon: "🧮",
            title: "Matematicamente rigoroso",
            desc: "Implementação fiel ao método Fuzzy TOPSIS conforme Chen (2000). Todos os cálculos intermediários são salvos e auditáveis.",
          },
          {
            icon: "📖",
            title: "11 etapas explicadas",
            desc: "Visualize cada passo do algoritmo em linguagem simples — da matriz de decisão ao ranking final, com fórmulas e tabelas.",
          },
          {
            icon: "📊",
            title: "Dashboards e exportação",
            desc: "Gráficos de barras, radar e comparação entre alternativas. Exporte o relatório completo em PDF ou CSV.",
          },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Algorithm steps preview */}
      <div className="mt-20 card p-8 text-left">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Como funciona</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: "1–2", label: "Avalie", desc: "Descreva alternativas e critérios com termos linguísticos" },
            { step: "3–5", label: "Processe", desc: "O sistema normaliza, aplica pesos e cria a matriz ponderada" },
            { step: "6–9", label: "Compare", desc: "Calcula distâncias para as soluções ideal e anti-ideal" },
            { step: "10–11", label: "Decida", desc: "Ranking final com o Closeness Coefficient para cada alternativa" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center text-sm font-bold mx-auto mb-3">
                {item.step}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{item.label}</h4>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
