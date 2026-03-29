import { describe, it, expect } from 'vitest';
import {
  calculateRevenueBreakdown,
  calculateThreeScenarioRevenue,
  compareTariffs,
} from '@/modules/tariffs/calculator';
import { ALL_TARIFFS } from '@/modules/tariffs/data';
import type { BatterySystem, Tariff } from '@/shared/types';

// --- Test fixtures ---

const testSystem: BatterySystem = {
  id: 'test-system',
  homeId: 'test-home',
  inverterModel: 'Sigenergy M1',
  batteryModules: 17,
  totalCapacityKwh: 204,
  batteryChemistry: 'LFP',
  solarPvKwp: 10,
  installCost: 47800,
  annualMaintenanceCost: 400,
  warrantyYears: 15,
  degradationRatePercent: 2,
  maxChargeRateKw: 100,
  maxDischargeRateKw: 100,
  roundTripEfficiency: 0.92,
};

const smallSystem: BatterySystem = {
  id: 'small-system',
  homeId: 'test-home',
  inverterModel: 'GivEnergy',
  batteryModules: 5,
  totalCapacityKwh: 50,
  batteryChemistry: 'LFP',
  installCost: 15000,
  annualMaintenanceCost: 200,
  warrantyYears: 10,
  degradationRatePercent: 2,
  maxChargeRateKw: 25,
  maxDischargeRateKw: 10,
  roundTripEfficiency: 0.90,
};

const iofTariff: Tariff = {
  id: 'iof-test',
  supplier: 'Octopus Energy',
  name: 'Intelligent Octopus Flux',
  type: 'flux',
  importRates: [
    { periodStart: '19:00', periodEnd: '16:00', ratePencePerKwh: 24.27 },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 32.36 },
  ],
  exportRates: [
    { periodStart: '19:00', periodEnd: '16:00', ratePencePerKwh: 24.27 },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 32.36 },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2026-03-01'),
};

const fluxTariff: Tariff = {
  id: 'flux-test',
  supplier: 'Octopus Energy',
  name: 'Octopus Flux',
  type: 'flux',
  importRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 17.90 },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 29.83 },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 41.77 },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 29.83 },
  ],
  exportRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 5.12 },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 10.54 },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 30.68 },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 10.54 },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2026-03-01'),
};

// --- Tests ---

describe('calculateRevenueBreakdown', () => {
  it('should return all required fields', () => {
    const result = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    expect(result).toHaveProperty('dailyArbitragePence');
    expect(result).toHaveProperty('dailyArbitrageGbp');
    expect(result).toHaveProperty('monthlyArbitrageGbp');
    expect(result).toHaveProperty('annualArbitrageGbp');
    expect(result).toHaveProperty('annualSavingSessionsGbp');
    expect(result).toHaveProperty('annualFlexibilityGbp');
    expect(result).toHaveProperty('annualSegGbp');
    expect(result).toHaveProperty('totalAnnualGbp');
    expect(result).toHaveProperty('totalMonthlyGbp');
    expect(result).toHaveProperty('totalDailyGbp');
  });

  it('should produce positive revenue for a 204kWh system on IOF', () => {
    const result = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    expect(result.totalAnnualGbp).toBeGreaterThan(0);
    expect(result.annualArbitrageGbp).toBeGreaterThan(0);
  });

  it('monthly revenue should be annual / 12', () => {
    const result = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    expect(result.totalMonthlyGbp).toBeCloseTo(result.totalAnnualGbp / 12, 1);
  });

  it('daily revenue should be annual / 365', () => {
    const result = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    expect(result.totalDailyGbp).toBeCloseTo(result.totalAnnualGbp / 365, 1);
  });

  it('more cycles should yield more revenue', () => {
    const result2 = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    const result3 = calculateRevenueBreakdown(testSystem, iofTariff, 3.0);
    expect(result3.annualArbitrageGbp).toBeGreaterThan(result2.annualArbitrageGbp);
  });

  it('larger system should earn more arbitrage revenue than smaller system', () => {
    const large = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    const small = calculateRevenueBreakdown(smallSystem, iofTariff, 2.0);
    expect(large.annualArbitrageGbp).toBeGreaterThan(small.annualArbitrageGbp);
  });

  it('should include solar SEG revenue when solarPvKwp is set', () => {
    const withSolar = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    const withoutSolar = calculateRevenueBreakdown({ ...testSystem, solarPvKwp: undefined }, iofTariff, 2.0);
    expect(withSolar.annualSegGbp).toBeGreaterThan(0);
    expect(withoutSolar.annualSegGbp).toBe(0);
  });

  it('should exclude grid services when includeGridServices is false', () => {
    const with_ = calculateRevenueBreakdown(testSystem, iofTariff, 2.0, true);
    const without = calculateRevenueBreakdown(testSystem, iofTariff, 2.0, false);
    expect(with_.annualSavingSessionsGbp).toBeGreaterThan(0);
    expect(without.annualSavingSessionsGbp).toBe(0);
    expect(without.annualFlexibilityGbp).toBe(0);
  });

  it('Flux tariff should give higher arbitrage than IOF for standalone battery (no solar)', () => {
    const noSolarSystem = { ...testSystem, solarPvKwp: undefined };
    const iof = calculateRevenueBreakdown(noSolarSystem, iofTariff, 2.0, false);
    const flux = calculateRevenueBreakdown(noSolarSystem, fluxTariff, 2.0, false);
    // Flux has lower off-peak import (17.90p vs 24.27p) so spread is wider
    expect(flux.annualArbitrageGbp).toBeGreaterThan(iof.annualArbitrageGbp);
  });

  it('all revenue values should be rounded to 2 decimal places', () => {
    const result = calculateRevenueBreakdown(testSystem, iofTariff, 2.0);
    const checkRounding = (n: number) => Math.abs(n - Math.round(n * 100) / 100) < 0.001;
    expect(checkRounding(result.dailyArbitrageGbp)).toBe(true);
    expect(checkRounding(result.monthlyArbitrageGbp)).toBe(true);
    expect(checkRounding(result.annualArbitrageGbp)).toBe(true);
    expect(checkRounding(result.totalAnnualGbp)).toBe(true);
  });
});

