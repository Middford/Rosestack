// ============================================================
// RoseStack Grid Module — AAF (Arbitrage Availability Factor)
//
// AAF = the fraction of the theoretical maximum arbitrage revenue
// that is actually achievable given the battery system's physical
// constraints (charge rate, capacity, G99 export limits).
// ============================================================

export interface AafInputs {
  // Battery system
  totalCapacityKwh: number;
  maxChargeRateKw: number;
  maxDischargeRateKw: number;
  roundTripEfficiency: number;
  exportLimitKw?: number;           // G99 export limit, if applicable

  // Tariff/dispatch profile
  cheapWindowHours: number;         // How many hours per day of cheap rate (e.g., 6hr overnight on IOF)
  peakWindowHours: number;          // How many hours per day of peak/export opportunity
  shoulderWindowHours?: number;     // Optional shoulder window

  // Revenue window weights (must sum to 1.0)
  eveningPeakWeight: number;        // Default 0.60
  morningPeakWeight: number;        // Default 0.25
  shoulderWeight: number;           // Default 0.15
}

export interface AafResult {
  capacityAaf: number;      // Fraction of capacity usable given charge window
  powerAaf: number;         // Fraction of max power achievable given export limit
  weightedAaf: number;      // Combined AAF weighted by window weights
  bottleneck: 'capacity' | 'power' | 'charge_window' | 'export_limit';
  maxAchievableRevenuePercent: number;  // = weightedAaf × 100
  notes: string[];          // Explains limiting factors
}

// ============================================================
// Tariff profile definitions
// ============================================================

interface TariffProfile {
  cheapWindowHours: number;
  peakWindowHours: number;
  shoulderWindowHours: number;
  eveningPeakWeight: number;
  morningPeakWeight: number;
  shoulderWeight: number;
  description: string;
}

const TARIFF_PROFILES: Record<'IOF' | 'Flux' | 'Agile', TariffProfile> = {
  IOF: {
    // Intelligent Octopus Flux: overnight cheap 23:30-05:30 (6 hours)
    cheapWindowHours: 6,
    peakWindowHours: 4,         // Morning + evening peak windows
    shoulderWindowHours: 14,    // Remaining daytime hours
    eveningPeakWeight: 0.60,
    morningPeakWeight: 0.25,
    shoulderWeight: 0.15,
    description: 'Intelligent Octopus Flux — 6hr overnight cheap window',
  },
  Flux: {
    // Octopus Flux: similar structure, peak + cheap windows
    cheapWindowHours: 6,
    peakWindowHours: 4,
    shoulderWindowHours: 14,
    eveningPeakWeight: 0.60,
    morningPeakWeight: 0.25,
    shoulderWeight: 0.15,
    description: 'Octopus Flux — 6hr overnight cheap window',
  },
  Agile: {
    // Octopus Agile: variable price, typically 8-12 cheapest slots available
    cheapWindowHours: 10,       // Average of cheapest 10 slots per day
    peakWindowHours: 6,         // Evening peak (4-7pm typically)
    shoulderWindowHours: 8,
    eveningPeakWeight: 0.65,
    morningPeakWeight: 0.20,
    shoulderWeight: 0.15,
    description: 'Octopus Agile — dynamic pricing, ~10hr cheap window average',
  },
};

// ============================================================
// Core AAF calculation
// ============================================================

