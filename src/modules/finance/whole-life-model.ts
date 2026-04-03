// ============================================================
// Finance Module — Whole-Life Cost Model (Section 12)
// Year-by-year CAPEX/revenue/cost model over the full ESA term.
//
// IMPORTANT: All projections delegate to the shared scenario engine
// at /src/shared/utils/scenarios.ts. This file handles:
//   - Detailed CAPEX breakdown per system type
//   - Annual cost itemisation (debt service, insurance, G99, etc.)
//   - Annual revenue itemisation (arbitrage, SS, flex, SEG, CM)
//   - Wrapping the shared engine's output into WholeLifeYear rows
//   - IRR / NPV / payback summary
//   - Three-scenario output (best / likely / worst)
// ============================================================

import {
  calculateScenario,
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
  SAVING_SESSIONS,
  formatGbp,
} from '@/shared/utils/scenarios';
import type {
  BatterySystem,
  Tariff,
  ScenarioAssumptions,
  YearlyProjection,
} from '@/shared/types';
import { ALL_TARIFFS } from '@/modules/tariffs/data';

// ============================================================
// Data Structures
// ============================================================

export interface CapexBreakdown {
  /** Battery modules (hardware cost only) */
  batteryHardware: number;
  /** Inverter hardware */
  inverterHardware: number;
  /** Solar PV panels + mounting (0 if not applicable) */
  solarHardware: number;
  /** Heat pump (0 if not applicable) */
  heatPumpHardware: number;
  /** Labour, civils, cable runs */
  installation: number;
  /** ENWL G99 application fee (typically £1,500) */
  g99Application: number;
  /** MCS certification cost (typically £500–1,000) */
  mcsCertification: number;
  /** Pre-installation electrical survey */
  electricalSurvey: number;
  /** Battery enclosure / housing */
  enclosure: number;
  /** Initial commissioning + first-year monitoring setup */
  commissioningMonitoring: number;
  /** 5% contingency on all above */
  contingency: number;
  /** Sum of all line items (including contingency) */
  totalCapex: number;
}

export interface AnnualCosts {
  year: number;
  /** Fixed homeowner payment (£1,200/year = £100/month) */
  homeownerPayment: number;
  /** Battery maintenance, scaled slightly upward as system ages */
  maintenance: number;
  /** Battery-specific insurance premium */
  insurance: number;
  /** Remote monitoring subscription */
  monitoring: number;
  /** ENWL G99 annual connection charge */
  g99AnnualFee: number;
  /** Annual loan repayment (principal + interest) */
  debtService: number;
  /** Sinking fund contribution for inverter replacement at year ~10 */
  replacementFund: number;
  /** Sum of all cost lines */
  totalCosts: number;
}

export interface AnnualRevenue {
  year: number;
  /** Buy-low/sell-high arbitrage revenue from tariff spread */
  arbitrageRevenue: number;
  /** Saving Sessions / Demand Flexibility Service */
  savingSessionsRevenue: number;
  /** ENWL / Piclo Flex flexibility market revenue */
  flexibilityRevenue: number;
  /** Smart Export Guarantee payments for solar export */
  segRevenue: number;
  /** Capacity Market revenue (if system is qualified) */
  capacityMarketRevenue: number;
  /** Sum of all revenue lines */
  totalRevenue: number;
}

export interface WholeLifeYear {
  year: number;
  costs: AnnualCosts;
  revenue: AnnualRevenue;
  /** Revenue minus costs for this year */
  netCashFlow: number;
  /** Running cumulative net cash flow from Year 0 (Year 0 = -totalCapex) */
  cumulativeCashFlow: number;
  /** Degraded capacity as a percentage of nameplate (e.g. 98 = 98%) */
  batteryCapacityPercent: number;
  /** Cumulative net cash flow / totalCapex × 100 */
  roi: number;
  /** True once cumulative cash flow first turns positive */
  paybackAchieved: boolean;
}

