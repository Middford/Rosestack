import { describe, it, expect } from 'vitest';
import {
  calculateScenario,
  calculateAllScenarios,
  summariseScenarios,
  formatGbp,
  formatPaybackRange,
  getDscrStatus,
  calculateDailyArbitrageSpreadPence,
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
} from '@/shared/utils/scenarios';
import type { BatterySystem, Tariff } from '@/shared/types';

// --- Test fixtures ---

const testSystem: BatterySystem = {
  id: 'test-system-1',
  homeId: 'test-home-1',
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

const testTariff: Tariff = {
  id: 'test-tariff-iof',
  supplier: 'Octopus Energy',
  name: 'Intelligent Octopus Flux',
  type: 'flux',
  importRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 11.44 }, // cheap overnight
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 24.50 }, // daytime
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 39.44 }, // peak
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 24.50 }, // evening
  ],
  exportRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 4.10 },  // overnight
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 16.30 }, // daytime
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 28.30 }, // peak export
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 16.30 }, // evening
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2024-01-01'),
};

// Smaller system for simpler calculations
const smallSystem: BatterySystem = {
  id: 'test-system-small',
  homeId: 'test-home-2',
  inverterModel: 'GivEnergy Giv-HY',
  batteryModules: 5,
  totalCapacityKwh: 50,
  batteryChemistry: 'LFP',
  installCost: 15000,
  annualMaintenanceCost: 200,
  warrantyYears: 10,
  degradationRatePercent: 2,
  maxChargeRateKw: 25,
  maxDischargeRateKw: 25,
  roundTripEfficiency: 0.90,
};

// --- Tests ---

describe('Scenario Defaults', () => {
  it('should have correct scenario types', () => {
    expect(BEST_CASE_DEFAULTS.type).toBe('best');
    expect(LIKELY_CASE_DEFAULTS.type).toBe('likely');
    expect(WORST_CASE_DEFAULTS.type).toBe('worst');
  });

  it('best case should have more optimistic values than worst case', () => {
    expect(BEST_CASE_DEFAULTS.energyInflationPercent).toBeGreaterThan(WORST_CASE_DEFAULTS.energyInflationPercent);
    expect(BEST_CASE_DEFAULTS.batteryDegradationPercent).toBeLessThan(WORST_CASE_DEFAULTS.batteryDegradationPercent);
    expect(BEST_CASE_DEFAULTS.savingSessionsPerYear).toBeGreaterThan(WORST_CASE_DEFAULTS.savingSessionsPerYear);
    expect(BEST_CASE_DEFAULTS.cyclesPerDay).toBeGreaterThan(WORST_CASE_DEFAULTS.cyclesPerDay);
    expect(BEST_CASE_DEFAULTS.flexibilityRevenuePerHomePerYear).toBeGreaterThan(WORST_CASE_DEFAULTS.flexibilityRevenuePerHomePerYear);
  });

  it('likely case should be between best and worst', () => {
    expect(LIKELY_CASE_DEFAULTS.cyclesPerDay).toBeGreaterThan(WORST_CASE_DEFAULTS.cyclesPerDay);
    expect(LIKELY_CASE_DEFAULTS.cyclesPerDay).toBeLessThan(BEST_CASE_DEFAULTS.cyclesPerDay);
    expect(LIKELY_CASE_DEFAULTS.batteryDegradationPercent).toBeGreaterThan(BEST_CASE_DEFAULTS.batteryDegradationPercent);
    expect(LIKELY_CASE_DEFAULTS.batteryDegradationPercent).toBeLessThan(WORST_CASE_DEFAULTS.batteryDegradationPercent);
  });
});

describe('calculateDailyArbitrageSpreadPence', () => {
  it('should calculate spread between cheapest import and highest export', () => {
    const spread = calculateDailyArbitrageSpreadPence(testTariff);
    // Highest export: 28.30p, cheapest import: 11.44p => spread = 16.86p
    expect(spread).toBeCloseTo(16.86, 1);
  });
});

describe('calculateScenario', () => {
  it('should return 10 years of projections by default', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS);
    expect(result).toHaveLength(10);
    expect(result[0].year).toBe(1);
    expect(result[9].year).toBe(10);
  });

  it('should return custom number of years', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS, 20);
    expect(result).toHaveLength(20);
  });

  it('should show battery degradation over time', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS);
    expect(result[0].batteryCapacityRemaining).toBeGreaterThan(result[9].batteryCapacityRemaining);
    // 2% per year for 10 years = 80% remaining
    expect(result[9].batteryCapacityRemaining).toBeCloseTo(80, 0);
  });

  it('should accumulate cumulative revenue', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS);
    for (let i = 1; i < result.length; i++) {
      // If net revenue is positive, cumulative should increase
      if (result[i].netRevenue > 0) {
        expect(result[i].cumulativeRevenue).toBeGreaterThan(result[i - 1].cumulativeRevenue);
      }
    }
  });

  it('should generate positive gross revenue for a 204kWh system on IOF', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS);
    // A 204kWh system on IOF should generate significant revenue
    expect(result[0].grossRevenue).toBeGreaterThan(5000);
  });

  it('should deduct homeowner payment of £1200/year', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS);
    expect(result[0].homeownerPayment).toBe(1200);
  });

  it('should show increasing ROI over time for profitable system', () => {
    const result = calculateScenario(testSystem, testTariff, LIKELY_CASE_DEFAULTS);
    // ROI should generally increase year over year for a profitable system
    expect(result[4].roi).toBeGreaterThan(result[0].roi);
  });

  it('best case should generate more revenue than worst case', () => {
    const best = calculateScenario(testSystem, testTariff, BEST_CASE_DEFAULTS);
    const worst = calculateScenario(testSystem, testTariff, WORST_CASE_DEFAULTS);
    expect(best[0].grossRevenue).toBeGreaterThan(worst[0].grossRevenue);
    expect(best[9].cumulativeRevenue).toBeGreaterThan(worst[9].cumulativeRevenue);
  });
});

