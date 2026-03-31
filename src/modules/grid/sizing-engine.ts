// ============================================================
// RoseStack Grid Module — Battery Sizing Engine
//
// Recommends the optimal battery system for a given property
// taking into account G99 export limits, charge rate constraints,
// solar interaction, and phase type.
// ============================================================

import { type AafResult, calculateAafForTariff } from './aaf';

export type { AafResult };

export interface SizingInputs {
  // Property
  phase: '1-phase' | '3-phase';
  peakDemandKw: number;           // From consumption model
  annualConsumptionKwh: number;   // From consumption model

  // Grid connection
  exportLimitKw?: number;         // From G99 assessment (0 = no export allowed)
  connectionFuseAmps?: number;    // Main fuse size (100A 3ph = 69kW)

  // Solar
  solarKwp?: number;              // Existing or planned solar

  // Commercial preferences
  budget?: number;                // Max capital cost (optional)
  targetPaybackMonths?: number;   // Target payback period
}

export interface SizingOption {
  label: string;                  // e.g., "Standard 3-Phase" or "Single-Phase (Limited)"
  batteryCapacityKwh: number;
  inverterKw: number;
  phase: '1-phase' | '3-phase';
  estimatedCapex: number;         // £
  aaf: AafResult;
  estimatedAnnualRevenue: { likely: number; best: number; worst: number };
  estimatedPaybackMonths: { likely: number; best: number; worst: number };
  constraints: string[];          // Any limiting factors
  risks: string[];                // Risk flags
  recommended: boolean;           // Is this the recommended option?
}

export interface SizingResult {
  primaryOption: SizingOption;    // Recommended option
  alternativeOption?: SizingOption; // Alternative (e.g., larger if budget allows, or 1-phase fallback)
  g99Required: boolean;           // Does system require G99 (true if >3.68kW per phase)
  g99Probability: number;         // 0-1 probability of G99 approval
  exportLimitRisk: string;        // 'none' | 'low' | 'medium' | 'high'
  notes: string[];
}

// ============================================================
// Hardware cost models (£, 2026 pricing)
// ============================================================

// Battery cost per kWh (installed, including modules and BMS)
const BATTERY_COST_PER_KWH = 350; // £/kWh

// Inverter cost by power rating
function getInverterCost(inverterKw: number, phase: '1-phase' | '3-phase'): number {
  if (phase === '1-phase') {
    // Single-phase: small inverters
    if (inverterKw <= 3.68) return 1200;
    if (inverterKw <= 5) return 1800;
    return 2500;
  }
  // Three-phase
  if (inverterKw <= 10) return 3000;
  if (inverterKw <= 20) return 5000;
  if (inverterKw <= 50) return 8000;
  if (inverterKw <= 100) return 14000;
  return 20000;
}

// Installation cost (civil works, electrical, commissioning)
function getInstallationCost(phase: '1-phase' | '3-phase', batteryKwh: number): number {
  const base = phase === '3-phase' ? 4500 : 2500;
  // Larger batteries need more civil works (more units, more cable)
  const scaleCost = Math.max(0, (batteryKwh - 50) * 10);
  return base + scaleCost;
}

// G99 application cost (DNO connection study)
const G99_APPLICATION_COST = 1500;

// ============================================================
// Revenue model (annual, per kWh of usable capacity)
// Uses IOF as primary tariff — the most favourable for large systems
// ============================================================

// Revenue per kWh of *effective* capacity per year, by scenario
// These are conservative estimates for Lancashire market (2026)
const REVENUE_PER_KWH_EFFECTIVE: Record<'likely' | 'best' | 'worst', number> = {
  likely: 85,   // £85/kWh/year effective capacity (Agile/IOF blend)
  best: 120,    // £120/kWh/year (strong spreads, Saving Sessions, flexibility)
  worst: 50,    // £50/kWh/year (compressed spreads, minimal flexibility income)
};

// ============================================================
// Sizing configuration presets
// ============================================================

interface SystemConfig {
  label: string;
  batteryKwh: number;
  inverterKw: number;
  phase: '1-phase' | '3-phase';
  description: string;
}

