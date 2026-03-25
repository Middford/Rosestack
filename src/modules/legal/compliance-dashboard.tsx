'use client';

import { Badge } from '@/shared/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { ComplianceRequirement, ComplianceStatus, ComplianceCategory } from './types';

const statusConfig: Record<ComplianceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  compliant: { label: 'Compliant', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  'action-needed': { label: 'Action Needed', variant: 'danger' },
  'not-applicable': { label: 'N/A', variant: 'default' },
};

const categoryLabels: Record<ComplianceCategory, string> = {
  'mcs-certification': 'MCS Certification',
  'g99-g98': 'G99/G98 Grid Connection',
  'electrical-regs': 'Electrical Regulations',
  'esa-contract': 'ESA Contract',
  fca: 'FCA Considerations',
  'seg-registration': 'SEG Registration',
  insurance: 'Insurance',
  'fire-safety': 'Fire Safety',
  'planning-permission': 'Planning Permission',
};

const criticalityConfig: Record<string, { variant: 'danger' | 'warning' | 'info' | 'default' }> = {
  critical: { variant: 'danger' },
  high: { variant: 'warning' },
  medium: { variant: 'info' },
  low: { variant: 'default' },
};

interface ComplianceDashboardProps {
  requirements: ComplianceRequirement[];
}

export function ComplianceDashboard({ requirements }: ComplianceDashboardProps) {
  const statusCounts = {
    compliant: requirements.filter((r) => r.status === 'compliant').length,
    pending: requirements.filter((r) => r.status === 'pending').length,
    'action-needed': requirements.filter((r) => r.status === 'action-needed').length,
    'not-applicable': requirements.filter((r) => r.status === 'not-applicable').length,
  };

  const grouped = requirements.reduce<Record<string, ComplianceRequirement[]>>((acc, req) => {
    const cat = req.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(req);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-danger">
          <p className="text-sm text-text-secondary">Action Needed</p>
          <p className="text-2xl font-bold text-danger">{statusCounts['action-needed']}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-warning">
          <p className="text-sm text-text-secondary">Pending</p>
          <p className="text-2xl font-bold text-warning">{statusCounts.pending}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-success">
          <p className="text-sm text-text-secondary">Compliant</p>
          <p className="text-2xl font-bold text-success">{statusCounts.compliant}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-border">
          <p className="text-sm text-text-secondary">Not Applicable</p>
          <p className="text-2xl font-bold text-text-tertiary">{statusCounts['not-applicable']}</p>
        </Card>
      </div>

      {/* Requirements by Category */}
      {Object.entries(grouped).map(([category, reqs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{categoryLabels[category as ComplianceCategory] ?? category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead className="hidden md:table-cell">Criticality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reqs.map((req) => {
                  const sc = statusConfig[req.status];
                  const cc = criticalityConfig[req.criticality];
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{req.name}</p>
                          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{req.description}</p>
                          {req.notes && (
                            <p className="text-xs text-text-tertiary mt-1 italic">{req.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={cc.variant}>{req.criticality}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {req.dueDate ?? '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-text-secondary">
                        {req.owner}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
