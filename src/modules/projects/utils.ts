// ============================================================
// Projects Module — Utilities
// ============================================================

import { batteries, inverters } from '@/modules/hardware/data';
import type { ProjectCapex, ConnectionType } from './types';

// ── DNO Connection Costs by Type ─────────────────────────────────────────────
//
// Based on real ENWL data + industry research:
// - The Beeches 3-phase quote: £6,821 ex-VAT (road crossing)
// - ENWL witness testing guide: no witness test for type-tested <200kW
// - G99 assessment: £0-500 for Type A with headroom
// - Combined jobs save on excavation/LA permissions (one dig, not two)

export const CONNECTION_COSTS: Record<ConnectionType, {
  label: string;
  exportLimitKw: number;
  g99Fee: number;
  dnoConnectionCost: number;
  phaseUpgrade: number;
  description: string;
}> = {
  'g98': {
    label: 'G98 — Notification Only',
    exportLimitKw: 11,
    g99Fee: 0,
    dnoConnectionCost: 0,
    phaseUpgrade: 0,
    description: '≤16A/phase. Free, instant notification. 11kW export limit on 3-phase.',
  },
  'g99-fast-track': {
    label: 'G99 Fast Track',
    exportLimitKw: 14,
    g99Fee: 0,
    dnoConnectionCost: 0,
    phaseUpgrade: 0,
    description: '≤32A/phase, ≤60A total. Free, 2-4 weeks. ~14kW export on 3-phase.',
  },
  'g99-only': {
    label: 'G99 Standard — Already 3-Phase',
    exportLimitKw: 66,
    g99Fee: 500,
    dnoConnectionCost: 0,
    phaseUpgrade: 0,
    description: 'Property already has 3-phase. Assessment £0-500. No physical works if transformer has headroom. Type-tested inverters = no witness test under 200kW.',
  },
  'g99-plus-upgrade': {
    label: 'G99 + 3-Phase Upgrade (Same Side)',
    exportLimitKw: 66,
    g99Fee: 500,
    dnoConnectionCost: 3500,
    phaseUpgrade: 0, // included in dnoConnectionCost
    description: 'Combined G99 + 3-phase upgrade. Single excavation. ~£3,500 for same-side connection (no road crossing). ENWL Connection Offer covers both.',
  },
  'g99-road-crossing': {
    label: 'G99 + 3-Phase Upgrade (Road Crossing)',
    exportLimitKw: 66,
    g99Fee: 500,
    dnoConnectionCost: 7000,
    phaseUpgrade: 0, // included in dnoConnectionCost
    description: 'Combined G99 + 3-phase with road crossing. ~£7,000 based on real ENWL quote (ref 5500324786/A). Includes excavation, backfill, resurfacing, LA permissions.',
  },
};

// Installation cost defaults by PLANNED phase type
const INSTALL_COSTS = {
  '1-phase': { labour: 2000, slab: 800, cabling: 500, metering: 1500, contingencyPct: 0.05 },
  '3-phase': { labour: 4000, slab: 2500, cabling: 1500, metering: 3500, contingencyPct: 0.05 },
};

// Cost to upgrade from single-phase to three-phase supply
// Based on real ENWL quote for The Beeches (ref 5500324786/A, Oct 2024):
//   Construction works: £6,502 + Local authority permissions: £319 = £6,821 ex-VAT
// This was a road-crossing job — simpler installs may be £3,000-4,000
// Using £5,000 as a realistic average for budgeting
const PHASE_UPGRADE_COST = 5000;

export function getDefaultInstallCost(plannedPhase: '1-phase' | '3-phase'): number {
  const c = INSTALL_COSTS[plannedPhase];
  return c.labour + c.slab + c.cabling + c.metering;
}

export function getPhaseUpgradeCost(
  currentPhase: '1-phase' | '3-phase',
  plannedPhase: '1-phase' | '3-phase',
): number {
  if (currentPhase === '1-phase' && plannedPhase === '3-phase') return PHASE_UPGRADE_COST;
  return 0;
}

