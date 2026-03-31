"use client";

import type { FiveCostMetrics } from "@/shared/utils/cost-metrics-types";
import { rateAllMetrics } from "@/shared/utils/cost-metrics";

interface CostMetricCardsProps {
  metrics: FiveCostMetrics;
}

const DOT_COLOURS = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
} as const;

const BORDER_COLOURS = {
  green: "border-emerald-500/30",
  amber: "border-amber-500/30",
  red: "border-red-500/30",
} as const;

export function CostMetricCards({ metrics }: CostMetricCardsProps) {
  const ratings = rateAllMetrics(metrics);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {ratings.map((r) => {
        const isLcos = r.metric === "lcosPerKwh";
        const displayValue = isLcos
          ? `${(r.value * 100).toFixed(1)}p`
          : `£${Math.round(r.value)}`;
        const unit = isLcos ? "/kWh" : "/kWh";

        return (
          <div
            key={r.metric}
            className={`rounded-lg border ${BORDER_COLOURS[r.rating]} bg-card p-4 flex flex-col gap-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {r.label}
              </span>
              <div className={`h-2.5 w-2.5 rounded-full ${DOT_COLOURS[r.rating]}`} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {displayValue}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
