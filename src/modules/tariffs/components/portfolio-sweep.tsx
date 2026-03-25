'use client';

import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import { formatGbp } from '@/shared/utils/scenarios';
import { PORTFOLIO_SWEEP_DATA } from '../data';
import type { PropertyTariffSweep } from '../data';

const statusConfig = {
  pending: { variant: 'warning' as const, label: 'Pending' },
  approved: { variant: 'success' as const, label: 'Approved' },
  rejected: { variant: 'danger' as const, label: 'Rejected' },
  switched: { variant: 'info' as const, label: 'Switched' },
};

export function PortfolioSweep() {
  const [data, setData] = useState<PropertyTariffSweep[]>(PORTFOLIO_SWEEP_DATA);
  const threshold = 5;

  const flagged = data.filter(d => d.upliftPercent > threshold);
  const optimal = data.filter(d => d.upliftPercent <= threshold);

  const totalUplift = flagged.reduce(
    (sum, d) => sum + (d.recommendedAnnualRevenue.likely - d.currentAnnualRevenue.likely),
    0,
  );

  function handleApprove(propertyId: string) {
    setData(prev => prev.map(d =>
      d.propertyId === propertyId ? { ...d, status: 'approved' as const } : d
    ));
  }

  function handleReject(propertyId: string) {
    setData(prev => prev.map(d =>
      d.propertyId === propertyId ? { ...d, status: 'rejected' as const } : d
    ));
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Properties Scanned</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{data.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Switches Flagged</p>
          <p className="text-2xl font-bold text-warning mt-1">{flagged.length}</p>
          <p className="text-xs text-text-tertiary mt-0.5">&gt;{threshold}% uplift threshold</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Already Optimal</p>
          <p className="text-2xl font-bold text-success mt-1">{optimal.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Total Potential Uplift</p>
          <p className="text-2xl font-bold text-rose-light mt-1">{formatGbp(totalUplift)}/yr</p>
        </Card>
      </div>

      {/* Flagged Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Tariff Optimisation Sweep</CardTitle>
          <CardDescription>
            Properties where switching tariff would increase revenue by &gt;{threshold}%. Approve to initiate switch (requires Letter of Authority in ESA).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Current Tariff</TableHead>
                <TableHead>Recommended</TableHead>
                <TableHead className="text-right">Current Rev (Likely)</TableHead>
                <TableHead className="text-right">Recommended Rev (Likely)</TableHead>
                <TableHead className="text-right">Uplift</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(d => {
                const config = statusConfig[d.status];
                return (
                  <TableRow key={d.propertyId}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-text-primary">{d.address}</span>
                        <p className="text-xs text-text-tertiary">{d.propertyId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">{d.currentTariffName}</TableCell>
                    <TableCell className="font-medium">
                      {d.currentTariffId === d.recommendedTariffId ? (
                        <span className="text-success">Already optimal</span>
                      ) : (
                        <span className="text-info">{d.recommendedTariffName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="text-xs text-text-secondary">
                        <span className="text-scenario-best">{formatGbp(d.currentAnnualRevenue.best)}</span>
                        {' / '}
                        <span className="font-bold text-scenario-likely">{formatGbp(d.currentAnnualRevenue.likely)}</span>
                        {' / '}
                        <span className="text-scenario-worst">{formatGbp(d.currentAnnualRevenue.worst)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="text-xs text-text-secondary">
                        <span className="text-scenario-best">{formatGbp(d.recommendedAnnualRevenue.best)}</span>
                        {' / '}
                        <span className="font-bold text-scenario-likely">{formatGbp(d.recommendedAnnualRevenue.likely)}</span>
                        {' / '}
                        <span className="text-scenario-worst">{formatGbp(d.recommendedAnnualRevenue.worst)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {d.upliftPercent > 0 ? (
                        <span className="font-mono font-bold text-success">+{d.upliftPercent.toFixed(1)}%</span>
                      ) : (
                        <span className="text-text-tertiary">0%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.status === 'pending' && d.upliftPercent > 0 && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" onClick={() => handleApprove(d.propertyId)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(d.propertyId)}>
                            Reject
                          </Button>
                        </div>
                      )}
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
