// ============================================================
// RoseStack Platform — Risk & Opportunity Modelling Engine
// Agent 10: Risk & Opportunities Manager
// ============================================================

// --- Base constants ---
const BASE_REVENUE_PER_HOME = 32000;
const BASE_CAPEX_PER_HOME = 47800;
const BASE_HOMES_TARGET = 100;
const BASE_DSCR = 2.1;
const BASE_PAYBACK_MONTHS = 20;
const BASE_SAVING_SESSIONS_REVENUE = 3000;
const BASE_FLEXIBILITY_REVENUE = 500;

// ============================================================
// Risk Modelling Engine
// ============================================================

export interface TariffChangeModelInput {
  iofSpreadChangePercent: number; // e.g. -10, -20, -50
  savingSessionsActive: boolean;
  flexibilityRevenueActive: boolean;
}

export interface ModelOutput {
  perHomeRevenue: number;
  portfolioRevenue: number;
  paybackMonths: number;
  dscr: number;
  revenueChange: number;
  revenueChangePercent: number;
}

export function modelTariffChange(input: TariffChangeModelInput): ModelOutput {
  const arbitrageRevenue = 26000 * (1 + input.iofSpreadChangePercent / 100);
  const ssRevenue = input.savingSessionsActive ? BASE_SAVING_SESSIONS_REVENUE : 0;
  const flexRevenue = input.flexibilityRevenueActive ? BASE_FLEXIBILITY_REVENUE : 0;
  const perHome = arbitrageRevenue + ssRevenue + flexRevenue;
  const change = perHome - BASE_REVENUE_PER_HOME;

  return {
    perHomeRevenue: Math.round(perHome),
    portfolioRevenue: Math.round(perHome * BASE_HOMES_TARGET),
    paybackMonths: perHome > 0 ? Math.round((BASE_CAPEX_PER_HOME / perHome) * 12) : 999,
    dscr: perHome > 0 ? Math.round((perHome / (BASE_CAPEX_PER_HOME / 10)) * 100) / 100 : 0,
    revenueChange: Math.round(change),
    revenueChangePercent: Math.round((change / BASE_REVENUE_PER_HOME) * 100 * 10) / 10,
  };
}

export interface EnergyPriceScenario {
  name: string;
  description: string;
  wholesalePriceMultiplier: number;
  spreadImpactPercent: number;
}

export const ENERGY_PRICE_SCENARIOS: EnergyPriceScenario[] = [
  { name: 'Net Zero', description: 'Gradual wholesale price decline as renewables scale', wholesalePriceMultiplier: 0.7, spreadImpactPercent: -15 },
  { name: 'Crisis', description: 'Energy price spike then gradual normalisation', wholesalePriceMultiplier: 1.8, spreadImpactPercent: 30 },
  { name: 'Stagnation', description: 'Flat wholesale prices, minimal spread change', wholesalePriceMultiplier: 1.0, spreadImpactPercent: 0 },
  { name: 'Collapse', description: 'Significant price crash from oversupply', wholesalePriceMultiplier: 0.4, spreadImpactPercent: -40 },
];

export function modelEnergyPriceScenario(scenario: EnergyPriceScenario): ModelOutput {
  return modelTariffChange({
    iofSpreadChangePercent: scenario.spreadImpactPercent,
    savingSessionsActive: true,
    flexibilityRevenueActive: true,
  });
}

export interface TechFailureModelInput {
  degradationRatePercent: number; // annual, e.g. 2, 3, 5
  failureProbabilityPercent: number; // e.g. 2, 5, 10
  replacementCostPerUnit: number;
}

export function modelTechnologyFailure(input: TechFailureModelInput): {
  year5CapacityPercent: number;
  year10CapacityPercent: number;
  annualMaintenanceCost: number;
  warrantyClaimForecast: number;
  revenueReductionYear5: number;
  revenueReductionYear10: number;
} {
  const year5Cap = Math.max(50, 100 - input.degradationRatePercent * 5);
  const year10Cap = Math.max(50, 100 - input.degradationRatePercent * 10);

  return {
    year5CapacityPercent: Math.round(year5Cap * 10) / 10,
    year10CapacityPercent: Math.round(year10Cap * 10) / 10,
    annualMaintenanceCost: Math.round(BASE_HOMES_TARGET * (input.failureProbabilityPercent / 100) * input.replacementCostPerUnit),
    warrantyClaimForecast: Math.round(BASE_HOMES_TARGET * (input.failureProbabilityPercent / 100) * 10),
    revenueReductionYear5: Math.round(BASE_REVENUE_PER_HOME * (1 - year5Cap / 100) * BASE_HOMES_TARGET),
    revenueReductionYear10: Math.round(BASE_REVENUE_PER_HOME * (1 - year10Cap / 100) * BASE_HOMES_TARGET),
  };
}

