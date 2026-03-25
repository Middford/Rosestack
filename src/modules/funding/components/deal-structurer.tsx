'use client';

import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button,
} from '@/shared/ui';
import { dealStructures, recommendDealStructure, type DealStructure, type DealRecommendation } from '../data';

export function DealStructurer() {
  const [fundingAmount, setFundingAmount] = useState(250000);
  const [stage, setStage] = useState<'pre-revenue' | 'early-revenue' | 'growth' | 'scale'>('pre-revenue');
  const [hasPG, setHasPG] = useState(true);
  const [seisEligible, setSeisEligible] = useState(true);
  const [recommendation, setRecommendation] = useState<DealRecommendation | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleRecommend = () => {
    const rec = recommendDealStructure(fundingAmount, stage, hasPG, seisEligible);
    setRecommendation(rec);
  };

  return (
    <div className="space-y-6">
      {/* Input Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Structure Advisor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Funding Required</label>
              <input
                type="number"
                value={fundingAmount}
                onChange={e => setFundingAmount(Number(e.target.value))}
                className="w-full h-10 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
                step={10000}
                min={10000}
              />
              <p className="text-xs text-text-tertiary mt-1">
                £{(fundingAmount / 1000).toFixed(0)}k
              </p>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Business Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as typeof stage)}
                className="w-full h-10 rounded-[var(--radius-md)] border border-border bg-bg-primary px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-rose"
              >
                <option value="pre-revenue">Pre-Revenue</option>
                <option value="early-revenue">Early Revenue (1-10 homes)</option>
                <option value="growth">Growth (10-50 homes)</option>
                <option value="scale">Scale (50+ homes)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPG}
                  onChange={e => setHasPG(e.target.checked)}
                  className="rounded border-border"
                />
                Personal Guarantee capacity
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={seisEligible}
                  onChange={e => setSeisEligible(e.target.checked)}
                  className="rounded border-border"
                />
                SEIS eligible
              </label>
            </div>
            <div className="flex items-end">
              <Button onClick={handleRecommend} className="w-full">
                Get Recommendation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      {recommendation && (
        <Card className="border-rose/30">
          <CardHeader>
            <CardTitle>Recommended Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">{recommendation.reasoning}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard label="Total Available" value={recommendation.totalAvailable} />
              <MetricCard label="Est. Cost of Capital" value={recommendation.estimatedCostOfCapital} />
              <MetricCard label="Timeline" value={`${recommendation.timelineWeeks} weeks`} />
            </div>

            {recommendation.suggestedSplit && (
              <div className="bg-bg-primary rounded-[var(--radius-md)] p-3">
                <p className="text-xs text-text-tertiary">Suggested Split</p>
                <p className="text-sm text-text-primary font-medium">{recommendation.suggestedSplit}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DealCard deal={recommendation.primary} label="Primary" />
              {recommendation.secondary && <DealCard deal={recommendation.secondary} label="Secondary" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Structures */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">All Deal Structures</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Collapse' : 'Show All'}
        </Button>
      </div>

      {showAll && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dealStructures.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-primary rounded-[var(--radius-md)] p-3">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-sm text-text-primary font-medium">{value}</p>
    </div>
  );
}

const complexityVariant = {
  low: 'success' as const,
  medium: 'warning' as const,
  high: 'danger' as const,
};

function DealCard({ deal, label }: { deal: DealStructure; label?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            {label && <Badge variant="rose" className="mb-1">{label}</Badge>}
            <h4 className="text-sm font-semibold text-text-primary">{deal.name}</h4>
            <p className="text-xs text-text-secondary mt-0.5">{deal.description}</p>
          </div>
          <Badge variant={complexityVariant[deal.complexity]}>{deal.complexity}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-text-tertiary">Rate Range</span>
            <p className="text-text-primary">{deal.typicalRateRange}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Funding</span>
            <p className="text-text-primary">{deal.fundingRange}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Time to Fund</span>
            <p className="text-text-primary">{deal.timeToFund}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Best For</span>
            <p className="text-text-primary">{deal.suitableFor}</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-full">
          {expanded ? 'Less detail' : 'More detail'}
        </Button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-success mb-1">Pros</p>
                <ul className="space-y-0.5">
                  {deal.pros.map((p, i) => (
                    <li key={i} className="text-xs text-text-secondary">+ {p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-danger mb-1">Cons</p>
                <ul className="space-y-0.5">
                  {deal.cons.map((c, i) => (
                    <li key={i} className="text-xs text-text-secondary">- {c}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">Tax Benefits</p>
              <ul className="space-y-0.5">
                {deal.taxBenefits.map((t, i) => (
                  <li key={i} className="text-xs text-text-tertiary">{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">Security Needed</p>
              <ul className="space-y-0.5">
                {deal.securityNeeded.map((s, i) => (
                  <li key={i} className="text-xs text-text-tertiary">{s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
