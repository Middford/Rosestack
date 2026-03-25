'use client';

import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import type { TariffWithMeta } from '../data';
import { ALL_TARIFFS, GRID_SERVICES } from '../data';

type SortKey = 'name' | 'supplier' | 'spread' | 'cheapestImport' | 'bestExport';
type SortDir = 'asc' | 'desc';

export function TariffDatabase() {
  const [sortKey, setSortKey] = useState<SortKey>('spread');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function getCheapest(t: TariffWithMeta): number {
    return Math.min(...t.importRates.map(r => r.ratePencePerKwh));
  }

  function getBestExport(t: TariffWithMeta): number {
    return Math.max(...t.exportRates.map(r => r.ratePencePerKwh));
  }

  const sorted = [...ALL_TARIFFS].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'name': return mul * a.name.localeCompare(b.name);
      case 'supplier': return mul * a.supplier.localeCompare(b.supplier);
      case 'spread': return mul * (a.arbitrageSpreadPence - b.arbitrageSpreadPence);
      case 'cheapestImport': return mul * (getCheapest(a) - getCheapest(b));
      case 'bestExport': return mul * (getBestExport(a) - getBestExport(b));
      default: return 0;
    }
  });

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>UK Energy Tariff Database</CardTitle>
          <CardDescription>All tariffs relevant to battery arbitrage, sorted by spread</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('supplier')}>
                  Supplier{arrow('supplier')}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Tariff{arrow('name')}
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('cheapestImport')}>
                  Cheapest Import{arrow('cheapestImport')}
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('bestExport')}>
                  Best Export{arrow('bestExport')}
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('spread')}>
                  Spread{arrow('spread')}
                </TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>Kraken</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.supplier}</TableCell>
                  <TableCell>
                    <div>
                      <span className="text-text-primary">{t.name}</span>
                      <p className="text-xs text-text-tertiary mt-0.5 max-w-xs truncate">{t.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.type === 'flux' ? 'rose' : t.type === 'agile' ? 'info' : 'default'}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{getCheapest(t).toFixed(2)}p</TableCell>
                  <TableCell className="text-right font-mono">{getBestExport(t).toFixed(2)}p</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono font-bold ${t.arbitrageSpreadPence > 10 ? 'text-success' : t.arbitrageSpreadPence > 5 ? 'text-warning' : 'text-danger'}`}>
                      {t.arbitrageSpreadPence.toFixed(2)}p
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.bestForBattery ? (
                      <Badge variant="success">Best</Badge>
                    ) : (
                      <Badge variant="default">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.krakenControlled ? (
                      <Badge variant="info">Yes</Badge>
                    ) : (
                      <span className="text-text-tertiary">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grid Services Revenue Streams</CardTitle>
          <CardDescription>Additional revenue beyond tariff arbitrage</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Est. Annual / Home</TableHead>
                <TableHead>Min Portfolio</TableHead>
                <TableHead>Aggregator</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GRID_SERVICES.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-text-primary">{s.name}</span>
                      <p className="text-xs text-text-tertiary mt-0.5 max-w-xs truncate">{s.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{s.provider}</TableCell>
                  <TableCell>
                    <Badge variant={s.type === 'demand-response' ? 'success' : s.type === 'flexibility' ? 'info' : 'default'}>
                      {s.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {s.ratePencePerKwh ? `${s.ratePencePerKwh}p/kWh` : s.ratePerKwPerYear ? `£${s.ratePerKwPerYear}/kW/yr` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-success">
                    £{s.historicalEarningsPerHomePerYear ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.minPortfolioSize ? `${s.minPortfolioSize}+ homes` : 'Any'}
                  </TableCell>
                  <TableCell>
                    {s.aggregatorRequired ? <Badge variant="warning">Required</Badge> : <span className="text-text-tertiary">No</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'active' ? 'success' : s.status === 'seasonal' ? 'info' : 'default'}>
                      {s.status}
                    </Badge>
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
