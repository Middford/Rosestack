'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, SimpleStatCard } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import { getRevenueAttribution } from '../data';
import { BarChart3, TrendingUp, PoundSterling, Target } from 'lucide-react';

function channelColor(channel: string): string {
  switch (channel) {
    case 'referral': return 'bg-rose';
    case 'door-knock': return 'bg-blue-500';
    case 'website': return 'bg-indigo-500';
    case 'club': return 'bg-emerald-500';
    case 'social': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}

function channelBadge(channel: string): 'default' | 'success' | 'warning' | 'info' | 'rose' {
  switch (channel) {
    case 'referral': return 'rose';
    case 'door-knock': return 'info';
    case 'website': return 'default';
    case 'club': return 'success';
    case 'social': return 'warning';
    default: return 'default';
  }
}

export function RevenueAttribution() {
  const attributions = getRevenueAttribution();
  const totalRevenue = attributions.reduce((s, a) => s + a.totalProjectedRevenue, 0);
  const totalLeads = attributions.reduce((s, a) => s + a.totalLeads, 0);
  const totalConverted = attributions.reduce((s, a) => s + a.convertedLeads, 0);
  const maxRevenue = Math.max(...attributions.map(a => a.totalProjectedRevenue));

  const bestChannel = [...attributions].sort((a, b) => b.averageAnnualRevenue - a.averageAnnualRevenue)[0];
  const bestConversion = [...attributions].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Revenue Attribution</h2>
        <p className="text-sm text-text-secondary">Which acquisition channels produce the highest-value homes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard label="Total Pipeline Revenue" value={`£${totalRevenue.toLocaleString()}/yr`} subtitle={`${totalConverted} contracted homes`} trend="up" />
        <SimpleStatCard label="Highest Value Channel" value={bestChannel?.channel ?? 'N/A'} subtitle={bestChannel ? `£${bestChannel.averageAnnualRevenue}/yr avg` : ''} />
        <SimpleStatCard label="Best Conversion" value={bestConversion?.channel ?? 'N/A'} subtitle={bestConversion ? `${bestConversion.conversionRate}% rate` : ''} />
        <SimpleStatCard label="Total Leads" value={totalLeads.toString()} subtitle={`${totalConverted} converted`} />
      </div>

      {/* Revenue by Channel Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Revenue by Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attributions
              .sort((a, b) => b.totalProjectedRevenue - a.totalProjectedRevenue)
              .map(attr => {
                const pct = maxRevenue > 0 ? (attr.totalProjectedRevenue / maxRevenue) * 100 : 0;
                return (
                  <div key={attr.channel} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={channelBadge(attr.channel)}>{attr.channel}</Badge>
                        <span className="text-xs text-text-tertiary">
                          {attr.convertedLeads}/{attr.totalLeads} leads converted
                        </span>
                      </div>
                      <span className="text-sm font-bold text-text-primary">
                        £{attr.totalProjectedRevenue.toLocaleString()}/yr
                      </span>
                    </div>
                    <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', channelColor(attr.channel))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Channel</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Leads</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Converted</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Conv. Rate</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Avg Property Score</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Avg Revenue</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Total Revenue</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">CPA</th>
                </tr>
              </thead>
              <tbody>
                {attributions
                  .sort((a, b) => b.totalProjectedRevenue - a.totalProjectedRevenue)
                  .map(attr => (
                    <tr key={attr.channel} className="border-b border-border hover:bg-bg-hover transition-colors">
                      <td className="py-2 px-3">
                        <Badge variant={channelBadge(attr.channel)}>{attr.channel}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary">{attr.totalLeads}</td>
                      <td className="py-2 px-3 text-right text-text-primary">{attr.convertedLeads}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={cn(
                          'font-medium',
                          attr.conversionRate >= 30 ? 'text-emerald-400' : attr.conversionRate > 0 ? 'text-amber-400' : 'text-text-tertiary',
                        )}>
                          {attr.conversionRate}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary">{attr.averagePropertyScore}</td>
                      <td className="py-2 px-3 text-right text-text-primary">
                        {attr.averageAnnualRevenue > 0 ? `£${attr.averageAnnualRevenue.toLocaleString()}/yr` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-text-primary">
                        {attr.totalProjectedRevenue > 0 ? `£${attr.totalProjectedRevenue.toLocaleString()}/yr` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-text-secondary">
                        {attr.costPerAcquisition > 0 ? `£${attr.costPerAcquisition}` : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
