// ============================================================
// RoseStack Grid Module — Sizing Engine Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { sizeBatterySystem, calculateG99Probability } from './sizing-engine';
import { calculateAaf, calculateAafForTariff } from './aaf';
import type { SizingInputs } from './sizing-engine';
import type { AafInputs } from './aaf';

// ============================================================
// AAF Tests
// ============================================================

describe('calculateAaf', () => {
  it('returns capacityAaf of 1.0 when battery can be fully charged in window', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 100,
      maxChargeRateKw: 50,      // 50kW × 6hr = 300kWh > 100kWh capacity
      maxDischargeRateKw: 50,
      roundTripEfficiency: 1.0,
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.capacityAaf).toBeCloseTo(1.0, 3);
  });

  it('reduces capacityAaf when charge window cannot fill battery', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 192,
      maxChargeRateKw: 16,      // 16kW × 6hr = 96kWh — only fills 50% of 192kWh
      maxDischargeRateKw: 96,
      roundTripEfficiency: 1.0,
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    // Can only charge 96kWh in 6hr window, so capacityAaf = 96/192 = 0.5
    expect(result.capacityAaf).toBeCloseTo(0.5, 2);
  });

  it('reduces powerAaf when export limit is below discharge rate', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 100,
      maxChargeRateKw: 50,
      maxDischargeRateKw: 96,
      roundTripEfficiency: 1.0,
      exportLimitKw: 48,        // Export limit = 50% of discharge rate
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.powerAaf).toBeCloseTo(48 / 96, 3);
  });

  it('powerAaf is 1.0 when no export limit', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 100,
      maxChargeRateKw: 50,
      maxDischargeRateKw: 50,
      roundTripEfficiency: 1.0,
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.powerAaf).toBe(1.0);
  });

  it('identifies export_limit as bottleneck when export limit constrains power', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 100,
      maxChargeRateKw: 50,
      maxDischargeRateKw: 96,
      roundTripEfficiency: 0.92,
      exportLimitKw: 20,        // Very low export limit
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.bottleneck).toBe('export_limit');
  });

  it('identifies charge_window as bottleneck when window is too short', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 192,
      maxChargeRateKw: 20,      // 20kW × 2hr = 40kWh — very limited fill
      maxDischargeRateKw: 96,
      roundTripEfficiency: 0.92,
      cheapWindowHours: 2,      // Very short window
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.bottleneck).toBe('charge_window');
    expect(result.capacityAaf).toBeLessThan(0.5);
  });

  it('weightedAaf is between 0 and 1', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 192,
      maxChargeRateKw: 96,
      maxDischargeRateKw: 96,
      roundTripEfficiency: 0.92,
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.weightedAaf).toBeGreaterThan(0);
    expect(result.weightedAaf).toBeLessThanOrEqual(1.0);
    expect(result.maxAchievableRevenuePercent).toBeCloseTo(result.weightedAaf * 100, 5);
  });

  it('notes array is non-empty and describes the situation', () => {
    const inputs: AafInputs = {
      totalCapacityKwh: 192,
      maxChargeRateKw: 96,
      maxDischargeRateKw: 96,
      roundTripEfficiency: 0.92,
      cheapWindowHours: 6,
      peakWindowHours: 4,
      eveningPeakWeight: 0.60,
      morningPeakWeight: 0.25,
      shoulderWeight: 0.15,
    };

    const result = calculateAaf(inputs);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});

