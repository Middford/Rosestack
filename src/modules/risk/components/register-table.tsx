'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { RiskItem, OpportunityItem, RiskCategory, OpportunityCategory } from '@/shared/types';
import { getRiskRatingBadgeVariant, getOpportunityRatingBadgeVariant } from '../scoring';

type ViewMode = 'risks' | 'opportunities' | 'all';
type SortField = 'name' | 'category' | 'score' | 'probability' | 'impact' | 'status' | 'owner';
type SortDir = 'asc' | 'desc';

interface RegisterTableProps {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  onSelectRisk?: (id: string) => void;
  onSelectOpportunity?: (id: string) => void;
}

interface UnifiedItem {
  id: string;
  name: string;
  type: 'risk' | 'opportunity';
  category: string;
  probability: number;
  impact: number;
  score: number;
  rating: string;
  owner: string;
  status: string;
  lastReviewed: Date;
}

function unifyItems(risks: RiskItem[], opportunities: OpportunityItem[]): UnifiedItem[] {
  const riskItems: UnifiedItem[] = risks.map(r => ({
    id: r.id,
    name: r.name,
    type: 'risk' as const,
    category: r.category,
    probability: r.probability,
    impact: r.impact,
    score: r.score,
    rating: r.rating,
    owner: r.mitigationOwner,
    status: r.mitigationStatus,
    lastReviewed: r.lastReviewed,
  }));

  const oppItems: UnifiedItem[] = opportunities.map(o => ({
    id: o.id,
    name: o.name,
    type: 'opportunity' as const,
    category: o.category,
    probability: o.probability,
    impact: o.impact,
    score: o.score,
    rating: o.rating,
    owner: o.captureOwner,
    status: o.captureStatus,
    lastReviewed: o.lastReviewed,
  }));

  return [...riskItems, ...oppItems];
}

const ALL_CATEGORIES: (RiskCategory | OpportunityCategory)[] = [
  'tariff', 'energy-market', 'regulatory', 'technology', 'operational', 'financial', 'competitive',
  'hardware-cost', 'revenue-enhancement', 'grid-flexibility', 'policy-tailwind', 'business-model', 'competitive-advantage',
];

export function RegisterTable({ risks, opportunities, onSelectRisk, onSelectOpportunity }: RegisterTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = useMemo(() => unifyItems(risks, opportunities), [risks, opportunities]);

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (viewMode === 'risks') items = items.filter(i => i.type === 'risk');
    if (viewMode === 'opportunities') items = items.filter(i => i.type === 'opportunity');
    if (categoryFilter !== 'all') items = items.filter(i => i.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return items;
  }, [allItems, viewMode, sortField, sortDir, categoryFilter, searchQuery]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function handleItemClick(item: UnifiedItem) {
    if (item.type === 'risk') onSelectRisk?.(item.id);
    else onSelectOpportunity?.(item.id);
  }

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ^' : ' v';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Combined Register</CardTitle>
          <div className="flex gap-2">
            {(['all', 'risks', 'opportunities'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs rounded-[var(--radius-md)] transition-colors ${
                  viewMode === mode
                    ? 'bg-rose text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-rose"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-bg-tertiary border border-border rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-rose"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/-/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-text-tertiary mb-2">{filteredItems.length} items</div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 cursor-pointer" onClick={() => handleSort('name')}>ID</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>Name{sortIndicator('name')}</TableHead>
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="cursor-pointer hidden md:table-cell" onClick={() => handleSort('category')}>Category{sortIndicator('category')}</TableHead>
              <TableHead className="w-12 cursor-pointer text-center" onClick={() => handleSort('probability')}>P{sortIndicator('probability')}</TableHead>
              <TableHead className="w-12 cursor-pointer text-center" onClick={() => handleSort('impact')}>I{sortIndicator('impact')}</TableHead>
              <TableHead className="w-16 cursor-pointer text-center" onClick={() => handleSort('score')}>Score{sortIndicator('score')}</TableHead>
              <TableHead className="w-24">Rating</TableHead>
              <TableHead className="cursor-pointer hidden lg:table-cell" onClick={() => handleSort('owner')}>Owner{sortIndicator('owner')}</TableHead>
              <TableHead className="cursor-pointer hidden lg:table-cell" onClick={() => handleSort('status')}>Status{sortIndicator('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <TableCell className="text-xs text-text-tertiary font-mono">{item.id}</TableCell>
                <TableCell className="font-medium text-sm">{item.name}</TableCell>
                <TableCell>
                  <Badge variant={item.type === 'risk' ? 'danger' : 'info'}>
                    {item.type === 'risk' ? 'Risk' : 'Opp'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-text-secondary capitalize hidden md:table-cell">
                  {item.category.replace(/-/g, ' ')}
                </TableCell>
                <TableCell className="text-center text-sm">{item.probability}</TableCell>
                <TableCell className="text-center text-sm">{item.impact}</TableCell>
                <TableCell className="text-center font-bold text-sm">{item.score}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.type === 'risk'
                        ? getRiskRatingBadgeVariant(item.rating as any)
                        : getOpportunityRatingBadgeVariant(item.rating as any)
                    }
                  >
                    {item.rating}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm hidden lg:table-cell">{item.owner}</TableCell>
                <TableCell className="text-xs text-text-secondary capitalize hidden lg:table-cell">
                  {item.status.replace(/-/g, ' ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
