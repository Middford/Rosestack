'use client';

import {
  Card, CardHeader, CardTitle, CardContent,
  Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  TrafficLight,
} from '@/shared/ui';
import { covenants, getCovenantSummary, type Covenant, type CovenantStatus } from '../data';

const trendIcon: Record<string, string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
};

const trendVariant: Record<string, 'success' | 'default' | 'danger'> = {
  improving: 'success',
  stable: 'default',
  declining: 'danger',
};

export function CovenantTracker() {
  const summary = getCovenantSummary();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <TrafficLight status="green" className="justify-center mb-1" />
          <p className="text-2xl font-bold text-success">{summary.green}</p>
          <p className="text-xs text-text-tertiary">Compliant</p>
        </Card>
        <Card className="p-4 text-center">
          <TrafficLight status="amber" className="justify-center mb-1" />
          <p className="text-2xl font-bold text-warning">{summary.amber}</p>
          <p className="text-xs text-text-tertiary">Watch</p>
        </Card>
        <Card className="p-4 text-center">
          <TrafficLight status="red" className="justify-center mb-1" />
          <p className="text-2xl font-bold text-danger">{summary.red}</p>
          <p className="text-xs text-text-tertiary">Breach</p>
        </Card>
      </div>

      {/* Covenant Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Covenants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Covenant</TableHead>
                <TableHead className="hidden md:table-cell">Lender / Facility</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead className="hidden md:table-cell">Trend</TableHead>
                <TableHead className="hidden lg:table-cell">Next Test</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {covenants.map(cov => (
                <CovenantRow key={cov.id} covenant={cov} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Breach Actions */}
      {covenants.filter(c => c.status !== 'green').length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {covenants.filter(c => c.status !== 'green').map(cov => (
              <div key={cov.id} className="flex items-start gap-3 p-3 bg-bg-primary rounded-[var(--radius-md)]">
                <TrafficLight status={cov.status} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{cov.name} — {cov.lender}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Current: {formatCovenantValue(cov)} vs Threshold: {formatThreshold(cov)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">{cov.breachAction}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CovenantRow({ covenant }: { covenant: Covenant }) {
  return (
    <TableRow>
      <TableCell>
        <TrafficLight status={covenant.status} />
      </TableCell>
      <TableCell>
        <p className="text-sm font-medium">{covenant.name}</p>
        <p className="text-xs text-text-tertiary">{covenant.metric}</p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <p className="text-sm">{covenant.lender}</p>
        <p className="text-xs text-text-tertiary">{covenant.facility}</p>
      </TableCell>
      <TableCell className="text-sm font-medium">{formatCovenantValue(covenant)}</TableCell>
      <TableCell className="text-sm">{formatThreshold(covenant)}</TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant={trendVariant[covenant.trend]}>{trendIcon[covenant.trend]}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-text-secondary">
        {covenant.nextTest}
      </TableCell>
    </TableRow>
  );
}

function formatCovenantValue(cov: Covenant): string {
  if (cov.metric === 'DSCR' || cov.metric === 'Stressed DSCR' || cov.metric === 'ICR') {
    return `${cov.currentValue.toFixed(2)}x`;
  }
  if (cov.metric === 'LTV' || cov.metric === 'Default %') {
    return `${cov.currentValue.toFixed(1)}%`;
  }
  if (cov.metric === 'Revenue') {
    return `£${(cov.currentValue / 1000).toFixed(0)}k`;
  }
  return String(cov.currentValue);
}

function formatThreshold(cov: Covenant): string {
  if (cov.metric === 'DSCR' || cov.metric === 'Stressed DSCR' || cov.metric === 'ICR') {
    return `≥ ${cov.threshold.toFixed(2)}x`;
  }
  if (cov.metric === 'LTV' || cov.metric === 'Default %') {
    return `≤ ${cov.threshold.toFixed(1)}%`;
  }
  if (cov.metric === 'Revenue') {
    return `≥ £${(cov.threshold / 1000).toFixed(0)}k`;
  }
  return String(cov.threshold);
}
