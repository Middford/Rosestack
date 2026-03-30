"use client";

interface PaybackProgressBarProps {
  cumulativeActualGbp: number;
  installedCostGbp: number;
  projectedPaybackMonth: number;
  currentMonth: number;
}

export function PaybackProgressBar({
  cumulativeActualGbp,
  installedCostGbp,
  projectedPaybackMonth,
  currentMonth,
}: PaybackProgressBarProps) {
  const percent = Math.min((cumulativeActualGbp / installedCostGbp) * 100, 100);
  const expectedPercent =
    projectedPaybackMonth > 0
      ? Math.min((currentMonth / projectedPaybackMonth) * 100, 100)
      : 0;

  // Variance: how far ahead/behind vs expected progress
  const variance = percent - expectedPercent;
  let colour: string;
  let statusText: string;

  if (variance >= -5) {
    colour = "bg-emerald-500";
    statusText = variance > 5 ? "Ahead of plan" : "On track";
  } else if (variance >= -25) {
    colour = "bg-amber-500";
    statusText = "Slightly behind";
  } else {
    colour = "bg-red-500";
    statusText = "Behind plan";
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Payback Progress</h3>
        <span className="text-xs text-muted-foreground">
          Month {currentMonth} of {projectedPaybackMonth} projected
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${percent}%` }}
        />
        {/* Expected progress marker */}
        {expectedPercent > 0 && expectedPercent < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-white/40"
            style={{ left: `${expectedPercent}%` }}
            title={`Expected: ${expectedPercent.toFixed(0)}%`}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${colour}`} />
          <span className="text-xs text-muted-foreground">{statusText}</span>
        </div>
        <span className="text-xs font-medium text-foreground">
          {percent.toFixed(1)}% — £{Math.round(cumulativeActualGbp).toLocaleString()} / £{Math.round(installedCostGbp).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
