'use client';

import { Badge } from '@/shared/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { G99Application, G99Stage } from './types';

const stageConfig: Record<G99Stage, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger'; order: number }> = {
  'pre-submission': { label: 'Pre-Submission', variant: 'default', order: 0 },
  submitted: { label: 'Submitted', variant: 'info', order: 1 },
  'dno-review': { label: 'DNO Review', variant: 'warning', order: 2 },
  'design-approval': { label: 'Design Approved', variant: 'info', order: 3 },
  commissioning: { label: 'Commissioning', variant: 'warning', order: 4 },
  connected: { label: 'Connected', variant: 'success', order: 5 },
  rejected: { label: 'Rejected', variant: 'danger', order: 6 },
};

const stages: G99Stage[] = ['pre-submission', 'submitted', 'dno-review', 'design-approval', 'commissioning', 'connected'];

interface G99PipelineProps {
  applications: G99Application[];
}

export function G99Pipeline({ applications }: G99PipelineProps) {
  const sorted = [...applications].sort(
    (a, b) => stageConfig[a.stage].order - stageConfig[b.stage].order,
  );

  const stageCounts = stages.map((stage) => ({
    stage,
    ...stageConfig[stage],
    count: applications.filter((a) => a.stage === stage).length,
  }));

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stageCounts.map((s) => (
          <Card key={s.stage} className="p-3 text-center">
            <p className="text-xs text-text-secondary">{s.label}</p>
            <p className="text-xl font-bold text-text-primary mt-1">{s.count}</p>
          </Card>
        ))}
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>G99/G98 Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="hidden md:table-cell">Capacity</TableHead>
                <TableHead className="hidden md:table-cell">Reference</TableHead>
                <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                <TableHead className="hidden lg:table-cell">Expected Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((app) => {
                const sc = stageConfig[app.stage];
                return (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{app.address}</p>
                        <p className="text-xs text-text-tertiary">{app.dnoRegion}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.applicationType === 'G99' ? 'info' : 'default'}>
                        {app.applicationType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {app.capacityKw} kW
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary">
                      {app.referenceNumber ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {app.submissionDate ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {app.actualApprovalDate ? (
                        <span className="text-success">{app.actualApprovalDate}</span>
                      ) : (
                        app.expectedApprovalDate ?? '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {applications.length === 0 && (
            <p className="text-center text-text-tertiary py-8">No G99/G98 applications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
