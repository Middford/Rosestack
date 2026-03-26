// ============================================================
// Tariff Data Service — Seeded UK energy tariff data
// All tariffs relevant to battery arbitrage with exact rates
// ============================================================

import type { Tariff, TariffRate } from '@/shared/types';

// --- Grid Service Types ---

export interface GridService {
  id: string;
  name: string;
  provider: string;
  type: 'demand-response' | 'flexibility' | 'capacity' | 'balancing' | 'export';
  description: string;
  ratePencePerKwh?: number;
  ratePerKwPerYear?: number;
  sessionsPerYear?: number;
  avgSessionDurationHours?: number;
  eligibility: string[];
  minBatteryKwh?: number;
  minPortfolioSize?: number;
  aggregatorRequired: boolean;
  historicalEarningsPerHomePerYear?: number;
  status: 'active' | 'upcoming' | 'seasonal';
}

export interface TariffWithMeta extends Tariff {
  description: string;
  arbitrageSpreadPence: number;
  bestForBattery: boolean;
  krakenControlled: boolean;
  apiEndpoint?: string;
  historicalAvgSpread?: number;
  notes?: string;
}

// --- Helper to calculate spread ---

function calcSpread(importRates: TariffRate[], exportRates: TariffRate[]): number {
  const cheapestImport = Math.min(...importRates.map(r => r.ratePencePerKwh));
  const highestExport = Math.max(...exportRates.map(r => r.ratePencePerKwh));
  return Math.round((highestExport - cheapestImport) * 100) / 100;
}

// ============================================================
// Core Tariffs
// ============================================================

// IOF (INTELLI-FLUX-IMPORT-23-07-14) — Region D (ENWL), March 2026.
// Import rates confirmed via Octopus API: 2-period structure (off-peak/peak).
// Export product returned 404 from the public API, but multiple independent sources
// confirm IOF uses EQUAL import/export rates — same rate at each time period.
// This is the key differentiator: you are paid what you pay, at every hour of the day.
// NOTE: IOF signups were paused by Octopus as of early 2026. Verify availability.
const octopusIof: TariffWithMeta = {
  id: 'octopus-iof',
  supplier: 'Octopus Energy',
  name: 'Intelligent Octopus Flux',
  type: 'flux',
  description: 'Kraken-controlled tariff with equal import/export rates — confirmed 2-period structure. Off-peak (19:00–16:00): 24.27p in/out. Peak (16:00–19:00): 32.36p in/out. Import rates confirmed via Octopus API (INTELLI-FLUX-IMPORT-23-07-14, Region D, March 2026). Export product returned 404 but equal-rate structure is confirmed by multiple sources. Designed for solar+battery homes. Kraken optimises charging/discharging automatically. IMPORTANT: IOF signups currently paused — check availability before planning around this tariff. For standalone BESS (no solar), Flux or Agile provide better arbitrage due to lower off-peak import costs.',
  importRates: [
    { periodStart: '19:00', periodEnd: '16:00', ratePencePerKwh: 24.27, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 32.36, season: 'all' },
  ],
  exportRates: [
    // IOF confirmed equal import/export rates — you are paid the same rate you pay.
    // Off-peak (19:00–16:00): export at 24.27p (vs Flux off-peak export of only 5.12p).
    // Peak (16:00–19:00): export at 32.36p (vs Flux peak export of 30.68p — similar).
    // For solar+battery: IOF is superior — daytime solar export at 24.27p vs Flux 10.54p.
    // For standalone BESS (no solar): IOF import at 24.27p vs Flux at 17.90p — worse spread.
    { periodStart: '19:00', periodEnd: '16:00', ratePencePerKwh: 24.27, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 32.36, season: 'all' },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2026-03-01'),
  eligibilityRequirements: [
    'MCS-certified battery installation',
    'Solar PV system required (IOF designed for solar+battery homes)',
    'Compatible battery: GivEnergy, Enphase, SolarEdge, or Tesla',
    'Octopus Energy account (import and export tariff)',
    'Smart meter (half-hourly readings)',
    'Check: IOF signups may be paused — verify with Octopus before applying',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: true,
  notes: 'IOF confirmed equal import/export rates: off-peak 24.27p (19:00–16:00), peak 32.36p (16:00–19:00). Resolved: import=export parity confirmed by Octopus documentation and third-party sources. For standalone BESS without solar: arbitrage spread is only 8.09p (32.36 - 24.27) vs Flux spread of 12.78p (30.68 - 17.90) — Flux is better for pure arbitrage. For solar+battery: IOF is significantly better because daytime solar exports earn 24.27p (vs Flux 10.54p). IOF signups paused as of early 2026 — not a current onboarding route. Modelled here for comparison and for future availability.',
};
octopusIof.arbitrageSpreadPence = calcSpread(octopusIof.importRates, octopusIof.exportRates);

// Standard Flux (FLUX-IMPORT-23-02-14 / FLUX-EXPORT-23-02-14) — Region D (ENWL), March 2026.
// Import and export rates confirmed via Octopus API. 4-period structure.
const octopusFlux: TariffWithMeta = {
  id: 'octopus-flux',
  supplier: 'Octopus Energy',
  name: 'Octopus Flux',
  type: 'flux',
  description: 'Standard Flux tariff without Kraken intelligent optimisation. Manual scheduling of charge/discharge. Four time-of-use periods with different import and export rates. Rates confirmed via Octopus API for Region D (ENWL), March 2026.',
  importRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 17.90, season: 'all' },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 29.83, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 41.77, season: 'all' },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 29.83, season: 'all' },
  ],
  exportRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 5.12, season: 'all' },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 10.54, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 30.68, season: 'all' },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 10.54, season: 'all' },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2026-03-01'),
  eligibilityRequirements: [
    'Solar PV system required',
    'Smart meter installed',
    'Octopus Energy account',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  apiEndpoint: 'https://api.octopus.energy/v1/products/FLUX-IMPORT-23-02-14/',
  notes: 'Rates from Octopus API (Region D, March 2026). Import: off-peak 17.90p (02:00-05:00), day 29.83p (05:00-16:00/19:00-02:00), peak 41.77p (16:00-19:00). Export: off-peak 5.12p, day 10.54p, peak 30.68p. Arbitrage strategy: charge at 17.90p off-peak, discharge at peak when export is 30.68p.',
};
octopusFlux.arbitrageSpreadPence = calcSpread(octopusFlux.importRates, octopusFlux.exportRates);

