'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import type { RiskItem, OpportunityItem } from '@/shared/types';
import {
  buildRiskHeatMap,
  buildOpportunityHeatMap,
  getRiskHeatMapCellColour,
  getOpportunityHeatMapCellColour,
  type HeatMapCell,
} from '../scoring';

interface HeatMapProps {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  onSelectRisk?: (id: string) => void;
  onSelectOpportunity?: (id: string) => void;
}

const PROBABILITY_LABELS = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Very Unlikely'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Transformative'];

function HeatMapGrid({
  grid,
  type,
  getCellColour,
  onSelect,
}: {
  grid: HeatMapCell[][];
  type: 'risk' | 'opportunity';
  getCellColour: (score: number) => string;
  onSelect?: (id: string) => void;
}) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <div className="relative">
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex items-center -rotate-180 mr-2" style={{ writingMode: 'vertical-rl' }}>
          <span className="text-xs text-text-tertiary font-medium">Probability</span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1">
            {grid.map((row, ri) =>
              row.map((cell, ci) => {
                const key = `${ri}-${ci}`;
                const isHovered = hoveredCell === key;

                return (
                  <div
                    key={key}
                    className={`relative aspect-square border rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer transition-all ${getCellColour(cell.score)} ${isHovered ? 'ring-2 ring-text-primary/30 scale-105' : ''}`}
                    onMouseEnter={() => setHoveredCell(key)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {cell.items.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center items-center p-1">
                        {cell.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onSelect?.(item.id)}
                            className={`w-2.5 h-2.5 rounded-full ${type === 'risk' ? 'bg-danger' : 'bg-amber-400'} hover:ring-2 hover:ring-white/50 transition-all`}
                            title={item.name}
                          />
                        ))}
                      </div>
                    )}

                    {isHovered && cell.items.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bg-elevated border border-border rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-lg)] min-w-[180px]">
                        <p className="text-xs text-text-tertiary mb-1">
                          P{cell.probability} x I{cell.impact} = {cell.score}
                        </p>
                        {cell.items.map((item) => (
                          <p key={item.id} className="text-xs text-text-primary truncate">
                            {item.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-5 gap-1 mt-1">
            {IMPACT_LABELS.map((label) => (
              <div key={label} className="text-center">
                <span className="text-[10px] text-text-tertiary">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary text-center mt-1 font-medium">Impact</p>
        </div>
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-6 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
        {PROBABILITY_LABELS.map((label) => (
          <span key={label} className="text-[10px] text-text-tertiary">{label.slice(0, 8)}</span>
        ))}
      </div>
    </div>
  );
}

export function RiskOpportunityHeatMap({ risks, opportunities, onSelectRisk, onSelectOpportunity }: HeatMapProps) {
  const riskGrid = buildRiskHeatMap(risks);
  const oppGrid = buildOpportunityHeatMap(opportunities);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Heat Map</CardTitle>
          <p className="text-xs text-text-tertiary">{risks.length} risks plotted by probability and impact</p>
        </CardHeader>
        <CardContent>
          <HeatMapGrid
            grid={riskGrid}
            type="risk"
            getCellColour={getRiskHeatMapCellColour}
            onSelect={onSelectRisk}
          />
          <div className="flex gap-3 mt-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-900/30 border border-emerald-500/20" />
              <span className="text-[10px] text-text-tertiary">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-900/30 border border-amber-500/20" />
              <span className="text-[10px] text-text-tertiary">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-900/30 border border-orange-500/20" />
              <span className="text-[10px] text-text-tertiary">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-500/30" />
              <span className="text-[10px] text-text-tertiary">Critical</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opportunity Heat Map</CardTitle>
          <p className="text-xs text-text-tertiary">{opportunities.length} opportunities plotted by probability and impact</p>
        </CardHeader>
        <CardContent>
          <HeatMapGrid
            grid={oppGrid}
            type="opportunity"
            getCellColour={getOpportunityHeatMapCellColour}
            onSelect={onSelectOpportunity}
          />
          <div className="flex gap-3 mt-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-900/30 border border-blue-500/20" />
              <span className="text-[10px] text-text-tertiary">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-cyan-900/30 border border-cyan-500/20" />
              <span className="text-[10px] text-text-tertiary">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-900/30 border border-emerald-500/20" />
              <span className="text-[10px] text-text-tertiary">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-900/40 border border-amber-400/30" />
              <span className="text-[10px] text-text-tertiary">Transformative</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
