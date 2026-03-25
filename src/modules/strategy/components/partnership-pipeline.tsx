'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import { getPartnershipsByStageGrouped, getTotalPotentialHomes } from '../service';
import type { PartnershipStage, PartnershipType } from '../types';

const stageLabels: Record<PartnershipStage, string> = {
  identified: 'Identified',
  outreach: 'Outreach',
  negotiation: 'Negotiation',
  agreed: 'Agreed',
  active: 'Active',
};

const stageColors: Record<PartnershipStage, string> = {
  identified: 'bg-bg-tertiary border-border',
  outreach: 'bg-info-subtle border-info/30',
  negotiation: 'bg-warning-subtle border-warning/30',
  agreed: 'bg-success-subtle border-success/30',
  active: 'bg-rose-subtle border-rose/30',
};

const typeVariant: Record<PartnershipType, 'info' | 'success' | 'warning' | 'rose' | 'danger' | 'default'> = {
  dno: 'danger',
  'sports-club': 'success',
  'housing-developer': 'warning',
  'solar-installer': 'info',
  'ev-installer': 'info',
  'social-housing': 'rose',
  other: 'default',
};

const typeLabel: Record<PartnershipType, string> = {
  dno: 'DNO',
  'sports-club': 'Sports Club',
  'housing-developer': 'Developer',
  'solar-installer': 'Solar Installer',
  'ev-installer': 'EV Installer',
  'social-housing': 'Social Housing',
  other: 'Other',
};

export function PartnershipPipeline() {
  const grouped = getPartnershipsByStageGrouped();
  const totalHomes = getTotalPotentialHomes();
  const stages: PartnershipStage[] = ['identified', 'outreach', 'negotiation', 'agreed', 'active'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Partnership Pipeline</CardTitle>
          <p className="text-sm text-text-secondary">
            Tracking {Object.values(grouped).flat().length} partnerships — {totalHomes.toLocaleString()} potential homes
          </p>
        </CardHeader>
        <CardContent>
          {/* Kanban board */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stages.map(stage => (
              <div key={stage} className="space-y-2">
                {/* Column header */}
                <div className={`rounded-[var(--radius-md)] border px-3 py-2 ${stageColors[stage]}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{stageLabels[stage]}</span>
                    <span className="text-xs text-text-tertiary">{grouped[stage].length}</span>
                  </div>
                </div>

                {/* Cards */}
                {grouped[stage].map(p => (
                  <div
                    key={p.id}
                    className="rounded-[var(--radius-md)] border border-border bg-bg-secondary p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary leading-tight">{p.name}</p>
                    </div>
                    <Badge variant={typeVariant[p.type]}>{typeLabel[p.type]}</Badge>
                    <p className="text-xs text-text-tertiary line-clamp-2">{p.description}</p>
                    {p.potentialHomes && (
                      <p className="text-xs text-text-secondary">
                        ~{p.potentialHomes} potential homes
                      </p>
                    )}
                    {p.notes && (
                      <p className="text-xs text-text-tertiary italic border-t border-border pt-1.5 mt-1.5">
                        {p.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-text-tertiary">
                      Updated: {p.lastUpdated.toLocaleDateString('en-GB')}
                    </p>
                  </div>
                ))}

                {grouped[stage].length === 0 && (
                  <div className="rounded-[var(--radius-md)] border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-text-tertiary">No partnerships</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
