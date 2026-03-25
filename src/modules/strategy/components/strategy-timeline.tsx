'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import { getAllInitiatives, getPhaseLabel } from '../service';
import type { StrategyPhase } from '../types';

const phaseColors: Record<StrategyPhase, { bg: string; bar: string; badge: 'info' | 'warning' | 'success' | 'rose' }> = {
  'phase-1': { bg: 'bg-info-subtle', bar: 'bg-info', badge: 'info' },
  'phase-2': { bg: 'bg-warning-subtle', bar: 'bg-warning', badge: 'warning' },
  'phase-3': { bg: 'bg-success-subtle', bar: 'bg-success', badge: 'success' },
  'phase-4': { bg: 'bg-rose-subtle', bar: 'bg-rose', badge: 'rose' },
};

const categoryLabel: Record<string, string> = {
  geographic: 'Geographic',
  vertical: 'Vertical',
  adjacent: 'Adjacent',
  moat: 'Moat',
  partnership: 'Partnership',
};

const TOTAL_MONTHS = 60;

export function StrategyTimeline() {
  const initiatives = getAllInitiatives();
  const phases: StrategyPhase[] = ['phase-1', 'phase-2', 'phase-3', 'phase-4'];

  // Month markers
  const yearMarkers = [
    { month: 1, label: 'M1' },
    { month: 6, label: 'M6' },
    { month: 12, label: 'Y1' },
    { month: 18, label: 'M18' },
    { month: 24, label: 'Y2' },
    { month: 36, label: 'Y3' },
    { month: 48, label: 'Y4' },
    { month: 60, label: 'Y5' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Timeline</CardTitle>
        <p className="text-sm text-text-secondary">
          Strategic initiatives across 4 phases over 5 years
        </p>
      </CardHeader>
      <CardContent>
        {/* Phase legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {phases.map(phase => (
            <Badge key={phase} variant={phaseColors[phase].badge}>
              {getPhaseLabel(phase)}
            </Badge>
          ))}
        </div>

        {/* Timeline header */}
        <div className="relative mb-2 ml-[200px] md:ml-[240px]">
          <div className="flex justify-between">
            {yearMarkers.map(m => (
              <span
                key={m.month}
                className="text-[10px] text-text-tertiary"
                style={{ position: 'absolute', left: `${((m.month - 1) / TOTAL_MONTHS) * 100}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Phase sections */}
        <div className="space-y-6 mt-6">
          {phases.map(phase => {
            const phaseInitiatives = initiatives.filter(i => i.phase === phase);
            if (phaseInitiatives.length === 0) return null;

            return (
              <div key={phase}>
                <p className="text-sm font-medium text-text-primary mb-2">{getPhaseLabel(phase)}</p>
                <div className="space-y-2">
                  {phaseInitiatives.map(init => {
                    const leftPercent = ((init.startMonth - 1) / TOTAL_MONTHS) * 100;
                    const widthPercent = (init.durationMonths / TOTAL_MONTHS) * 100;

                    return (
                      <div key={init.id} className="flex items-center gap-2">
                        {/* Label */}
                        <div className="w-[200px] md:w-[240px] shrink-0 text-right pr-3">
                          <p className="text-xs text-text-primary truncate">{init.name}</p>
                          <p className="text-[10px] text-text-tertiary">
                            {categoryLabel[init.category]} | M{init.startMonth}-M{init.startMonth + init.durationMonths - 1}
                          </p>
                        </div>
                        {/* Bar */}
                        <div className="flex-1 relative h-7 bg-bg-tertiary rounded-[var(--radius-sm)] overflow-hidden">
                          <div
                            className={`absolute top-0 h-full rounded-[var(--radius-sm)] ${phaseColors[phase].bar} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                            title={`${init.name}: M${init.startMonth}-M${init.startMonth + init.durationMonths - 1}\n${init.description}`}
                          >
                            <span className="text-[10px] text-white font-medium px-1.5 leading-7 whitespace-nowrap overflow-hidden text-ellipsis block">
                              {init.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-border">
          {phases.map(phase => {
            const phaseInits = initiatives.filter(i => i.phase === phase);
            return (
              <div key={phase} className="text-center">
                <p className="text-lg font-bold text-text-primary">{phaseInits.length}</p>
                <p className="text-xs text-text-tertiary">
                  {getPhaseLabel(phase).split(':')[0]} initiatives
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