// RECOMMENDED tariff for battery arbitrage — variable half-hourly pricing
const octopusAgile: TariffWithMeta = {
  id: 'octopus-agile',
  supplier: 'Octopus Energy',
  name: 'Octopus Agile',
  type: 'agile',
  description: 'Half-hourly variable pricing tied to wholesale market via Agile Outgoing export. Best tariff for battery arbitrage due to wide spreads. Rates published day-ahead at 16:00. Can go negative (plunge pricing). Requires smart meter.',
  importRates: [
    { periodStart: '00:00', periodEnd: '04:00', ratePencePerKwh: 7.50, season: 'all' },
    { periodStart: '04:00', periodEnd: '07:00', ratePencePerKwh: 15.20, season: 'all' },
    { periodStart: '07:00', periodEnd: '16:00', ratePencePerKwh: 22.80, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 38.50, season: 'all' },
    { periodStart: '19:00', periodEnd: '00:00', ratePencePerKwh: 25.40, season: 'all' },
  ],
  exportRates: [
    // Agile Outgoing: tracks wholesale, avg 9-12p. Was 15p, cut to 12p on 1 March 2026.
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 12.00, season: 'all' },
  ],
  standingChargePencePerDay: 42.63,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Smart meter installed',
    'Octopus Energy account',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: true,
  krakenControlled: false,
  apiEndpoint: 'https://api.octopus.energy/v1/products/AGILE-24-10-01/',
  historicalAvgSpread: 18.5,
  notes: 'RECOMMENDED for battery arbitrage. Average overnight import: 5-10p, daytime: 15-30p, peak: 25-50p+. Agile Outgoing export tracks wholesale, avg 9-12p (was 15p, cut to 12p on 1 March 2026). Plunge pricing events (~15/year) can yield negative import rates. Best with automated scheduling.',
};
octopusAgile.arbitrageSpreadPence = calcSpread(octopusAgile.importRates, octopusAgile.exportRates);

