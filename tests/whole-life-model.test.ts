import { describe, it, expect } from 'vitest';
import {
  buildWholeLifeModel,
  buildThreeScenarioWholeLifeModel,
  formatCapexBreakdown,
  getBeechesWholeLifeModel,
  type WholeLifeModelParams,
  type CapexBreakdown,
} from '@/modules/finance/whole-life-model';
import type { Tariff } from '@/shared/types';

// ============================================================
// Shared Test Fixture
// ============================================================

const IOF_TARIFF: Tariff = {
  id: 'test-iof',
  supplier: 'Octopus Energy',
  name: 'Intelligent Octopus Flux',
  type: 'flux',
  importRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 11.44 },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 24.50 },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 39.44 },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 24.50 },
  ],
  exportRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 4.10 },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 16.30 },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 30.68 },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 16.30 },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2024-01-01'),
};

const BASE_PARAMS: WholeLifeModelParams = {
  capacityKwh: 192,
  inverterKw: 96,
  tariff: IOF_TARIFF,
  scenario: 'likely',
  annualDebtService: 4800,
  esaTermYears: 10,
};

// ============================================================
// CAPEX Breakdown
// ============================================================

describe('CAPEX Breakdown', () => {
  it('likely scenario: total CAPEX should be in the expected range for 192kWh', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    // Expected: ~£46k–£57k for 192kWh system on likely case
    expect(model.capex.totalCapex).toBeGreaterThan(45000);
    expect(model.capex.totalCapex).toBeLessThan(65000);
  });

  it('totalCapex should equal sum of line items including contingency', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const c = model.capex;
    const sumBeforeContingency =
      c.batteryHardware +
      c.inverterHardware +
      c.solarHardware +
      c.heatPumpHardware +
      c.installation +
      c.g99Application +
      c.mcsCertification +
      c.electricalSurvey +
      c.enclosure +
      c.commissioningMonitoring;
    const expectedContingency = Math.round(sumBeforeContingency * 0.05);
    expect(c.contingency).toBe(expectedContingency);
    expect(c.totalCapex).toBe(sumBeforeContingency + expectedContingency);
  });

  it('best scenario: CAPEX should be lower than likely (hardware price drop)', () => {
    const best = buildWholeLifeModel({ ...BASE_PARAMS, scenario: 'best' });
    const likely = buildWholeLifeModel({ ...BASE_PARAMS, scenario: 'likely' });
    expect(best.capex.totalCapex).toBeLessThan(likely.capex.totalCapex);
  });

  it('worst scenario: CAPEX should be higher than likely (supply issues + labour)', () => {
    const worst = buildWholeLifeModel({ ...BASE_PARAMS, scenario: 'worst' });
    const likely = buildWholeLifeModel({ ...BASE_PARAMS, scenario: 'likely' });
    expect(worst.capex.totalCapex).toBeGreaterThan(likely.capex.totalCapex);
  });

  it('solarHardware should be 0 when no solar', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, solarKwp: undefined });
    expect(model.capex.solarHardware).toBe(0);
  });

  it('solarHardware should be positive when solar is present', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, solarKwp: 10 });
    expect(model.capex.solarHardware).toBeGreaterThan(0);
  });

  it('heatPumpHardware should be 0 when hasHeatPump = false', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, hasHeatPump: false });
    expect(model.capex.heatPumpHardware).toBe(0);
  });

  it('heatPumpHardware should be positive when hasHeatPump = true', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, hasHeatPump: true });
    expect(model.capex.heatPumpHardware).toBeGreaterThan(0);
  });

  it('g99Application should be exactly £1,500', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.capex.g99Application).toBe(1500);
  });

  it('mcsCertification should be exactly £800', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.capex.mcsCertification).toBe(800);
  });
});

// ============================================================
// Projections Structure
// ============================================================