const SYSTEM_CONFIGS: Record<string, SystemConfig> = {
  '1ph_small': {
    label: 'Single-Phase (Limited)',
    batteryKwh: 15,
    inverterKw: 3.68,
    phase: '1-phase',
    description: 'Small 1-phase system below G98 threshold — no G99 required.',
  },
  '1ph_standard': {
    label: 'Single-Phase Standard',
    batteryKwh: 20,
    inverterKw: 5,
    phase: '1-phase',
    description: '1-phase system — G99 required, limited revenue potential.',
  },
  '3ph_entry': {
    label: '3-Phase Entry',
    batteryKwh: 50,
    inverterKw: 10,
    phase: '3-phase',
    description: 'Minimum viable 3-phase system.',
  },
  '3ph_standard': {
    label: '3-Phase Standard',
    batteryKwh: 120,
    inverterKw: 40,
    phase: '3-phase',
    description: 'Standard RoseStack 3-phase deployment.',
  },
  '3ph_optimal': {
    label: '3-Phase Optimal',
    batteryKwh: 192,
    inverterKw: 96,
    phase: '3-phase',
    description: 'High-throughput 3-phase system — sweet spot for RoseStack economics.',
  },
  '3ph_large': {
    label: '3-Phase Large',
    batteryKwh: 300,
    inverterKw: 100,
    phase: '3-phase',
    description: 'Large 3-phase system for farm/commercial properties.',
  },
};

// ============================================================
// Option builder
// ============================================================

function buildSizingOption(
  config: SystemConfig,
  exportLimitKw: number | undefined,
  inputs: SizingInputs,
  isRecommended: boolean,
): SizingOption {
  const constraints: string[] = [];
  const risks: string[] = [];

  // Determine effective export limit for this configuration
  let effectiveExportLimit = exportLimitKw;

  // Apply phase-specific limits
  if (config.phase === '1-phase') {
    // G98 threshold: 3.68kW (16A × 230V)
    const phaseExportCap = 3.68;
    if (config.inverterKw > phaseExportCap) {
      // G99 required: ENWL will likely impose 3.68kW per phase limit
      constraints.push(`G99 required: inverter ${config.inverterKw} kW exceeds G98 threshold (3.68 kW)`);
    }
    effectiveExportLimit = effectiveExportLimit !== undefined
      ? Math.min(effectiveExportLimit, phaseExportCap)
      : phaseExportCap;
  } else {
    // 3-phase G98 threshold: 11kW (16A × 400V × √3)
    // G99 required above 11kW
    if (config.inverterKw > 11) {
      constraints.push(`G99 required: 3-phase inverter ${config.inverterKw} kW exceeds 11 kW G98 threshold`);
    }
    // Connection fuse limit
    if (inputs.connectionFuseAmps !== undefined) {
      const fuseCapacityKw = (inputs.connectionFuseAmps * 400 * Math.sqrt(3)) / 1000;
      if (config.inverterKw > fuseCapacityKw) {
        const limited = Math.min(config.inverterKw, fuseCapacityKw);
        constraints.push(`Fuse limit: ${inputs.connectionFuseAmps}A fuse caps export at ${fuseCapacityKw.toFixed(0)} kW`);
        effectiveExportLimit = effectiveExportLimit !== undefined
          ? Math.min(effectiveExportLimit, limited)
          : limited;
      }
    }
  }

  // Zero export constraint
  if (exportLimitKw === 0) {
    constraints.push('Zero export: battery can only self-consume, no grid export revenue');
    risks.push('Zero export severely limits revenue — consider challenging G99 condition');
    effectiveExportLimit = 0;
  } else if (exportLimitKw !== undefined && exportLimitKw < config.inverterKw * 0.5) {
    risks.push(`Low export limit (${exportLimitKw} kW) significantly constrains revenue potential`);
  }

  // Solar interaction
  if ((inputs.solarKwp ?? 0) > 0) {
    const solarKwp = inputs.solarKwp!;
    if (solarKwp > config.inverterKw * 0.5) {
      constraints.push(`Solar ${solarKwp} kWp may exceed inverter headroom during summer peaks`);
    } else {
      constraints.push(`Solar ${solarKwp} kWp improves self-consumption, reduces import`);
    }
  }

  // Phase risks
  if (config.phase === '1-phase') {
    risks.push('Single-phase limits to 3.68 kW export — revenue significantly lower than 3-phase');
    risks.push('Battery cycling limited — payback may exceed 10 years at worst-case spreads');
  }

  // Compute AAF using IOF as primary tariff
  const aaf = calculateAafForTariff(
    {
      totalCapacityKwh: config.batteryKwh,
      maxChargeRateKw: config.inverterKw,
      maxDischargeRateKw: config.inverterKw,
      roundTripEfficiency: 0.92,
      exportLimitKw: effectiveExportLimit,
    },
    'IOF',
  );

  // Effective annual revenue-generating capacity
  const effectiveCapacityKwh = config.batteryKwh * aaf.capacityAaf;

  // Annual revenue estimates
  const estimatedAnnualRevenue = {
    likely: effectiveCapacityKwh * REVENUE_PER_KWH_EFFECTIVE.likely * aaf.powerAaf,
    best: effectiveCapacityKwh * REVENUE_PER_KWH_EFFECTIVE.best * aaf.powerAaf,
    worst: effectiveCapacityKwh * REVENUE_PER_KWH_EFFECTIVE.worst * aaf.powerAaf,
  };

  // CAPEX
  const batteryCost = config.batteryKwh * BATTERY_COST_PER_KWH;
  const inverterCost = getInverterCost(config.inverterKw, config.phase);
  const installCost = getInstallationCost(config.phase, config.batteryKwh);
  const g99Cost = config.inverterKw > (config.phase === '1-phase' ? 3.68 : 11)
    ? G99_APPLICATION_COST
    : 0;
  const estimatedCapex = batteryCost + inverterCost + installCost + g99Cost;

  // Payback months
  const estimatedPaybackMonths = {
    likely: estimatedAnnualRevenue.likely > 0
      ? Math.round((estimatedCapex / estimatedAnnualRevenue.likely) * 12)
      : 9999,
    best: estimatedAnnualRevenue.best > 0
      ? Math.round((estimatedCapex / estimatedAnnualRevenue.best) * 12)
      : 9999,
    worst: estimatedAnnualRevenue.worst > 0
      ? Math.round((estimatedCapex / estimatedAnnualRevenue.worst) * 12)
      : 9999,
  };

  return {
    label: config.label,
    batteryCapacityKwh: config.batteryKwh,
    inverterKw: config.inverterKw,
    phase: config.phase,
    estimatedCapex,
    aaf,
    estimatedAnnualRevenue,
    estimatedPaybackMonths,
    constraints,
    risks,
    recommended: isRecommended,
  };
}

