'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { RiskItem, OpportunityItem, MitigationStatus, CaptureStatus } from '@/shared/types';

interface MitigationRegisterProps {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
}

type ViewType = 'mitigations' | 'captures' | 'all';
type StatusFilter = 'all' | MitigationStatus | CaptureStatus;

function statusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'implemented': case 'tested': case 'captured': return 'success';
    case 'in-progress': case 'researching': return 'warning';
    case 'missed': return 'danger';
    case 'not-started': return 'default';
    default: return 'default';
  }
}

function progressPercent(status: string): number {
  switch (status) {
    case 'not-started': return 0;
    case 'researching': return 25;
    case 'in-progress': return 50;
    case 'implemented': return 75;
    case 'tested': case 'captured': return 100;
    case 'missed': return 0;
    default: return 0;
  }
}

export function MitigationCaptureRegister({ risks, opportunities }: MitigationRegisterProps) {
  const [viewType, setViewType] = useState<ViewType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const mitigations = useMemo(() =>
    risks.map(r => ({
      id: r.id,
      name: r.name,
      type: 'mitigation' as const,
      strategy: r.mitigationStrategy,
      owner: r.mitigationOwner,
      status: r.mitigationStatus,
      score: r.score,
      residualScore: r.residualScore,
      trigger: r.triggerThreshold,
      contingency: r.contingencyPlan,
    })),
    [risks]
  );

  const captures = useMemo(() =>
    opportunities.map(o => ({
      id: o.id,
      name: o.name,
      type: 'capture' as const,
      strategy: o.captureStrategy,
      owner: o.captureOwner,
      status: o.captureStatus,
      score: o.score,
      expectedValue: o.expectedValue,
      trigger: o.triggerThreshold,
      dependencies: o.dependencies,
      investmentRequired: o.investmentRequired,
    })),
    [opportunities]
  );

  const allItems = useMemo(() => {
    let items: Array<typeof mitigations[0] | typeof captures[0]> = [];
    if (viewType === 'mitigations' || viewType === 'all') items = [...items, ...mitigations];
    if (viewType === 'captures' || viewType === 'all') items = [...items, ...captures];

    if (statusFilter !== 'all') {
      items = items.filter(i => i.status === statusFilter);
    }

    return items.sort((a, b) => b.score - a.score);
  }, [viewType, statusFilter, mitigations, captures]);

  const mitStats = {
    total: mitigations.length,
    notStarted: mitigations.filter(m => m.status === 'not-started').length,
    inProgress: mitigations.filter(m => m.status === 'in-progress').length,
    implemented: mitigations.filter(m => m.status === 'implemented' || m.status === 'tested').length,
  };

  const capStats = {
    total: captures.length,
    notStarted: captures.filter(c => c.status === 'not-started').length,
    researching: captures.filter(c => c.status === 'researching').length,
    inProgress: captures.filter(c => c.status === 'in-progress').length,
    captured: captures.filter(c => c.status === 'captured').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Mitigation & Capture Register</CardTitle>
            <p className="text-xs text-text-tertiary mt-1">Track progress on risk mitigations and opportunity captures</p>
          </div>
          <div className="flex gap-2">
            {(['all', 'mitigations', 'captures'] as ViewType[]).map(v => (
              <button
                key={v}
                onClick={() => setViewType(v)}
                className={`px-3 py-1.5 text-xs rounded-[var(--radius-md)] transition-colors ${
                  viewType === v ? 'bg-rose text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-[10px] text-text-tertiary uppercase">Risk Mitigations</p>
            <p className="text-lg font-bold text-text-primary">{mitStats.implemented}/{mitStats.total}</p>
            <div className="w-full bg-bg-hover rounded-full h-1.5 mt-1">
              <div className="bg-success h-1.5 rounded-full" style={{ width: `${(mitStats.implemented / mitStats.total) * 100}%` }} />
            </div>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-[10px] text-text-tertiary uppercase">In Progress</p>
            <p className="text-lg font-bold text-warning">{mitStats.inProgress}</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-[10px] text-text-tertiary uppercase">Opp Captures</p>
            <p className="text-lg font-bold text-text-primary">{capStats.captured}/{capStats.total}</p>
            <div className="w-full bg-bg-hover rounded-full h-1.5 mt-1">
              <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(capStats.captured / capStats.total) * 100}%` }} />
            </div>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
            <p className="text-[10px] text-text-tertiary uppercase">Researching</p>
            <p className="text-lg font-bold text-info">{capStats.researching}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-rose"
          >
            <option value="all">All Statuses</option>
            <option value="not-started">Not Started</option>
            <option value="researching">Researching</option>
            <option value="in-progress">In Progress</option>
            <option value="implemented">Implemented</option>
            <option value="tested">Tested</option>
            <option value="captured">Captured</option>
            <option value="missed">Missed</option>
          </select>
          <span className="text-xs text-text-tertiary self-center">{allItems.length} items</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="hidden md:table-cell">Strategy</TableHead>
              <TableHead className="w-16">Owner</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map(item => (
              <TableRow key={item.id}>
                <TableCell className="text-xs text-text-tertiary font-mono">{item.id}</TableCell>
                <TableCell className="text-sm font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant={item.type === 'mitigation' ? 'danger' : 'info'}>
                    {item.type === 'mitigation' ? 'Mitigate' : 'Capture'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-text-secondary max-w-[300px] truncate hidden md:table-cell">
                  {item.strategy}
                </TableCell>
                <TableCell className="text-xs">{item.owner}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(item.status)}>
                    {item.status.replace(/-/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-bg-hover rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${progressPercent(item.status) === 100 ? 'bg-success' : progressPercent(item.status) > 0 ? 'bg-warning' : 'bg-bg-hover'}`}
                      style={{ width: `${progressPercent(item.status)}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