export function calculateProjectCapex(params: {
  batteryId: string;
  batteryStacks: number;
  inverterId: string;
  inverterCount: number;
  solarKwp: number;
  currentPhase: '1-phase' | '3-phase';
  plannedPhase: '1-phase' | '3-phase';
  connectionType?: ConnectionType;
  g99ApplicationCost?: number;
  dnoConnectionCostOverride?: number | null;
  installationCostOverride?: number | null;
  solarCostOverride?: number | null;
}): ProjectCapex {
  const battery = batteries.find(b => b.id === params.batteryId);
  const inverter = inverters.find(i => i.id === params.inverterId);

  const batteryHardware =
    (battery?.wholesalePriceGbp ?? 0) *
    params.batteryStacks *
    (battery?.maxModulesPerString ?? 1);
  const inverterHardware = (inverter?.priceGbp ?? 0) * params.inverterCount;
  const solarCost = params.solarCostOverride ?? params.solarKwp * 400;
  const installationLabour =
    params.installationCostOverride ?? getDefaultInstallCost(params.plannedPhase);

  // Connection costs from connection type (replaces separate phase upgrade + G99 fee)
  const connType = params.connectionType ?? 'g99-only';
  const connCosts = CONNECTION_COSTS[connType];

  // Allow overrides but default to connection type costs
  const g99Application = params.g99ApplicationCost ?? connCosts.g99Fee;
  const dnoConnectionCost = params.dnoConnectionCostOverride ?? connCosts.dnoConnectionCost;

  // Phase upgrade is now included in dnoConnectionCost for combined types
  // Only charge separately if using old-style separate upgrade
  const phaseUpgradeCost = connType === 'g98' || connType === 'g99-fast-track' || connType === 'g99-only'
    ? getPhaseUpgradeCost(params.currentPhase, params.plannedPhase)
    : 0; // included in dnoConnectionCost for combined types

  const subtotal =
    batteryHardware + inverterHardware + solarCost + installationLabour +
    phaseUpgradeCost + g99Application + dnoConnectionCost;
  const contingency = Math.round(subtotal * 0.05);

  return {
    batteryHardware,
    inverterHardware,
    solarCost,
    installationLabour,
    phaseUpgradeCost,
    g99Application,
    dnoConnectionCost,
    contingency,
    totalCapex: subtotal + contingency,
  };
}

/** Map 18-stage pipeline status to financial phase */
export function mapPipelineToPhase(
  status: string,
): 'pre-build' | 'build' | 'operational' {
  const preBuild = [
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
  ];
  const build = ['g99_submitted', 'g99_approved', 'installation_scheduled'];

  if (preBuild.includes(status)) return 'pre-build';
  if (build.includes(status)) return 'build';
  return 'operational'; // installed, commissioned, live
}

// ── Daily consumption estimator ──────────────────────────────────────────────
//
// Estimates daily kWh from property attributes. Based on:
// - Ofgem Typical Domestic Consumption Values (TDCV) 2024
// - EPC band multipliers (A homes use ~60% of a D home, G homes ~140%)
// - Heat pump adds 20-40 kWh/day depending on season (annual avg ~25 kWh/day
//   for a 9kW ASHP with COP 3.5 heating a 4-bed detached)
// - Each EV adds ~7.8 kWh/day (10,000 miles/year at 3.5 miles/kWh)
//
// Returns a rounded whole number suitable for the consumption slider.

const BEDROOMS_BASE_KWH: Record<number, number> = {
  1: 8,    // flat / small terrace
  2: 12,
  3: 16,   // typical semi
  4: 22,   // typical detached
  5: 28,
  6: 34,
  7: 38,
  8: 42,
};

const PROPERTY_TYPE_MULTIPLIER: Record<string, number> = {
  detached: 1.15,    // larger, more exposed walls
  semi: 1.0,         // baseline
  terrace: 0.85,     // shared walls = less heat loss
  bungalow: 1.05,    // single storey but wider footprint
  farm: 1.30,        // larger, older, draughty
  commercial: 1.40,  // bigger spaces
};

// EPC band energy efficiency multiplier
// A/B homes are well insulated = lower consumption
// E/F/G homes are poorly insulated = higher consumption
const EPC_MULTIPLIER: Record<string, number> = {
  'A': 0.60,
  'B': 0.75,
  'C': 0.90,
  'D': 1.00,   // baseline (UK average)
  'E': 1.15,
  'F': 1.30,
  'G': 1.45,
};

// Heat pump replaces gas boiler — adds electrical consumption
// but at COP 3-4 it's much less than the gas it replaces
// Annual heating demand for a Lancashire home ≈ 12,000-18,000 kWh thermal
// At COP 3.5: 3,400-5,100 kWh electrical = 9.3-14 kWh/day annual average
const HEAT_PUMP_BASE_KWH_PER_DAY = 12; // annual daily average for typical 4-bed

// EV consumption: 10,000 miles/year ÷ 365 ÷ 3.5 miles/kWh = 7.8 kWh/day
const EV_KWH_PER_DAY = 7.8;