export interface WholeLifeModel {
  capex: CapexBreakdown;
  projections: WholeLifeYear[];
  summary: {
    totalCapex: number;
    totalRevenue: number;
    totalCosts: number;
    totalNetCashFlow: number;
    /** Year number in which payback is achieved (999 = not within term) */
    paybackYear: number;
    /** Month within paybackYear when payback is achieved (1–12) */
    paybackMonth: number;
    /** IRR as a percentage (e.g. 22.5 = 22.5%) */
    irr: number;
    /** NPV at 8% discount rate in £ */
    npv8Percent: number;
    /** NPV at 5% discount rate in £ */
    npv5Percent: number;
    /** Total net revenue over ESA term / totalCapex */
    lifetimeRevenueMultiple: number;
    /**
     * ESA end-of-term residual value (Option B: homeowner purchase at 40% of original CAPEX).
     * Only meaningful at Year 10. Used in investor materials to show asset-backed floor value.
     * Source: ESA end-of-term clause (comp-9b). Status: Draft — requires solicitor review.
     */
    residualValueGbp: number;
  };
  scenarios: {
    best: WholeLifeYear[];
    likely: WholeLifeYear[];
    worst: WholeLifeYear[];
  };
}

// ============================================================
// Build Parameters
// ============================================================

export interface WholeLifeModelParams {
  /** Battery capacity in kWh (e.g. 192 for Garage King) */
  capacityKwh: number;
  /** Inverter peak output in kW (e.g. 96 for two M1 units) */
  inverterKw: number;
  /** Solar PV array size in kWp (optional) */
  solarKwp?: number;
  /** Whether a heat pump is co-located (affects CAPEX) */
  hasHeatPump?: boolean;
  /** The tariff profile used for arbitrage revenue */
  tariff: Tariff;
  /** Which scenario to build */
  scenario: 'best' | 'likely' | 'worst';
  /** Annual debt service in £ (principal + interest). 0 = no debt. */
  annualDebtService?: number;
  /** ESA contract term in years (default 10) */
  esaTermYears?: number;
  /**
   * Optional assumption overrides for this build.
   * If omitted the scenario defaults are used unchanged.
   */
  assumptionOverrides?: Partial<ScenarioAssumptions>;
}

// ============================================================
// CAPEX Builder
// ============================================================

/**
 * Build a detailed CAPEX breakdown for the given system parameters.
 *
 * Reference system: The Beeches — 192kWh / 96kW Sigenergy
 *   Battery modules: 192kWh × £200/kWh = £38,400
 *   Inverter:  £3,200  (Sigenergy M1 100kW)
 *   Installation: £4,500
 *   G99: £1,500
 *   MCS: £800
 *   Survey: £350
 *   Enclosure: £1,800
 *   Commissioning/monitoring: £600
 *   Contingency 5%: £2,558
 *   Total: ~£53,708
 */
function buildCapexBreakdown(params: WholeLifeModelParams): CapexBreakdown {
  const { capacityKwh, inverterKw, solarKwp, hasHeatPump, scenario } = params;

  // Hardware cost multipliers per scenario
  const hardwareMult =
    scenario === 'best' ? 0.8   // -20% price drop
    : scenario === 'worst' ? 1.1 // +10% supply issues
    : 1.0;

  const installMult =
    scenario === 'best' ? 0.9    // -10% efficiency gains
    : scenario === 'worst' ? 1.15 // +15% labour shortage
    : 1.0;

  // Battery modules: £200/kWh at wholesale (likely case)
  const batteryHardware = Math.round(capacityKwh * 200 * hardwareMult);

  // Inverter: base £3,200 for 100kW M1, scaled by kW
  const baseInverterCost = 3200 * (inverterKw / 100);
  const inverterHardware = Math.round(baseInverterCost * hardwareMult);

  // Solar: £600/kWp supply-and-fit (panels + mounting, not labour)
  const solarHardware = solarKwp ? Math.round(solarKwp * 600 * hardwareMult) : 0;

  // Heat pump: fixed £5,500 hardware if present
  const heatPumpHardware = hasHeatPump ? Math.round(5500 * hardwareMult) : 0;

  // Installation labour / civils / cable
  // Base: £4,500 for 192kWh system, scales with capacity
  const baseInstall = 4500 * (capacityKwh / 192);
  const installation = Math.round(baseInstall * installMult);

  // Fixed soft costs (regulatory/certification)
  const g99Application = 1500;
  const mcsCertification = 800;
  const electricalSurvey = 350;
  const enclosure = Math.round(1800 * installMult); // civils/housing
  const commissioningMonitoring = 600;

  // Sum before contingency
  const subTotal =
    batteryHardware +
    inverterHardware +
    solarHardware +
    heatPumpHardware +
    installation +
    g99Application +
    mcsCertification +
    electricalSurvey +
    enclosure +
    commissioningMonitoring;

  const contingency = Math.round(subTotal * 0.05);
  const totalCapex = subTotal + contingency;

  return {
    batteryHardware,
    inverterHardware,
    solarHardware,
    heatPumpHardware,
    installation,
    g99Application,
    mcsCertification,
    electricalSurvey,
    enclosure,
    commissioningMonitoring,
    contingency,
    totalCapex,
  };
}

