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
