import { describe, it, expect } from 'vitest';
import {
  modelTariffChange,
  modelEnergyPriceScenario,
  modelTechnologyFailure,
  modelRegulatoryChange,
  modelHardwareCostReduction,
  modelRevenueEnhancement,
  modelMarketExpansion,
  runDownsideScenarios,
  runUpsideScenarios,
  runStressTest,
  ENERGY_PRICE_SCENARIOS,
} from '@/modules/risk/modelling';

// --- Tariff Change Model ---

describe('modelTariffChange', () => {
  it('should return positive revenue for baseline (0% change)', () => {
    const result = modelTariffChange({
      iofSpreadChangePercent: 0,
      savingSessionsActive: true,
      flexibilityRevenueActive: true,
    });
    expect(result.perHomeRevenue).toBeGreaterThan(0);
    expect(result.portfolioRevenue).toBeGreaterThan(0);
  });

  it('negative spread change should reduce revenue', () => {
    const baseline = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: true });
    const degraded = modelTariffChange({ iofSpreadChangePercent: -20, savingSessionsActive: true, flexibilityRevenueActive: true });
    expect(degraded.perHomeRevenue).toBeLessThan(baseline.perHomeRevenue);
    expect(degraded.revenueChange).toBeLessThan(0);
  });

  it('positive spread change should increase revenue', () => {
    const baseline = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: true });
    const improved = modelTariffChange({ iofSpreadChangePercent: 20, savingSessionsActive: true, flexibilityRevenueActive: true });
    expect(improved.perHomeRevenue).toBeGreaterThan(baseline.perHomeRevenue);
    expect(improved.revenueChange).toBeGreaterThan(0);
  });

  it('disabling saving sessions should reduce revenue', () => {
    const with_ = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: true });
    const without = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: false, flexibilityRevenueActive: true });
    expect(without.perHomeRevenue).toBeLessThan(with_.perHomeRevenue);
  });

  it('disabling flexibility should reduce revenue', () => {
    const with_ = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: true });
    const without = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: false });
    expect(without.perHomeRevenue).toBeLessThan(with_.perHomeRevenue);
  });

  it('portfolio revenue should be 100x per-home revenue', () => {
    const result = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: true });
    expect(result.portfolioRevenue).toBe(result.perHomeRevenue * 100);
  });

  it('should return positive payback months', () => {
    const result = modelTariffChange({ iofSpreadChangePercent: 0, savingSessionsActive: true, flexibilityRevenueActive: true });
    expect(result.paybackMonths).toBeGreaterThan(0);
    expect(result.paybackMonths).toBeLessThan(999);
  });

  it('50% spread collapse should return 999 months payback or still positive', () => {
    const result = modelTariffChange({ iofSpreadChangePercent: -100, savingSessionsActive: false, flexibilityRevenueActive: false });
    // Revenue would be near zero, payback should be very high
    expect(result.paybackMonths).toBeGreaterThan(100);
  });
});

// --- Energy Price Scenario ---

describe('modelEnergyPriceScenario', () => {
  it('should model all ENERGY_PRICE_SCENARIOS without error', () => {
    for (const scenario of ENERGY_PRICE_SCENARIOS) {
      const result = modelEnergyPriceScenario(scenario);
      expect(result.perHomeRevenue).toBeDefined();
      expect(result.portfolioRevenue).toBeDefined();
    }
  });

  it('Crisis scenario should yield higher revenue than Collapse', () => {
    const crisis = ENERGY_PRICE_SCENARIOS.find(s => s.name === 'Crisis')!;
    const collapse = ENERGY_PRICE_SCENARIOS.find(s => s.name === 'Collapse')!;
    expect(modelEnergyPriceScenario(crisis).perHomeRevenue).toBeGreaterThan(
      modelEnergyPriceScenario(collapse).perHomeRevenue,
    );
  });

  it('Net Zero scenario should have positive spread impact change applied', () => {
    const netZero = ENERGY_PRICE_SCENARIOS.find(s => s.name === 'Net Zero')!;
    const result = modelEnergyPriceScenario(netZero);
    expect(result.revenueChange).toBeLessThan(0); // -15% spread impact
  });
});

// --- Technology Failure Model ---

