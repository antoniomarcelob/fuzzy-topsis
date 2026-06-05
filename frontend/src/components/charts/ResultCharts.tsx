"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutionResult, Problem } from "@/types";

interface Props {
  result: ExecutionResult;
  problem: Problem;
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export function ResultCharts({ result, problem }: Props) {
  const rankingData = result.ranking.map((item) => ({
    name: item.alt_name,
    CC: parseFloat(item.cc.toFixed(4)),
    "d* (FPIS)": parseFloat(item.d_pos.toFixed(4)),
    "d- (FNIS)": parseFloat(item.d_neg.toFixed(4)),
  }));

  // Radar chart: each axis = criterion, each series = alternative
  const criteriaNames = problem.criteria.map((c) => c.name);
  const radarData = criteriaNames.map((cName, idx) => {
    const crit = problem.criteria[idx];
    const entry: Record<string, string | number> = { subject: cName };
    problem.alternatives.forEach((alt) => {
      const vals = result.weighted_matrix[alt.id]?.[crit.id];
      entry[alt.name] = vals ? parseFloat(((vals[0] + vals[1] + vals[2]) / 3).toFixed(4)) : 0;
    });
    return entry;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar chart — CC ranking */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Closeness Coefficient por Alternativa</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rankingData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => v.toFixed(4)} />
            <Bar dataKey="CC" radius={[6, 6, 0, 0]}>
              {rankingData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#16a34a" : COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart — distances */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Distâncias FPIS vs FNIS</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rankingData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => v.toFixed(4)} />
            <Legend />
            <Bar dataKey="d* (FPIS)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="d- (FNIS)" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar chart — weighted criteria per alternative */}
      {problem.alternatives.length > 0 && criteriaNames.length >= 3 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Comparação por Critério (Matriz Ponderada — valor central)</h3>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <Legend />
              {problem.alternatives.map((alt, i) => (
                <Radar
                  key={alt.id}
                  name={alt.name}
                  dataKey={alt.name}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
              <Tooltip formatter={(v: number) => v.toFixed(4)} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
