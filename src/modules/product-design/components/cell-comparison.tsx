'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { sodiumIonCells } from '../data';
import type { SodiumIonCellSpec } from '../types';

const statusColors: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  'mass-production': 'success',
  'pilot': 'warning',
  'development': 'info',
  'announced': 'danger',
};

export function CellComparison() {
  const [selected, setSelected] = useState<string[]>(
    sodiumIonCells.filter(c => c.status === 'mass-production').map(c => c.id)
  );

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const cells = sodiumIonCells.filter(c => selected.includes(c.id));

  const renderValue = (cell: SodiumIonCellSpec, key: keyof SodiumIonCellSpec) => {
    const val = cell[key];
    if (val === undefined || val === null) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.join(', ') || 'None';
    return String(val);
  };

  const specs: { label: string; key: keyof SodiumIonCellSpec; unit?: string; highlight?: 'high' | 'low' }[] = [
    { label: 'Origin', key: 'origin' },
    { label: 'Energy Density', key: 'energyDensityWhKg', unit: 'Wh/kg', highlight: 'high' },
    { label: 'Nominal Voltage', key: 'nominalVoltage', unit: 'V' },
    { label: 'Capacity', key: 'capacityAh', unit: 'Ah', highlight: 'high' },
    { label: 'Cycle Life', key: 'cycleLife', highlight: 'high' },
    { label: 'Temp Range', key: 'operatingTempMin' },
    { label: 'Cell Price', key: 'estimatedCellPriceUsdKwh', unit: '$/kWh', highlight: 'low' },
    { label: 'Pack Price', key: 'estimatedPackPriceUsdKwh', unit: '$/kWh', highlight: 'low' },
    { label: 'Production Capacity', key: 'productionCapacityGwh', unit: 'GWh' },
    { label: 'Export to UK', key: 'exportToUk' },
    { label: 'MOQ', key: 'moqKwh', unit: 'kWh' },
    { label: 'Certifications', key: 'certifications' },
  ];

  const getBestValue = (key: keyof SodiumIonCellSpec, dir: 'high' | 'low') => {
    const vals = cells.map(c => c[key]).filter(v => typeof v === 'number') as number[];
    if (vals.length === 0) return null;
    return dir === 'high' ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="space-y-4">
      {/* Cell selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Cells to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sodiumIonCells.map(cell => (
              <button
                key={cell.id}
                onClick={() => toggle(cell.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected.includes(cell.id)
                    ? 'border-rose bg-rose-subtle text-rose-light'
                    : 'border-border bg-bg-tertiary text-text-secondary hover:border-border-hover'
                }`}
              >
                <span className="font-medium">{cell.manufacturer}</span>
                <Badge variant={statusColors[cell.status]}>{cell.status}</Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison table */}
      {cells.length > 0 && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px] sticky left-0 bg-bg-secondary">Specification</TableHead>
                    {cells.map(cell => (
                      <TableHead key={cell.id} className="min-w-[140px] text-center">
                        <div className="font-semibold text-text-primary">{cell.manufacturer}</div>
                        <div className="text-xs text-text-tertiary">{cell.model}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specs.map(spec => {
                    const best = spec.highlight ? getBestValue(spec.key, spec.highlight) : null;
                    return (
                      <TableRow key={spec.key}>
                        <TableCell className="sticky left-0 bg-bg-secondary font-medium text-text-secondary">
                          {spec.label}
                        </TableCell>
                        {cells.map(cell => {
                          const val = cell[spec.key];
                          const numVal = typeof val === 'number' ? val : null;
                          const isBest = best !== null && numVal === best;

                          if (spec.key === 'operatingTempMin') {
                            return (
                              <TableCell key={cell.id} className="text-center">
                                {cell.operatingTempMin}C to {cell.operatingTempMax}C
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell
                              key={cell.id}
                              className={`text-center ${isBest ? 'text-success font-semibold' : ''}`}
                            >
                              {renderValue(cell, spec.key)}
                              {spec.unit && typeof val === 'number' ? ` ${spec.unit}` : ''}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {/* Notes row */}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-bg-secondary font-medium text-text-secondary">Notes</TableCell>
                    {cells.map(cell => (
                      <TableCell key={cell.id} className="text-xs text-text-tertiary max-w-[200px]">
                        {cell.notes}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
