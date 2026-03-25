'use client';

import { Badge } from '@/shared/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { Certification, CertificationStatus } from './types';

const statusConfig: Record<CertificationStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  expired: { label: 'Expired', variant: 'danger' },
  'renewal-due': { label: 'Renewal Due', variant: 'warning' },
  'not-started': { label: 'Not Started', variant: 'default' },
};

interface CertificationTrackerProps {
  certifications: Certification[];
}

export function CertificationTracker({ certifications }: CertificationTrackerProps) {
  const activeCerts = certifications.filter((c) => c.status === 'active').length;
  const pendingCerts = certifications.filter((c) => c.status === 'pending' || c.status === 'not-started').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Certifications</p>
          <p className="text-2xl font-bold text-text-primary">{certifications.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-success">
          <p className="text-sm text-text-secondary">Active</p>
          <p className="text-2xl font-bold text-success">{activeCerts}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-warning">
          <p className="text-sm text-text-secondary">Pending / Not Started</p>
          <p className="text-2xl font-bold text-warning">{pendingCerts}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certifications & Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certification</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Provider</TableHead>
                <TableHead className="hidden lg:table-cell">Expiry / Renewal</TableHead>
                <TableHead className="hidden lg:table-cell">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certifications.map((cert) => {
                const sc = statusConfig[cert.status];
                return (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{cert.name}</p>
                        {cert.reference && (
                          <p className="text-xs text-text-tertiary">Ref: {cert.reference}</p>
                        )}
                        {cert.notes && (
                          <p className="text-xs text-text-tertiary mt-0.5 italic">{cert.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{cert.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary">
                      {cert.provider}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {cert.expiryDate ?? cert.renewalDate ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {cert.cost ? `£${cert.cost.toLocaleString()}` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
