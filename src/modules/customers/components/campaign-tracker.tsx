'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, SimpleStatCard } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import { campaigns } from '../data';
import { MapPin, DoorOpen, Target, TrendingUp, PoundSterling } from 'lucide-react';

function campaignTypeBadge(type: string): { variant: 'default' | 'success' | 'warning' | 'info' | 'rose'; label: string } {
  switch (type) {
    case 'door-knock': return { variant: 'info', label: 'Door Knock' };
    case 'leaflet': return { variant: 'default', label: 'Leaflet' };
    case 'social': return { variant: 'rose', label: 'Social' };
    case 'club-event': return { variant: 'success', label: 'Club Event' };
    case 'email': return { variant: 'warning', label: 'Email' };
    default: return { variant: 'default', label: type };
  }
}

export function CampaignTracker() {
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
  const totalDoors = campaigns.reduce((s, c) => s + (c.doorsKnocked || 0), 0);
  const overallConversionRate = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;
  const costPerLead = totalLeads > 0 ? Math.round(totalCost / totalLeads) : 0;

  // Conversion by area
  const areaStats = new Map<string, { leads: number; conversions: number; cost: number }>();
  for (const c of campaigns) {
    const existing = areaStats.get(c.postcode) || { leads: 0, conversions: 0, cost: 0 };
    existing.leads += c.leadsGenerated;
    existing.conversions += c.conversions;
    existing.cost += c.cost;
    areaStats.set(c.postcode, existing);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Campaign Tracker</h2>
        <p className="text-sm text-text-secondary">Door-knock routes, areas covered, and conversion by area</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SimpleStatCard label="Campaigns" value={campaigns.length.toString()} />
        <SimpleStatCard label="Doors Knocked" value={totalDoors.toLocaleString()} />
        <SimpleStatCard label="Leads Generated" value={totalLeads.toString()} subtitle={`${overallConversionRate}% conversion`} trend="up" />
        <SimpleStatCard label="Total Cost" value={`£${totalCost.toLocaleString()}`} subtitle={`£${costPerLead}/lead`} />
        <SimpleStatCard label="Conversions" value={totalConversions.toString()} subtitle={`from ${totalLeads} leads`} trend="up" />
      </div>

      {/* Conversion by Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Conversion by Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(areaStats.entries())
              .sort((a, b) => b[1].conversions - a[1].conversions)
              .map(([postcode, stats]) => {
                const convRate = stats.leads > 0 ? Math.round((stats.conversions / stats.leads) * 100) : 0;
                return (
                  <div key={postcode} className="flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-bg-primary p-3">
                    <div className="flex h-10 w-16 items-center justify-center rounded-[var(--radius-sm)] bg-bg-tertiary">
                      <span className="text-sm font-bold text-text-primary">{postcode}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text-secondary">{stats.leads} leads, {stats.conversions} converted</span>
                        <span className={cn(
                          'text-sm font-medium',
                          convRate >= 25 ? 'text-emerald-400' : convRate > 0 ? 'text-amber-400' : 'text-text-tertiary',
                        )}>
                          {convRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            convRate >= 25 ? 'bg-emerald-500' : convRate > 0 ? 'bg-amber-500' : 'bg-bg-hover',
                          )}
                          style={{ width: `${Math.max(convRate, 2)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-text-tertiary">£{stats.cost}</span>
                      <p className="text-[10px] text-text-tertiary">spend</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* All Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Campaign</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Area</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Doors</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Leads</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Conversions</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Cost</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const badge = campaignTypeBadge(c.type);
                  return (
                    <tr key={c.id} className="border-b border-border hover:bg-bg-hover transition-colors">
                      <td className="py-2 px-3">
                        <p className="text-text-primary font-medium">{c.name}</p>
                        {c.notes && <p className="text-xs text-text-tertiary mt-0.5">{c.notes}</p>}
                      </td>
                      <td className="py-2 px-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                      <td className="py-2 px-3 text-text-secondary">{c.area}</td>
                      <td className="py-2 px-3 text-right text-text-primary">{c.doorsKnocked ?? '-'}</td>
                      <td className="py-2 px-3 text-right text-text-primary">{c.leadsGenerated}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={cn(
                          'font-medium',
                          c.conversions > 0 ? 'text-emerald-400' : 'text-text-tertiary',
                        )}>
                          {c.conversions}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary">£{c.cost}</td>
                      <td className="py-2 px-3 text-text-secondary">{c.startDate.toLocaleDateString('en-GB')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