// ============================================================
// G99 probability calculator
// ============================================================

export function calculateG99Probability(
  distanceToSubstationKm: number,
  substationLoadPercent: number,
  exportLimitKw: number,
): number {
  // Base probability — G99 approval is generally likely for residential
  let probability = 0.85;

  // Proximity to substation: further away = more likely to be approved
  // (less impact on local network)
  if (distanceToSubstationKm < 0.2) {
    probability -= 0.15; // Very close — higher risk of constraint
  } else if (distanceToSubstationKm < 0.5) {
    probability -= 0.05;
  } else if (distanceToSubstationKm > 1.0) {
    probability += 0.05;
  }

  // Substation load: heavily loaded substations less likely to approve high export
  if (substationLoadPercent >= 90) {
    probability -= 0.30; // Very loaded — likely to impose strict limits
  } else if (substationLoadPercent >= 75) {
    probability -= 0.15;
  } else if (substationLoadPercent >= 60) {
    probability -= 0.05;
  } else if (substationLoadPercent < 40) {
    probability += 0.05; // Plenty of headroom
  }

  // Export limit: if an export limit is already being requested/imposed
  // at 0 kW, this indicates a constrained network — approval still possible but harder
  if (exportLimitKw === 0) {
    probability -= 0.20;
  } else if (exportLimitKw < 10) {
    probability -= 0.10;
  }

  // Clamp to [0.05, 0.98]
  return Math.min(0.98, Math.max(0.05, probability));
}

// ============================================================
// Export limit risk assessment
// ============================================================

function assessExportLimitRisk(
  exportLimitKw: number | undefined,
  phase: '1-phase' | '3-phase',
  inverterKw: number,
): string {
  if (exportLimitKw === undefined) {
    // No limit imposed — standard G99 application pending
    return 'low';
  }

  if (exportLimitKw === 0) {
    return 'high';
  }

  const limitFraction = exportLimitKw / inverterKw;

  if (limitFraction < 0.25) return 'high';
  if (limitFraction < 0.5) return 'medium';
  if (limitFraction < 0.75) return 'low';
  return 'none';
}

// ============================================================
// Main sizing function
// ============================================================