const octopusIntelligentGo: TariffWithMeta = {
  id: 'octopus-intelligent-go',
  supplier: 'Octopus Energy',
  name: 'Octopus Intelligent Go',
  type: 'time-of-use',
  description: 'EV-focused tariff with 6-hour cheap overnight window. Battery charging possible during cheap window. Kraken may extend cheap periods.',
  importRates: [
    { periodStart: '23:30', periodEnd: '05:30', ratePencePerKwh: 7.50, season: 'all' },
    { periodStart: '05:30', periodEnd: '23:30', ratePencePerKwh: 27.35, season: 'all' },
  ],
  exportRates: [
    // Octopus Outgoing dropped to 12p on 1 March 2026 (was 15p)
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 12.00, season: 'all' },
  ],
  standingChargePencePerDay: 42.63,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Compatible EV or charger',
    'Smart meter installed',
    'Octopus Energy account',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: true,
  notes: 'Primarily for EV owners but battery can charge during cheap window. Export via Octopus Outgoing at 12p (cut from 15p on 1 March 2026).',
};
octopusIntelligentGo.arbitrageSpreadPence = calcSpread(octopusIntelligentGo.importRates, octopusIntelligentGo.exportRates);

const octopusCosy: TariffWithMeta = {
  id: 'octopus-cosy',
  supplier: 'Octopus Energy',
  name: 'Octopus Cosy',
  type: 'time-of-use',
  description: 'Heat pump tariff with three cheap windows (morning, afternoon, evening) totalling 8 hours. Stacking potential with battery and heat pump.',
  importRates: [
    { periodStart: '04:00', periodEnd: '07:00', ratePencePerKwh: 10.00, season: 'all' },
    { periodStart: '07:00', periodEnd: '13:00', ratePencePerKwh: 25.62, season: 'all' },
    { periodStart: '13:00', periodEnd: '16:00', ratePencePerKwh: 10.00, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 36.16, season: 'all' },
    { periodStart: '19:00', periodEnd: '22:00', ratePencePerKwh: 25.62, season: 'all' },
    { periodStart: '22:00', periodEnd: '00:00', ratePencePerKwh: 10.00, season: 'all' },
    { periodStart: '00:00', periodEnd: '04:00', ratePencePerKwh: 25.62, season: 'all' },
  ],
  exportRates: [
    // Octopus Outgoing dropped to 12p on 1 March 2026 (was 15p)
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 12.00, season: 'all' },
  ],
  standingChargePencePerDay: 42.63,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Heat pump installed',
    'Smart meter installed',
    'Octopus Energy account',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  notes: 'Three cheap windows: 04:00-07:00, 13:00-16:00, and 22:00-00:00 (8 hours total). Stacking: charge battery in cheap windows, discharge at peak 16:00-19:00. Good synergy with heat pump + battery.',
};
octopusCosy.arbitrageSpreadPence = calcSpread(octopusCosy.importRates, octopusCosy.exportRates);

const eonSmartFlex: TariffWithMeta = {
  id: 'eon-smart-flex',
  supplier: 'E.ON Next',
  name: 'E.ON Next Drive Smart',
  type: 'time-of-use',
  description: 'E.ON time-of-use tariff for battery and EV owners. Cheap overnight rate with daytime standard rate.',
  importRates: [
    { periodStart: '00:00', periodEnd: '06:00', ratePencePerKwh: 8.00, season: 'all' },
    { periodStart: '06:00', periodEnd: '00:00', ratePencePerKwh: 28.62, season: 'all' },
  ],
  exportRates: [
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 12.00, season: 'all' },
  ],
  standingChargePencePerDay: 48.12,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Smart meter installed',
    'E.ON Next account',
    'Battery or EV charger',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  notes: '6-hour cheap window 00:00-06:00 at 8p. Lower export rate than Octopus makes it less attractive for pure arbitrage.',
};
eonSmartFlex.arbitrageSpreadPence = calcSpread(eonSmartFlex.importRates, eonSmartFlex.exportRates);