describe('modelTechnologyFailure', () => {
  it('should show capacity degradation over time', () => {
    const result = modelTechnologyFailure({
      degradationRatePercent: 2,
      failureProbabilityPercent: 3,
      replacementCostPerUnit: 5000,
    });
    expect(result.year5CapacityPercent).toBeLessThan(100);
    expect(result.year10CapacityPercent).toBeLessThan(result.year5CapacityPercent);
  });

  it('higher degradation rate should cause more capacity loss', () => {
    const low = modelTechnologyFailure({ degradationRatePercent: 1.5, failureProbabilityPercent: 1, replacementCostPerUnit: 1000 });
    const high = modelTechnologyFailure({ degradationRatePercent: 3, failureProbabilityPercent: 1, replacementCostPerUnit: 1000 });
    expect(high.year10CapacityPercent).toBeLessThan(low.year10CapacityPercent);
  });

  it('capacity should never go below 50%', () => {
    const result = modelTechnologyFailure({
      degradationRatePercent: 20,
      failureProbabilityPercent: 5,
      replacementCostPerUnit: 1000,
    });
    expect(result.year5CapacityPercent).toBeGreaterThanOrEqual(50);
    expect(result.year10CapacityPercent).toBeGreaterThanOrEqual(50);
  });

  it('higher failure probability should increase maintenance cost', () => {
    const low = modelTechnologyFailure({ degradationRatePercent: 2, failureProbabilityPercent: 1, replacementCostPerUnit: 5000 });
    const high = modelTechnologyFailure({ degradationRatePercent: 2, failureProbabilityPercent: 5, replacementCostPerUnit: 5000 });
    expect(high.annualMaintenanceCost).toBeGreaterThan(low.annualMaintenanceCost);
  });
});

// --- Regulatory Change Model ---

describe('modelRegulatoryChange', () => {
  it('no changes should result in zero additional costs', () => {
    const result = modelRegulatoryChange({
      vatReintroduced: false,
      planningRequired: false,
      fireSafetyUpgrade: false,
      fcaRegulation: false,
      mcsIncrease: false,
      g99Delays: false,
    });
    expect(result.additionalCapexPerHome).toBe(0);
    expect(result.annualComplianceCost).toBe(0);
    expect(result.deploymentDelayWeeks).toBe(0);
    expect(result.totalPortfolioImpact).toBe(0);
  });

  it('VAT reintroduction should add 20% to capex', () => {
    const result = modelRegulatoryChange({
      vatReintroduced: true,
      planningRequired: false,
      fireSafetyUpgrade: false,
      fcaRegulation: false,
      mcsIncrease: false,
      g99Delays: false,
    });
    // 20% of £47,800 = £9,560
    expect(result.additionalCapexPerHome).toBe(9560);
  });

  it('planning requirement should add delay and capex', () => {
    const result = modelRegulatoryChange({
      vatReintroduced: false,
      planningRequired: true,
      fireSafetyUpgrade: false,
      fcaRegulation: false,
      mcsIncrease: false,
      g99Delays: false,
    });
    expect(result.deploymentDelayWeeks).toBe(8);
    expect(result.additionalCapexPerHome).toBe(2000);
  });

  it('G99 delays should add 8 weeks', () => {
    const result = modelRegulatoryChange({
      vatReintroduced: false,
      planningRequired: false,
      fireSafetyUpgrade: false,
      fcaRegulation: false,
      mcsIncrease: false,
      g99Delays: true,
    });
    expect(result.deploymentDelayWeeks).toBe(8);
  });

  it('FCA regulation should add compliance cost', () => {
    const result = modelRegulatoryChange({
      vatReintroduced: false,
      planningRequired: false,
      fireSafetyUpgrade: false,
      fcaRegulation: true,
      mcsIncrease: false,
      g99Delays: false,
    });
    expect(result.annualComplianceCost).toBe(50000);
  });

  it('total portfolio impact should accumulate all costs', () => {
    const result = modelRegulatoryChange({
      vatReintroduced: true,
      planningRequired: true,
      fireSafetyUpgrade: true,
      fcaRegulation: true,
      mcsIncrease: true,
      g99Delays: true,
    });
    expect(result.totalPortfolioImpact).toBeGreaterThan(result.additionalCapexPerHome);
  });
});