export function calculateAaf(inputs: AafInputs): AafResult {
  const {
    totalCapacityKwh,
    maxChargeRateKw,
    maxDischargeRateKw,
    roundTripEfficiency,
    exportLimitKw,
    cheapWindowHours,
    eveningPeakWeight,
    morningPeakWeight,
    shoulderWeight,
  } = inputs;

  const notes: string[] = [];

  // --- Capacity AAF ---
  // How much of the battery can actually be charged in the available cheap window?
  // Max energy deliverable in cheap window = chargeRate × cheapWindowHours
  const maxChargableInWindowKwh = maxChargeRateKw * cheapWindowHours;

  // The effective capacity we can fill
  const effectiveChargeKwh = Math.min(maxChargableInWindowKwh, totalCapacityKwh);

  // Account for round-trip efficiency: we need more input than we discharge
  // If we charge X kWh at efficiency η, we get X×η kWh back out
  const effectiveDischargeKwh = effectiveChargeKwh * roundTripEfficiency;

  // Theoretical max discharge = full battery × efficiency (if we could always fill 100%)
  const theoreticalMaxDischargeKwh = totalCapacityKwh * roundTripEfficiency;

  const capacityAaf = theoreticalMaxDischargeKwh > 0
    ? Math.min(effectiveDischargeKwh / theoreticalMaxDischargeKwh, 1.0)
    : 0;

  if (maxChargableInWindowKwh < totalCapacityKwh) {
    const deficit = totalCapacityKwh - maxChargableInWindowKwh;
    notes.push(
      `Charge window limits fill: ${maxChargableInWindowKwh.toFixed(0)} kWh chargeable ` +
      `vs ${totalCapacityKwh.toFixed(0)} kWh capacity (${deficit.toFixed(0)} kWh unused).`,
    );
  }

  // --- Power AAF ---
  // What fraction of discharge power can we actually deliver given the export limit?
  const effectiveDischargeKw = exportLimitKw !== undefined
    ? Math.min(exportLimitKw, maxDischargeRateKw)
    : maxDischargeRateKw;

  const powerAaf = maxDischargeRateKw > 0
    ? Math.min(effectiveDischargeKw / maxDischargeRateKw, 1.0)
    : 0;

  if (exportLimitKw !== undefined && exportLimitKw < maxDischargeRateKw) {
    notes.push(
      `G99 export limit of ${exportLimitKw.toFixed(1)} kW restricts ` +
      `discharge from ${maxDischargeRateKw.toFixed(1)} kW to ${effectiveDischargeKw.toFixed(1)} kW.`,
    );
  }

  // --- Weighted AAF ---
  // The combined AAF combines capacity and power constraints, weighted by revenue windows.
  // Evening peak carries most revenue weight (typically 60%).
  // The power AAF limits what we can earn during each window.
  // The capacity AAF limits how much energy is available across the day.
  const combinedAaf = capacityAaf * powerAaf;

  // Weight by revenue windows
  const weightSum = eveningPeakWeight + morningPeakWeight + shoulderWeight;
  const normalisedEveningWeight = eveningPeakWeight / weightSum;
  const normalisedMorningWeight = morningPeakWeight / weightSum;
  const normalisedShoulderWeight = shoulderWeight / weightSum;

  // Evening peak often uses most of the battery, morning uses remainder
  // For simplicity, model evening as using capacityAaf × powerAaf fully,
  // morning as using remaining capacity (if any) × powerAaf
  const eveningCapacityFraction = Math.min(capacityAaf, 1.0);
  const morningCapacityFraction = Math.min(Math.max(capacityAaf - eveningCapacityFraction * 0.6, 0) / 0.4, 1.0);
  const shoulderCapacityFraction = capacityAaf * 0.5; // Shoulder export lower opportunity

  const weightedAaf =
    normalisedEveningWeight * eveningCapacityFraction * powerAaf +
    normalisedMorningWeight * morningCapacityFraction * powerAaf +
    normalisedShoulderWeight * shoulderCapacityFraction * powerAaf;

  // --- Bottleneck identification ---
  let bottleneck: AafResult['bottleneck'];

  if (exportLimitKw !== undefined && exportLimitKw < maxDischargeRateKw && powerAaf < capacityAaf) {
    bottleneck = 'export_limit';
    notes.push('Primary bottleneck: G99 export limit restricts power delivery.');
  } else if (maxChargableInWindowKwh < totalCapacityKwh) {
    if (capacityAaf < 0.8) {
      bottleneck = 'charge_window';
      notes.push('Primary bottleneck: Cheap window too short to fully charge battery.');
    } else {
      bottleneck = 'capacity';
      notes.push('Primary bottleneck: Battery capacity partially constrained by charge window.');
    }
  } else if (powerAaf < 0.95) {
    bottleneck = 'power';
    notes.push('Primary bottleneck: Power delivery constrained by export limit or inverter rating.');
  } else {
    bottleneck = 'capacity';
    notes.push('System operating near theoretical maximum — minimal bottleneck.');
  }

  // Add efficiency note if significant losses
  if (roundTripEfficiency < 0.92) {
    notes.push(
      `Round-trip efficiency of ${(roundTripEfficiency * 100).toFixed(0)}% reduces effective output.`,
    );
  }

  return {
    capacityAaf,
    powerAaf,
    weightedAaf,
    bottleneck,
    maxAchievableRevenuePercent: weightedAaf * 100,
    notes,
  };
}

// ============================================================
// Convenience wrapper for common tariff types
// ============================================================

export function calculateAafForTariff(
  system: {
    totalCapacityKwh: number;
    maxChargeRateKw: number;
    maxDischargeRateKw: number;
    roundTripEfficiency: number;
    exportLimitKw?: number;
  },
  tariffType: 'IOF' | 'Flux' | 'Agile',
): AafResult {
  const profile = TARIFF_PROFILES[tariffType];

  const inputs: AafInputs = {
    ...system,
    cheapWindowHours: profile.cheapWindowHours,
    peakWindowHours: profile.peakWindowHours,
    shoulderWindowHours: profile.shoulderWindowHours,
    eveningPeakWeight: profile.eveningPeakWeight,
    morningPeakWeight: profile.morningPeakWeight,
    shoulderWeight: profile.shoulderWeight,
  };

  const result = calculateAaf(inputs);

  // Prepend tariff description to notes
  result.notes.unshift(`Tariff: ${profile.description}`);

  return result;
}

// ============================================================
// Example calculations (exported for documentation / testing)
// ============================================================

// Standard RoseStack 3-phase system: 192 kWh, 96 kW charger
export const STANDARD_SYSTEM_AAF_IOF = () =>
  calculateAafForTariff(
    {
      totalCapacityKwh: 192,
      maxChargeRateKw: 96,
      maxDischargeRateKw: 96,
      roundTripEfficiency: 0.92,
    },
    'IOF',
  );