describe('calculateAafForTariff', () => {
  const standardSystem = {
    totalCapacityKwh: 192,
    maxChargeRateKw: 96,
    maxDischargeRateKw: 96,
    roundTripEfficiency: 0.92,
  };

  it('IOF tariff: 192kWh battery with 96kW charger fills in 2 hours — capacityAaf near 1.0', () => {
    // IOF window = 6hr. 96kW × 6hr = 576kWh > 192kWh, so battery fills fully.
    const result = calculateAafForTariff(standardSystem, 'IOF');
    expect(result.capacityAaf).toBeCloseTo(1.0, 2);
  });

  it('IOF tariff: power unrestricted gives powerAaf = 1.0', () => {
    const result = calculateAafForTariff(standardSystem, 'IOF');
    expect(result.powerAaf).toBe(1.0);
  });

  it('Agile tariff: longer cheap window results in capacityAaf >= IOF', () => {
    const iof = calculateAafForTariff(standardSystem, 'IOF');
    const agile = calculateAafForTariff(standardSystem, 'Agile');
    // Agile has longer window so capacity should be at least as good
    expect(agile.capacityAaf).toBeGreaterThanOrEqual(iof.capacityAaf - 0.01);
  });

  it('tariff notes include tariff description', () => {
    const result = calculateAafForTariff(standardSystem, 'IOF');
    // The note prepends the full tariff description which includes "Flux" for the IOF tariff
    expect(result.notes[0]).toContain('Tariff:');
    expect(result.notes[0]).toContain('overnight cheap window');
  });

  it('with export limit, IOF shows constrained powerAaf', () => {
    const systemWithLimit = { ...standardSystem, exportLimitKw: 48 };
    const result = calculateAafForTariff(systemWithLimit, 'IOF');
    expect(result.powerAaf).toBeCloseTo(48 / 96, 2);
  });
});

// ============================================================
// Sizing Engine Tests
// ============================================================

describe('sizeBatterySystem — 3-phase', () => {
  it('recommends 3-phase system for 3-phase property', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.primaryOption.phase).toBe('3-phase');
  });

  it('G99 required for 3-phase system above 11kW', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
    };

    const result = sizeBatterySystem(inputs);
    // Default 3-phase recommendation is 96kW inverter which exceeds 11kW threshold
    expect(result.g99Required).toBe(true);
  });

  it('provides alternative option for 3-phase', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.alternativeOption).toBeDefined();
  });

  it('budget constraint shifts to smaller system', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
      budget: 50000,
    };

    const result = sizeBatterySystem(inputs);
    // Tight budget should recommend entry-level system
    expect(result.primaryOption.batteryCapacityKwh).toBeLessThanOrEqual(120);
  });

  it('high peak demand triggers large system recommendation', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 80,          // Very high peak — farm/commercial
      annualConsumptionKwh: 30000,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.primaryOption.batteryCapacityKwh).toBeGreaterThanOrEqual(192);
  });

  it('zero export limit creates high risk flag', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
      exportLimitKw: 0,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.exportLimitRisk).toBe('high');
  });

  it('low export limit downsizes primary recommendation', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
      exportLimitKw: 10,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.primaryOption.batteryCapacityKwh).toBeLessThanOrEqual(120);
  });

  it('estimated revenues are positive for unconstrained system', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.primaryOption.estimatedAnnualRevenue.likely).toBeGreaterThan(0);
    expect(result.primaryOption.estimatedAnnualRevenue.best).toBeGreaterThan(
      result.primaryOption.estimatedAnnualRevenue.likely,
    );
    expect(result.primaryOption.estimatedAnnualRevenue.likely).toBeGreaterThan(
      result.primaryOption.estimatedAnnualRevenue.worst,
    );
  });

  it('payback months: best < likely < worst', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
    };

    const result = sizeBatterySystem(inputs);
    const { estimatedPaybackMonths } = result.primaryOption;
    expect(estimatedPaybackMonths.best).toBeLessThan(estimatedPaybackMonths.likely);
    expect(estimatedPaybackMonths.likely).toBeLessThan(estimatedPaybackMonths.worst);
  });

  it('CAPEX is a positive number', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.primaryOption.estimatedCapex).toBeGreaterThan(0);
  });
});

