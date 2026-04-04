// ============================================================
// Property Prospecting Scoring Algorithm
//
// Scores properties 0-100 for RoseStack deployment suitability.
//
// DECISION CRITERIA (April 2026):
// 1. Has existing solar panels (visible or EPC-confirmed)
// 2. 3-phase electrical supply (confirmed or high likelihood)
// 3. Close to substations with spare headroom (for G99 approval)
//
// These three factors are the PRIMARY drivers (65 points).
// Secondary factors (35 points) cover property suitability,
// garden access, and revenue potential.
// ============================================================

import type { TargetProperty } from './property-data';
import { substations } from './substation-data';

export interface PropertyScore {
  property: TargetProperty;
  totalScore: number;
  breakdown: ScoreBreakdown;
  estimatedRevenueRange: { low: number; high: number };
}

export interface ScoreBreakdown {
  solarScore: number;           // 0-25: existing solar panels (PRIMARY)
  phaseScore: number;           // 0-25: 3-phase supply (PRIMARY)
  substationHeadroomScore: number; // 0-15: substation spare capacity (PRIMARY)
  gardenScore: number;          // 0-10: garden access for battery slab
  propertySizeScore: number;    // 0-10: bedrooms + type (consumption proxy)
  epcScore: number;             // 0-10: energy profile
  clusterScore: number;         // 0-5:  existing RoseStack homes nearby
}

// ── PRIMARY FACTOR 1: Solar panels (25 points) ──────────────────────────────
//
// Properties with existing solar are ideal targets because:
// - They already understand renewable energy
// - Solar + battery is the strongest revenue combination
// - Solar self-consumption saves the highest import rates
// - Indicates homeowner investment in energy infrastructure
//
// The EPC field PHOTO_SUPPLY gives % of roof area with PV.
// We also check for solar references in heating description.

function scoreSolar(prop: TargetProperty): number {
  // Check for solar via photo_supply field (added to TargetProperty)
  const photoSupply = (prop as unknown as Record<string, unknown>).photoSupply as number | undefined;
  if (photoSupply != null && photoSupply > 0) {
    // Any solar = big score. More coverage = better.
    if (photoSupply >= 25) return 25;  // 25%+ roof coverage — serious installation
    if (photoSupply >= 10) return 22;  // decent system
    return 18;                          // small system but still solar-aware
  }

  // Check for solar water heating flag
  const solarWaterHeating = (prop as unknown as Record<string, unknown>).solarWaterHeating as boolean | undefined;
  if (solarWaterHeating) return 12; // solar thermal — energy-aware homeowner

  // No solar data — score based on roof suitability
  // Detached houses with south-facing potential score higher
  if (prop.propertyType === 'detached' || prop.propertyType === 'farm') return 5;
  if (prop.propertyType === 'bungalow') return 4; // good roof access
  if (prop.propertyType === 'semi') return 3;
  return 1; // terrace — limited roof
}

// ── PRIMARY FACTOR 2: 3-phase supply (25 points) ────────────────────────────
//
// 3-phase is essential for systems >3.68kW (G98 single-phase limit).
// Our target systems are 30-100kW, so 3-phase is non-negotiable for
// the best installations. 1-phase homes can be upgraded but it adds
// £3,500 cost and delays.

function scorePhase(prop: TargetProperty): number {
  if (prop.threePhaseConfirmed) return 25;
  // Scale by likelihood score
  if (prop.threePhaseScore >= 80) return 20;
  if (prop.threePhaseScore >= 60) return 15;
  if (prop.threePhaseScore >= 40) return 10;
  if (prop.threePhaseScore >= 20) return 5;
  return 2; // very unlikely but not impossible (upgrade path)
}

// ── PRIMARY FACTOR 3: Substation headroom (15 points) ───────────────────────
//
// Properties near substations with SPARE CAPACITY score highest because:
// - G99 applications are more likely to be approved
// - Faster connection (no reinforcement needed)
// - Lower risk of curtailment conditions
//
// CHANGED: Previously rewarded "approaching constraint" for flexibility
// revenue. Now rewards UNCONSTRAINED with high maxNewConnections.

