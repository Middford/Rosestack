"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ExportSensitivityResult } from "@/shared/utils/cost-metrics-types";

interface ExportSensitivityChartProps {
  result: ExportSensitivityResult;
  currentExportKw?: number;
  height?: number;
}

export function ExportSensitivityChart({
  result,
  currentExportKw,
  height = 320,
}: ExportSensitivityChartProps) {
  const data = result.points.map((p) => ({
    exportKw: p.exportKw,
    paybackMonths: p.paybackMonths >= 999 ? null : p.paybackMonths,
    viable: p.viable,
    annualRevenue: p.annualRevenueGbp,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Export Limit Sensitivity
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Payback period vs DNO export limit — below the red line is viable
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="exportKw"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            label={{ value: "Export Limit (kW)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            label={{ value: "Payback (months)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#d1d5db" }}
            itemStyle={{ color: "#d1d5db" }}
            formatter={(value: number | null, name: string) => {
              if (name === "paybackMonths") {
                return value === null ? ["Not viable", "Payback"] : [`${value} months`, "Payback"];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `${label} kW export`}
          />

          {/* Contract term reference line */}
          <ReferenceLine
            y={result.contractTermMonths}
            stroke="#ef4444"
            strokeDasharray="6 4"
            label={{ value: "Contract Term", fill: "#ef4444", fontSize: 10, position: "right" }}
          />

          {/* Current export limit marker */}
          {currentExportKw && (
            <ReferenceLine
              x={currentExportKw}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              label={{ value: "Current", fill: "#3b82f6", fontSize: 10, position: "top" }}
            />
          )}

          {/* Optimal export marker */}
          <ReferenceLine
            x={result.optimalExportKw}
            stroke="#10b981"
            strokeDasharray="4 4"
            label={{ value: "Optimal", fill: "#10b981", fontSize: 10, position: "top" }}
          />

          <Line
            type="monotone"
            dataKey="paybackMonths"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#8b5cf6" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