// ============================================================
// BatterySystem Synthesiser
// ============================================================

/**
 * Build a BatterySystem object for use with the shared scenario engine.
 * The scenario engine needs a BatterySystem; we synthesise one from
 * the WholeLifeModelParams so callers don't need to construct it.
 */
function buildBatterySystem(params: WholeLifeModelParams): BatterySystem {
  const { capacityKwh, inverterKw, solarKwp, scenario } = params;
  const capex = buildCapexBreakdown(params);

  // Maintenance base: £150/year for small systems, scales with capacity
  const baseMaintenanceCost = Math.max(150, Math.round(150 * (capacityKwh / 50)));
  const maintMult =
    scenario === 'best' ? 0.85
    : scenario === 'worst' ? 1.25
    : 1.0;

  return {
    id: `wlm-${capacityKwh}kwh-${inverterKw}kw`,
    homeId: 'model',
    inverterModel: `${inverterKw}kW Inverter`,
    batteryModules: Math.round(capacityKwh / 12), // assumes 12kWh modules
    totalCapacityKwh: capacityKwh,
    batteryChemistry: 'LFP',
    solarPvKwp: solarKwp,
    installCost: capex.totalCapex,
    annualMaintenanceCost: Math.round(baseMaintenanceCost * maintMult),
    warrantyYears: 15,
    degradationRatePercent: 2,
    maxChargeRateKw: inverterKw,
    maxDischargeRateKw: inverterKw,
    roundTripEfficiency: 0.92,
  };
}

// ============================================================
// Revenue Itemisation
// ============================================================

/**
 * Split a YearlyProjection's grossRevenue into itemised revenue lines.
 *
 * The shared scenario engine calculates total gross revenue. Here we
 * decompose it into the sub-components for the WholeLifeYear display.
 * The decomposition uses the same proportional splits the engine applies.
 */
function itemiseRevenue(
  yearData: YearlyProjection,
  assumptions: ScenarioAssumptions,
  system: BatterySystem,
): Omit<AnnualRevenue, 'year'> {
  // Saving Sessions revenue — use SAVING_SESSIONS authoritative annual totals.
  // These are scenario-specific flat values from the corrected March 2026 model.
  const savingSessionsRevenue = SAVING_SESSIONS[assumptions.type].annual_total;

  // Flexibility market revenue from the assumption
  const flexibilityRevenue = assumptions.flexibilityRevenuePerHomePerYear;

  // SEG: solar export. If no solar, zero.
  // Solar export share: ~5% of gross when solar is present (conservative)
  const segRevenue = system.solarPvKwp
    ? Math.round(yearData.grossRevenue * 0.05)
    : 0;

  // Capacity Market: not currently operational for behind-the-meter in UK.
  const capacityMarketRevenue = 0;

  // Arbitrage is the remainder
  const arbitrageRevenue = Math.max(
    0,
    yearData.grossRevenue - savingSessionsRevenue - flexibilityRevenue - segRevenue - capacityMarketRevenue,
  );

  return {
    arbitrageRevenue: Math.round(arbitrageRevenue),
    savingSessionsRevenue: Math.round(savingSessionsRevenue),
    flexibilityRevenue: Math.round(flexibilityRevenue),
    segRevenue: Math.round(segRevenue),
    capacityMarketRevenue,
    totalRevenue: Math.round(yearData.grossRevenue),
  };
}

// ============================================================
// Cost Itemisation
// ============================================================

