'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import { regulatoryMilestones } from '../data';
import type { RegulatoryStatus } from '../types';

const statusColors: Record<RegulatoryStatus, 'danger' | 'warning' | 'info' | 'success'> = {
  'not-started': 'danger',
  'in-progress': 'warning',
  'submitted': 'info',
  'achieved': 'success',
};

const statusLabels: Record<RegulatoryStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'submitted': 'Submitted',
  'achieved': 'Achieved',
};

// Timeline quarters for the Gantt view
const quarters = ['2026-Q4', '2027-Q1', '2027-Q2', '2027-Q3', '2027-Q4', '2028-Q1', '2028-Q2'];

function getQuarterIndex(target: string): number {
  return quarters.indexOf(target);
}

export function RegulatoryRoadmap() {
  const totalCost = regulatoryMilestones.reduce((sum, m) => sum + m.estimatedCostGbp, 0);
  const totalWeeks = regulatoryMilestones.reduce((sum, m) => sum + m.estimatedWeeks, 0);
  const completed = regulatoryMilestones.filter(m => m.status === 'achieved').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Milestones</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{regulatoryMilestones.length}</p>
          <p className="text-xs text-success mt-1">{completed} achieved</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Est. Cost</p>
          <p className="text-2xl font-bold text-text-primary mt-1">£{totalCost.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary mt-1">Testing + certification</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Duration</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{totalWeeks} weeks</p>
          <p className="text-xs text-text-tertiary mt-1">Sequential estimate (parallel possible)</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Critical Path</p>
          <p className="text-2xl font-bold text-warning mt-1">MCS</p>
          <p className="text-xs text-text-tertiary mt-1">20 weeks, most dependencies</p>
        </Card>
      </div>

      {/* Gantt-style timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Certification Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Quarter headers */}
              <div className="grid gap-0" style={{ gridTemplateColumns: `200px repeat(${quarters.length}, 1fr)` }}>
                <div className="text-xs text-text-tertiary font-medium px-2 py-1 border-b border-border">
                  Milestone
                </div>
                {quarters.map(q => (
                  <div key={q} className="text-xs text-text-tertiary font-medium text-center px-2 py-1 border-b border-l border-border">
                    {q}
                  </div>
                ))}

                {/* Milestone rows */}
                {regulatoryMilestones.map(milestone => {
                  const targetIdx = getQuarterIndex(milestone.targetDate);
                  const durationQ = Math.max(1, Math.ceil(milestone.estimatedWeeks / 13));
                  const startIdx = Math.max(0, targetIdx - durationQ + 1);

                  return (
                    <div key={milestone.id} className="contents">
                      <div className="flex items-center gap-2 px-2 py-2 border-b border-border">
                        <span className="text-xs text-text-primary font-medium truncate">{milestone.name}</span>
                      </div>
                      {quarters.map((_, qIdx) => {
                        const isActive = qIdx >= startIdx && qIdx <= targetIdx;
                        const isTarget = qIdx === targetIdx;
                        return (
                          <div key={qIdx} className="flex items-center px-1 py-2 border-b border-l border-border">
                            {isActive && (
                              <div
                                className={`h-6 w-full rounded ${
                                  isTarget
                                    ? 'bg-rose'
                                    : 'bg-rose/40'
                                }`}
                                title={`${milestone.name} — ${milestone.estimatedWeeks} weeks, £${milestone.estimatedCostGbp.toLocaleString()}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regulatoryMilestones.map(milestone => (
          <Card key={milestone.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{milestone.name}</CardTitle>
                <Badge variant={statusColors[milestone.status]}>{statusLabels[milestone.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-3">{milestone.description}</p>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Standard</dt>
                  <dd className="text-text-primary font-mono text-xs">{milestone.standard}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Est. Cost</dt>
                  <dd className="text-text-primary">£{milestone.estimatedCostGbp.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Duration</dt>
                  <dd className="text-text-primary">{milestone.estimatedWeeks} weeks</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Target</dt>
                  <dd className="text-text-primary">{milestone.targetDate}</dd>
                </div>
                {milestone.dependencies.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">Depends on</dt>
                    <dd className="text-text-primary text-right max-w-[200px]">
                      {milestone.dependencies
                        .map(d => regulatoryMilestones.find(m => m.id === d)?.name || d)
                        .join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="text-xs text-text-tertiary mt-3 italic">{milestone.notes}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
