// ============================================================
// Deployment Planner — optimal deployment sequence
// Given target homes/year, recommends substation priority order
// ============================================================

import { substations, flexibilityTenders } from './substation-data';
import { targetProperties } from './property-data';
import { scoreAndRankProperties } from './scoring';
import type { Substation } from '@/shared/types';

export interface DeploymentPhase {
  phase: number;
  substationId: string;
  substationName: string;
  homesTarget: number;
  topProperties: Array<{
    id: string;
    address: string;
    postcode: string;
    score: number;
    estimatedRevenue: { low: number; high: number };
  }>;
  flexibilityValue: number;
  rationale: string;
}

export interface DeploymentPlan {
  targetHomesPerYear: number;
  phases: DeploymentPhase[];
  totalFlexibilityRevenue: number;
  averagePropertyScore: number;
}

function prioritiseSubstations(): Array<Substation & { priority: number }> {
  return substations.map(sub => {
    let priority = 0;

    // Flexibility tender value
    const tender = flexibilityTenders[sub.id];
    if (tender && tender.status === 'open') priority += 30;
    else if (tender && tender.status === 'pending') priority += 15;

    // Approaching constraint = sweet spot (flex value + still connectable)
    if (sub.constraintStatus === 'approaching') priority += 25;
    else if (sub.constraintStatus === 'unconstrained') priority += 15;
    else priority += 5; // constrained — harder to connect

    // Available headroom
    if (sub.maxNewConnections && sub.maxNewConnections > 100) priority += 20;
    else if (sub.maxNewConnections && sub.maxNewConnections > 50) priority += 10;

    // Property density in area
    const propsNearby = targetProperties.filter(p => p.nearestSubstationId === sub.id).length;
    priority += Math.min(20, propsNearby * 2);

    return { ...sub, priority };
  }).sort((a, b) => b.priority - a.priority);
}

export function generateDeploymentPlan(targetHomesPerYear: number): DeploymentPlan {
  const prioritised = prioritiseSubstations();
  const phases: DeploymentPhase[] = [];
  let remaining = targetHomesPerYear;
  let phase = 1;
  let totalFlex = 0;
  let totalScore = 0;
  let totalProps = 0;

  for (const sub of prioritised) {
    if (remaining <= 0) break;

    const props = targetProperties.filter(p => p.nearestSubstationId === sub.id);
    const scored = scoreAndRankProperties(props);
    const maxHomes = Math.min(remaining, sub.maxNewConnections ?? 50, scored.length);

    if (maxHomes === 0) continue;

    const topScored = scored.slice(0, maxHomes);
    const flexValue = flexibilityTenders[sub.id]?.totalAnnualValue ?? 0;

    const rationale = buildRationale(sub, topScored.length, flexValue);

    phases.push({
      phase: phase++,
      substationId: sub.id,
      substationName: sub.name,
      homesTarget: maxHomes,
      topProperties: topScored.map(s => ({
        id: s.property.id,
        address: s.property.address,
        postcode: s.property.postcode,
        score: s.totalScore,
        estimatedRevenue: s.estimatedRevenueRange,
      })),
      flexibilityValue: flexValue,
      rationale,
    });

    totalFlex += flexValue;
    for (const s of topScored) { totalScore += s.totalScore; totalProps++; }
    remaining -= maxHomes;
  }

  return {
    targetHomesPerYear,
    phases,
    totalFlexibilityRevenue: totalFlex,
    averagePropertyScore: totalProps > 0 ? Math.round(totalScore / totalProps) : 0,
  };
}

function buildRationale(sub: Substation, homes: number, flexValue: number): string {
  const parts: string[] = [];

  if (sub.constraintStatus === 'approaching') {
    parts.push('Approaching constraint — flexibility services highly valued');
  } else if (sub.constraintStatus === 'constrained') {
    parts.push('Already constrained — limited new connections but high flexibility premium');
  } else {
    parts.push('Unconstrained — easy connection pathway');
  }

  if (flexValue > 0) {
    parts.push(`Active flexibility tender worth £${(flexValue / 1000).toFixed(0)}k/year`);
  }

  if (homes >= 10) {
    parts.push('Strong cluster potential — install cost savings');
  }

  return parts.join('. ') + '.';
}