export interface RegulatoryChangeInput {
  vatReintroduced: boolean;
  planningRequired: boolean;
  fireSafetyUpgrade: boolean;
  fcaRegulation: boolean;
  mcsIncrease: boolean;
  g99Delays: boolean;
}

export function modelRegulatoryChange(input: RegulatoryChangeInput): {
  additionalCapexPerHome: number;
  annualComplianceCost: number;
  deploymentDelayWeeks: number;
  totalPortfolioImpact: number;
} {
  let capexIncrease = 0;
  let complianceCost = 0;
  let delay = 0;

  if (input.vatReintroduced) capexIncrease += BASE_CAPEX_PER_HOME * 0.2;
  if (input.planningRequired) { capexIncrease += 2000; delay += 8; }
  if (input.fireSafetyUpgrade) capexIncrease += 3000;
  if (input.fcaRegulation) complianceCost += 50000;
  if (input.mcsIncrease) capexIncrease += 500;
  if (input.g99Delays) delay += 8;

  return {
    additionalCapexPerHome: Math.round(capexIncrease),
    annualComplianceCost: Math.round(complianceCost),
    deploymentDelayWeeks: delay,
    totalPortfolioImpact: Math.round((capexIncrease * BASE_HOMES_TARGET) + complianceCost),
  };
}

// ============================================================
// Opportunity Modelling Engine
// ============================================================

export interface HardwareCostReductionInput {
  costReductionPercent: number; // 10, 20, 30, 50
}

export function modelHardwareCostReduction(input: HardwareCostReductionInput): {
  newCapexPerHome: number;
  paybackMonths: number;
  roi10Year: number;
  additionalHomesFundable: number;
  portfolioNpvUplift: number;
} {
  const newCapex = BASE_CAPEX_PER_HOME * (1 - input.costReductionPercent / 100);
  const payback = Math.round((newCapex / BASE_REVENUE_PER_HOME) * 12);
  const roi = Math.round(((BASE_REVENUE_PER_HOME * 10 - newCapex) / newCapex) * 100);
  const fundingPool = BASE_CAPEX_PER_HOME * BASE_HOMES_TARGET;
  const additionalHomes = Math.floor(fundingPool / newCapex) - BASE_HOMES_TARGET;
  const npvUplift = Math.round((BASE_CAPEX_PER_HOME - newCapex) * BASE_HOMES_TARGET);

  return {
    newCapexPerHome: Math.round(newCapex),
    paybackMonths: payback,
    roi10Year: roi,
    additionalHomesFundable: additionalHomes,
    portfolioNpvUplift: npvUplift,
  };
}

export interface RevenueEnhancementInput {
  savingSessionsDoubled: boolean;
  iofSpreadWidenPercent: number;
  flexibilityUnlocked: boolean;
  tripleCycling: boolean;
}

export function modelRevenueEnhancement(input: RevenueEnhancementInput): {
  perHomeRevenue: number;
  portfolioRevenue: number;
  revenueUplift: number;
  newDscr: number;
  acceleratedPaybackMonths: number;
} {
  let revenue = BASE_REVENUE_PER_HOME;

  if (input.savingSessionsDoubled) revenue += BASE_SAVING_SESSIONS_REVENUE;
  revenue += BASE_REVENUE_PER_HOME * (input.iofSpreadWidenPercent / 100) * 0.8;
  if (input.flexibilityUnlocked) revenue += 1500;
  if (input.tripleCycling) revenue += BASE_REVENUE_PER_HOME * 0.4;

  return {
    perHomeRevenue: Math.round(revenue),
    portfolioRevenue: Math.round(revenue * BASE_HOMES_TARGET),
    revenueUplift: Math.round(revenue - BASE_REVENUE_PER_HOME),
    newDscr: Math.round((revenue / (BASE_CAPEX_PER_HOME / 10)) * 100) / 100,
    acceleratedPaybackMonths: Math.round((BASE_CAPEX_PER_HOME / revenue) * 12),
  };
}

