'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import { getAllMoatActions, getMoatProgress } from '../service';
import type { MoatStatus } from '../types';

const statusVariant: Record<MoatStatus, 'success' | 'warning' | 'default'> = {
  done: 'success',
  'in-progress': 'warning',
  'not-started': 'default',
};

const statusLabel: Record<MoatStatus, string> = {
  done: 'Done',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
};

const priorityColor: Record<string, string> = {
  high: 'text-danger',
  medium: 'text-warning',
  low: 'text-text-tertiary',
};

export function MoatScorecard() {
  const actions = getAllMoatActions();
  const progress = getMoatProgress();
  const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  // Group by strategy
  const grouped = actions.reduce<Record<string, typeof actions>>((acc, a) => {
    if (!acc[a.strategy]) acc[a.strategy] = [];
    acc[a.strategy].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Actions</p>
          <p className="text-2xl font-bold text-text-primary">{progress.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Done</p>
          <p className="text-2xl font-bold text-success">{progress.done}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">In Progress</p>
          <p className="text-2xl font-bold text-warning">{progress.inProgress}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Completion</p>
          <p className="text-2xl font-bold text-text-primary">{progressPercent}%</p>
          <div className="mt-2 h-2 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-rose transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Grouped by strategy */}
      {Object.entries(grouped).map(([strategy, strategyActions]) => (
        <Card key={strategy}>
          <CardHeader>
            <CardTitle className="text-base">{strategy}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strategyActions.map(action => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border p-3"
                >
                  {/* Status indicator */}
                  <div className="mt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        action.status === 'done'
                          ? 'border-success bg-success'
                          : action.status === 'in-progress'
                          ? 'border-warning bg-warning'
                          : 'border-border bg-bg-tertiary'
                      }`}
                    >
                      {action.status === 'done' && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${
                        action.status === 'done' ? 'text-text-tertiary line-through' : 'text-text-primary'
                      }`}>
                        {action.action}
                      </p>
                      <Badge variant={statusVariant[action.status]}>{statusLabel[action.status]}</Badge>
                      <span className={`text-xs font-medium ${priorityColor[action.priority]}`}>
                        {action.priority} priority
                      </span>
                    </div>
                    {action.notes && (
                      <p className="text-xs text-text-tertiary mt-1">{action.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-text-tertiary">Owner: {action.owner}</span>
                      {action.targetDate && (
                        <span className="text-xs text-text-tertiary">Target: {action.targetDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
