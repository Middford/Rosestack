// ============================================================
// RoseStack System Presets — Hardware Building Blocks & Configs
//
// Defines the Fogstar/Sunsynk hardware components and named
// system configurations (RS-25, RS-300, Beeches) used by the
// backtest engine and hardware optimiser.
//
// Export limits are fixed by phase type:
//   Single-phase: 22kW (G100 limit)
//   Three-phase:  66kW (G99, 22kW per phase)
// ============================================================

import type { SystemParams } from '@/modules/tariffs/dispatch-matrix';

// --- Hardware Components ---

export interface BatteryStack {
  name: string;
  capacityKwh: number;
  priceGbp: number;
  /** Max charge/discharge rate per stack in kW */
  maxRateKw: number;
  /** Nominal voltage */
  voltageV: number;
  chemistry: 'LFP';
  cycleLife: number;
  /** Annual capacity degradation as fraction (0.02 = 2%) */
  degradationRate: number;
  /** Round-trip efficiency as fraction (0.93 = 93%) */
  efficiency: number;
}

export interface Inverter {
  name: string;
  rateKw: number;
  priceGbp: number;
  phase: 'single' | 'three';
  maxParallel: number;
}

export const FOGSTAR_STACK: BatteryStack = {
  name: 'Fogstar Energy 64.4kWh IP65',
  capacityKwh: 64.4,
  priceGbp: 5999,
  maxRateKw: 15.36, // 300A × 51.2V = 15.36kW per stack
  voltageV: 51.2,
  chemistry: 'LFP',
  cycleLife: 8000,
  degradationRate: 0.02,
  efficiency: 0.93,
};

export const SUNSYNK_12KW: Inverter = {
  name: 'Sunsynk 12kW Single-Phase',
  rateKw: 12,
  priceGbp: 1500,
  phase: 'single',
  maxParallel: 2,
};

export const SUNSYNK_30KW: Inverter = {
  name: 'Sunsynk 30kW 3-Phase LV',
  rateKw: 30,
  priceGbp: 3000,
  phase: 'three',
  maxParallel: 3, // up to 10 supported but 3 is practical max for residential
};

// --- Export Limits by Phase ---

export const EXPORT_LIMITS = {
  single: 22, // kW — G100 limit
  three: 66,  // kW — G99, 22kW per phase
} as const;

// --- Installation Costs (estimates) ---

export interface InstallCosts {
  electricianLabour: number;
  concreteSlab: number;
  dcAcCabling: number;
  acProtectionMetering: number;
  contingencyPct: number;
}

export const INSTALL_COSTS_SINGLE: InstallCosts = {
  electricianLabour: 2000,
  concreteSlab: 800,
  dcAcCabling: 500,
  acProtectionMetering: 1500,
  contingencyPct: 0.10,
};

export const INSTALL_COSTS_THREE: InstallCosts = {
  electricianLabour: 4000,
  concreteSlab: 2500,
  dcAcCabling: 1500,
  acProtectionMetering: 3500,
  contingencyPct: 0.10,
};

// --- CAPEX Calculator ---

export interface SystemConfig {
  stacks: number;
  inverter: Inverter;
  inverterCount: number;
  solarKwp: number;
  phaseType: 'single' | 'three';
}

export interface CapexBreakdown {
  batteryGbp: number;
  inverterGbp: number;
  solarGbp: number;
  installGbp: number;
  contingencyGbp: number;
  totalGbp: number;
}

/**
 * Calculate total CAPEX for a given system configuration.
 * Solar cost assumes £400/kWp for panels + rails + MC4.
 */
export function calculateCapex(config: SystemConfig): CapexBreakdown {
  const batteryGbp = config.stacks * FOGSTAR_STACK.priceGbp;
  const inverterGbp = config.inverterCount * config.inverter.priceGbp;
  const solarGbp = config.solarKwp * 400; // £400/kWp typical for panels + mounting
  const installCosts = config.phaseType === 'three' ? INSTALL_COSTS_THREE : INSTALL_COSTS_SINGLE;
  const installGbp = installCosts.electricianLabour
    + installCosts.concreteSlab
    + installCosts.dcAcCabling
    + installCosts.acProtectionMetering;
  const subtotal = batteryGbp + inverterGbp + solarGbp + installGbp;
  const contingencyGbp = Math.round(subtotal * installCosts.contingencyPct);

  return {
    batteryGbp,
    inverterGbp,
    solarGbp,
    installGbp,
    contingencyGbp,
    totalGbp: subtotal + contingencyGbp,
  };
}

