'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { ALL_TARIFFS } from '@/modules/tariffs/data';
import { modelBulkTariffChange, generatePortfolioCsv, formatGbp } from '../data';
import type { PortfolioProperty, BulkTariffChangeResult } from '../types';

interface BulkOperationsProps {
  properties: PortfolioProperty[];
}

export function BulkOperations({ properties }: BulkOperationsProps) {
  const [selectedTariffId, setSelectedTariffId] = useState('octopus-iof');
  const [tariffChangeResults, setTariffChangeResults] = useState<BulkTariffChangeResult[] | null>(null);

  function handleTariffModel() {
    const results = modelBulkTariffChange(properties, selectedTariffId);
    setTariffChangeResults(results);
  }

  function handleCsvExport() {
    const csv = generatePortfolioCsv(properties);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rosestack-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalUplift = tariffChangeResults
    ? tariffChangeResults.reduce((sum, r) => sum + (r.newAnnualRevenue.likely - r.currentAnnualRevenue.likely), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Bulk Tariff Change */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Tariff Change Modelling</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <p className="text-sm text-text-secondary mb-4">
            Model the impact of switching all properties to a different tariff before making any changes.
          </p>
          <div className="flex gap-3 items-end mb-6">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">Switch all to:</label>
              <select
                value={selectedTariffId}
                onChange={e => setSelectedTariffId(e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary"
              >
                {ALL_TARIFFS.map(t => (
                  <option key={t.id} value={t.id}>{t.supplier} - {t.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleTariffModel} variant="secondary">
              Model Impact
            </Button>
          </div>

          {tariffChangeResults && (
            <>
              <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-bg-primary border border-border">
                <span className="text-sm text-text-secondary">
                  Total annual revenue change:{' '}
                </span>
                <span className={`text-lg font-bold ${totalUplift >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalUplift >= 0 ? '+' : ''}{formatGbp(totalUplift)}/year
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Current Tariff</TableHead>
                    <TableHead>New Tariff</TableHead>
                    <TableHead>Current (Likely)</TableHead>
                    <TableHead>New (Likely)</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tariffChangeResults.map(r => (
                    <TableRow key={r.propertyId}>
                      <TableCell className="font-medium">{r.address}</TableCell>
                      <TableCell className="text-xs">{r.currentTariff}</TableCell>
                      <TableCell className="text-xs">{r.newTariff}</TableCell>
                      <TableCell>{formatGbp(r.currentAnnualRevenue.likely)}/yr</TableCell>
                      <TableCell>{formatGbp(r.newAnnualRevenue.likely)}/yr</TableCell>
                      <TableCell>
                        <Badge variant={r.upliftPercent >= 0 ? 'success' : 'danger'}>
                          {r.upliftPercent >= 0 ? '+' : ''}{r.upliftPercent}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Reporting</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleCsvExport}
              className="p-4 rounded-[var(--radius-md)] border border-border bg-bg-primary hover:bg-bg-hover transition-colors text-left"
            >
              <p className="text-sm font-medium text-text-primary">CSV Export</p>
              <p className="text-xs text-text-tertiary mt-1">
                Download entire portfolio data as CSV for lender reporting
              </p>
            </button>
            <div className="p-4 rounded-[var(--radius-md)] border border-border bg-bg-primary opacity-60">
              <p className="text-sm font-medium text-text-primary">Portfolio Summary PDF</p>
              <p className="text-xs text-text-tertiary mt-1">
                Generate professional summary document for investors/lenders
              </p>
              <Badge className="mt-2">Coming soon</Badge>
            </div>
            <div className="p-4 rounded-[var(--radius-md)] border border-border bg-bg-primary opacity-60">
              <p className="text-sm font-medium text-text-primary">Lender Report</p>
              <p className="text-xs text-text-tertiary mt-1">
                Formatted covenant compliance and portfolio health report
              </p>
              <Badge className="mt-2">Coming soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
