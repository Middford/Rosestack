'use client';

import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import {
  dataRoomDocuments,
  type DataRoomDocument,
  type DataRoomCategory,
  type DocumentStatus,
} from '../data';

const categoryLabels: Record<DataRoomCategory, string> = {
  financial: 'Financial',
  legal: 'Legal',
  technical: 'Technical',
  commercial: 'Commercial',
  compliance: 'Compliance',
  insurance: 'Insurance',
  corporate: 'Corporate',
};

const statusVariant: Record<DocumentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'rose'> = {
  draft: 'warning',
  ready: 'success',
  shared: 'info',
  signed: 'rose',
  expired: 'danger',
};

const confidentialityVariant: Record<string, 'default' | 'warning' | 'danger'> = {
  'public': 'default',
  'confidential': 'warning',
  'highly-confidential': 'danger',
};

export function DataRoom() {
  const [categoryFilter, setCategoryFilter] = useState<DataRoomCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const categories = Array.from(new Set(dataRoomDocuments.map(d => d.category)));

  const filtered = dataRoomDocuments.filter(d => {
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchesSearch = search === '' ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const statusCounts = dataRoomDocuments.reduce(
    (acc, d) => ({ ...acc, [d.status]: (acc[d.status] || 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['draft', 'ready', 'shared', 'signed', 'expired'] as DocumentStatus[]).map(status => (
          <Card key={status} className="p-3 text-center">
            <p className="text-xl font-bold text-text-primary">{statusCounts[status] || 0}</p>
            <Badge variant={statusVariant[status]} className="mt-1">{status}</Badge>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-10 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-rose"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as DataRoomCategory | 'all')}
          className="h-10 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{categoryLabels[c]}</option>
          ))}
        </select>
      </div>

      {/* Document Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Version</TableHead>
              <TableHead className="hidden md:table-cell">Confidentiality</TableHead>
              <TableHead className="hidden lg:table-cell">Shared With</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(doc => (
              <DocumentRow key={doc.id} document={doc} />
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Data Room Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Data Room Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map(cat => {
              const docs = dataRoomDocuments.filter(d => d.category === cat);
              const ready = docs.filter(d => d.status === 'ready' || d.status === 'shared' || d.status === 'signed').length;
              return (
                <div key={cat} className="flex items-center justify-between p-3 bg-bg-primary rounded-[var(--radius-md)]">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{categoryLabels[cat]}</p>
                    <p className="text-xs text-text-tertiary">{ready}/{docs.length} ready</p>
                  </div>
                  <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${docs.length > 0 ? (ready / docs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentRow({ document: doc }: { document: DataRoomDocument }) {
  return (
    <TableRow>
      <TableCell>
        <p className="text-sm font-medium">{doc.name}</p>
        <p className="text-xs text-text-tertiary line-clamp-1">{doc.description}</p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge>{categoryLabels[doc.category]}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-text-secondary">v{doc.version}</TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant={confidentialityVariant[doc.confidentiality]}>
          {doc.confidentiality.replace('-', ' ')}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {doc.sharedWith.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {doc.sharedWith.map((s, i) => (
              <span key={i} className="text-xs text-text-tertiary">{s}{i < doc.sharedWith.length - 1 ? ',' : ''}</span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-text-tertiary">Not shared</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-text-secondary">{doc.lastUpdated}</TableCell>
    </TableRow>
  );
}