export function sizeBatterySystem(inputs: SizingInputs): SizingResult {
  const {
    phase,
    peakDemandKw,
    annualConsumptionKwh,
    exportLimitKw,
    connectionFuseAmps,
    solarKwp,
    budget,
    targetPaybackMonths,
  } = inputs;

  const notes: string[] = [];

  // --- Determine primary configuration ---
  let primaryConfigKey: string;
  let alternativeConfigKey: string | undefined;

  if (phase === '1-phase') {
    // 1-phase is strongly discouraged for RoseStack economics
    notes.push(
      'Single-phase supply detected. RoseStack economics are significantly better with 3-phase. ' +
      'Consider whether property could be upgraded to 3-phase (typically £2,000-5,000 via DNO).',
    );

    if (exportLimitKw === 0) {
      primaryConfigKey = '1ph_small';
      notes.push('Zero export on 1-phase: minimum system only for self-consumption.');
    } else {
      primaryConfigKey = '1ph_standard';
      alternativeConfigKey = '1ph_small';
    }
  } else {
    // 3-phase: recommend based on budget and payback target
    const targetPayback = targetPaybackMonths ?? 84; // Default: 7-year target

    // Select primary based on budget
    if (budget !== undefined && budget < 60000) {
      primaryConfigKey = '3ph_entry';
      alternativeConfigKey = '3ph_standard';
    } else if (budget !== undefined && budget < 90000) {
      primaryConfigKey = '3ph_standard';
      alternativeConfigKey = '3ph_optimal';
    } else {
      // Default: recommend optimal
      primaryConfigKey = '3ph_optimal';
      alternativeConfigKey = '3ph_large';
    }

    // If peak demand is very high (farm/commercial), suggest large
    if (peakDemandKw > 60) {
      notes.push(
        `High peak demand (${peakDemandKw.toFixed(1)} kW) detected — large system may be appropriate.`,
      );
      if (primaryConfigKey === '3ph_optimal') {
        primaryConfigKey = '3ph_large';
        alternativeConfigKey = '3ph_optimal';
      }
    }

    // If export limit is very low, downsize
    if (exportLimitKw !== undefined && exportLimitKw < 20 && exportLimitKw > 0) {
      notes.push(
        `Low export limit (${exportLimitKw} kW) makes oversized inverter uneconomic. ` +
        'Recommending smaller inverter to match export headroom.',
      );
      primaryConfigKey = '3ph_entry';
      alternativeConfigKey = '3ph_standard';
    }
  }

  // Build the options
  const primaryConfig = SYSTEM_CONFIGS[primaryConfigKey];
  const primaryOption = buildSizingOption(primaryConfig, exportLimitKw, inputs, true);

  let alternativeOption: SizingOption | undefined;
  if (alternativeConfigKey) {
    const altConfig = SYSTEM_CONFIGS[alternativeConfigKey];
    alternativeOption = buildSizingOption(altConfig, exportLimitKw, inputs, false);
  }

  // --- G99 assessment ---
  const g99Threshold = phase === '1-phase' ? 3.68 : 11;
  const g99Required = primaryConfig.inverterKw > g99Threshold;

  // Estimate G99 probability (use defaults if substation data unavailable)
  // Default: moderate distance, moderate load
  const g99Probability = g99Required
    ? calculateG99Probability(
        0.5,    // Assume 500m to substation as default
        65,     // Assume 65% substation load as default
        exportLimitKw ?? primaryConfig.inverterKw,
      )
    : 1.0; // G98 — no G99 needed, automatically approved

  // --- Export limit risk ---
  const exportLimitRisk = assessExportLimitRisk(
    exportLimitKw,
    primaryConfig.phase,
    primaryConfig.inverterKw,
  );

  // Additional context notes
  if (annualConsumptionKwh > 0) {
    const batteryToConsumptionRatio = primaryConfig.batteryKwh / (annualConsumptionKwh / 365);
    notes.push(
      `Battery capacity (${primaryConfig.batteryKwh} kWh) is ` +
      `${batteryToConsumptionRatio.toFixed(1)}× the daily average consumption ` +
      `(${(annualConsumptionKwh / 365).toFixed(0)} kWh/day).`,
    );
  }

  if (solarKwp !== undefined && solarKwp > 0) {
    notes.push(
      `Solar ${solarKwp} kWp present. Battery will capture excess generation and reduce import.`,
    );
  }

  if (g99Required) {
    notes.push(
      `G99 connection application required (ENWL). Estimated approval probability: ` +
      `${(g99Probability * 100).toFixed(0)}%. Allow 3-6 months for ENWL determination.`,
    );
  }

  if (exportLimitRisk === 'high') {
    notes.push(
      'High export limit risk detected. Revenue projections assume constrained export — ' +
      'challenge export limit conditions via ENWL appeals process if possible.',
    );
  }

  return {
    primaryOption,
    alternativeOption,
    g99Required,
    g99Probability,
    exportLimitRisk,
    notes,
  };
}
