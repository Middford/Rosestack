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

// IOF uses a single-rate model where import = export at all times.
// Rates are ENWL/Manchester region approximations and change quarterly.
const octopusIof: TariffWithMeta = {
  id: 'octopus-iof',
  supplier: 'Octopus Energy',
  name: 'Intelligent Octopus Flux',
  type: 'flux',
  description: 'Kraken-controlled tariff where import and export rates are equal at all times. Kraken schedules charge/discharge to maximise spread between off-peak and peak windows. Rates are regional (shown: ENWL/Manchester) and change quarterly.',
  importRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 21.71, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 28.94, season: 'all' },
  ],
  exportRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 21.71, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 28.94, season: 'all' },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'MCS-certified battery installation',
    'Minimum 4.6kWh battery capacity',
    'Octopus Energy account',
    'Smart meter installed',
    'Solar PV system recommended',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: true,
  notes: 'On IOF, import = export at all times. Kraken optimises scheduling. Revenue comes from the spread between off-peak (~21.71p) and peak (~28.94p). Rates shown are ENWL/Manchester region approximations and change quarterly.',
};
octopusIof.arbitrageSpreadPence = calcSpread(octopusIof.importRates, octopusIof.exportRates);

const octopusFlux: TariffWithMeta = {
  id: 'octopus-flux',
  supplier: 'Octopus Energy',
  name: 'Octopus Flux',
  type: 'flux',
  description: 'Standard Flux tariff without Kraken intelligent optimisation. Manual scheduling of charge/discharge. Three time-of-use periods.',
  importRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 7.44, season: 'all' },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 24.50, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 36.86, season: 'all' },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 24.50, season: 'all' },
  ],
  exportRates: [
    { periodStart: '02:00', periodEnd: '05:00', ratePencePerKwh: 3.96, season: 'all' },
    { periodStart: '05:00', periodEnd: '16:00', ratePencePerKwh: 13.44, season: 'all' },
    { periodStart: '16:00', periodEnd: '19:00', ratePencePerKwh: 22.36, season: 'all' },
    { periodStart: '19:00', periodEnd: '02:00', ratePencePerKwh: 13.44, season: 'all' },
  ],
  standingChargePencePerDay: 46.36,
  validFrom: new Date('2025-01-01'),
  eligibilityRequirements: [
    'Solar PV system required',
    'Smart meter installed',
    'Octopus Energy account',
  ],
  arbitrageSpreadPence: 0,
  bestForBattery: false,
  krakenControlled: false,
  notes: 'Same time windows as IOF but without intelligent optimisation. Slightly lower export rates.',
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
    description: 'Incentivised demand reduction events during peak grid stress. Earn up to 800p/kWh for reducing consumption. Typically 1-2 hour sessions. 2023/24 season had ~25 sessions.',
    ratePencePerKwh: 350,
    sessionsPerYear: 25,
    avgSessionDurationHours: 1.5,
    eligibility: ['Octopus Energy customer', 'Smart meter installed'],
    minBatteryKwh: 0,
    aggregatorRequired: false,
    historicalEarningsPerHomePerYear: 150,
    status: 'seasonal',
  },
  {
    id: 'dfs',
    name: 'Demand Flexibility Service (DFS)',
    provider: 'National Grid ESO',
    type: 'demand-response',
    description: 'National Grid programme paying consumers to reduce demand during system stress events. Delivered via energy suppliers. Rates typically 300-500p/kWh.',
    ratePencePerKwh: 400,
    sessionsPerYear: 12,
    avgSessionDurationHours: 2,
    eligibility: ['Via energy supplier', 'Smart meter installed'],
    minBatteryKwh: 0,
    aggregatorRequired: false,
    historicalEarningsPerHomePerYear: 96,
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

export const HISTORICAL_RATES: HistoricalRate[] = [
  { month: 'Jan 2024', agileAvgImport: 18.2, agileAvgExport: 14.5, fluxPeakExport: 21.8, iofPeakExport: 22.9, savingSessionRate: 400 },
  { month: 'Feb 2024', agileAvgImport: 17.8, agileAvgExport: 14.2, fluxPeakExport: 21.5, iofPeakExport: 22.5, savingSessionRate: 380 },
  { month: 'Mar 2024', agileAvgImport: 16.5, agileAvgExport: 13.8, fluxPeakExport: 21.2, iofPeakExport: 22.2, savingSessionRate: 350 },
  { month: 'Apr 2024', agileAvgImport: 15.2, agileAvgExport: 13.0, fluxPeakExport: 20.8, iofPeakExport: 21.8, savingSessionRate: 0 },
  { month: 'May 2024', agileAvgImport: 14.8, agileAvgExport: 12.5, fluxPeakExport: 20.5, iofPeakExport: 21.5, savingSessionRate: 0 },
  { month: 'Jun 2024', agileAvgImport: 13.5, agileAvgExport: 11.8, fluxPeakExport: 20.2, iofPeakExport: 21.2, savingSessionRate: 0 },
  { month: 'Jul 2024', agileAvgImport: 14.2, agileAvgExport: 12.0, fluxPeakExport: 20.5, iofPeakExport: 21.5, savingSessionRate: 0 },
  { month: 'Aug 2024', agileAvgImport: 15.5, agileAvgExport: 12.8, fluxPeakExport: 20.8, iofPeakExport: 21.8, savingSessionRate: 0 },
  { month: 'Sep 2024', agileAvgImport: 16.8, agileAvgExport: 13.5, fluxPeakExport: 21.2, iofPeakExport: 22.2, savingSessionRate: 0 },
  { month: 'Oct 2024', agileAvgImport: 19.5, agileAvgExport: 15.2, fluxPeakExport: 21.8, iofPeakExport: 22.8, savingSessionRate: 320 },
  { month: 'Nov 2024', agileAvgImport: 22.8, agileAvgExport: 16.5, fluxPeakExport: 22.2, iofPeakExport: 23.2, savingSessionRate: 380 },
  { month: 'Dec 2024', agileAvgImport: 24.5, agileAvgExport: 17.8, fluxPeakExport: 22.5, iofPeakExport: 23.5, savingSessionRate: 450 },
  { month: 'Jan 2025', agileAvgImport: 23.8, agileAvgExport: 17.2, fluxPeakExport: 22.3, iofPeakExport: 23.5, savingSessionRate: 420 },
  { month: 'Feb 2025', agileAvgImport: 22.5, agileAvgExport: 16.8, fluxPeakExport: 22.2, iofPeakExport: 23.4, savingSessionRate: 380 },
  { month: 'Mar 2025', agileAvgImport: 20.2, agileAvgExport: 15.5, fluxPeakExport: 22.0, iofPeakExport: 23.2, savingSessionRate: 350 },
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