export interface MarketExpansionInput {
  commercialSites: number;
  commercialRevenuePerSite: number;
  newBuildHomes: number;
  socialHousing: number;
}

export function modelMarketExpansion(input: MarketExpansionInput): {
  totalPortfolioSize: number;
  totalAnnualRevenue: number;
  additionalCapexRequired: number;
  revenueBySegment: Array<{ segment: string; homes: number; revenue: number }>;
} {
  const segments = [
    { segment: 'Domestic (existing)', homes: BASE_HOMES_TARGET, revenue: BASE_REVENUE_PER_HOME * BASE_HOMES_TARGET },
    { segment: 'Commercial', homes: input.commercialSites, revenue: input.commercialSites * input.commercialRevenuePerSite },
    { segment: 'New Build', homes: input.newBuildHomes, revenue: input.newBuildHomes * BASE_REVENUE_PER_HOME * 0.7 },
    { segment: 'Social Housing', homes: input.socialHousing, revenue: input.socialHousing * BASE_REVENUE_PER_HOME * 0.6 },
  ];

  const totalHomes = segments.reduce((s, seg) => s + seg.homes, 0);
  const totalRevenue = segments.reduce((s, seg) => s + seg.revenue, 0);
  const additionalCapex = (input.commercialSites * 80000) + (input.newBuildHomes * BASE_CAPEX_PER_HOME * 0.8) + (input.socialHousing * BASE_CAPEX_PER_HOME * 0.9);

  return {
    totalPortfolioSize: totalHomes,
    totalAnnualRevenue: Math.round(totalRevenue),
    additionalCapexRequired: Math.round(additionalCapex),
    revenueBySegment: segments.map(s => ({ ...s, revenue: Math.round(s.revenue) })),
  };
}

// ============================================================
// Scenario Engine
// ============================================================