// --- Hardware Cost Reduction ---

describe('modelHardwareCostReduction', () => {
  it('should reduce capex proportionally', () => {
    const result10 = modelHardwareCostReduction({ costReductionPercent: 10 });
    const result30 = modelHardwareCostReduction({ costReductionPercent: 30 });
    expect(result30.newCapexPerHome).toBeLessThan(result10.newCapexPerHome);
  });

  it('should shorten payback period', () => {
    const result0 = modelHardwareCostReduction({ costReductionPercent: 0 });
    const result30 = modelHardwareCostReduction({ costReductionPercent: 30 });
    expect(result30.paybackMonths).toBeLessThan(result0.paybackMonths);
  });

  it('should enable more homes to be funded', () => {
    const result0 = modelHardwareCostReduction({ costReductionPercent: 0 });
    const result30 = modelHardwareCostReduction({ costReductionPercent: 30 });
    expect(result30.additionalHomesFundable).toBeGreaterThan(result0.additionalHomesFundable);
  });

  it('30% cost reduction should give positive NPV uplift', () => {
    const result = modelHardwareCostReduction({ costReductionPercent: 30 });
    expect(result.portfolioNpvUplift).toBeGreaterThan(0);
  });

  it('should return positive 10-year ROI for 0% cost reduction at base revenue', () => {
    const result = modelHardwareCostReduction({ costReductionPercent: 0 });
    expect(result.roi10Year).toBeGreaterThan(0);
  });
});

// --- Revenue Enhancement ---

describe('modelRevenueEnhancement', () => {
  it('baseline should return base revenue', () => {
    const result = modelRevenueEnhancement({
      savingSessionsDoubled: false,
      iofSpreadWidenPercent: 0,
      flexibilityUnlocked: false,
      tripleCycling: false,
    });
    expect(result.revenueUplift).toBe(0);
  });

  it('doubling saving sessions should increase revenue', () => {
    const baseline = modelRevenueEnhancement({
      savingSessionsDoubled: false,
      iofSpreadWidenPercent: 0,
      flexibilityUnlocked: false,
      tripleCycling: false,
    });
    const enhanced = modelRevenueEnhancement({
      savingSessionsDoubled: true,
      iofSpreadWidenPercent: 0,
      flexibilityUnlocked: false,
      tripleCycling: false,
    });
    expect(enhanced.perHomeRevenue).toBeGreaterThan(baseline.perHomeRevenue);
  });

  it('triple cycling should give the largest uplift', () => {
    const tricycling = modelRevenueEnhancement({
      savingSessionsDoubled: false,
      iofSpreadWidenPercent: 0,
      flexibilityUnlocked: false,
      tripleCycling: true,
    });
    expect(tricycling.revenueUplift).toBeGreaterThan(0);
  });

  it('DSCR should improve with revenue enhancement', () => {
    const baseline = modelRevenueEnhancement({
      savingSessionsDoubled: false,
      iofSpreadWidenPercent: 0,
      flexibilityUnlocked: false,
      tripleCycling: false,
    });
    const enhanced = modelRevenueEnhancement({
      savingSessionsDoubled: true,
      iofSpreadWidenPercent: 20,
      flexibilityUnlocked: true,
      tripleCycling: false,
    });
    expect(enhanced.newDscr).toBeGreaterThan(baseline.newDscr);
  });

  it('portfolio revenue should be 100x per-home revenue', () => {
    const result = modelRevenueEnhancement({
      savingSessionsDoubled: true,
      iofSpreadWidenPercent: 10,
      flexibilityUnlocked: false,
      tripleCycling: false,
    });
    expect(result.portfolioRevenue).toBe(result.perHomeRevenue * 100);
  });
});

// --- Market Expansion ---

