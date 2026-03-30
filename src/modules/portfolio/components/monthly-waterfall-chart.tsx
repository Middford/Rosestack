"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { MonthlyPaybackResult } from "@/shared/utils/cost-metrics-types";

interface MonthlyWaterfallChartProps {
  paybackResult: MonthlyPaybackResult;
  showMonths?: number;
  height?: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyWaterfallChart({
  paybackResult,
  showMonths = 24,
  height = 360,
}: MonthlyWaterfallChartProps) {
  const data = paybackResult.months.slice(0, showMonths).map((m) => ({
    label: `M${m.month}`,
    monthLabel: MONTH_LABELS[m.calendarMonth - 1],
    revenue: m.grossRevenueGbp,
    costs: -m.costsGbp,
    net: m.netRevenueGbp,
    cumulative: m.cumulativeNetGbp,
  }));

  const paybackMonth =
    paybackResult.paybackMonth < 999 ? paybackResult.paybackMonth : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Monthly Revenue vs Cost
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        First {showMonths} months — seasonal revenue variation with cumulative net
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickFormatter={(v: number) => `£${Math.round(v)}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#d1d5db" }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                revenue: "Revenue",
                costs: "Costs",
                cumulative: "Cumulative Net",
              };
              return [`£${Math.round(Math.abs(value))}`, labels[name] || name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
          />

          {/* Revenue bars */}
          <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[2, 2, 0, 0]} />

          {/* Cost bars (negative) */}
          <Bar dataKey="costs" fill="#ef4444" name="Costs" radius={[0, 0, 2, 2]} />

          {/* Cumulative net line */}
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#f8fafc"
            strokeWidth={2}
            dot={false}
            name="Cumulative Net"
          />

          {/* Payback crossing point */}
          {paybackMonth && paybackMonth <= showMonths && (
            <ReferenceLine
              x={`M${paybackMonth}`}
              stroke="#10b981"
              strokeDasharray="6 4"
              label={{ value: "Payback", fill: "#10b981", fontSize: 10, position: "top" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
