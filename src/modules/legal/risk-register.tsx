'use client';

import { Badge } from '@/shared/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { LegalRisk, LegalRiskStatus, LegalRiskCategory } from './types';

const statusConfig: Record<LegalRiskStatus, { label: string; variant: 'danger' | 'warning' | 'success' | 'default' }> = {
  open: { label: 'Open', variant: 'danger' },
  mitigating: { label: 'Mitigating', variant: 'warning' },
  closed: { label: 'Closed', variant: 'success' },
  accepted: { label: 'Accepted', variant: 'default' },
};

const categoryLabels: Record<LegalRiskCategory, string> = {
  regulatory: 'Regulatory',
  contractual: 'Contractual',
  compliance: 'Compliance',
  litigation: 'Litigation',
  'data-protection': 'Data Protection',
  'financial-regulation': 'Financial Regulation',
};

function getRiskColor(score: number): string {
  if (score >= 15) return 'text-danger';
  if (score >= 10) return 'text-warning';
  if (score >= 5) return 'text-info';
  return 'text-success';
}

function getRiskBg(score: number): string {
  if (score >= 15) return 'bg-danger/20';
  if (score >= 10) return 'bg-warning/20';
  if (score >= 5) return 'bg-info/20';
  return 'bg-success/20';
}

interface RiskRegisterProps {
  risks: LegalRisk[];
}

export function RiskRegister({ risks }: RiskRegisterProps) {
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  const highRisks = risks.filter((r) => r.score >= 10).length;
  const openRisks = risks.filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Risks</p>
          <p className="text-2xl font-bold text-text-primary">{risks.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-danger">
          <p className="text-sm text-text-secondary">High / Critical</p>
          <p className="text-2xl font-bold text-danger">{highRisks}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-warning">
          <p className="text-sm text-text-secondary">Open</p>
          <p className="text-2xl font-bold text-warning">{openRisks}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Avg Score</p>
          <p className="text-2xl font-bold text-text-primary">
            {risks.length > 0 ? (risks.reduce((a, r) => a + r.score, 0) / risks.length).toFixed(1) : '0'}
          </p>
        </Card>
      </div>

      {/* Risk Heat Map (simple visual) */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((risk) => (
              <div
                key={risk.id}
                className={`rounded-[var(--radius-md)] border border-border p-3 ${getRiskBg(risk.score)}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-bold ${getRiskColor(risk.score)}`}>
                    {risk.score}
                  </span>
                  <Badge variant={statusConfig[risk.status].variant}>
                    {statusConfig[risk.status].label}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-text-primary mt-1">{risk.name}</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  P:{risk.probability} x I:{risk.impact} — {categoryLabels[risk.category]}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Mitigation</TableHead>
                <TableHead className="hidden lg:table-cell">Review Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{risk.name}</p>
                      <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                        {risk.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{categoryLabels[risk.category]}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${getRiskColor(risk.score)}`}>{risk.score}</span>
                    <span className="text-xs text-text-tertiary block">
                      {risk.probability}x{risk.impact}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[risk.status].variant}>
                      {statusConfig[risk.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-text-secondary max-w-xs">
                    {risk.mitigation}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {risk.reviewDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
