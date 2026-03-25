'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { generateTimelineData, type TimelineItem } from '../data';

export function RiskOpportunityTimeline() {
  const items = useMemo(() => generateTimelineData(), []);

  const risks = items.filter(i => i.type === 'risk').sort((a, b) => a.startMonth - b.startMonth);
  const opportunities = items.filter(i => i.type === 'opportunity').sort((a, b) => a.startMonth - b.startMonth);

  const maxMonth = Math.max(...items.map(i => i.endMonth), 36);
  const months = Array.from({ length: Math.ceil(maxMonth / 6) + 1 }, (_, i) => i * 6);

  function getBarStyle(item: TimelineItem) {
    const left = (item.startMonth / maxMonth) * 100;
    const width = ((item.endMonth - item.startMonth) / maxMonth) * 100;
    const opacity = 0.3 + (item.probability / 5) * 0.7;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 1)}%`,
      opacity,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk/Opportunity Timeline</CardTitle>
        <p className="text-xs text-text-tertiary">
          Gantt-style view showing when items are most likely to materialise (risks above, opportunities below)
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline axis */}
          <div className="flex justify-between text-[10px] text-text-tertiary mb-2 ml-[180px]">
            {months.map(m => (
              <span key={m}>{m === 0 ? 'Now' : `+${m}mo`}</span>
            ))}
          </div>

          {/* Risks (above centre line) */}
          <div className="space-y-0.5 mb-1">
            {risks.slice(0, 15).map(item => (
              <div key={item.id} className="flex items-center h-5">
                <div className="w-[180px] shrink-0 text-[10px] text-text-tertiary truncate pr-2 text-right" title={item.name}>
                  {item.name}
                </div>
                <div className="relative flex-1 h-full">
                  <div
                    className="absolute top-0.5 h-3.5 rounded-sm bg-danger"
                    style={getBarStyle(item)}
                    title={`${item.name} — Score: ${item.score}, P: ${item.probability}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Centre line */}
          <div className="flex items-center h-6 ml-[180px]">
            <div className="flex-1 border-t-2 border-text-tertiary/30 border-dashed" />
          </div>

          {/* Opportunities (below centre line) */}
          <div className="space-y-0.5 mt-1">
            {opportunities.slice(0, 15).map(item => (
              <div key={item.id} className="flex items-center h-5">
                <div className="w-[180px] shrink-0 text-[10px] text-text-tertiary truncate pr-2 text-right" title={item.name}>
                  {item.name}
                </div>
                <div className="relative flex-1 h-full">
                  <div
                    className="absolute top-0.5 h-3.5 rounded-sm bg-amber-400"
                    style={getBarStyle(item)}
                    title={`${item.name} — Score: ${item.score}, P: ${item.probability}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 rounded-sm bg-danger" />
              <span className="text-[10px] text-text-tertiary">Risks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 rounded-sm bg-amber-400" />
              <span className="text-[10px] text-text-tertiary">Opportunities</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 rounded-sm bg-text-tertiary/50" />
              <span className="text-[10px] text-text-tertiary">Opacity = probability</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