/**
 * Convert a SystemConfig into dispatch-ready SystemParams.
 */
export function configToParams(config: SystemConfig): SystemParams {
  const totalCapacityKwh = config.stacks * FOGSTAR_STACK.capacityKwh;
  const totalInverterKw = config.inverterCount * config.inverter.rateKw;
  // Effective charge/discharge rate is limited by the slower of inverter or battery
  const totalBatteryRateKw = config.stacks * FOGSTAR_STACK.maxRateKw;
  const effectiveRateKw = Math.min(totalInverterKw, totalBatteryRateKw);

  return {
    totalCapacityKwh,
    maxChargeRateKw: effectiveRateKw,
    maxDischargeRateKw: effectiveRateKw,
    roundTripEfficiency: FOGSTAR_STACK.efficiency,
    minSoc: 0.05,
    maxSoc: 0.98,
    solarKwp: config.solarKwp,
    exportLimitKw: EXPORT_LIMITS[config.phaseType],
  };
}

// --- Named Presets ---

export interface SystemPreset {
  id: string;
  label: string;
  description: string;
  config: SystemConfig;
  params: SystemParams;
  capex: CapexBreakdown;
}

function makePreset(
  id: string,
  label: string,
  description: string,
  config: SystemConfig,
): SystemPreset {
  return {
    id,
    label,
    description,
    config,
    params: configToParams(config),
    capex: calculateCapex(config),
  };
}

export const SYSTEM_PRESETS: Record<string, SystemPreset> = {
  'rs-25': makePreset(
    'rs-25',
    'RS-25 (Single-Phase)',
    '1 Fogstar stack, 2× Sunsynk 12kW, single-phase 22kW export',
    {
      stacks: 1,
      inverter: SUNSYNK_12KW,
      inverterCount: 2,
      solarKwp: 5.3,
      phaseType: 'single',
    },
  ),

  'rs-300': makePreset(
    'rs-300',
    'RS-300 (Three-Phase)',
    '5 Fogstar stacks (322kWh), 3× Sunsynk 30kW, three-phase 66kW export, 25kWp solar',
    {
      stacks: 5,
      inverter: SUNSYNK_30KW,
      inverterCount: 3,
      solarKwp: 25,
      phaseType: 'three',
    },
  ),

  'beeches': makePreset(
    'beeches',
    'The Beeches (600kWh)',
    '10 Fogstar stacks (644kWh), 3× Sunsynk 30kW, three-phase 66kW export, 25kWp solar + 5.3kWp fence',
    {
      stacks: 10,
      inverter: SUNSYNK_30KW,
      inverterCount: 3,
      solarKwp: 30.3, // 25kWp roof + 5.3kWp fence
      phaseType: 'three',
    },
  ),
};

/**
 * Generate all configurations in the optimiser search grid.
 * Iterates across stack count, inverter count, and solar kWp.
 */
export function generateConfigGrid(
  phaseType: 'single' | 'three',
  options?: {
    maxStacks?: number;
    solarSteps?: number[];
    maxInverters?: number;
  },
): SystemConfig[] {
  const inverter = phaseType === 'three' ? SUNSYNK_30KW : SUNSYNK_12KW;
  const maxStacks = options?.maxStacks ?? 10;
  const solarSteps = options?.solarSteps ?? [0, 5, 10, 15, 20, 25];
  const maxInverters = options?.maxInverters ?? inverter.maxParallel;

  const configs: SystemConfig[] = [];

  for (let stacks = 1; stacks <= maxStacks; stacks++) {
    for (let invCount = 1; invCount <= maxInverters; invCount++) {
      for (const solar of solarSteps) {
        configs.push({
          stacks,
          inverter,
          inverterCount: invCount,
          solarKwp: solar,
          phaseType,
        });
      }
    }
  }

  return configs;
}
