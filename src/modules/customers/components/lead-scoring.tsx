'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import { leads } from '../data';
import { PIPELINE_STAGES } from '../types';
import { TrendingUp, Home, Users, Link2 } from 'lucide-react';

function ScoreBreakdownBar({ label, score, maxScore, icon: Icon }: {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = Math.round((score / maxScore) * 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-text-tertiary shrink-0" />
      <span className="text-sm text-text-secondary w-32">{label}</span>
      <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-text-primary w-12 text-right">{score}/{maxScore}</span>
    </div>
  );
}

function sourceQualityScore(source: string): number {
  switch (source) {
    case 'referral': return 90;
    case 'club': return 75;
    case 'door-knock': return 60;
    case 'website': return 50;
    case 'social': return 35;
    default: return 25;
  }
}

function sourceQualityLabel(score: number): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' } {
  if (score >= 80) return { label: 'Excellent', variant: 'success' };
  if (score >= 60) return { label: 'Good', variant: 'info' };
  if (score >= 40) return { label: 'Average', variant: 'warning' };
  return { label: 'Low', variant: 'danger' };
}

export function LeadScoring() {
  const sortedLeads = [...leads].sort((a, b) => b.totalScore - a.totalScore);

  const avgPropertyScore = Math.round(leads.reduce((s, l) => s + l.propertyScore, 0) / leads.length);
  const avgEngagement = Math.round(leads.reduce((s, l) => s + l.engagementScore, 0) / leads.length);
  const avgTotal = Math.round(leads.reduce((s, l) => s + l.totalScore, 0) / leads.length);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Lead Scoring</h2>
        <p className="text-sm text-text-secondary">Property score (60%) + Engagement score (40%) + Source quality</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-text-tertiary" />
            <p className="text-sm text-text-secondary">Avg Property Score</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{avgPropertyScore}</p>
          <p className="text-xs text-text-tertiary mt-1">Based on grid scoring algorithm</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-text-tertiary" />
            <p className="text-sm text-text-secondary">Avg Engagement Score</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{avgEngagement}</p>
          <p className="text-xs text-text-tertiary mt-1">Activity, responsiveness, interest level</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-text-tertiary" />
            <p className="text-sm text-text-secondary">Avg Total Score</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{avgTotal}</p>
          <p className="text-xs text-text-tertiary mt-1">Combined weighted score</p>
        </Card>
      </div>

      {/* Scoring Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads — Ranked by Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">#</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Stage</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Property</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Engagement</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Source</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Source Quality</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Total</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead, i) => {
                  const srcScore = sourceQualityScore(lead.source);
                  const srcQuality = sourceQualityLabel(srcScore);
                  const stageInfo = PIPELINE_STAGES.find(s => s.key === lead.stage);
                  const totalColor = lead.totalScore >= 75 ? 'text-emerald-400' : lead.totalScore >= 50 ? 'text-amber-400' : 'text-red-400';

                  return (
                    <tr key={lead.id} className="border-b border-border hover:bg-bg-hover transition-colors">
                      <td className="py-2 px-3 text-text-tertiary">{i + 1}</td>
                      <td className="py-2 px-3">
                        <p className="text-text-primary font-medium">{lead.name}</p>
                        <p className="text-xs text-text-tertiary">{lead.postcode}</p>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className={cn('w-1.5 h-1.5 rounded-full', stageInfo?.color)} />
                          <span className="text-text-secondary">{stageInfo?.label}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-text-primary">{lead.propertyScore}</td>
                      <td className="py-2 px-3 text-right font-mono text-text-primary">{lead.engagementScore}</td>
                      <td className="py-2 px-3">
                        <Badge variant={lead.source === 'referral' ? 'rose' : lead.source === 'club' ? 'info' : 'default'}>
                          {lead.source}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant={srcQuality.variant}>{srcQuality.label}</Badge>
                      </td>
                      <td className={cn('py-2 px-3 text-right font-mono font-bold', totalColor)}>
                        {lead.totalScore}
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary">
                        £{lead.estimatedAnnualRevenue.toLocaleString()}/yr
                      </td>
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