describe('calculateThreeScenarioRevenue', () => {
  it('should return best, likely, and worst scenarios', () => {
    const result = calculateThreeScenarioRevenue(testSystem, iofTariff);
    expect(result).toHaveProperty('best');
    expect(result).toHaveProperty('likely');
    expect(result).toHaveProperty('worst');
  });

  it('best scenario should have more revenue than likely which has more than worst', () => {
    const result = calculateThreeScenarioRevenue(testSystem, iofTariff);
    expect(result.best.annualArbitrageGbp).toBeGreaterThan(result.likely.annualArbitrageGbp);
    expect(result.likely.annualArbitrageGbp).toBeGreaterThan(result.worst.annualArbitrageGbp);
  });

  it('worst case excludes grid services', () => {
    const result = calculateThreeScenarioRevenue(testSystem, iofTariff);
    expect(result.worst.annualSavingSessionsGbp).toBe(0);
    expect(result.worst.annualFlexibilityGbp).toBe(0);
  });

  it('best case includes grid services', () => {
    const result = calculateThreeScenarioRevenue(testSystem, iofTariff);
    expect(result.best.annualSavingSessionsGbp).toBeGreaterThan(0);
    expect(result.best.annualFlexibilityGbp).toBeGreaterThan(0);
  });

  it('all revenue values should be positive', () => {
    const result = calculateThreeScenarioRevenue(testSystem, iofTariff);
    expect(result.best.totalAnnualGbp).toBeGreaterThan(0);
    expect(result.likely.totalAnnualGbp).toBeGreaterThan(0);
    expect(result.worst.totalAnnualGbp).toBeGreaterThan(0);
  });
});

describe('compareTariffs', () => {
  it('should rank tariffs and return results for each', () => {
    const tariffs = ALL_TARIFFS.slice(0, 3);
    const results = compareTariffs(testSystem, tariffs);
    expect(results).toHaveLength(3);
    expect(results[0].rank).toBe(1);
    expect(results[1].rank).toBe(2);
    expect(results[2].rank).toBe(3);
  });

  it('should rank by likely annual revenue descending', () => {
    const tariffs = ALL_TARIFFS.slice(0, 3);
    const results = compareTariffs(testSystem, tariffs);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].revenue.likely.totalAnnualGbp).toBeGreaterThanOrEqual(
        results[i + 1].revenue.likely.totalAnnualGbp,
      );
    }
  });

  it('should return spread in pence for each tariff', () => {
    const tariffs = ALL_TARIFFS.slice(0, 2);
    const results = compareTariffs(testSystem, tariffs);
    for (const result of results) {
      expect(result.spreadPence).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return three scenarios per tariff', () => {
    const tariffs = ALL_TARIFFS.slice(0, 2);
    const results = compareTariffs(testSystem, tariffs);
    for (const result of results) {
      expect(result.revenue.best).toBeDefined();
      expect(result.revenue.likely).toBeDefined();
      expect(result.revenue.worst).toBeDefined();
    }
  });
});