/**
 * Build itemised annual costs for a given year.
 *
 * The scenario engine already deducts homeowner payment, maintenance and
 * insurance. Here we re-construct the full cost breakdown and add
 * debt service, monitoring, G99 annual fee and replacement fund.
 */
function buildAnnualCosts(
  year: number,
  system: BatterySystem,
  assumptions: ScenarioAssumptions,
  annualDebtService: number,
): AnnualCosts {
  const homeownerPayment = 1200; // £100/month fixed

  // Maintenance scales with age: +2% per year to reflect older systems needing more attention
  const baseMaint = system.annualMaintenanceCost * (1 + assumptions.maintenanceCostChangePercent / 100);
  const maintenance = Math.round(baseMaint * Math.pow(1.02, year - 1));

  // Insurance: 0.8% of hardware value capped at £1,500, min £150
  const hardwareValue =
    system.installCost - 1500 - 800 - 350 - 1800 - 600; // subtract soft costs
  const insurance = Math.round(Math.max(150, Math.min(1500, hardwareValue * 0.008)));

  // Remote monitoring subscription
  const monitoring = 300;

  // G99 annual connection charge (ENWL)
  const g99AnnualFee = 150;

  // Replacement fund: target £3,200 for inverter replacement at year 10
  // = £320/year sinking fund
  const replacementFund = 320;

  const totalCosts =
    homeownerPayment + maintenance + insurance + monitoring + g99AnnualFee + annualDebtService + replacementFund;

  return {
    year,
    homeownerPayment,
    maintenance,
    insurance,
    monitoring,
    g99AnnualFee,
    debtService: Math.round(annualDebtService),
    replacementFund,
    totalCosts: Math.round(totalCosts),
  };
}

// ============================================================
// IRR / NPV Helpers
// ============================================================

function calculateIrr(cashFlows: number[], maxIterations = 200): number {
  let rate = 0.1;
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const d = Math.pow(1 + rate, t);
      npv += cashFlows[t] / d;
      if (t > 0) dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npv) < 0.01 || dnpv === 0) break;
    rate -= npv / dnpv;
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }
  return Math.round(rate * 10000) / 100; // return as percentage
}

function calculateNpv(cashFlows: number[], discountRate: number): number {
  return Math.round(
    cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + discountRate, t), 0) * 100,
  ) / 100;
}

// ============================================================
// Core Builder
// ============================================================

/**
 * Build a whole-life model for a single scenario.
 *
 * Uses the shared scenario engine (calculateScenario) for all year-by-year
 * projections, then wraps the output into the WholeLifeModel structure with
 * itemised costs and revenue.
 */