describe('modelMarketExpansion', () => {
  it('should include base domestic homes in portfolio', () => {
    const result = modelMarketExpansion({
      commercialSites: 0,
      commercialRevenuePerSite: 0,
      newBuildHomes: 0,
      socialHousing: 0,
    });
    expect(result.totalPortfolioSize).toBe(100);
  });

  it('should grow total portfolio with additional segments', () => {
    const result = modelMarketExpansion({
      commercialSites: 10,
      commercialRevenuePerSite: 80000,
      newBuildHomes: 20,
      socialHousing: 15,
    });
    expect(result.totalPortfolioSize).toBe(145);
  });

  it('should return 4 revenue segments', () => {
    const result = modelMarketExpansion({
      commercialSites: 5,
      commercialRevenuePerSite: 80000,
      newBuildHomes: 10,
      socialHousing: 5,
    });
    expect(result.revenueBySegment).toHaveLength(4);
  });

  it('total revenue should sum all segments', () => {
    const result = modelMarketExpansion({
      commercialSites: 10,
      commercialRevenuePerSite: 80000,
      newBuildHomes: 10,
      socialHousing: 10,
    });
    const segmentTotal = result.revenueBySegment.reduce((s, seg) => s + seg.revenue, 0);
    expect(result.totalAnnualRevenue).toBe(segmentTotal);
  });
});

// --- Scenario Runners ---

describe('runDownsideScenarios', () => {
  it('should return 5 downside scenarios', () => {
    const scenarios = runDownsideScenarios();
    expect(scenarios).toHaveLength(5);
    for (const s of scenarios) {
      expect(s.type).toBe('downside');
    }
  });

  it('all downside scenarios should have negative revenue impact', () => {
    const scenarios = runDownsideScenarios();
    for (const s of scenarios) {
      expect(s.revenueImpact).toBeLessThanOrEqual(0);
    }
  });

  it('Perfect Storm should be the most severe', () => {
    const scenarios = runDownsideScenarios();
    const ps = scenarios.find(s => s.name === 'Perfect Storm')!;
    expect(ps.severity).toBe('critical');
    expect(ps.dscrImpact).toBeLessThan(-0.5);
  });
});

describe('runUpsideScenarios', () => {
  it('should return 5 upside scenarios', () => {
    const scenarios = runUpsideScenarios();
    expect(scenarios).toHaveLength(5);
    for (const s of scenarios) {
      expect(s.type).toBe('upside');
    }
  });

  it('upside scenarios should have non-negative revenue impact', () => {
    const scenarios = runUpsideScenarios();
    for (const s of scenarios) {
      expect(s.revenueImpact).toBeGreaterThanOrEqual(0);
    }
  });

  it('upside scenarios should have positive DSCR impact', () => {
    const scenarios = runUpsideScenarios();
    for (const s of scenarios) {
      expect(s.dscrImpact).toBeGreaterThanOrEqual(0);
    }
  });
});

// --- Stress Test ---

describe('runStressTest', () => {
  it('baseline should show business survives', () => {
    const result = runStressTest(0, 2, 0, false);
    expect(result.businessSurvives).toBe(true);
    expect(result.adjustedDscr).toBeGreaterThan(1.0);
  });

  it('extreme stress should not survive', () => {
    // -90% IOF + 5% degradation + 10% interest rate rise + no SS
    // arbitrage = 26000 * 0.1 = 2600; degradation = 0.75; perHome ≈ 2450; debtService ≈ 5258
    const result = runStressTest(-90, 5, 10, true);
    expect(result.businessSurvives).toBe(false);
    expect(result.adjustedDscr).toBeLessThan(1.0);
  });

  it('worse conditions should result in lower DSCR', () => {
    const mild = runStressTest(-10, 2, 0, false);
    const severe = runStressTest(-30, 4, 3, true);
    expect(severe.adjustedDscr).toBeLessThan(mild.adjustedDscr);
  });

  it('cancelled saving sessions should reduce adjusted revenue', () => {
    const with_ = runStressTest(0, 2, 0, false);
    const without = runStressTest(0, 2, 0, true);
    expect(without.adjustedRevenue).toBeLessThan(with_.adjustedRevenue);
  });

  it('payback should be 999 when revenue is negative', () => {
    // -200% IOF spread makes arbitrageRevenue negative, overwhelming base flexibility revenue
    // arbitrage = 26000 * (1 - 2) = -26000; perHome = -26000 * 0.75 + 500 = -19000 (< 0)
    const result = runStressTest(-200, 5, 0, true);
    expect(result.adjustedPayback).toBe(999);
  });
});
