'use client';

import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import { lenders, type Lender, type LenderType, type LenderStatus } from '../data';

const typeLabels: Record<LenderType, string> = {
  'asset-finance': 'Asset Finance',
  'green-fund': 'Green Fund',
  'ggs-scheme': 'GGS Scheme',
  'public-body': 'Public Body',
  'community-finance': 'Community',
  'bank': 'Bank',
  'p2p': 'P2P',
  'equity': 'Equity',
};

const statusVariant: Record<LenderStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'rose'> = {
  'researching': 'default',
  'contacted': 'info',
  'in-discussion': 'warning',
  'term-sheet': 'rose',
  'approved': 'success',
  'rejected': 'danger',
  'on-hold': 'default',
};

export function LenderDatabase() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LenderType | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = lenders.filter(l => {
    const matchesSearch = search === '' ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || l.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = Array.from(new Set(lenders.map(l => l.type)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search lenders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-10 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-rose"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as LenderType | 'all')}
          className="h-10 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
        >
          <option value="all">All Types</option>
          {types.map(t => (
            <option key={t} value={t}>{typeLabels[t]}</option>
          ))}
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lender</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Funding Range</TableHead>
              <TableHead className="hidden lg:table-cell">Rate</TableHead>
              <TableHead className="hidden md:table-cell">DSCR Req</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(lender => (
              <LenderRow
                key={lender.id}
                lender={lender}
                expanded={expanded === lender.id}
                onToggle={() => setExpanded(expanded === lender.id ? null : lender.id)}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      {filtered.length === 0 && (
        <p className="text-sm text-text-tertiary text-center py-8">No lenders match your search.</p>
      )}
    </div>
  );
}

function LenderRow({ lender, expanded, onToggle }: { lender: Lender; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <div>
            <p className="font-medium">{lender.name}</p>
            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{lender.description}</p>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Badge variant={lender.greenFocused ? 'success' : 'default'}>
            {typeLabels[lender.type]}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-sm">
          {formatCurrency(lender.minFunding)} - {formatCurrency(lender.maxFunding)}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-sm">{lender.typicalRate}</TableCell>
        <TableCell className="hidden md:table-cell text-sm">
          {lender.dscrRequirement > 0 ? `${lender.dscrRequirement.toFixed(2)}x` : 'N/A'}
        </TableCell>
        <TableCell>
          <Badge variant={statusVariant[lender.status]}>
            {lender.status.replace('-', ' ')}
          </Badge>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-bg-primary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <DetailItem label="Typical Term" value={lender.typicalTerm} />
                <DetailItem label="Track Record Needed" value={lender.trackRecordNeeded} />
                <DetailItem label="Personal Guarantee" value={lender.personalGuarantee ? 'Yes' : 'No'} />
                <DetailItem label="Security Required" value={lender.securityRequired.join(', ')} />
              </div>
              <div className="space-y-2">
                {lender.contactName && <DetailItem label="Contact" value={lender.contactName} />}
                {lender.contactEmail && <DetailItem label="Email" value={lender.contactEmail} />}
                {lender.website && <DetailItem label="Website" value={lender.website} />}
                <DetailItem label="Notes" value={lender.notes} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-text-tertiary">{label}</span>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `£${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `£${(amount / 1000).toFixed(0)}k`;
  return `£${amount}`;
}
