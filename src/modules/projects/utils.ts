// ============================================================
// Projects Module — Utilities
// ============================================================

import { batteries, inverters } from '@/modules/hardware/data';
import type { ProjectCapex } from './types';

// Installation cost defaults by phase type
const INSTALL_COSTS = {
  '1-phase': { labour: 2000, slab: 800, cabling: 500, metering: 1500, contingencyPct: 0.05 },
  '3-phase': { labour: 4000, slab: 2500, cabling: 1500, metering: 3500, contingencyPct: 0.05 },
};

export function getDefaultInstallCost(phase: '1-phase' | '3-phase'): number {
  const c = INSTALL_COSTS[phase];
  const subtotal = c.labour + c.slab + c.cabling + c.metering;
  return subtotal;
}

export function calculateProjectCapex(params: {
  batteryId: string;
  batteryStacks: number;
  inverterId: string;
  inverterCount: number;
  solarKwp: number;
  phase: '1-phase' | '3-phase';
  g99ApplicationCost?: number;
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
    params.installationCostOverride ?? getDefaultInstallCost(params.phase);
  const g99Application = params.g99ApplicationCost ?? 350;

  const subtotal =
    batteryHardware + inverterHardware + solarCost + installationLabour + g99Application;
  const contingency = Math.round(subtotal * 0.05);

  return {
    batteryHardware,
    inverterHardware,
    solarCost,
    installationLabour,
    g99Application,
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