export function buildWholeLifeModel(params: WholeLifeModelParams): WholeLifeModel {
  const {
    scenario,
    tariff,
    annualDebtService = 0,
    esaTermYears = 10,
    assumptionOverrides,
  } = params;

  const baseAssumptions =
    scenario === 'best' ? BEST_CASE_DEFAULTS
    : scenario === 'worst' ? WORST_CASE_DEFAULTS
    : LIKELY_CASE_DEFAULTS;

  const assumptions: ScenarioAssumptions = { ...baseAssumptions, ...assumptionOverrides };

  const capex = buildCapexBreakdown(params);
  const system = buildBatterySystem(params);

  // Delegate all year-by-year projections to the shared scenario engine
  const engineProjections: YearlyProjection[] = calculateScenario(
    system,
    tariff,
    assumptions,
    esaTermYears,
  );

  const projections: WholeLifeYear[] = [];
  let cumulativeCashFlow = -capex.totalCapex; // Year 0 = initial CAPEX outlay
  let paybackAchievedYear = 999;
  let paybackAchievedMonth = 1;
  let paybackAlreadyHit = false;

  for (const yearData of engineProjections) {
    const costs = buildAnnualCosts(yearData.year, system, assumptions, annualDebtService);
    const revenueItems = itemiseRevenue(yearData, assumptions, system);

    // Net cash flow: use the engine's netRevenue as the revenue-side figure,
    // minus the additional costs we track separately (debt service, G99 annual,
    // replacement fund, monitoring) that aren't included in the engine's deductions.
    // The engine already deducts: homeownerPayment, maintenance, insurance
    // We add: debtService, g99AnnualFee, replacementFund, monitoring
    const additionalCosts =
      annualDebtService +
      costs.g99AnnualFee +
      costs.replacementFund +
      costs.monitoring;

    const netCashFlow = Math.round(yearData.netRevenue - additionalCosts);
    const prevCumulative = cumulativeCashFlow;
    cumulativeCashFlow = Math.round(cumulativeCashFlow + netCashFlow);

    // Payback detection: first year where cumulative turns non-negative
    if (!paybackAlreadyHit && cumulativeCashFlow >= 0) {
      paybackAlreadyHit = true;
      paybackAchievedYear = yearData.year;
      // Interpolate the month within the year
      const deficit = -prevCumulative; // how much was still negative at start of year
      paybackAchievedMonth =
        netCashFlow > 0
          ? Math.min(12, Math.ceil((deficit / netCashFlow) * 12))
          : 12;
    }

    const roi =
      capex.totalCapex > 0
        ? Math.round((cumulativeCashFlow / capex.totalCapex) * 10000) / 100
        : 0;

    projections.push({
      year: yearData.year,
      costs,
      revenue: { year: yearData.year, ...revenueItems },
      netCashFlow,
      cumulativeCashFlow,
      batteryCapacityPercent: yearData.batteryCapacityRemaining,
      roi,
      paybackAchieved: cumulativeCashFlow >= 0,
    });
  }

  // Summary statistics
  const totalRevenue = projections.reduce((s, p) => s + p.revenue.totalRevenue, 0);
  const totalCosts = projections.reduce((s, p) => s + p.costs.totalCosts, 0);
  const totalNetCashFlow = projections.reduce((s, p) => s + p.netCashFlow, 0);

  const cashFlowsForIrr = [
    -capex.totalCapex,
    ...projections.map(p => p.netCashFlow),
  ];

  const irr = calculateIrr(cashFlowsForIrr);
  const npv8Percent = calculateNpv(cashFlowsForIrr, 0.08);
  const npv5Percent = calculateNpv(cashFlowsForIrr, 0.05);
  const lifetimeRevenueMultiple =
    capex.totalCapex > 0
      ? Math.round((totalNetCashFlow / capex.totalCapex) * 100) / 100
      : 0;

  // ESA end-of-term residual value: Option B purchase price = 40% of original CAPEX.
  // Status: Draft — requires solicitor review before presenting to investors.
  const residualValueGbp = Math.round(capex.totalCapex * 0.40);

  return {
    capex,
    projections,
    summary: {
      totalCapex: capex.totalCapex,
      totalRevenue,
      totalCosts,
      totalNetCashFlow,
      paybackYear: paybackAchievedYear,
      paybackMonth: paybackAchievedMonth,
      irr,
      npv8Percent,
      npv5Percent,
      lifetimeRevenueMultiple,
      residualValueGbp,
    },
    scenarios: {
      // Single-scenario build: all three slots hold this scenario's projections.
      // Use buildThreeScenarioWholeLifeModel to get distinct projections.
      best: projections,
      likely: projections,
      worst: projections,
    },
  };
}

// ============================================================
// Three-Scenario Builder
// ============================================================

export interface ThreeScenarioParams {
  capacityKwh: number;
  inverterKw: number;
  solarKwp?: number;
  hasHeatPump?: boolean;
  tariff: Tariff;
  annualDebtService?: number;
  esaTermYears?: number;
  assumptionOverrides?: {
    best?: Partial<ScenarioAssumptions>;
    likely?: Partial<ScenarioAssumptions>;
    worst?: Partial<ScenarioAssumptions>;
  };
}

/**
 * Build best, likely and worst whole-life models in one call.
 * Each scenario gets its own distinct CAPEX breakdown (hardware costs differ),
 * its own annual revenue projections, and its own summary metrics.
 */