describe('Projections structure', () => {
  it('should return exactly esaTermYears projections', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, esaTermYears: 10 });
    expect(model.projections).toHaveLength(10);
  });

  it('should support a custom ESA term of 7 years', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, esaTermYears: 7 });
    expect(model.projections).toHaveLength(7);
  });

  it('year numbers should start at 1 and increment by 1', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    model.projections.forEach((p, i) => {
      expect(p.year).toBe(i + 1);
      expect(p.costs.year).toBe(i + 1);
      expect(p.revenue.year).toBe(i + 1);
    });
  });

  it('homeownerPayment should be £1,200 every year', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    for (const p of model.projections) {
      expect(p.costs.homeownerPayment).toBe(1200);
    }
  });

  it('debtService should equal annualDebtService in every year', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, annualDebtService: 4800 });
    for (const p of model.projections) {
      expect(p.costs.debtService).toBe(4800);
    }
  });

  it('debtService should be 0 when annualDebtService is 0', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, annualDebtService: 0 });
    for (const p of model.projections) {
      expect(p.costs.debtService).toBe(0);
    }
  });

  it('revenue total lines should always be >= 0', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    for (const p of model.projections) {
      expect(p.revenue.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(p.revenue.arbitrageRevenue).toBeGreaterThanOrEqual(0);
      expect(p.revenue.savingSessionsRevenue).toBeGreaterThanOrEqual(0);
      expect(p.revenue.flexibilityRevenue).toBeGreaterThanOrEqual(0);
    }
  });

  it('batteryCapacityPercent should decrease year on year for likely case', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    for (let i = 1; i < model.projections.length; i++) {
      expect(model.projections[i].batteryCapacityPercent).toBeLessThanOrEqual(
        model.projections[i - 1].batteryCapacityPercent,
      );
    }
  });

  it('batteryCapacityPercent after 10 years at 2%/yr should be ~80%', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const lastYear = model.projections[9];
    // 1 - (0.02 × 10) = 0.80 = 80%
    expect(lastYear.batteryCapacityPercent).toBeCloseTo(80, 0);
  });

  it('first year cumulative cash flow should be negative (capex not recovered)', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.projections[0].cumulativeCashFlow).toBeLessThan(0);
  });

  it('paybackAchieved should be false until and true after payback year', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    let foundPayback = false;
    for (const p of model.projections) {
      if (p.paybackAchieved) foundPayback = true;
      if (foundPayback) expect(p.paybackAchieved).toBe(true);
    }
  });
});

// ============================================================
// Summary Metrics
// ============================================================

describe('Summary metrics', () => {
  it('totalCapex should match capex.totalCapex', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.summary.totalCapex).toBe(model.capex.totalCapex);
  });

  it('totalRevenue should be positive for a viable system', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.summary.totalRevenue).toBeGreaterThan(0);
  });

  it('totalNetCashFlow should equal sum of yearly net cash flows', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const sumFromRows = model.projections.reduce((s, p) => s + p.netCashFlow, 0);
    expect(model.summary.totalNetCashFlow).toBeCloseTo(sumFromRows, 0);
  });

  it('NPV at 8% should be positive for a profitable 192kWh system', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.summary.npv8Percent).toBeGreaterThan(0);
  });

  it('NPV at 5% should be >= NPV at 8% (lower discount = higher PV)', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.summary.npv5Percent).toBeGreaterThanOrEqual(model.summary.npv8Percent);
  });

  it('IRR should be a finite percentage', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(isFinite(model.summary.irr)).toBe(true);
  });

  it('lifetimeRevenueMultiple should be positive', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    expect(model.summary.lifetimeRevenueMultiple).toBeGreaterThan(0);
  });

  it('paybackYear should be between 1 and esaTermYears for a viable system', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    if (model.summary.paybackYear !== 999) {
      expect(model.summary.paybackYear).toBeGreaterThanOrEqual(1);
      expect(model.summary.paybackYear).toBeLessThanOrEqual(BASE_PARAMS.esaTermYears ?? 10);
    }
  });

  it('paybackMonth should be between 1 and 12', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    if (model.summary.paybackYear !== 999) {
      expect(model.summary.paybackMonth).toBeGreaterThanOrEqual(1);
      expect(model.summary.paybackMonth).toBeLessThanOrEqual(12);
    }
  });
});

// ============================================================
// Three-Scenario Builder
// ============================================================

describe('buildThreeScenarioWholeLifeModel', () => {
  const threeScenarioParams = {
    capacityKwh: 192,
    inverterKw: 96,
    tariff: IOF_TARIFF,
    annualDebtService: 4800,
    esaTermYears: 10,
  };

  it('should return three distinct model objects', () => {
    const result = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    expect(result.best).toBeDefined();
    expect(result.likely).toBeDefined();
    expect(result.worst).toBeDefined();
  });

  it('best CAPEX should be lower than likely (hardware price drop)', () => {
    const result = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    expect(result.best.capex.totalCapex).toBeLessThan(result.likely.capex.totalCapex);
  });

  it('worst CAPEX should be higher than likely', () => {
    const result = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    expect(result.worst.capex.totalCapex).toBeGreaterThan(result.likely.capex.totalCapex);
  });

  it('best total revenue over term should exceed likely and worst', () => {
    const result = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    expect(result.best.summary.totalRevenue).toBeGreaterThan(result.likely.summary.totalRevenue);
    expect(result.likely.summary.totalRevenue).toBeGreaterThan(result.worst.summary.totalRevenue);
  });

  it('best NPV at 8% should exceed worst NPV at 8%', () => {
    const result = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    expect(result.best.summary.npv8Percent).toBeGreaterThan(result.worst.summary.npv8Percent);
  });

  it('all three scenarios should have 10 projection rows', () => {
    const result = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    expect(result.best.projections).toHaveLength(10);
    expect(result.likely.projections).toHaveLength(10);
    expect(result.worst.projections).toHaveLength(10);
  });

  it('assumption overrides should propagate per scenario', () => {
    const withOverride = buildThreeScenarioWholeLifeModel({
      ...threeScenarioParams,
      assumptionOverrides: {
        likely: { cyclesPerDay: 3.0 },
      },
    });
    const withoutOverride = buildThreeScenarioWholeLifeModel(threeScenarioParams);
    // More cycles = more revenue
    expect(withOverride.likely.summary.totalRevenue).toBeGreaterThan(
      withoutOverride.likely.summary.totalRevenue,
    );
    // Best and worst should not be affected
    expect(withOverride.best.summary.totalRevenue).toBeCloseTo(
      withoutOverride.best.summary.totalRevenue,
      -2, // within £100
    );
  });
});

