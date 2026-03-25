'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import type { RiskItem, OpportunityItem } from '@/shared/types';
import { getRiskRatingBadgeVariant, getOpportunityRatingBadgeVariant, getRiskRatingColour, getOpportunityRatingColour } from '../scoring';
import { generateScoreHistory } from '../data';
import { formatGbp } from '@/shared/utils/scenarios';

interface RiskDetailProps {
  risk: RiskItem;
  onClose: () => void;
}

interface OpportunityDetailProps {
  opportunity: OpportunityItem;
  onClose: () => void;
}

function ScoreHistoryChart({ item }: { item: RiskItem | OpportunityItem }) {
  const history = generateScoreHistory(item);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} />
        <YAxis domain={[0, 25]} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
        />
        <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }} />
        <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Score" />
        <Line type="monotone" dataKey="probability" stroke="#10B981" strokeWidth={1.5} dot={{ r: 2 }} name="Probability" />
        <Line type="monotone" dataKey="impact" stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 2 }} name="Impact" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function FinancialImpactChart({ isRisk, score }: { isRisk: boolean; score: number }) {
  const data = [
    { scenario: 'Low', impact: isRisk ? -score * 300 : score * 200 },
    { scenario: 'Medium', impact: isRisk ? -score * 800 : score * 600 },
    { scenario: 'High', impact: isRisk ? -score * 2000 : score * 1500 },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="scenario" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} />
        <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} tickFormatter={(v) => formatGbp(v)} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
          formatter={(value: number) => [formatGbp(value), 'Impact']}
        />
        <Bar dataKey="impact" fill={isRisk ? '#EF4444' : '#10B981'} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-border last:border-b-0">
      <span className="text-xs font-medium text-text-tertiary w-40 shrink-0">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

export function RiskDetailPanel({ risk, onClose }: RiskDetailProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-text-tertiary font-mono">{risk.id}</span>
              <Badge variant={getRiskRatingBadgeVariant(risk.rating)}>{risk.rating}</Badge>
              <Badge variant="danger">Risk</Badge>
            </div>
            <CardTitle className="text-lg">{risk.name}</CardTitle>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-xl leading-none p-1"
          >
            x
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary">{risk.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Probability</p>
            <p className="text-2xl font-bold text-text-primary">{risk.probability}</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Impact</p>
            <p className="text-2xl font-bold text-text-primary">{risk.impact}</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center" style={{ borderLeft: `3px solid ${getRiskRatingColour(risk.rating)}` }}>
            <p className="text-xs text-text-tertiary">Score</p>
            <p className="text-2xl font-bold text-text-primary">{risk.score}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">Score History</h4>
          <ScoreHistoryChart item={risk} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">Financial Impact Model</h4>
          <FinancialImpactChart isRisk score={risk.score} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">Mitigation Plan</h4>
          <InfoRow label="Strategy" value={risk.mitigationStrategy} />
          <InfoRow label="Owner" value={risk.mitigationOwner} />
          <InfoRow label="Status" value={
            <Badge variant={risk.mitigationStatus === 'implemented' || risk.mitigationStatus === 'tested' ? 'success' : risk.mitigationStatus === 'in-progress' ? 'warning' : 'default'}>
              {risk.mitigationStatus.replace(/-/g, ' ')}
            </Badge>
          } />
          {risk.residualScore !== undefined && (
            <InfoRow label="Residual Score" value={`${risk.residualScore} (from ${risk.score})`} />
          )}
          {risk.triggerThreshold && <InfoRow label="Trigger Threshold" value={risk.triggerThreshold} />}
          {risk.contingencyPlan && <InfoRow label="Contingency (Plan B)" value={risk.contingencyPlan} />}
          <InfoRow label="Last Reviewed" value={risk.lastReviewed.toLocaleDateString('en-GB')} />
        </div>
      </CardContent>
    </Card>
  );
}

export function OpportunityDetailPanel({ opportunity, onClose }: OpportunityDetailProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-text-tertiary font-mono">{opportunity.id}</span>
              <Badge variant={getOpportunityRatingBadgeVariant(opportunity.rating)}>{opportunity.rating}</Badge>
              <Badge variant="info">Opportunity</Badge>
            </div>
            <CardTitle className="text-lg">{opportunity.name}</CardTitle>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-xl leading-none p-1"
          >
            x
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary">{opportunity.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Probability</p>
            <p className="text-2xl font-bold text-text-primary">{opportunity.probability}</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Impact</p>
            <p className="text-2xl font-bold text-text-primary">{opportunity.impact}</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center" style={{ borderLeft: `3px solid ${getOpportunityRatingColour(opportunity.rating)}` }}>
            <p className="text-xs text-text-tertiary">Score</p>
            <p className="text-2xl font-bold text-text-primary">{opportunity.score}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">Score History</h4>
          <ScoreHistoryChart item={opportunity} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">Financial Upside Model</h4>
          <FinancialImpactChart isRisk={false} score={opportunity.score} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">Capture Plan</h4>
          <InfoRow label="Strategy" value={opportunity.captureStrategy} />
          <InfoRow label="Owner" value={opportunity.captureOwner} />
          <InfoRow label="Status" value={
            <Badge variant={opportunity.captureStatus === 'captured' ? 'success' : opportunity.captureStatus === 'in-progress' ? 'warning' : opportunity.captureStatus === 'missed' ? 'danger' : 'default'}>
              {opportunity.captureStatus.replace(/-/g, ' ')}
            </Badge>
          } />
          {opportunity.expectedValue !== undefined && (
            <InfoRow label="Expected Value" value={formatGbp(opportunity.expectedValue) + '/yr'} />
          )}
          {opportunity.triggerThreshold && <InfoRow label="Trigger Threshold" value={opportunity.triggerThreshold} />}
          {opportunity.dependencies && opportunity.dependencies.length > 0 && (
            <InfoRow label="Dependencies" value={
              <ul className="list-disc list-inside space-y-0.5">
                {opportunity.dependencies.map((d, i) => <li key={i} className="text-sm">{d}</li>)}
              </ul>
            } />
          )}
          {opportunity.investmentRequired && <InfoRow label="Investment Required" value={opportunity.investmentRequired} />}
          <InfoRow label="Last Reviewed" value={opportunity.lastReviewed.toLocaleDateString('en-GB')} />
        </div>
      </CardContent>
    </Card>
  );
}