export function buildThreeScenarioWholeLifeModel(
  params: ThreeScenarioParams,
): { best: WholeLifeModel; likely: WholeLifeModel; worst: WholeLifeModel } {
  const base = {
    capacityKwh: params.capacityKwh,
    inverterKw: params.inverterKw,
    solarKwp: params.solarKwp,
    hasHeatPump: params.hasHeatPump,
    tariff: params.tariff,
    annualDebtService: params.annualDebtService,
    esaTermYears: params.esaTermYears,
  };

  return {
    best: buildWholeLifeModel({
      ...base,
      scenario: 'best',
      assumptionOverrides: params.assumptionOverrides?.best,
    }),
    likely: buildWholeLifeModel({
      ...base,
      scenario: 'likely',
      assumptionOverrides: params.assumptionOverrides?.likely,
    }),
    worst: buildWholeLifeModel({
      ...base,
      scenario: 'worst',
      assumptionOverrides: params.assumptionOverrides?.worst,
    }),
  };
}

// ============================================================
// Display Helpers
// ============================================================

/**
 * Return a human-readable multi-line summary of a CAPEX breakdown.
 */
export function formatCapexBreakdown(capex: CapexBreakdown): string {
  const lines: string[] = [
    'CAPEX Breakdown',
    '---------------',
    `Battery hardware:         ${formatGbp(capex.batteryHardware)}`,
    `Inverter:                 ${formatGbp(capex.inverterHardware)}`,
  ];

  if (capex.solarHardware > 0) {
    lines.push(`Solar PV hardware:        ${formatGbp(capex.solarHardware)}`);
  }
  if (capex.heatPumpHardware > 0) {
    lines.push(`Heat pump:                ${formatGbp(capex.heatPumpHardware)}`);
  }

  lines.push(
    `Installation:             ${formatGbp(capex.installation)}`,
    `G99 application:          ${formatGbp(capex.g99Application)}`,
    `MCS certification:        ${formatGbp(capex.mcsCertification)}`,
    `Electrical survey:        ${formatGbp(capex.electricalSurvey)}`,
    `Enclosure:                ${formatGbp(capex.enclosure)}`,
    `Commissioning/monitoring: ${formatGbp(capex.commissioningMonitoring)}`,
    `Contingency (5%):         ${formatGbp(capex.contingency)}`,
    '---------------',
    `TOTAL CAPEX:              ${formatGbp(capex.totalCapex)}`,
  );

  return lines.join('\n');
}

// ============================================================
// Reference Model: The Beeches
// ============================================================

/**
 * The Beeches reference tariff — Octopus Intelligent Octopus Flux (IOF).
 *
 * IOF scenario revenue shown at paused rates. Source from tariffs/data.ts, not hardcoded.
 *
 * IOF signups were paused by Octopus in early 2026. The current live IOF rates use equal
 * import/export pricing (24.27p off-peak, 32.36p peak both ways), giving only an 8.09p
 * arbitrage spread. This means the IOF scenario correctly shows near-zero arbitrage
 * revenue while paused — do NOT revert to the old pre-pause rates (11.44p / 39.44p).
 *
 * When IOF resumes, tariffs/data.ts will be updated and this model will automatically
 * reflect the current rates without any change needed here.
 */
const _iofTariffFromData = ALL_TARIFFS.find(t => t.id === 'octopus-iof');
if (!_iofTariffFromData) {
  throw new Error(
    'IOF tariff not found in tariffs/data.ts — ensure octopus-iof is present in ALL_TARIFFS',
  );
}
const BEECHES_IOF_TARIFF: Tariff = _iofTariffFromData;

/**
 * Return the three-scenario whole-life model for The Beeches demo property.
 *
 * System specification:
 *   - 192kWh battery (16 × 12kWh Sigenergy modules)
 *   - 96kW inverter (Sigenergy M1)
 *   - No solar / no heat pump
 *   - Tariff: Octopus Intelligent Flux
 *   - Annual debt service: £4,800 (assumed £40k loan at 6% / 10yr)
 *   - ESA term: 10 years
 *
 * These values are drawn from the session handover document.
 */
export function getBeechesWholeLifeModel(): {
  best: WholeLifeModel;
  likely: WholeLifeModel;
  worst: WholeLifeModel;
} {
  return buildThreeScenarioWholeLifeModel({
    capacityKwh: 192,
    inverterKw: 96,
    solarKwp: undefined,
    hasHeatPump: false,
    tariff: BEECHES_IOF_TARIFF,
    annualDebtService: 4800,
    esaTermYears: 10,
  });
}