// ============================================================
// formatCapexBreakdown
// ============================================================

describe('formatCapexBreakdown', () => {
  it('should return a non-empty string', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const formatted = formatCapexBreakdown(model.capex);
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should include the TOTAL CAPEX line', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const formatted = formatCapexBreakdown(model.capex);
    expect(formatted).toContain('TOTAL CAPEX');
  });

  it('should include G99 application line', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const formatted = formatCapexBreakdown(model.capex);
    expect(formatted).toContain('G99');
  });

  it('should NOT include solar line when no solar', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, solarKwp: undefined });
    const formatted = formatCapexBreakdown(model.capex);
    expect(formatted).not.toContain('Solar PV hardware');
  });

  it('should include solar line when solar is present', () => {
    const model = buildWholeLifeModel({ ...BASE_PARAMS, solarKwp: 10 });
    const formatted = formatCapexBreakdown(model.capex);
    expect(formatted).toContain('Solar PV hardware');
  });

  it('all monetary values in the output should start with £', () => {
    const model = buildWholeLifeModel(BASE_PARAMS);
    const formatted = formatCapexBreakdown(model.capex);
    const lines = formatted.split('\n').filter(l => l.includes(':'));
    const dataLines = lines.filter(l => !l.includes('---') && !l.includes('CAPEX Breakdown'));
    for (const line of dataLines) {
      const valuepart = line.split(':')[1]?.trim();
      if (valuepart) expect(valuepart).toMatch(/^£/);
    }
  });
});

// ============================================================
// The Beeches Reference Model
// ============================================================

describe('getBeechesWholeLifeModel', () => {
  it('should return a valid three-scenario model', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.best).toBeDefined();
    expect(model.likely).toBeDefined();
    expect(model.worst).toBeDefined();
  });

  it('likely model: 192kWh capacity means battery hardware ~£38,400', () => {
    const model = getBeechesWholeLifeModel();
    // £200/kWh × 192 × 1.0 (likely multiplier) = £38,400
    expect(model.likely.capex.batteryHardware).toBe(38400);
  });

  it('likely model: should have 10 projection years', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.likely.projections).toHaveLength(10);
  });

  it('likely model: G99 application should be £1,500', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.likely.capex.g99Application).toBe(1500);
  });

  it('likely model: MCS certification should be £800', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.likely.capex.mcsCertification).toBe(800);
  });

  it('likely model: no solar hardware (Beeches has no solar)', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.likely.capex.solarHardware).toBe(0);
  });

  it('likely model: CAPEX/kWh should be in realistic range', () => {
    const model = getBeechesWholeLifeModel();
    const capexPerKwh = model.likely.capex.totalCapex / 192;
    // Expect £200–350/kWh all-in for a 192kWh system
    expect(capexPerKwh).toBeGreaterThan(200);
    expect(capexPerKwh).toBeLessThan(360);
  });

  it('best model: CAPEX should be lower than likely (hardware discount)', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.best.capex.totalCapex).toBeLessThan(model.likely.capex.totalCapex);
  });

  it('worst model: CAPEX should be higher than likely (supply chain premium)', () => {
    const model = getBeechesWholeLifeModel();
    expect(model.worst.capex.totalCapex).toBeGreaterThan(model.likely.capex.totalCapex);
  });

  it('likely model: annual homeowner payment should be £1,200 every year', () => {
    const model = getBeechesWholeLifeModel();
    for (const p of model.likely.projections) {
      expect(p.costs.homeownerPayment).toBe(1200);
    }
  });

  it('likely model: debt service should be £4,800 every year', () => {
    const model = getBeechesWholeLifeModel();
    for (const p of model.likely.projections) {
      expect(p.costs.debtService).toBe(4800);
    }
  });
});