export function estimateDailyConsumption(params: {
  bedrooms: number;
  propertyType: string;
  epcRating: string;
  hasHeatPump: boolean;
  evCount: number;
}): number {
  const { bedrooms, propertyType, epcRating, hasHeatPump, evCount } = params;

  // Base from bedrooms (clamp to 1-8)
  const clampedBeds = Math.max(1, Math.min(8, bedrooms));
  const base = BEDROOMS_BASE_KWH[clampedBeds] ?? 16;

  // Apply property type multiplier
  const propMultiplier = PROPERTY_TYPE_MULTIPLIER[propertyType] ?? 1.0;

  // Apply EPC multiplier (use first character, uppercase)
  const epcBand = (epcRating || 'D').trim().charAt(0).toUpperCase();
  const epcMultiplier = EPC_MULTIPLIER[epcBand] ?? 1.0;

  // Electrical base consumption (lighting, appliances, cooking, hot water if electric)
  let daily = base * propMultiplier * epcMultiplier;

  // Heat pump adds electrical heating load
  // Scale by bedroom count (proxy for house size)
  if (hasHeatPump) {
    const hpScale = clampedBeds / 4; // 4-bed = baseline
    daily += HEAT_PUMP_BASE_KWH_PER_DAY * hpScale * epcMultiplier;
  }

  // EVs
  daily += evCount * EV_KWH_PER_DAY;

  return Math.round(daily);
}

// ── Property score calculator ────────────────────────────────────────────────
//
// Scores a property 0-100 based on suitability for RoseStack installation.
// Higher = better candidate. Factors:
//   - Phase (3-phase = ideal for large systems)
//   - Property type (detached with garden = best access)
//   - Bedrooms (more = larger house = more consumption)
//   - Garden access (essential for battery slab)
//   - EPC rating (worse EPC = higher consumption = more value from battery)
//   - Solar potential (higher kWp roof = more free charging)

export function calculatePropertyScore(params: {
  phase: string;
  propertyType: string;
  bedrooms: number;
  gardenAccess: boolean;
  epcRating: string;
  solarKwp: number;
  hasHeatPump: boolean;
  evCount: number;
}): number {
  let score = 0;

  // Phase: 3-phase is essential for large systems (25 pts)
  score += params.phase === '3-phase' ? 25 : 5;

  // Property type (15 pts)
  const typeScores: Record<string, number> = {
    detached: 15, farm: 14, bungalow: 12, semi: 8, terrace: 4, commercial: 10,
  };
  score += typeScores[params.propertyType] ?? 8;

  // Bedrooms — proxy for house size and consumption (10 pts)
  score += Math.min(10, Math.max(2, (params.bedrooms - 1) * 2));

  // Garden access — essential for battery slab (15 pts)
  score += params.gardenAccess ? 15 : 0;

  // EPC rating — worse insulation = higher consumption = more arbitrage value (10 pts)
  // D/E properties benefit most from battery + heat pump
  const epcScores: Record<string, number> = {
    A: 3, B: 5, C: 7, D: 10, E: 9, F: 6, G: 4,
  };
  const epcBand = (params.epcRating || 'D').trim().charAt(0).toUpperCase();
  score += epcScores[epcBand] ?? 7;

  // Solar potential (10 pts)
  if (params.solarKwp >= 25) score += 10;
  else if (params.solarKwp >= 15) score += 7;
  else if (params.solarKwp >= 5) score += 4;
  else score += 1;

  // Heat pump — increases consumption and arbitrage value (8 pts)
  score += params.hasHeatPump ? 8 : 0;

  // EVs — increases off-peak charging value (7 pts)
  score += Math.min(7, params.evCount * 4);

  return Math.min(100, Math.max(0, score));
}

// ── Engagement score ────────────────────────────────────────────────────────
//
// Scores engagement 0-100 based on pipeline progress.
// Further along the pipeline = more engaged.

export function calculateEngagementScore(status: string, daysInCurrentStatus: number): number {
  const statusScores: Record<string, number> = {
    new_lead: 10, initial_contact: 20, interested: 35, property_assessed: 45,
    visit_scheduled: 50, visit_complete: 60, proposal_prepared: 65,
    proposal_sent: 70, proposal_reviewing: 75, verbal_agreement: 80,
    contract_sent: 85, contracted: 90, g99_submitted: 92, g99_approved: 94,
    installation_scheduled: 96, installed: 98, commissioned: 99, live: 100,
    on_hold: 15, lost: 0,
  };
  let score = statusScores[status] ?? 10;

  // Decay for stale leads — lose points if sitting too long
  if (daysInCurrentStatus > 30 && score < 80) score = Math.max(5, score - 10);
  if (daysInCurrentStatus > 60 && score < 80) score = Math.max(5, score - 10);

  return Math.min(100, Math.max(0, score));
}

export function getSystemTotals(
  batteryId: string,
  stacks: number,
  inverterId: string,
  inverterCount: number,
) {
  const battery = batteries.find(b => b.id === batteryId);
  const inverter = inverters.find(i => i.id === inverterId);
  const totalCapKwh =
    (battery?.capacityPerModuleKwh ?? 0) * stacks * (battery?.maxModulesPerString ?? 1);
  const totalInverterKw = (inverter?.maxOutputKw ?? 0) * inverterCount;
  const efficiency = (battery?.roundTripEfficiency ?? 93) / 100;
  return { totalCapKwh, totalInverterKw, efficiency, battery, inverter };
}
