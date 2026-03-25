'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { getAllCompetitors, getTotalCompetitorPortfolio } from '../service';
import type { CompetitorThreat } from '../types';

const threatVariant: Record<CompetitorThreat, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export function CompetitorMap() {
  const competitors = getAllCompetitors();
  const totalPortfolio = getTotalCompetitorPortfolio();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Competitor Landscape</CardTitle>
          <p className="text-sm text-text-secondary">
            Known battery deployers — estimated combined portfolio: {totalPortfolio.toLocaleString()} homes
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Est. Portfolio</TableHead>
                <TableHead>Threat</TableHead>
                <TableHead>Strengths</TableHead>
                <TableHead>Weaknesses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map(comp => (
                <TableRow key={comp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{comp.name}</p>
                      <p className="text-xs text-text-tertiary mt-0.5 max-w-xs">{comp.description.slice(0, 100)}...</p>
                    </div>
                  </TableCell>
                  <TableCell>{comp.region}</TableCell>
                  <TableCell className="text-right font-mono">
                    {comp.estimatedPortfolioSize.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={threatVariant[comp.threat]}>{comp.threat}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {comp.strengths.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {comp.weaknesses.slice(0, 2).map((w, i) => (
                        <span key={i} className="text-xs bg-bg-tertiary text-text-tertiary px-1.5 py-0.5 rounded">
                          {w}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Threat Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as CompetitorThreat[]).map(threat => {
          const count = competitors.filter(c => c.threat === threat).length;
          const portfolio = competitors
            .filter(c => c.threat === threat)
            .reduce((sum, c) => sum + c.estimatedPortfolioSize, 0);
          return (
            <Card key={threat} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={threatVariant[threat]}>{threat}</Badge>
                <span className="text-lg font-bold text-text-primary">{count}</span>
              </div>
              <p className="text-xs text-text-tertiary">
                {portfolio.toLocaleString()} est. homes
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
