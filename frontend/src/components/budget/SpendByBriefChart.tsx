import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeBudgetSegments } from "@/lib/budget";
import { CHART_COLORS } from "@/lib/chartColors";
import { inr } from "@/lib/api";
import type { PipelineResult } from "@/lib/types";

export function SpendByBriefChart({ pipeline }: { pipeline: PipelineResult | null }) {
  const { segments } = computeBudgetSegments(pipeline);

  if (!pipeline || segments.length === 0) {
    return <div className="h-40 rounded-lg bg-surface-muted animate-pulse" aria-hidden="true" />;
  }

  const data = segments.map((s) => ({ name: s.label, spend: s.amountInr }));

  return (
    <div className="h-44 w-full" role="img" aria-label="Bar chart of committed spend by brief">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.border} />
          <XAxis
            type="number"
            tickFormatter={(v) => inr(Number(v))}
            tick={{ fill: CHART_COLORS.textFaint, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.border }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: CHART_COLORS.textSoft, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.border }}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => inr(Number(v))}
            contentStyle={{
              background: CHART_COLORS.surface,
              border: `1px solid ${CHART_COLORS.border}`,
              borderRadius: 8,
              fontSize: 12,
              color: CHART_COLORS.ink,
              boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
            }}
          />
          <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS.segments[i % CHART_COLORS.segments.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
