'use client';

import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, SimpleStatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import { investors, getTotalPipelineValue, type Investor, type InvestorStage } from '../data';
import { formatGbp } from '@/shared/utils/scenarios';

const stageOrder: InvestorStage[] = [
  'identified',
  'contacted',
  'nda-signed',
  'data-room-access',
  'term-sheet',
  'committed',
  'declined',
];

const stageLabels: Record<InvestorStage, string> = {
  'identified': 'Identified',
  'contacted': 'Contacted',
  'nda-signed': 'NDA Signed',
  'data-room-access': 'Data Room',
  'term-sheet': 'Term Sheet',
  'committed': 'Committed',
  'declined': 'Declined',
};

const stageVariant: Record<InvestorStage, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'rose'> = {
  'identified': 'default',
  'contacted': 'info',
  'nda-signed': 'warning',
  'data-room-access': 'warning',
  'term-sheet': 'rose',
  'committed': 'success',
  'declined': 'danger',
};

export function InvestorPipeline() {
  const pipeline = getTotalPipelineValue();
  const activeInvestors = investors.filter(i => i.stage !== 'declined');
  const upcomingActions = investors
    .filter(i => i.nextActionDate && i.stage !== 'declined')
    .sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SimpleStatCard
          label="Active Investors"
          value={String(activeInvestors.length)}
          subtitle="In pipeline"
        />
        <SimpleStatCard
          label="Interested Amount"
          value={formatGbp(pipeline.interested)}
          subtitle="Expressed interest"
        />
        <SimpleStatCard
          label="Committed"
          value={formatGbp(pipeline.committed)}
          subtitle="Term sheets signed"
        />
        <SimpleStatCard
          label="Conversion Rate"
          value={`${activeInvestors.length > 0 ? Math.round((investors.filter(i => i.stage === 'committed').length / activeInvestors.length) * 100) : 0}%`}
          subtitle="To committed"
        />
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stageOrder.filter(s => s !== 'declined').map(stage => {
              const count = investors.filter(i => i.stage === stage).length;
              const width = Math.max(20, count * 25);
              return (
                <div
                  key={stage}
                  className="flex-1 min-w-[80px] bg-bg-primary rounded-[var(--radius-md)] p-3 text-center"
                >
                  <p className="text-2xl font-bold text-text-primary">{count}</p>
                  <p className="text-xs text-text-tertiary">{stageLabels[stage]}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Investor Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Investors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="hidden lg:table-cell">Range</TableHead>
                <TableHead className="hidden md:table-cell">Interested</TableHead>
                <TableHead className="hidden lg:table-cell">Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map(inv => (
                <InvestorRow key={inv.id} investor={inv} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming Actions */}
      {upcomingActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingActions.map(inv => (
              <div
                key={inv.id}
                className="flex items-start gap-3 p-3 bg-bg-primary rounded-[var(--radius-md)]"
              >
                <Badge variant={stageVariant[inv.stage]}>{stageLabels[inv.stage]}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{inv.name}</p>
                  <p className="text-xs text-text-secondary">{inv.nextAction}</p>
                </div>
                <p className="text-xs text-text-tertiary whitespace-nowrap">{inv.nextActionDate}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvestorRow({ investor }: { investor: Investor }) {
  return (
    <TableRow>
      <TableCell>
        <p className="text-sm font-medium">{investor.name}</p>
        <p className="text-xs text-text-tertiary">{investor.contactName}</p>
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm">{investor.type}</TableCell>
      <TableCell>
        <Badge variant={stageVariant[investor.stage]}>{stageLabels[investor.stage]}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm">{investor.investmentRange}</TableCell>
      <TableCell className="hidden md:table-cell text-sm">
        {investor.interestedAmount ? formatGbp(investor.interestedAmount) : '-'}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <p className="text-xs text-text-secondary">{investor.nextAction}</p>
        <p className="text-xs text-text-tertiary">{investor.nextActionDate}</p>
      </TableCell>
    </TableRow>
  );
}
