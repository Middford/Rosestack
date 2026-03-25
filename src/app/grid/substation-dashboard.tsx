'use client';

import { substations, flexibilityTenders } from '@/modules/grid/substation-data';
import { Badge } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';

export function SubstationDashboard() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Substation</TableHead>
            <TableHead>Capacity (MVA)</TableHead>
            <TableHead>Utilisation</TableHead>
            <TableHead>Constraint</TableHead>
            <TableHead>Connected Homes</TableHead>
            <TableHead>Headroom</TableHead>
            <TableHead>G99 Status</TableHead>
            <TableHead>Flex Tender</TableHead>
            <TableHead className="text-right">Flex Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {substations.map(sub => {
            const tender = flexibilityTenders[sub.id];
            const loadPercent = sub.currentLoadPercent ?? 0;
            return (
              <TableRow key={sub.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-xs text-text-tertiary">{sub.id}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{sub.capacityMva}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${loadPercent}%`,
                          backgroundColor: loadPercent >= 85 ? '#EF4444'
                            : loadPercent >= 70 ? '#F59E0B'
                            : '#10B981',
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-tertiary font-mono">{loadPercent}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    sub.constraintStatus === 'unconstrained' ? 'success'
                    : sub.constraintStatus === 'approaching' ? 'warning'
                    : 'danger'
                  }>
                    {sub.constraintStatus}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{sub.connectedHomes?.toLocaleString()}</TableCell>
                <TableCell className="font-mono">{sub.maxNewConnections}</TableCell>
                <TableCell>
                  <Badge variant={
                    loadPercent >= 85 ? 'danger'
                    : loadPercent >= 70 ? 'warning'
                    : 'success'
                  }>
                    {loadPercent >= 85 ? 'Under review' : loadPercent >= 70 ? 'Monitoring' : 'Clear'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tender ? (
                    <Badge variant={
                      tender.status === 'open' ? 'success'
                      : tender.status === 'pending' ? 'warning'
                      : 'info'
                    }>
                      {tender.status}
                    </Badge>
                  ) : (
                    <span className="text-text-tertiary text-xs">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {tender
                    ? `£${tender.totalAnnualValue.toLocaleString()}/yr`
                    : <span className="text-text-tertiary">-</span>
                  }
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
