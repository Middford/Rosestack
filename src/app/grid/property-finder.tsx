'use client';

import { useState, useMemo } from 'react';
import { getPropertiesByPostcode } from '@/modules/grid/property-data';
import { scoreAndRankProperties, getScoreGrade } from '@/modules/grid/scoring';
import { substations, flexibilityTenders } from '@/modules/grid/substation-data';
import { Badge, Button } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { Search } from 'lucide-react';

export function PropertyFinder() {
  const [searchQuery, setSearchQuery] = useState('BB5');
  const [activeSearch, setActiveSearch] = useState('BB5');

  const results = useMemo(() => {
    const props = getPropertiesByPostcode(activeSearch);
    return scoreAndRankProperties(props);
  }, [activeSearch]);

  const handleSearch = () => {
    setActiveSearch(searchQuery.trim());
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by postcode (e.g. BB5, BB7 1)"
            className="w-full h-10 pl-10 pr-4 rounded-[var(--radius-md)] border border-border bg-bg-tertiary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:border-rose"
          />
        </div>
        <Button onClick={handleSearch} size="md">Search</Button>
      </div>

      {/* Results summary */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>{results.length} properties found</span>
        {results.length > 0 && (
          <>
            <span>Avg score: {Math.round(results.reduce((s, r) => s + r.totalScore, 0) / results.length)}/100</span>
            <span>Excellent: {results.filter(r => r.totalScore >= 75).length}</span>
          </>
        )}
      </div>

      {/* Results table */}
      {results.length > 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Postcode</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>EPC</TableHead>
                <TableHead>3-Phase</TableHead>
                <TableHead>Nearest Substation</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Est. Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(scored => {
                const grade = getScoreGrade(scored.totalScore);
                const sub = substations.find(s => s.id === scored.property.nearestSubstationId);
                return (
                  <TableRow key={scored.property.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{scored.property.address}</p>
                        <p className="text-xs text-text-tertiary">
                          {scored.property.bedrooms} bed {scored.property.propertyType} ({scored.property.builtYear})
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{scored.property.postcode}</TableCell>
                    <TableCell className="capitalize">{scored.property.propertyType}</TableCell>
                    <TableCell>
                      <Badge variant={
                        scored.property.epcRating <= 'B' ? 'success'
                        : scored.property.epcRating === 'C' ? 'info'
                        : scored.property.epcRating === 'D' ? 'warning'
                        : 'danger'
                      }>
                        {scored.property.epcRating}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${scored.property.threePhaseScore}%`,
                              backgroundColor: scored.property.threePhaseConfirmed ? '#10B981'
                                : scored.property.threePhaseScore >= 60 ? '#3B82F6'
                                : '#6B7280',
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary">
                          {scored.property.threePhaseConfirmed ? 'Confirmed' : `${scored.property.threePhaseScore}%`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs">{sub?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-text-tertiary">{scored.property.distanceToSubstationKm} km</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={grade.color}>{scored.totalScore} — {grade.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      £{scored.estimatedRevenueRange.low}-£{scored.estimatedRevenueRange.high}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-8 text-center">
          <p className="text-text-tertiary">No properties found for &ldquo;{activeSearch}&rdquo;. Try a BB postcode prefix.</p>
        </div>
      )}
    </div>
  );
}
