'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import { PIPELINE_STAGES, type PipelineStage, type CrmLead } from '../types';
import { leads as allLeads } from '../data';
import { Phone, Mail, MapPin, Calendar, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

function stageBadgeVariant(stage: PipelineStage): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'rose' {
  switch (stage) {
    case 'new': return 'info';
    case 'contacted': return 'default';
    case 'qualified': return 'warning';
    case 'proposal-sent': return 'rose';
    case 'contracted': return 'success';
    case 'installation-scheduled': return 'success';
    case 'live': return 'success';
    default: return 'default';
  }
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-text-secondary w-7 text-right">{score}</span>
    </div>
  );
}

function LeadCard({ lead, onMove }: { lead: CrmLead; onMove: (lead: CrmLead, direction: 'forward' | 'back') => void }) {
  const [expanded, setExpanded] = useState(false);
  const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === lead.stage);
  const canMoveForward = stageIndex < PIPELINE_STAGES.length - 1;
  const canMoveBack = stageIndex > 0;

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg-primary p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">{lead.name}</p>
          <p className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {lead.postcode}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-text-primary">{lead.totalScore}</span>
          <p className="text-[10px] text-text-tertiary">score</p>
        </div>
      </div>

      <div className="space-y-1">
        <ScoreBar score={lead.propertyScore} label="Property" />
        <ScoreBar score={lead.engagementScore} label="Engage" />
      </div>

      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <Badge variant={lead.source === 'referral' ? 'rose' : lead.source === 'club' ? 'info' : 'default'}>
          {lead.source}
        </Badge>
        <span>{lead.estimatedSystemSize}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary w-full"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="space-y-1 text-xs text-text-secondary">
            {lead.phone && (
              <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>
            )}
            {lead.email && (
              <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</p>
            )}
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {lead.createdAt.toLocaleDateString('en-GB')}
            </p>
          </div>

          <p className="text-xs text-text-tertiary">
            Est. revenue: <span className="text-text-primary font-medium">£{lead.estimatedAnnualRevenue.toLocaleString()}/yr</span>
          </p>

          {lead.activities.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-text-tertiary uppercase">Recent Activity</p>
              {lead.activities.slice(0, 3).map(a => (
                <p key={a.id} className="text-[11px] text-text-tertiary">
                  {a.timestamp.toLocaleDateString('en-GB')} — {a.description}
                </p>
              ))}
            </div>
          )}

          {lead.followUps.filter(f => !f.completed).length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-warning uppercase">Follow-ups</p>
              {lead.followUps.filter(f => !f.completed).map(f => (
                <p key={f.id} className="text-[11px] text-warning">
                  {f.dueDate.toLocaleDateString('en-GB')} — {f.description}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-1 pt-1">
            {canMoveBack && (
              <Button size="sm" variant="ghost" onClick={() => onMove(lead, 'back')} className="text-xs flex-1">
                Back
              </Button>
            )}
            {canMoveForward && (
              <Button size="sm" variant="primary" onClick={() => onMove(lead, 'forward')} className="text-xs flex-1">
                Advance <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadPipeline() {
  const [leadData, setLeadData] = useState<CrmLead[]>(allLeads);

  const handleMove = (lead: CrmLead, direction: 'forward' | 'back') => {
    const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === lead.stage);
    const newIndex = direction === 'forward' ? stageIndex + 1 : stageIndex - 1;
    if (newIndex < 0 || newIndex >= PIPELINE_STAGES.length) return;

    setLeadData(prev => prev.map(l =>
      l.id === lead.id
        ? { ...l, stage: PIPELINE_STAGES[newIndex].key, updatedAt: new Date() }
        : l
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Lead Pipeline</h2>
          <p className="text-sm text-text-secondary">{leadData.length} total leads across {PIPELINE_STAGES.length} stages</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = leadData.filter(l => l.stage === stage.key);
          return (
            <div key={stage.key} className="flex-shrink-0 w-[280px]">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                <h3 className="text-sm font-medium text-text-primary">{stage.label}</h3>
                <Badge variant={stageBadgeVariant(stage.key)}>{stageLeads.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-[var(--radius-lg)] bg-bg-secondary/50 p-2">
                {stageLeads
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map(lead => (
                    <LeadCard key={lead.id} lead={lead} onMove={handleMove} />
                  ))}
                {stageLeads.length === 0 && (
                  <p className="text-xs text-text-tertiary text-center py-8">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
