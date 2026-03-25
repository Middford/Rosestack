'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { formatGbp } from '@/shared/utils/scenarios';
import type { PortfolioProperty, PropertyStatusFilter } from '../types';
import type { HomeStatus } from '@/shared/types';

interface PropertyTableProps {
  properties: PortfolioProperty[];
}

const statusBadge: Record<HomeStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  live: { variant: 'success', label: 'Live' },
  installed: { variant: 'warning', label: 'Installed' },
  contracted: { variant: 'info', label: 'Contracted' },
  qualified: { variant: 'default', label: 'Qualified' },
  prospect: { variant: 'default', label: 'Prospect' },
  churned: { variant: 'danger', label: 'Churned' },
};

type SortKey = 'address' | 'status' | 'capacity' | 'tariff' | 'revenue' | 'payback';

export function PropertyTable({ properties }: PropertyTableProps) {
  const [statusFilter, setStatusFilter] = useState<PropertyStatusFilter>('all');
  const [tariffFilter, setTariffFilter] = useState<string>('all');
  const [postcodeFilter, setPostcodeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('address');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const tariffOptions = useMemo(() => {
    const tariffs = new Set(properties.map(p => p.tariff.name));
    return Array.from(tariffs);
  }, [properties]);

  const filtered = useMemo(() => {
    let result = [...properties];

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    if (tariffFilter !== 'all') {
      result = result.filter(p => p.tariff.name === tariffFilter);
    }
    if (postcodeFilter) {
      result = result.filter(p => p.postcode.toLowerCase().startsWith(postcodeFilter.toLowerCase()));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'address': cmp = a.address.localeCompare(b.address); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'capacity': cmp = a.system.totalCapacityKwh - b.system.totalCapacityKwh; break;
        case 'tariff': cmp = a.tariff.name.localeCompare(b.tariff.name); break;
        case 'revenue': cmp = a.summary.likely.annualNetRevenue - b.summary.likely.annualNetRevenue; break;
        case 'payback': cmp = a.summary.likely.paybackMonths - b.summary.likely.paybackMonths; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [properties, statusFilter, tariffFilter, postcodeFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-text-primary"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Properties</CardTitle>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as PropertyStatusFilter)}
              className="h-8 px-3 text-xs rounded-[var(--radius-sm)] bg-bg-tertiary border border-border text-text-primary"
            >
              <option value="all">All Status</option>
              <option value="live">Live</option>
              <option value="installed">Installed</option>
              <option value="contracted">Contracted</option>
              <option value="qualified">Qualified</option>
              <option value="prospect">Prospect</option>
            </select>
            <select
              value={tariffFilter}
              onChange={e => setTariffFilter(e.target.value)}
              className="h-8 px-3 text-xs rounded-[var(--radius-sm)] bg-bg-tertiary border border-border text-text-primary"
            >
              <option value="all">All Tariffs</option>
              {tariffOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Postcode..."
              value={postcodeFilter}
              onChange={e => setPostcodeFilter(e.target.value)}
              className="h-8 w-28 px-3 text-xs rounded-[var(--radius-sm)] bg-bg-tertiary border border-border text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader label="Address" field="address" />
            <SortHeader label="Status" field="status" />
            <TableHead>System</TableHead>
            <SortHeader label="Capacity" field="capacity" />
            <SortHeader label="Tariff" field="tariff" />
            <SortHeader label="Monthly Revenue" field="revenue" />
            <SortHeader label="Payback" field="payback" />
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(p => {
            const badge = statusBadge[p.status];
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{p.address}</span>
                    <span className="text-xs text-text-tertiary ml-2">{p.postcode}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {p.system.inverterModel}
                </TableCell>
                <TableCell>{p.system.totalCapacityKwh} kWh</TableCell>
                <TableCell className="text-xs">{p.tariff.name}</TableCell>
                <TableCell className="font-medium">
                  {formatGbp(p.summary.likely.annualNetRevenue / 12)}
                </TableCell>
                <TableCell>
                  <span className="text-xs">
                    {p.summary.likely.paybackMonths < 999
                      ? `${p.summary.likely.paybackMonths}mo`
                      : '>10yr'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <a
                      href={`/portfolio/${p.id}`}
                      className="text-xs text-rose hover:text-rose-light"
                    >
                      View
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-text-tertiary py-8">
                No properties match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