describe('calculateAllScenarios', () => {
  it('should return three scenarios', () => {
    const result = calculateAllScenarios(testSystem, testTariff);
    expect(result.best).toHaveLength(10);
    expect(result.likely).toHaveLength(10);
    expect(result.worst).toHaveLength(10);
  });

  it('best cumulative should exceed likely which exceeds worst', () => {
    const result = calculateAllScenarios(testSystem, testTariff);
    const bestTotal = result.best[9].cumulativeRevenue;
    const likelyTotal = result.likely[9].cumulativeRevenue;
    const worstTotal = result.worst[9].cumulativeRevenue;
    expect(bestTotal).toBeGreaterThan(likelyTotal);
    expect(likelyTotal).toBeGreaterThan(worstTotal);
  });

  it('should accept overrides per scenario', () => {
    const result = calculateAllScenarios(testSystem, testTariff, {
      likely: { cyclesPerDay: 3 },
    });
    // With 3 cycles/day, likely case revenue should be much higher
    const defaultResult = calculateAllScenarios(testSystem, testTariff);
    expect(result.likely[0].grossRevenue).toBeGreaterThan(defaultResult.likely[0].grossRevenue);
  });
});

describe('summariseScenarios', () => {
  it('should calculate summary metrics for all three scenarios', () => {
    const projection = calculateAllScenarios(testSystem, testTariff);
    const summary = summariseScenarios(projection, testSystem);

    // All scenarios should have valid metrics
    for (const scenario of ['best', 'likely', 'worst'] as const) {
      expect(summary[scenario].paybackMonths).toBeGreaterThan(0);
      expect(summary[scenario].tenYearIrr).toBeDefined();
      expect(summary[scenario].tenYearNpv).toBeDefined();
      expect(summary[scenario].annualNetRevenue).toBeDefined();
      expect(summary[scenario].dscr).toBeDefined();
    }
  });

  it('best case payback should be fastest', () => {
    const projection = calculateAllScenarios(testSystem, testTariff);
    const summary = summariseScenarios(projection, testSystem);
    expect(summary.best.paybackMonths).toBeLessThanOrEqual(summary.likely.paybackMonths);
    expect(summary.likely.paybackMonths).toBeLessThanOrEqual(summary.worst.paybackMonths);
  });

  it('best case IRR should be highest', () => {
    const projection = calculateAllScenarios(testSystem, testTariff);
    const summary = summariseScenarios(projection, testSystem);
    expect(summary.best.tenYearIrr).toBeGreaterThan(summary.likely.tenYearIrr);
    expect(summary.likely.tenYearIrr).toBeGreaterThan(summary.worst.tenYearIrr);
  });
});

describe('formatGbp', () => {
  it('should format as GBP currency', () => {
    expect(formatGbp(2667)).toBe('£2,667');
    expect(formatGbp(2667.50, 2)).toBe('£2,667.50');
    expect(formatGbp(0)).toBe('£0');
    expect(formatGbp(-500)).toBe('-£500');
  });
});

describe('formatPaybackRange', () => {
  it('should format payback as range with likely highlighted', () => {
    const projection = calculateAllScenarios(testSystem, testTariff);
    const summary = summariseScenarios(projection, testSystem);
    const formatted = formatPaybackRange(summary);
    expect(formatted).toContain('–');
    expect(formatted).toContain('likely:');
    expect(formatted).toContain('months');
  });
});

describe('getDscrStatus', () => {
  it('should return green when all scenarios above covenant', () => {
    const summary = {
      best: { paybackMonths: 12, tenYearIrr: 50, tenYearNpv: 100000, annualNetRevenue: 20000, dscr: 2.5 },
      likely: { paybackMonths: 18, tenYearIrr: 40, tenYearNpv: 80000, annualNetRevenue: 15000, dscr: 1.8 },
      worst: { paybackMonths: 26, tenYearIrr: 25, tenYearNpv: 50000, annualNetRevenue: 10000, dscr: 1.3 },
    };
    expect(getDscrStatus(summary, 1.2)).toBe('green');
  });

  it('should return amber when only worst is below covenant', () => {
    const summary = {
      best: { paybackMonths: 12, tenYearIrr: 50, tenYearNpv: 100000, annualNetRevenue: 20000, dscr: 2.5 },
      likely: { paybackMonths: 18, tenYearIrr: 40, tenYearNpv: 80000, annualNetRevenue: 15000, dscr: 1.5 },
      worst: { paybackMonths: 26, tenYearIrr: 25, tenYearNpv: 50000, annualNetRevenue: 10000, dscr: 1.0 },
    };
    expect(getDscrStatus(summary, 1.2)).toBe('amber');
  });

  it('should return red when likely is below covenant', () => {
    const summary = {
      best: { paybackMonths: 12, tenYearIrr: 50, tenYearNpv: 100000, annualNetRevenue: 20000, dscr: 2.5 },
      likely: { paybackMonths: 18, tenYearIrr: 40, tenYearNpv: 80000, annualNetRevenue: 15000, dscr: 1.0 },
      worst: { paybackMonths: 26, tenYearIrr: 25, tenYearNpv: 50000, annualNetRevenue: 10000, dscr: 0.8 },
    };
    expect(getDscrStatus(summary, 1.2)).toBe('red');
  });
});