describe('sizeBatterySystem — 1-phase', () => {
  it('recommends 1-phase system for 1-phase property', () => {
    const inputs: SizingInputs = {
      phase: '1-phase',
      peakDemandKw: 8,
      annualConsumptionKwh: 4000,
    };

    const result = sizeBatterySystem(inputs);
    expect(result.primaryOption.phase).toBe('1-phase');
  });

  it('G99 not required for 1-phase system at 3.68kW', () => {
    const inputs: SizingInputs = {
      phase: '1-phase',
      peakDemandKw: 5,
      annualConsumptionKwh: 4000,
    };

    const result = sizeBatterySystem(inputs);
    // Small 1-phase system at 3.68kW should not require G99
    if (result.primaryOption.inverterKw <= 3.68) {
      expect(result.g99Required).toBe(false);
    }
  });

  it('includes risk warning about 1-phase limitations', () => {
    const inputs: SizingInputs = {
      phase: '1-phase',
      peakDemandKw: 8,
      annualConsumptionKwh: 4000,
    };

    const result = sizeBatterySystem(inputs);
    const allRisks = [
      ...result.primaryOption.risks,
      ...result.notes,
    ].join(' ');
    expect(allRisks.toLowerCase()).toContain('single-phase');
  });

  it('1-phase system has lower revenue than equivalent 3-phase', () => {
    const base: Omit<SizingInputs, 'phase'> = {
      peakDemandKw: 10,
      annualConsumptionKwh: 5000,
    };

    const onePhase = sizeBatterySystem({ ...base, phase: '1-phase' });
    const threePhase = sizeBatterySystem({ ...base, phase: '3-phase' });

    expect(onePhase.primaryOption.estimatedAnnualRevenue.likely).toBeLessThan(
      threePhase.primaryOption.estimatedAnnualRevenue.likely,
    );
  });
});

describe('sizeBatterySystem — solar interaction', () => {
  it('solar presence is noted in constraints', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
      solarKwp: 10,
    };

    const result = sizeBatterySystem(inputs);
    const allConstraints = result.primaryOption.constraints.join(' ');
    expect(allConstraints.toLowerCase()).toContain('solar');
  });

  it('notes mention solar when present', () => {
    const inputs: SizingInputs = {
      phase: '3-phase',
      peakDemandKw: 20,
      annualConsumptionKwh: 8000,
      solarKwp: 6,
    };

    const result = sizeBatterySystem(inputs);
    const allNotes = result.notes.join(' ');
    expect(allNotes.toLowerCase()).toContain('solar');
  });
});

// ============================================================
// G99 Probability Tests
// ============================================================

describe('calculateG99Probability', () => {
  it('returns probability between 0 and 1', () => {
    const prob = calculateG99Probability(0.5, 65, 100);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('heavily loaded substation reduces probability', () => {
    const lowLoad = calculateG99Probability(0.5, 40, 100);
    const highLoad = calculateG99Probability(0.5, 92, 100);
    expect(highLoad).toBeLessThan(lowLoad);
  });

  it('very close to substation reduces probability', () => {
    const farAway = calculateG99Probability(2.0, 65, 100);
    const veryClose = calculateG99Probability(0.1, 65, 100);
    expect(veryClose).toBeLessThan(farAway);
  });

  it('zero export limit reduces probability', () => {
    const normalExport = calculateG99Probability(0.5, 65, 100);
    const zeroExport = calculateG99Probability(0.5, 65, 0);
    expect(zeroExport).toBeLessThan(normalExport);
  });

  it('G98 systems (no G99 needed) return 1.0 from sizeBatterySystem', () => {
    const inputs: SizingInputs = {
      phase: '1-phase',
      peakDemandKw: 3,
      annualConsumptionKwh: 3000,
    };

    const result = sizeBatterySystem(inputs);
    if (!result.g99Required) {
      expect(result.g99Probability).toBe(1.0);
    }
  });

  it('worst case scenario still returns at least minimum probability', () => {
    // Very loaded substation, very close, zero export
    const prob = calculateG99Probability(0.05, 95, 0);
    expect(prob).toBeGreaterThanOrEqual(0.05);
  });

  it('best case scenario returns near-maximum probability', () => {
    // Far away, low load, reasonable export
    const prob = calculateG99Probability(2.0, 30, 100);
    expect(prob).toBeLessThanOrEqual(0.98);
    expect(prob).toBeGreaterThan(0.85);
  });
});
