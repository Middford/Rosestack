// ============================================================
// Property Prospecting Scoring Algorithm
// Scores properties 0-100 for RoseStack deployment suitability
// ============================================================

import type { TargetProperty } from './property-data';
import { substations, flexibilityTenders } from './substation-data';

export interface PropertyScore {
  property: TargetProperty;
  totalScore: number;
  breakdown: ScoreBreakdown;
  estimatedRevenueRange: { low: number; high: number };
}

export interface ScoreBreakdown {
  phaseScore: number;         // 0-20: 3-phase likelihood
  propertyAgeScore: number;   // 0-10: pre-1970 large detached = highest
  epcScore: number;           // 0-15: B/C preferred
  gardenScore: number;        // 0-5:  garden access for install
  substationScore: number;    // 0-15: proximity + constraint status
  affluenceScore: number;     // 0-10: homeowner decision speed
  clusterScore: number;       // 0-10: cluster deployment savings
  flexibilityScore: number;   // 0-15: flexibility tender value in area
}

const WEIGHTS = {
  phase: 20,
  propertyAge: 10,
  epc: 15,
  garden: 5,
  substation: 15,
  affluence: 10,
  cluster: 10,
  flexibility: 15,
} as const;

function scorePhase(prop: TargetProperty): number {
  if (prop.threePhaseConfirmed) return WEIGHTS.phase;
  return Math.round((prop.threePhaseScore / 100) * WEIGHTS.phase);
}

function scorePropertyAge(prop: TargetProperty): number {
  const isLargeDetached = prop.propertyType === 'detached' || prop.propertyType === 'farm';
  const isOld = prop.builtYear < 1970;

  if (isLargeDetached && isOld) return WEIGHTS.propertyAge;
  if (isLargeDetached) return Math.round(WEIGHTS.propertyAge * 0.7);
  if (isOld && prop.bedrooms >= 4) return Math.round(WEIGHTS.propertyAge * 0.6);
  return Math.round(WEIGHTS.propertyAge * 0.3);
}

function scoreEpc(prop: TargetProperty): number {
  // B and C are ideal — well insulated but not yet net-zero
  const scores: Record<string, number> = { A: 0.6, B: 1.0, C: 0.9, D: 0.5, E: 0.3 };
  const factor = scores[prop.epcRating] ?? 0.3;
  return Math.round(WEIGHTS.epc * factor);
}

function scoreGarden(prop: TargetProperty): number {
  return prop.gardenAccess ? WEIGHTS.garden : 0;
}

function scoreSubstation(prop: TargetProperty): number {
  const sub = substations.find(s => s.id === prop.nearestSubstationId);
  if (!sub) return 0;

  // Proximity score (closer is better for connection)
  const proxFactor = prop.distanceToSubstationKm < 1 ? 1.0
    : prop.distanceToSubstationKm < 2 ? 0.7
    : prop.distanceToSubstationKm < 5 ? 0.4
    : 0.2;

  // Constrained substations have more flexibility value but harder connections
  // Approaching = sweet spot (flexibility value + still connectable)
  const constraintFactor = sub.constraintStatus === 'approaching' ? 1.0
    : sub.constraintStatus === 'constrained' ? 0.6
    : 0.5;

  return Math.round(WEIGHTS.substation * (proxFactor * 0.5 + constraintFactor * 0.5));
}

function scoreAffluence(prop: TargetProperty): number {
  return Math.round(WEIGHTS.affluence * (prop.affluenceIndex / 10));
}

function scoreCluster(prop: TargetProperty): number {
  // More existing homes nearby = better for install efficiency
  if (prop.clusterCount >= 3) return WEIGHTS.cluster;
  if (prop.clusterCount >= 1) return Math.round(WEIGHTS.cluster * 0.6);
  return Math.round(WEIGHTS.cluster * 0.2);
}

function scoreFlexibility(prop: TargetProperty): number {
  const tender = flexibilityTenders[prop.nearestSubstationId];
  if (!tender) return 0;

  // Higher tender value = more revenue opportunity
  const valueFactor = Math.min(1, tender.valuePerMwPerHour / 120);
  const statusFactor = tender.status === 'open' ? 1.0 : tender.status === 'pending' ? 0.7 : 0.3;

  return Math.round(WEIGHTS.flexibility * valueFactor * statusFactor);
}

function estimateRevenue(prop: TargetProperty, totalScore: number): { low: number; high: number } {
  // Base annual revenue from arbitrage + export
  const baseRevenue = 800; // GBP/year from basic arbitrage on Flux/Agile
  const flexRevenue = flexibilityTenders[prop.nearestSubstationId]
    ? (flexibilityTenders[prop.nearestSubstationId].valuePerMwPerHour * 0.005 * 365 * 0.3)
    : 0;

  const scoreFactor = totalScore / 100;
  const low = Math.round((baseRevenue * 0.7 + flexRevenue * 0.5) * scoreFactor);
  const high = Math.round((baseRevenue * 1.3 + flexRevenue * 1.2) * scoreFactor);

  return { low: Math.max(400, low), high: Math.max(600, high) };
}

export function scoreProperty(prop: TargetProperty): PropertyScore {
  const breakdown: ScoreBreakdown = {
    phaseScore: scorePhase(prop),
    propertyAgeScore: scorePropertyAge(prop),
    epcScore: scoreEpc(prop),
    gardenScore: scoreGarden(prop),
    substationScore: scoreSubstation(prop),
    affluenceScore: scoreAffluence(prop),
    clusterScore: scoreCluster(prop),
    flexibilityScore: scoreFlexibility(prop),
  };

  const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return {
    property: prop,
    totalScore,
    breakdown,
    estimatedRevenueRange: estimateRevenue(prop, totalScore),
  };
}

export function scoreAndRankProperties(properties: TargetProperty[]): PropertyScore[] {
  return properties.map(scoreProperty).sort((a, b) => b.totalScore - a.totalScore);
}

export function getScoreGrade(score: number): { label: string; color: 'success' | 'warning' | 'danger' | 'info' } {
  if (score >= 75) return { label: 'Excellent', color: 'success' };
  if (score >= 55) return { label: 'Good', color: 'info' };
  if (score >= 35) return { label: 'Fair', color: 'warning' };
  return { label: 'Low', color: 'danger' };
}