const britishGasElectricDrivers: TariffWithMeta = {
  id: 'bg-electric-drivers',
  supplier: 'British Gas',
  name: 'British Gas EV Power',
  type: 'time-of-use',
  description: 'EV-focused tariff with cheap overnight rate. Battery can charge during off-peak window.',
  importRates: [
    { periodStart: '00:00', periodEnd: '05:00', ratePencePerKwh: 9.00, season: 'all' },
    { periodStart: '05:00', periodEnd: '00:00', ratePencePerKwh: 29.85, season: 'all' },
  ],
  exportRates: [
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 5.50, season: 'all' },
  ],
  standingChargePencePerDay: 49.85,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Smart meter installed',
    'British Gas account',
    'EV ownership required',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  notes: 'Very low export rate (SEG minimum) makes this poor for arbitrage. Short cheap window. EV ownership required.',
};
britishGasElectricDrivers.arbitrageSpreadPence = calcSpread(britishGasElectricDrivers.importRates, britishGasElectricDrivers.exportRates);

const ovoEnergy: TariffWithMeta = {
  id: 'ovo-energy',
  supplier: 'OVO Energy',
  name: 'OVO Energy Smart Tariff',
  type: 'time-of-use',
  description: 'OVO time-of-use tariff with moderate overnight discount. Reasonable SEG export rate.',
  importRates: [
    { periodStart: '00:00', periodEnd: '07:00', ratePencePerKwh: 11.50, season: 'all' },
    { periodStart: '07:00', periodEnd: '00:00', ratePencePerKwh: 27.20, season: 'all' },
  ],
  exportRates: [
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 7.50, season: 'all' },
  ],
  standingChargePencePerDay: 44.82,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Smart meter installed',
    'OVO Energy account',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  notes: 'Moderate spread. Export rate below market average. Not ideal for arbitrage-first strategy.',
};
ovoEnergy.arbitrageSpreadPence = calcSpread(ovoEnergy.importRates, ovoEnergy.exportRates);