export interface ScenarioResult {
  name: string;
  description: string;
  type: 'downside' | 'upside';
  revenueImpact: number;
  dscrImpact: number;
  paybackChange: number;
  portfolioValuationChange: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function runDownsideScenarios(): ScenarioResult[] {
  return [
    {
      name: 'Tariff Squeeze',
      description: 'IOF rates drop 20% + Agile spread narrows 15%',
      type: 'downside',
      revenueImpact: -Math.round(BASE_REVENUE_PER_HOME * 0.25 * BASE_HOMES_TARGET),
      dscrImpact: -0.5,
      paybackChange: 8,
      portfolioValuationChange: -Math.round(BASE_REVENUE_PER_HOME * 0.25 * BASE_HOMES_TARGET * 5),
      severity: 'high',
    },
    {
      name: 'Regulatory Tightening',
      description: 'New planning rules + MCS cost increase + G99 delays',
      type: 'downside',
      revenueImpact: -Math.round(5500 * BASE_HOMES_TARGET * 0.3),
      dscrImpact: -0.2,
      paybackChange: 4,
      portfolioValuationChange: -Math.round(5500 * BASE_HOMES_TARGET),
      severity: 'medium',
    },
    {
      name: 'Technology Shock',
      description: 'Accelerated degradation (5%/yr) + manufacturer exits market',
      type: 'downside',
      revenueImpact: -Math.round(BASE_REVENUE_PER_HOME * 0.15 * BASE_HOMES_TARGET),
      dscrImpact: -0.3,
      paybackChange: 6,
      portfolioValuationChange: -Math.round(BASE_REVENUE_PER_HOME * 0.15 * BASE_HOMES_TARGET * 4),
      severity: 'high',
    },
    {
      name: 'Market Competition',
      description: 'Octopus self-deploys + national player enters Lancashire',
      type: 'downside',
      revenueImpact: -Math.round(BASE_REVENUE_PER_HOME * 0.1 * BASE_HOMES_TARGET),
      dscrImpact: -0.15,
      paybackChange: 2,
      portfolioValuationChange: -Math.round(BASE_REVENUE_PER_HOME * BASE_HOMES_TARGET * 0.3),
      severity: 'medium',
    },
    {
      name: 'Perfect Storm',
      description: 'IOF rates -20% + degradation 3% + interest rates +2% + Saving Sessions cancelled',
      type: 'downside',
      revenueImpact: -Math.round(BASE_REVENUE_PER_HOME * 0.45 * BASE_HOMES_TARGET),
      dscrImpact: -0.9,
      paybackChange: 18,
      portfolioValuationChange: -Math.round(BASE_REVENUE_PER_HOME * BASE_HOMES_TARGET * 2),
      severity: 'critical',
    },
  ];
}

export function runUpsideScenarios(): ScenarioResult[] {
  return [
    {
      name: 'Hardware Windfall',
      description: 'Battery costs drop 30% + volume discounts kick in',
      type: 'upside',
      revenueImpact: 0,
      dscrImpact: 0.8,
      paybackChange: -6,
      portfolioValuationChange: Math.round(BASE_CAPEX_PER_HOME * 0.3 * BASE_HOMES_TARGET),
      severity: 'high',
    },
    {
      name: 'Revenue Boom',
      description: 'Saving Sessions doubled + flexibility markets open + IOF spread widens 20%',
      type: 'upside',
      revenueImpact: Math.round((BASE_SAVING_SESSIONS_REVENUE + 1500 + BASE_REVENUE_PER_HOME * 0.15) * BASE_HOMES_TARGET),
      dscrImpact: 0.6,
      paybackChange: -5,
      portfolioValuationChange: Math.round((BASE_SAVING_SESSIONS_REVENUE + 1500 + BASE_REVENUE_PER_HOME * 0.15) * BASE_HOMES_TARGET * 5),
      severity: 'high',
    },
    {
      name: 'Regulatory Tailwind',
      description: 'Government incentive + mandated new-build batteries',
      type: 'upside',
      revenueImpact: Math.round(BASE_REVENUE_PER_HOME * 0.5 * 50),
      dscrImpact: 0.3,
      paybackChange: -3,
      portfolioValuationChange: Math.round(BASE_REVENUE_PER_HOME * 0.5 * 50 * 5),
      severity: 'high',
    },
    {
      name: 'Market Domination',
      description: 'First-mover lock-in + referral network + ENWL partnership',
      type: 'upside',
      revenueImpact: Math.round(BASE_REVENUE_PER_HOME * 0.3 * BASE_HOMES_TARGET),
      dscrImpact: 0.4,
      paybackChange: -4,
      portfolioValuationChange: Math.round(BASE_REVENUE_PER_HOME * BASE_HOMES_TARGET * 1.5),
      severity: 'high',
    },
    {
      name: 'Best Case',
      description: 'Battery costs -30% + Saving Sessions doubled + flexibility revenue + 3 referrals per home',
      type: 'upside',
      revenueImpact: Math.round(BASE_REVENUE_PER_HOME * 0.6 * BASE_HOMES_TARGET),
      dscrImpact: 1.5,
      paybackChange: -10,
      portfolioValuationChange: Math.round(BASE_REVENUE_PER_HOME * BASE_HOMES_TARGET * 3),
      severity: 'high',
    },
  ];
}

// ============================================================
// Combined Stress Test
// ============================================================

export interface StressTestResult {
  scenarioName: string;
  adjustedRevenue: number;
  adjustedDscr: number;
  adjustedPayback: number;
  businessSurvives: boolean;
  breakEvenHomes: number;
}

export function runStressTest(
  iofChangePercent: number,
  degradationPercent: number,
  interestRateChangePercent: number,
  savingSessionsCancelled: boolean,
): StressTestResult {
  const arbitrageRevenue = 26000 * (1 + iofChangePercent / 100);
  const degradationFactor = Math.max(0.5, 1 - degradationPercent * 5 / 100);
  const ssRevenue = savingSessionsCancelled ? 0 : BASE_SAVING_SESSIONS_REVENUE;
  const perHome = (arbitrageRevenue * degradationFactor) + ssRevenue + BASE_FLEXIBILITY_REVENUE;

  const debtService = (BASE_CAPEX_PER_HOME / 10) * (1 + interestRateChangePercent / 100);
  const dscr = debtService > 0 ? perHome / debtService : 0;
  const payback = perHome > 0 ? Math.round((BASE_CAPEX_PER_HOME / perHome) * 12) : 999;
  const breakEven = perHome > 0 ? Math.ceil(debtService * BASE_HOMES_TARGET / perHome) : 999;

  return {
    scenarioName: 'Combined Stress Test',
    adjustedRevenue: Math.round(perHome),
    adjustedDscr: Math.round(dscr * 100) / 100,
    adjustedPayback: payback,
    businessSurvives: dscr >= 1.0,
    breakEvenHomes: breakEven,
  };
}