function scoreSubstationHeadroom(prop: TargetProperty): number {
  const sub = substations.find(s => s.id === prop.nearestSubstationId);
  if (!sub) return 0;

  // Headroom score: lower load % = more spare capacity = better for G99
  const loadPct = sub.currentLoadPercent ?? 50;
  let headroomFactor: number;
  if (loadPct < 50) headroomFactor = 1.0;       // plenty of room
  else if (loadPct < 65) headroomFactor = 0.85;
  else if (loadPct < 75) headroomFactor = 0.6;
  else if (loadPct < 85) headroomFactor = 0.35;  // getting tight
  else headroomFactor = 0.1;                      // constrained — risky

  // Proximity bonus: closer = cheaper connection, less cable
  let proxFactor: number;
  if (prop.distanceToSubstationKm < 0.5) proxFactor = 1.0;
  else if (prop.distanceToSubstationKm < 1.0) proxFactor = 0.85;
  else if (prop.distanceToSubstationKm < 2.0) proxFactor = 0.65;
  else proxFactor = 0.4;

  // Weight headroom 70%, proximity 30%
  return Math.round(15 * (headroomFactor * 0.7 + proxFactor * 0.3));
}

// ── SECONDARY FACTORS ───────────────────────────────────────────────────────

function scoreGarden(prop: TargetProperty): number {
  // Garden access is essential for outdoor battery installation
  return prop.gardenAccess ? 10 : 0;
}

function scorePropertySize(prop: TargetProperty): number {
  // Larger properties = higher consumption = more value from battery
  let score = 0;
  if (prop.bedrooms >= 5) score += 6;
  else if (prop.bedrooms >= 4) score += 4;
  else if (prop.bedrooms >= 3) score += 2;
  else score += 1;

  // Detached/farm properties are best (space, consumption, access)
  if (prop.propertyType === 'detached' || prop.propertyType === 'farm') score += 4;
  else if (prop.propertyType === 'bungalow' || prop.propertyType === 'semi') score += 2;
  else score += 1;

  return Math.min(10, score);
}

function scoreEpc(prop: TargetProperty): number {
  // D/E properties benefit most — high consumption but not derelict
  // C is good too. A/B already efficient. F/G may have structural issues.
  const scores: Record<string, number> = { A: 3, B: 5, C: 7, D: 10, E: 8, F: 4, G: 2 };
  return scores[prop.epcRating] ?? 5;
}

function scoreCluster(prop: TargetProperty): number {
  // Existing RoseStack homes nearby = install efficiency + social proof
  if (prop.clusterCount >= 3) return 5;
  if (prop.clusterCount >= 1) return 3;
  return 1;
}

// ── Revenue estimation ──────────────────────────────────────────────────────

function estimateRevenue(prop: TargetProperty, totalScore: number): { low: number; high: number } {
  // Based on actual tariff model results:
  // Flux: ~£30/day for 257kWh system = £11,000/yr
  // With Axle VPP: +£2,000-5,000/yr
  // Scale by property score (better properties = larger systems = more revenue)
  const scoreFactor = totalScore / 100;
  const hasSolar = ((prop as unknown as Record<string, unknown>).photoSupply as number ?? 0) > 0;
  const solarBonus = hasSolar ? 1500 : 0; // solar self-consumption savings

  const baseRevenue = prop.threePhaseConfirmed || prop.threePhaseScore >= 60
    ? 11000  // 3-phase — full size system
    : 4000;  // 1-phase — smaller system

  const low = Math.round((baseRevenue * 0.7 + solarBonus * 0.5) * scoreFactor);
  const high = Math.round((baseRevenue * 1.2 + solarBonus) * scoreFactor);

  return { low: Math.max(1000, low), high: Math.max(2000, high) };
}

// ── Main scoring function ───────────────────────────────────────────────────

export function scoreProperty(prop: TargetProperty): PropertyScore {
  const breakdown: ScoreBreakdown = {
    solarScore: scoreSolar(prop),
    phaseScore: scorePhase(prop),
    substationHeadroomScore: scoreSubstationHeadroom(prop),
    gardenScore: scoreGarden(prop),
    propertySizeScore: scorePropertySize(prop),
    epcScore: scoreEpc(prop),
    clusterScore: scoreCluster(prop),
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