const segRates: TariffWithMeta = {
  id: 'seg-rates',
  supplier: 'Various',
  name: 'Smart Export Guarantee (SEG)',
  type: 'fixed',
  description: 'Government-mandated export payment. All large suppliers must offer SEG. Rates vary by supplier. Listed rates are best available.',
  importRates: [
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 24.50, season: 'all' },
  ],
  exportRates: [
    // Best available SEG rate as of March 2026
    { periodStart: '00:00', periodEnd: '24:00', ratePencePerKwh: 15.10, season: 'all' },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2023-01-01'),
  eligibilityRequirements: [
    'MCS-certified solar PV or battery',
    'Smart meter installed',
    'Under 5MW capacity',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  notes: 'Octopus Outgoing: 12p (cut from 15p on 1 March 2026), E.ON Export Exclusive: 13p, British Gas Export & Earn Plus: 15.1p, EDF Export 12m: 15p, OVO: 7.5p. British Gas offers highest fixed SEG rate.',
};
segRates.arbitrageSpreadPence = calcSpread(segRates.importRates, segRates.exportRates);

// ============================================================
// All Tariffs
// ============================================================

export const ALL_TARIFFS: TariffWithMeta[] = [
  octopusIof,
  octopusFlux,
  octopusAgile,
  octopusIntelligentGo,
  octopusCosy,
  eonSmartFlex,
  britishGasElectricDrivers,
  ovoEnergy,
  segRates,
];

// ============================================================
// Grid Services
// ============================================================

export const GRID_SERVICES: GridService[] = [
  {
    id: 'saving-sessions',
    name: 'Saving Sessions',
    provider: 'Octopus Energy',
    type: 'demand-response',
    // IMPORTANT MECHANICS:
    // - Saving Sessions IS Octopus's delivery of the National Grid DFS programme.
    //   DFS and Saving Sessions are the SAME events — do not double-count.
    // - Baseline: calculated from the customer's typical consumption during the
    //   same half-hour slots on the previous 10 similar days.
    // - Reduction = baseline - actual meter reading. If exporting, actual is
    //   negative, so reduction = baseline + |export|.
    // - Payment is in Octopoints (1 point = 1p off bill), ON TOP of normal
    //   tariff export payments. No double-counting with arbitrage revenue.
    // - A battery home can export during session, earning both the normal export
    //   rate AND the SS reward. These genuinely stack.
    // - However, the reduction is measured at the household meter. Large battery
    //   capacity beyond what the inverter can discharge in the session window
    //   provides no additional benefit. The inverter rate is the bottleneck.
    // - Typical UK home baseline during a 1hr peak session: ~1kWh consumption.
    //   With a 10kW inverter discharging, reduction = 1 + 10 = 11kWh per session.
    // - Sessions announced ~24h in advance. Protocol: pre-charge to 100% SOC,
    //   discharge at max rate during session, resume normal cycling after.
    //
    // SESSION HISTORY:
    // - 2022/23 season: 25 sessions, avg ~400p/kWh, typical home earned ~£30-100
    // - 2023/24 season: ~12 sessions, avg ~250p/kWh, typical home earned ~£20-60
    // - 2024/25 season: ~10 sessions, avg ~200p/kWh, typical home earned ~£15-50
    // - Trend: fewer sessions, lower rates as grid stress reduces
    //
    // FOR BATTERY HOMES (with 10kW inverter, 1hr session):
    // - Gross per session: 11kWh * 200p/kWh = 2,200p = £22
    // - Pre-charge cost: 10kWh * 18p/kWh / 0.92 efficiency = 196p = ~£2
    // - Net per session: ~£20
    // - 10 sessions/year: ~£200/year (likely case)
    // - This is ADDITIONAL to normal arbitrage revenue for those periods.
    description: 'Octopus delivery of the National Grid DFS programme. Rewards measured reduction against household baseline during peak grid stress. Battery export during sessions counts as reduction. Payment (Octopoints) is ON TOP of normal tariff export — no double-counting. Inverter discharge rate is the bottleneck, not battery capacity. Sessions announced ~24h in advance.',
    ratePencePerKwh: 200, // average across 2024/25 season — was ~400p in 2022/23, trending down
    sessionsPerYear: 10, // 2024/25 had ~10 sessions — down from 25 in 2022/23
    avgSessionDurationHours: 1.0, // typical 1 hour (range 0.5-2hr)
    eligibility: ['Octopus Energy customer', 'Smart meter installed'],
    minBatteryKwh: 0,
    aggregatorRequired: false,
    // Realistic battery home earnings: 10 sessions * ~£20 net = ~£200/year
    // Non-battery home: 10 sessions * ~£2 (1kWh reduction) = ~£20/year
    historicalEarningsPerHomePerYear: 200, // battery home with 10kW inverter
    status: 'seasonal',
  },
  {
    id: 'dfs',
    name: 'Demand Flexibility Service (DFS)',
    provider: 'National Grid ESO',
    type: 'demand-response',
    // IMPORTANT: DFS is the upstream programme. Saving Sessions IS the delivery
    // mechanism for Octopus customers. They are the SAME events.
    // This entry exists for reference/completeness but revenue should NOT be
    // added on top of Saving Sessions — that would be double-counting.
    // If RoseStack switches to a non-Octopus supplier, DFS participation
    // would be via that supplier's own DFS scheme instead of Saving Sessions.
    description: 'National Grid ESO programme — the upstream mechanism behind Saving Sessions. Delivered via energy suppliers (Octopus = Saving Sessions, others have equivalent schemes). DO NOT add DFS revenue on top of Saving Sessions — they are the same events. Listed here for reference only.',
    ratePencePerKwh: 200, // aligned with current Saving Sessions average
    sessionsPerYear: 10, // same events as Saving Sessions
    avgSessionDurationHours: 1.0,
    eligibility: ['Via energy supplier', 'Smart meter installed'],
    minBatteryKwh: 0,
    aggregatorRequired: false,
    // DO NOT add this to Saving Sessions — same revenue stream
    historicalEarningsPerHomePerYear: 0, // zero because it is captured via Saving Sessions
    status: 'seasonal',
  },
  {
    id: 'enwl-flexibility',
    name: 'ENWL Flexibility Tenders',
    provider: 'Electricity North West',
    type: 'flexibility',
    description: 'Local flexibility tenders in Lancashire and wider ENWL territory. Pay for demand reduction or generation during local network constraints. Active tenders available in Lancaster, Preston, Blackburn areas.',
    ratePerKwPerYear: 50,
    eligibility: ['Located in ENWL territory', 'Minimum 50kW aggregated capacity', 'Metering requirements'],
    minPortfolioSize: 10,
    aggregatorRequired: true,
    historicalEarningsPerHomePerYear: 200,
    status: 'active',
  },
  {
    id: 'piclo-flex',
    name: 'Piclo Flex',
    provider: 'Piclo',
    type: 'flexibility',
    description: 'Flexibility marketplace connecting DER assets with DNOs. Register assets, bid into tenders. Revenue varies by location and network need. Transparent tender process.',
    ratePerKwPerYear: 40,
    eligibility: ['Registered on Piclo platform', 'Via aggregator for small assets', 'Metering requirements'],
    minPortfolioSize: 5,
    aggregatorRequired: true,
    historicalEarningsPerHomePerYear: 160,
    status: 'active',
  },
  {
    id: 'capacity-market',
    name: 'Capacity Market',
    provider: 'National Grid ESO',
    type: 'capacity',
    description: 'Annual auction for reliable capacity. Small batteries access via aggregators. Minimum portfolio ~1MW. Revenue is de-rated capacity payment. 4-year contracts available. T-1 cleared at £5/kW/year.',
    ratePerKwPerYear: 5,
    eligibility: ['Minimum 1MW aggregated portfolio', 'Via licensed aggregator', 'Operational metering'],
    minPortfolioSize: 100,
    aggregatorRequired: true,
    historicalEarningsPerHomePerYear: 20,
    status: 'active',
  },
  {
    id: 'balancing-mechanism',
    name: 'Balancing Mechanism',
    provider: 'National Grid ESO',
    type: 'balancing',
    description: 'Real-time grid balancing. Small batteries access via aggregator virtual power plants (VPPs). Revenue highly variable but can be significant. Requires fast response.',
    ratePencePerKwh: 25,
    eligibility: ['Via licensed aggregator', 'Fast response capability', 'Operational metering'],
    minPortfolioSize: 50,
    aggregatorRequired: true,
    historicalEarningsPerHomePerYear: 80,
    status: 'active',
  },
];

// ============================================================
// Historical Rate Data (for charts)
// ============================================================

export interface HistoricalRate {
  month: string;
  agileAvgImport: number;
  agileAvgExport: number;
  fluxPeakExport: number;
  iofPeakExport: number;
  savingSessionRate: number;
}

// NOTE: savingSessionRate is the average reward rate in p/kWh of measured reduction
// for sessions that occurred that month. 0 means no sessions (summer = no DFS season).
// Saving Sessions season runs roughly Oct-Mar each year (winter peak demand).
// Rates have trended DOWN as the programme matures:
// - 2022/23 avg ~400p/kWh, 2023/24 avg ~250p/kWh, 2024/25 avg ~200p/kWh.
export const HISTORICAL_RATES: HistoricalRate[] = [
  { month: 'Jan 2024', agileAvgImport: 18.2, agileAvgExport: 14.5, fluxPeakExport: 21.8, iofPeakExport: 22.9, savingSessionRate: 280 },
  { month: 'Feb 2024', agileAvgImport: 17.8, agileAvgExport: 14.2, fluxPeakExport: 21.5, iofPeakExport: 22.5, savingSessionRate: 250 },
  { month: 'Mar 2024', agileAvgImport: 16.5, agileAvgExport: 13.8, fluxPeakExport: 21.2, iofPeakExport: 22.2, savingSessionRate: 220 },
  { month: 'Apr 2024', agileAvgImport: 15.2, agileAvgExport: 13.0, fluxPeakExport: 20.8, iofPeakExport: 21.8, savingSessionRate: 0 },
  { month: 'May 2024', agileAvgImport: 14.8, agileAvgExport: 12.5, fluxPeakExport: 20.5, iofPeakExport: 21.5, savingSessionRate: 0 },
  { month: 'Jun 2024', agileAvgImport: 13.5, agileAvgExport: 11.8, fluxPeakExport: 20.2, iofPeakExport: 21.2, savingSessionRate: 0 },
  { month: 'Jul 2024', agileAvgImport: 14.2, agileAvgExport: 12.0, fluxPeakExport: 20.5, iofPeakExport: 21.5, savingSessionRate: 0 },
  { month: 'Aug 2024', agileAvgImport: 15.5, agileAvgExport: 12.8, fluxPeakExport: 20.8, iofPeakExport: 21.8, savingSessionRate: 0 },
  { month: 'Sep 2024', agileAvgImport: 16.8, agileAvgExport: 13.5, fluxPeakExport: 21.2, iofPeakExport: 22.2, savingSessionRate: 0 },
  { month: 'Oct 2024', agileAvgImport: 19.5, agileAvgExport: 15.2, fluxPeakExport: 21.8, iofPeakExport: 22.8, savingSessionRate: 220 },
  { month: 'Nov 2024', agileAvgImport: 22.8, agileAvgExport: 16.5, fluxPeakExport: 22.2, iofPeakExport: 23.2, savingSessionRate: 200 },
  { month: 'Dec 2024', agileAvgImport: 24.5, agileAvgExport: 17.8, fluxPeakExport: 22.5, iofPeakExport: 23.5, savingSessionRate: 250 },
  { month: 'Jan 2025', agileAvgImport: 23.8, agileAvgExport: 17.2, fluxPeakExport: 22.3, iofPeakExport: 23.5, savingSessionRate: 200 },
  { month: 'Feb 2025', agileAvgImport: 22.5, agileAvgExport: 16.8, fluxPeakExport: 22.2, iofPeakExport: 23.4, savingSessionRate: 180 },
  { month: 'Mar 2025', agileAvgImport: 20.2, agileAvgExport: 15.5, fluxPeakExport: 22.0, iofPeakExport: 23.2, savingSessionRate: 190 },
];

// ============================================================
// Tariff Monitor Alerts
// ============================================================

export interface TariffAlert {
  id: string;
  date: string;
  tariffId: string;
  tariffName: string;
  type: 'rate-change' | 'new-tariff' | 'spread-move' | 'regulatory';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
}

export const TARIFF_ALERTS: TariffAlert[] = [
  {
    id: 'alert-1',
    date: '2025-03-20',
    tariffId: 'octopus-iof',
    tariffName: 'Intelligent Octopus Flux',
    type: 'rate-change',
    severity: 'warning',
    title: 'IOF peak export rate increased to 23.76p',
    description: 'Octopus has increased the peak export rate by 1.2p. This improves the arbitrage spread. Revenue models updated.',
  },
  {
    id: 'alert-2',
    date: '2025-03-15',
    tariffId: 'octopus-agile',
    tariffName: 'Octopus Agile',
    type: 'spread-move',
    severity: 'info',
    title: 'Agile peak-to-trough spread widened to 28p',
    description: 'Wholesale volatility has increased the Agile spread. Average daily arbitrage opportunity now 28p/kWh vs 22p last month.',
  },
  {
    id: 'alert-3',
    date: '2025-03-10',
    tariffId: 'seg-rates',
    tariffName: 'SEG Rates',
    type: 'regulatory',
    severity: 'info',
    title: 'Ofgem reviewing SEG minimum rate requirements',
    description: 'Ofgem consultation on increasing the SEG floor rate. If approved, minimum export rate would rise from 0p to 5.5p. Decision expected Q3 2025.',
  },
  {
    id: 'alert-4',
    date: '2025-03-05',
    tariffId: 'eon-smart-flex',
    tariffName: 'E.ON Next Drive Smart',
    type: 'rate-change',
    severity: 'warning',
    title: 'E.ON overnight rate updated to 8p (00:00-06:00)',
    description: 'E.ON Next Drive Smart off-peak rate is 8p for the 00:00-06:00 window.',
  },
  {
    id: 'alert-5',
    date: '2025-02-28',
    tariffId: 'octopus-cosy',
    tariffName: 'Octopus Cosy',
    type: 'new-tariff',
    severity: 'info',
    title: 'Octopus Cosy now available nationally',
    description: 'Previously limited rollout, Cosy is now available to all heat pump owners with smart meters. Good stacking opportunity with battery.',
  },
];

// ============================================================
// Portfolio Optimisation Sweep Data
// ============================================================

export interface PropertyTariffSweep {
  propertyId: string;
  address: string;
  currentTariffId: string;
  currentTariffName: string;
  recommendedTariffId: string;
  recommendedTariffName: string;
  currentAnnualRevenue: { best: number; likely: number; worst: number };
  recommendedAnnualRevenue: { best: number; likely: number; worst: number };
  upliftPercent: number;
  status: 'pending' | 'approved' | 'rejected' | 'switched';
  lastReviewed: string;
}

export const PORTFOLIO_SWEEP_DATA: PropertyTariffSweep[] = [
  {
    propertyId: 'home-001',
    address: '14 Elm Rd, Lancaster LA1 3EF',
    currentTariffId: 'octopus-flux',
    currentTariffName: 'Octopus Flux',
    recommendedTariffId: 'octopus-iof',
    recommendedTariffName: 'Intelligent Octopus Flux',
    currentAnnualRevenue: { best: 1850, likely: 1520, worst: 1180 },
    recommendedAnnualRevenue: { best: 2150, likely: 1780, worst: 1380 },
    upliftPercent: 17.1,
    status: 'pending',
    lastReviewed: '2025-03-20',
  },
  {
    propertyId: 'home-002',
    address: '7 Oak Close, Preston PR1 7BG',
    currentTariffId: 'eon-smart-flex',
    currentTariffName: 'E.ON Next Drive Smart',
    recommendedTariffId: 'octopus-iof',
    recommendedTariffName: 'Intelligent Octopus Flux',
    currentAnnualRevenue: { best: 1450, likely: 1180, worst: 920 },
    recommendedAnnualRevenue: { best: 2150, likely: 1780, worst: 1380 },
    upliftPercent: 50.8,
    status: 'pending',
    lastReviewed: '2025-03-20',
  },
  {
    propertyId: 'home-003',
    address: '22 Maple Drive, Blackburn BB2 4HN',
    currentTariffId: 'octopus-iof',
    currentTariffName: 'Intelligent Octopus Flux',
    recommendedTariffId: 'octopus-iof',
    recommendedTariffName: 'Intelligent Octopus Flux',
    currentAnnualRevenue: { best: 2150, likely: 1780, worst: 1380 },
    recommendedAnnualRevenue: { best: 2150, likely: 1780, worst: 1380 },
    upliftPercent: 0,
    status: 'approved',
    lastReviewed: '2025-03-18',
  },
  {
    propertyId: 'home-004',
    address: '5 Birch Lane, Morecambe LA4 5RJ',
    currentTariffId: 'bg-electric-drivers',
    currentTariffName: 'British Gas EV Power',
    recommendedTariffId: 'octopus-iof',
    recommendedTariffName: 'Intelligent Octopus Flux',
    currentAnnualRevenue: { best: 980, likely: 780, worst: 580 },
    recommendedAnnualRevenue: { best: 2150, likely: 1780, worst: 1380 },
    upliftPercent: 128.2,
    status: 'pending',
    lastReviewed: '2025-03-20',
  },
];

// ============================================================
// Default system config for calculator
// ============================================================

export const DEFAULT_BATTERY_SYSTEM = {
  id: 'default',
  homeId: 'default',
  inverterModel: 'Sigenergy AI Hub 10kW',
  batteryModules: 2,
  totalCapacityKwh: 10,
  batteryChemistry: 'LFP' as const,
  solarPvKwp: 5,
  installCost: 12000,
  annualMaintenanceCost: 150,
  warrantyYears: 15,
  degradationRatePercent: 2,
  maxChargeRateKw: 5,
  maxDischargeRateKw: 5,
  roundTripEfficiency: 0.92,
};
