'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import {
  PIPELINE_STAGE_DEFINITIONS,
  STATUS_LABELS,
} from '../data';
import type { Lead, PipelineStatus, PipelineStageNumber } from '../types';
import { stageNumber } from '../types';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

// ── Stage colour helpers ───────────────────────────────────────────────────────

const STAGE_BADGE_COLOUR: Record<PipelineStageNumber, string> = {
  0: 'bg-slate-500/20 text-slate-300 border-slate-600',
  1: 'bg-blue-500/20 text-blue-300 border-blue-600',
  2: 'bg-amber-500/20 text-amber-300 border-amber-600',
  3: 'bg-rose-500/20 text-rose-300 border-rose-600',
  4: 'bg-purple-500/20 text-purple-300 border-purple-600',
  5: 'bg-emerald-500/20 text-emerald-300 border-emerald-600',
};

const STAGE_HEADER_COLOUR: Record<PipelineStageNumber, string> = {
  0: 'border-slate-600',
  1: 'border-blue-600',
  2: 'border-amber-600',
  3: 'border-rose-600',
  4: 'border-purple-600',
  5: 'border-emerald-600',
};

const STAGE_DOT_COLOUR: Record<PipelineStageNumber, string> = {
  0: 'bg-slate-400',
  1: 'bg-blue-400',
  2: 'bg-amber-400',
  3: 'bg-rose-400',
  4: 'bg-purple-400',
  5: 'bg-emerald-400',
};

// ── Ordered statuses — determines move-forward/back direction ─────────────────

const STATUS_ORDER: PipelineStatus[] = [
  'new_lead',
  'initial_contact',
  'interested',
  'property_assessed',
  'visit_scheduled',
  'visit_complete',
  'proposal_prepared',
  'proposal_sent',
  'proposal_reviewing',
  'verbal_agreement',
  'contract_sent',
  'contracted',
  'g99_submitted',
  'g99_approved',
  'installation_scheduled',
  'installed',
  'commissioned',
  'live',
];

// ── G99 probability badge ──────────────────────────────────────────────────────

function G99Badge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const isHigh = pct >= 75;
  const isMid = pct >= 50;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border',
        isHigh
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-600'
          : isMid
          ? 'bg-amber-500/15 text-amber-300 border-amber-600'
          : 'bg-red-500/15 text-red-300 border-red-600',
      )}
      title="G99 approval probability"
    >
      {isHigh ? (
        <ShieldCheck className="h-2.5 w-2.5" />
      ) : (
        <ShieldAlert className="h-2.5 w-2.5" />
      )}
      G99 {pct}%
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-text-secondary w-7 text-right">{score}</span>
    </div>
  );
}

// ── Days in status badge ──────────────────────────────────────────────────────

function DaysBadge({ days }: { days: number }) {
  const isStale = days >= 14;
  const isWarning = days >= 7;
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 text-[10px]',
        isStale ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-text-tertiary',
      )}
      title={`${days} days in current status`}
    >
      {isStale && <AlertTriangle className="h-2.5 w-2.5" />}
      <Clock className="h-2.5 w-2.5" />
      {days}d
    </div>
  );
}

// ── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  stageNum,
  onMove,
}: {
  lead: Lead;
  stageNum: PipelineStageNumber;
  onMove: (lead: Lead, direction: 'forward' | 'back') => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasProject = lead.hasProject ?? true;
  const statusIdx = STATUS_ORDER.indexOf(lead.status);
  const canMoveForward = statusIdx < STATUS_ORDER.length - 1;
  const canMoveBack = statusIdx > 0;
  const nextStatus = canMoveForward ? STATUS_ORDER[statusIdx + 1] : null;
  const isPromoteAction = nextStatus === 'proposal_prepared' && !hasProject;

  const badgeCls = STAGE_BADGE_COLOUR[stageNum];

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg-primary p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{lead.name}</p>
          <p className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.address.split(',').pop()?.trim() ?? lead.postcode}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-bold text-text-primary">{lead.totalScore}</span>
          <p className="text-[10px] text-text-tertiary">score</p>
        </div>
      </div>

      {/* Status badge + days */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded border',
            badgeCls,
          )}
        >
          {STATUS_LABELS[lead.status]}
        </span>
        <DaysBadge days={lead.daysInCurrentStatus} />
      </div>

      {/* Score bars */}
      <div className="space-y-1">
        <ScoreBar score={lead.propertyScore} label="Property" />
        <ScoreBar score={lead.engagementScore} label="Engage" />
      </div>

      {/* Source + system + G99 */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <Badge
          variant={
            lead.source === 'referral'
              ? 'rose'
              : lead.source === 'club'
              ? 'info'
              : 'default'
          }
        >
          {lead.source}
        </Badge>
        {hasProject ? (
          <span>{lead.estimatedSystemSize}</span>
        ) : (
          <span className="text-text-tertiary italic">Lead only</span>
        )}
      </div>

      {/* G99 badge — shown for Stage 3+ when assessment available */}
      {stageNum >= 3 && lead.g99Assessment && (
        <G99Badge probability={lead.g99Assessment.probability} />
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary w-full"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {expanded ? 'Less' : 'Details'}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-border">
          {/* Contact details */}
          <div className="space-y-1 text-xs text-text-secondary">
            {lead.phone && (
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </p>
            )}
            {lead.email && (
              <p className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {lead.email}
              </p>
            )}
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {lead.createdAt.toLocaleDateString('en-GB')}
            </p>
          </div>

          {/* Revenue — only show if project exists */}
          {hasProject && lead.estimatedAnnualRevenue > 0 && (
            <p className="text-xs text-text-tertiary">
              Est. revenue:{' '}
              <span className="text-text-primary font-medium">
                £{lead.estimatedAnnualRevenue.toLocaleString()}/yr
              </span>
            </p>
          )}

          {/* G99 detail — shown when assessment present */}
          {lead.g99Assessment && (
            <div className="rounded border border-border p-2 space-y-1">
              <p className="text-[10px] font-medium text-text-tertiary uppercase">
                G99 Assessment
              </p>
              <p className="text-[11px] text-text-secondary">
                Wait:{' '}
                <span className="text-text-primary">
                  {lead.g99Assessment.expectedWeeks.typical} wks typical
                </span>{' '}
                ({lead.g99Assessment.expectedWeeks.min}–
                {lead.g99Assessment.expectedWeeks.max} wks range)
              </p>
              <p className="text-[11px] text-text-secondary">
                Export limit risk:{' '}
                <span
                  className={cn(
                    'font-medium',
                    lead.g99Assessment.exportLimitRisk === 'none'
                      ? 'text-emerald-400'
                      : lead.g99Assessment.exportLimitRisk === 'low'
                      ? 'text-blue-400'
                      : lead.g99Assessment.exportLimitRisk === 'medium'
                      ? 'text-amber-400'
                      : 'text-red-400',
                  )}
                >
                  {lead.g99Assessment.exportLimitRisk}
                </span>
              </p>
              {lead.g99Assessment.factors.slice(0, 2).map((f, i) => (
                <p key={i} className="text-[10px] text-text-tertiary">
                  • {f}
                </p>
              ))}
            </div>
          )}

          {/* Recent activity */}
          {lead.activities.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-text-tertiary uppercase">
                Recent Activity
              </p>
              {lead.activities.slice(0, 3).map(a => (
                <p key={a.id} className="text-[11px] text-text-tertiary">
                  {a.timestamp.toLocaleDateString('en-GB')} — {a.description}
                </p>
              ))}
            </div>
          )}

          {/* Follow-ups */}
          {lead.followUps.filter(f => !f.completed).length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-warning uppercase">
                Follow-ups
              </p>
              {lead.followUps
                .filter(f => !f.completed)
                .map(f => (
                  <p key={f.id} className="text-[11px] text-warning">
                    {f.dueDate.toLocaleDateString('en-GB')} — {f.description}
                  </p>
                ))}
            </div>
          )}

          {/* Advance / back */}
          <div className="flex gap-1 pt-1">
            {canMoveBack && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove(lead, 'back')}
                className="text-xs flex-1"
              >
                Back
              </Button>
            )}
            {canMoveForward && (
              <Button
                size="sm"
                variant={isPromoteAction ? 'success' : 'primary'}
                onClick={() => onMove(lead, 'forward')}
                className="text-xs flex-1"
              >
                {isPromoteAction ? 'Create Project' : 'Advance'} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stage column ──────────────────────────────────────────────────────────────

function StageColumn({
  stageNum,
  stageLeads,
  onMove,
}: {
  stageNum: PipelineStageNumber;
  stageLeads: Lead[];
  onMove: (lead: Lead, direction: 'forward' | 'back') => void;
}) {
  const def = PIPELINE_STAGE_DEFINITIONS[stageNum];
  const totalRevenue = stageLeads.reduce((s, l) => s + l.estimatedAnnualRevenue, 0);

  return (
    <div className="flex-shrink-0 w-[265px]">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between mb-2 pb-2 border-b-2',
          STAGE_HEADER_COLOUR[stageNum],
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', STAGE_DOT_COLOUR[stageNum])} />
          <div>
            <h3 className="text-sm font-semibold text-text-primary leading-none">
              Stage {stageNum} — {def.name}
            </h3>
            <p className="text-[10px] text-text-tertiary mt-0.5">{def.description}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <span
            className={cn(
              'text-xs font-bold px-1.5 py-0.5 rounded',
              STAGE_BADGE_COLOUR[stageNum],
            )}
          >
            {stageLeads.length}
          </span>
        </div>
      </div>

      {/* Revenue indicator */}
      {totalRevenue > 0 && (
        <div className="flex items-center gap-1 mb-2 text-[11px] text-text-tertiary">
          <TrendingUp className="h-3 w-3" />
          <span>£{totalRevenue.toLocaleString()}/yr pipeline</span>
        </div>
      )}

      {/* Lead cards */}
      <div className="space-y-2 min-h-[200px] rounded-[var(--radius-lg)] bg-bg-secondary/40 p-2">
        {stageLeads
          .sort((a, b) => b.totalScore - a.totalScore)
          .map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stageNum={stageNum}
              onMove={onMove}
            />
          ))}
        {stageLeads.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-8">No leads</p>
        )}
      </div>
    </div>
  );
}

// ── Pipeline header stats ─────────────────────────────────────────────────────

function PipelineHeader({ leads }: { leads: Lead[] }) {
  const contractedStatuses: PipelineStatus[] = [
    'contracted',
    'g99_submitted',
    'g99_approved',
    'installation_scheduled',
    'installed',
    'commissioned',
    'live',
  ];

  const contractedLeads = leads.filter(l => contractedStatuses.includes(l.status));
  const liveLeads = leads.filter(l => l.status === 'live' || l.status === 'commissioned');
  const totalContractedRevenue = contractedLeads.reduce(
    (s, l) => s + l.estimatedAnnualRevenue,
    0,
  );

  const staleLeads = leads.filter(
    l => l.daysInCurrentStatus >= 14 && !['live', 'on_hold', 'lost'].includes(l.status),
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="rounded-[var(--radius-md)] bg-bg-secondary border border-border p-3">
        <p className="text-[11px] text-text-tertiary uppercase font-medium">Total Leads</p>
        <p className="text-xl font-bold text-text-primary mt-1">{leads.length}</p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-bg-secondary border border-border p-3">
        <p className="text-[11px] text-text-tertiary uppercase font-medium">Contracted</p>
        <p className="text-xl font-bold text-rose-400 mt-1">{contractedLeads.length}</p>
        <p className="text-[10px] text-text-tertiary">
          £{totalContractedRevenue.toLocaleString()}/yr
        </p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-bg-secondary border border-border p-3">
        <p className="text-[11px] text-text-tertiary uppercase font-medium">Live Systems</p>
        <p className="text-xl font-bold text-emerald-400 mt-1">{liveLeads.length}</p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-bg-secondary border border-border p-3">
        <p className="text-[11px] text-text-tertiary uppercase font-medium">Stale ({'>'}14d)</p>
        <p
          className={cn(
            'text-xl font-bold mt-1',
            staleLeads.length > 0 ? 'text-amber-400' : 'text-text-primary',
          )}
        >
          {staleLeads.length}
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LeadPipeline() {
  const [leadData, setLeadData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pipeline')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        // Map API dates to Date objects
        const mapped = (Array.isArray(data) ? data : []).map((l: Record<string, unknown>) => ({
          ...l,
          createdAt: new Date(l.createdAt as string),
          updatedAt: new Date(l.updatedAt as string),
        })) as Lead[];
        setLeadData(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMove = async (lead: Lead, direction: 'forward' | 'back') => {
    const idx = STATUS_ORDER.indexOf(lead.status);
    const newIdx = direction === 'forward' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[newIdx];

    // If advancing to proposal_prepared and no project exists, promote the lead
    const isPromote = newStatus === 'proposal_prepared' && !lead.hasProject;

    try {
      if (isPromote) {
        const res = await fetch(`/api/leads/${lead.id}/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to create project: ${err.error || 'Unknown error'}`);
          return;
        }
        // Refresh pipeline data after promotion
        const pipelineRes = await fetch('/api/pipeline');
        if (pipelineRes.ok) {
          const data = await pipelineRes.json();
          const mapped = (Array.isArray(data) ? data : []).map((l: Record<string, unknown>) => ({
            ...l,
            createdAt: new Date(l.createdAt as string),
            updatedAt: new Date(l.updatedAt as string),
          })) as Lead[];
          setLeadData(mapped);
        }
      } else {
        const res = await fetch(`/api/leads/${lead.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to update status: ${err.error || 'Unknown error'}`);
          return;
        }
        setLeadData(prev =>
          prev.map(l =>
            l.id === lead.id
              ? { ...l, status: newStatus, daysInCurrentStatus: 0, updatedAt: new Date() }
              : l,
          ),
        );
      }
    } catch {
      alert('Network error — status not saved');
    }
  };

  const activeLeads = leadData.filter(
    l => l.status !== 'on_hold' && l.status !== 'lost',
  );

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Lead Pipeline</h2>
          <p className="text-sm text-text-secondary">
            {activeLeads.length} active leads across 6 stages — 16 granular statuses
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <PipelineHeader leads={activeLeads} />

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGE_DEFINITIONS.map(def => {
          const stageLeads = activeLeads.filter(l =>
            (def.statuses as readonly PipelineStatus[]).includes(l.status),
          );
          return (
            <StageColumn
              key={def.number}
              stageNum={def.number}
              stageLeads={stageLeads}
              onMove={handleMove}
            />
          );
        })}
      </div>
    </div>
  );
}
