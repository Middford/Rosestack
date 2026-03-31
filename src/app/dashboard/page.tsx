'use client';

import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { StatCard, SimpleStatCard } from '@/shared/ui';
import { batteries, inverters } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs';
import { substations } from '@/modules/grid/substation-data';
import { leads } from '@/modules/customers/data';
import { BEECHES_PORTFOLIO_PROPERTY } from '@/modules/portfolio/beeches-seed';
import { SEEDED_RISKS, SEEDED_OPPORTUNITIES } from '@/modules/risk/data';
import { calculateRiskStats, calculateOpportunityStats, calculateNetPosition } from '@/modules/risk/scoring';
import {
  formatGbp,
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
} from '@/shared/utils/scenarios';
import {
  Battery, Zap, PoundSterling, Map, Lightbulb, Landmark, Shield, Users, Building2,
  AlertTriangle, TrendingUp, Home, ChevronRight, Activity, Gauge, Clock, Wifi,
} from 'lucide-react';

// --- Chart colour palette (vibrant Eclipse-inspired) ---
const COLORS = {
  rose: '#B91C4D',
  roseLight: '#E0366E',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  violet: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
  red: '#EF4444',
  indigo: '#6366F1',
};

const SCENARIO_COLORS = { best: '#10B981', likely: '#3B82F6', worst: '#F59E0B' };

const STACK_COLORS: Record<string, string> = {
  'Garage King': COLORS.cyan,
  'Garden Standard': COLORS.emerald,
  'Single-Phase Starter': COLORS.amber,
  'Solar Hybrid': COLORS.violet,
  'Full Package': COLORS.blue,
  'Quiet Neighbour': COLORS.pink,
};

const tooltipStyle = {
  backgroundColor: '#232636',
  border: '1px solid #2A2D3E',
  borderRadius: '8px',
  color: '#F0F1F5',
  fontSize: '12px',
};

// ============================================================
// Seed Data Generation
// Tells the story: 2 homes in Y1, ramping to ~100 over 8 years
// ============================================================

function generateDeploymentData() {
  // Realistic ramp: slow start, accelerating as systems prove out
  const quarterlyDeploys = [
    // Y1 (2026): 2 homes total
    { q: 'Q1 26', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 0, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q2 26', garageKing: 0, gardenStandard: 1, singlePhase: 0, solarHybrid: 0, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q3 26', garageKing: 0, gardenStandard: 0, singlePhase: 1, solarHybrid: 0, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q4 26', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 0 },
    // Y2 (2027): 8 homes (total 10)
    { q: 'Q1 27', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 0, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q2 27', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 0, quietNeighbour: 1 },
    { q: 'Q3 27', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q4 27', garageKing: 0, gardenStandard: 1, singlePhase: 0, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    // Y3 (2028): 12 homes (total 22)
    { q: 'Q1 28', garageKing: 1, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q2 28', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    { q: 'Q3 28', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q4 28', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    // Y4 (2029): 14 homes (total 36)
    { q: 'Q1 29', garageKing: 1, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q2 29', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    { q: 'Q3 29', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 1, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q4 29', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 0, fullPackage: 1, quietNeighbour: 1 },
    // Y5 (2030): 16 homes (total 52)
    { q: 'Q1 30', garageKing: 1, gardenStandard: 1, singlePhase: 1, solarHybrid: 1, fullPackage: 0, quietNeighbour: 0 },
    { q: 'Q2 30', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 1, fullPackage: 1, quietNeighbour: 1 },
    { q: 'Q3 30', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 1, quietNeighbour: 1 },
    { q: 'Q4 30', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 1, quietNeighbour: 0 },
    // Y6 (2031): 16 homes (total 68)
    { q: 'Q1 31', garageKing: 1, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q2 31', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    { q: 'Q3 31', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 1, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q4 31', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    // Y7 (2032): 16 homes (total 84)
    { q: 'Q1 32', garageKing: 1, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q2 32', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    { q: 'Q3 32', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 1, quietNeighbour: 1 },
    { q: 'Q4 32', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    // Y8 (2033): 16 homes (total 100)
    { q: 'Q1 33', garageKing: 1, gardenStandard: 1, singlePhase: 1, solarHybrid: 0, fullPackage: 1, quietNeighbour: 0 },
    { q: 'Q2 33', garageKing: 0, gardenStandard: 1, singlePhase: 1, solarHybrid: 1, fullPackage: 0, quietNeighbour: 1 },
    { q: 'Q3 33', garageKing: 1, gardenStandard: 0, singlePhase: 0, solarHybrid: 1, fullPackage: 1, quietNeighbour: 1 },
    { q: 'Q4 33', garageKing: 1, gardenStandard: 1, singlePhase: 0, solarHybrid: 0, fullPackage: 0, quietNeighbour: 0 },
  ];

  let cumulative = 0;
  return quarterlyDeploys.map(d => {
    const qTotal = d.garageKing + d.gardenStandard + d.singlePhase + d.solarHybrid + d.fullPackage + d.quietNeighbour;
    cumulative += qTotal;
    return { ...d, qTotal, cumulative };
  });
}

function generateCapacityData() {
  // Average ~120kWh per system, degradation ~2% per year
  const kwhPerHome = 120;
  const deployData = generateDeploymentData();
  const yearlyData: { year: string; nominalKwh: number; effectiveKwh: number; target: number }[] = [];

  for (let y = 0; y < 8; y++) {
    const yearLabel = `Y${y + 1}`;
    // Get cumulative homes at end of year
    const endOfYearIdx = Math.min((y + 1) * 4 - 1, deployData.length - 1);
    const totalHomes = deployData[endOfYearIdx]?.cumulative ?? 0;
    const nominalKwh = totalHomes * kwhPerHome;
    // Weighted average degradation - older homes degrade more
    const avgAge = (y + 1) / 2; // rough average age of fleet
    const degradation = 1 - (0.02 * avgAge);
    const effectiveKwh = Math.round(nominalKwh * degradation);
    yearlyData.push({
      year: yearLabel,
      nominalKwh,
      effectiveKwh,
      target: 100 * kwhPerHome, // 12,000 kWh target
    });
  }
  return yearlyData;
}

function generateCashFlowData() {
  // Cumulative cash flow over 10 years for the PORTFOLIO
  // Initial capex per home ~£25k, revenue per home varies by scenario
  const data: { year: string; best: number; likely: number; worst: number }[] = [];
  let bestCum = 0, likelyCum = 0, worstCum = 0;

  for (let y = 1; y <= 10; y++) {
    const homesDeployed = Math.min(100, Math.round(y <= 8 ? y * 12.5 : 100));
    const newHomes = y === 1 ? homesDeployed : homesDeployed - Math.min(100, Math.round((y - 1) <= 8 ? (y - 1) * 12.5 : 100));
    const capexThisYear = newHomes * 25000;

    // Revenue scales with total homes deployed, per scenario
    // Annual net revenue per home. Source: corrected Flux model, March 2026.
    // Best: Garage King (192kWh/96kW) likely = £15,538/yr.
    // Likely: Garden Standard (160kWh/40kW) = £11,562/yr.
    // Worst: Single-Phase Starter (54kWh/11.5kW) = £3,209/yr.
    const bestRevPerHome = 15538 * Math.pow(1 + BEST_CASE_DEFAULTS.energyInflationPercent / 100, y - 1);
    const likelyRevPerHome = 11562 * Math.pow(1 + LIKELY_CASE_DEFAULTS.energyInflationPercent / 100, y - 1);
    const worstRevPerHome = 3209 * Math.pow(1 + WORST_CASE_DEFAULTS.energyInflationPercent / 100, y - 1);

    // Costs per home: homeowner payment + maintenance + insurance
    const costsPerHome = 1200 + 400 + 300 + 300; // homeowner, maintenance, insurance, compliance

    bestCum += (homesDeployed * (bestRevPerHome - costsPerHome)) - capexThisYear;
    likelyCum += (homesDeployed * (likelyRevPerHome - costsPerHome)) - capexThisYear;
    worstCum += (homesDeployed * (worstRevPerHome - costsPerHome)) - capexThisYear;

    data.push({
      year: `Y${y}`,
      best: Math.round(bestCum),
      likely: Math.round(likelyCum),
      worst: Math.round(worstCum),
    });
  }
  return data;
}

function generateDscrData() {
  // DSCR = Net Operating Income / Annual Debt Service
  // Assumes total debt service starts at ~£30k/yr and grows with deployment
  const data: { year: string; best: number; likely: number; worst: number; covenant: number }[] = [];

  for (let y = 1; y <= 10; y++) {
    const homes = Math.min(100, Math.round(y <= 8 ? y * 12.5 : 100));
    const debtServicePerHome = 2000; // simplified annual debt per home
    const annualDebt = homes * debtServicePerHome;

    const bestRev = homes * 15538 * Math.pow(1.08, y - 1);
    const likelyRev = homes * 11562 * Math.pow(1.05, y - 1);
    const worstRev = homes * 3209 * Math.pow(1.02, y - 1);
    const costs = homes * 2200;

    data.push({
      year: `Y${y}`,
      best: annualDebt > 0 ? Math.round(((bestRev - costs) / annualDebt) * 100) / 100 : 0,
      likely: annualDebt > 0 ? Math.round(((likelyRev - costs) / annualDebt) * 100) / 100 : 0,
      worst: annualDebt > 0 ? Math.round(((worstRev - costs) / annualDebt) * 100) / 100 : 0,
      covenant: 1.25,
    });
  }
  return data;
}

function generateRevenuePerHomeData() {
  // Monthly revenue per home over time (improves with scale due to better tariff negotiation, ops efficiency)
  const data: { month: string; best: number; likely: number; worst: number }[] = [];
  const months = ['Jan', 'Apr', 'Jul', 'Oct'];

  for (let y = 0; y < 8; y++) {
    for (let q = 0; q < 4; q++) {
      const monthLabel = `${months[q]} ${26 + y}`;
      const yearFactor = Math.pow(1.05, y); // 5% improvement per year from inflation
      const scaleFactor = 1 + (y * 0.02); // slight improvement from scale

      data.push({
        month: monthLabel,
        best: Math.round(1295 * yearFactor * scaleFactor),
        likely: Math.round(963 * yearFactor * scaleFactor),
        worst: Math.round(267 * yearFactor * scaleFactor),
      });
    }
  }
  return data;
}

function generateGrossMarginData() {
  // Per-home annual breakdown for best/likely/worst
  // Annual gross revenue per home (net + ~£2,200-£2,700 costs).
  // Reference: Garden Standard (160kWh/40kW) on Flux, corrected March 2026.
  const baseRevenue = { best: 18000, likely: 14250, worst: 5400 };
  const homeownerPayment = 1200;
  const maintenance = { best: 340, likely: 400, worst: 500 };
  const insurance = 300;

  return [
    {
      scenario: 'Best',
      revenue: baseRevenue.best,
      homeowner: -homeownerPayment,
      maintenance: -maintenance.best,
      insurance: -insurance,
      margin: baseRevenue.best - homeownerPayment - maintenance.best - insurance,
    },
    {
      scenario: 'Likely',
      revenue: baseRevenue.likely,
      homeowner: -homeownerPayment,
      maintenance: -maintenance.likely,
      insurance: -insurance,
      margin: baseRevenue.likely - homeownerPayment - maintenance.likely - insurance,
    },
    {
      scenario: 'Worst',
      revenue: baseRevenue.worst,
      homeowner: -homeownerPayment,
      maintenance: -maintenance.worst,
      insurance: -insurance,
      margin: baseRevenue.worst - homeownerPayment - maintenance.worst - insurance,
    },
  ];
}

function generateTariffSpreadTrend() {
  // Monthly average arbitrage spread over time
  const data: { month: string; spread: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Winter spreads higher than summer
  const seasonalFactor = [1.2, 1.15, 1.0, 0.85, 0.75, 0.7, 0.7, 0.75, 0.85, 1.0, 1.15, 1.2];

  for (let y = 0; y < 3; y++) {
    for (let m = 0; m < 12; m++) {
      const baseSpread = 22 + (y * 1.5); // slight upward trend
      const spread = baseSpread * seasonalFactor[m] + (Math.random() * 3 - 1.5);
      data.push({
        month: `${months[m]} ${24 + y}`,
        spread: Math.round(spread * 10) / 10,
      });
    }
  }
  return data;
}

function generateGridServicesData() {
  // Monthly Saving Sessions + Flexibility earnings
  const data: { month: string; savingSessions: number; flexibility: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Saving Sessions primarily in winter
  const ssMonths = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1];
  // Flexibility more evenly spread
  for (let y = 0; y < 2; y++) {
    const homes = y === 0 ? 4 : 15;
    for (let m = 0; m < 12; m++) {
      data.push({
        month: `${months[m]} ${26 + y}`,
        savingSessions: ssMonths[m] * homes * (40 + Math.round(Math.random() * 20)),
        flexibility: homes * (15 + Math.round(Math.random() * 10)),
      });
    }
  }
  return data;
}

function generateVelocityData() {
  // Monthly deployment velocity
  const data: { month: string; deployed: number; target: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetPerMonth = 100 / 96; // ~1.04/month over 8 years

  for (let y = 0; y < 3; y++) {
    for (let m = 0; m < 12; m++) {
      const monthNum = y * 12 + m;
      // Ramp up: first year slower, then accelerating
      let deployed = 0;
      if (monthNum < 6) deployed = Math.random() > 0.7 ? 1 : 0;
      else if (monthNum < 18) deployed = Math.random() > 0.4 ? 1 : 0;
      else deployed = Math.random() > 0.2 ? 1 : Math.random() > 0.5 ? 2 : 0;

      data.push({
        month: `${months[m]} ${26 + y}`,
        deployed,
        target: Math.round(targetPerMonth * 100) / 100,
      });
    }
  }
  return data;
}

// ============================================================
// Dashboard Component
// ============================================================

export default function DashboardPage() {
  const liveHomes = leads.filter(l => l.stage === 'live').length;
  const contracted = leads.filter(l => l.stage === 'contracted' || l.stage === 'installation-scheduled').length;
  const pipelineLeads = leads.filter(l => l.stage !== 'live').length;
  const bestSpread = Math.max(...ALL_TARIFFS.map(t => t.arbitrageSpreadPence));
  const riskStats = calculateRiskStats(SEEDED_RISKS);
  const oppStats = calculateOpportunityStats(SEEDED_OPPORTUNITIES);
  const netPosition = calculateNetPosition(3200000, SEEDED_RISKS, SEEDED_OPPORTUNITIES);
  const netValue = netPosition.find(p => p.type === 'net')?.value ?? 0;

  // --- Pre-compute chart data ---
  const deploymentData = generateDeploymentData();
  const capacityData = generateCapacityData();
  const cashFlowData = generateCashFlowData();
  const dscrData = generateDscrData();
  const revenuePerHomeData = generateRevenuePerHomeData();
  const grossMarginData = generateGrossMarginData();
  const tariffSpreadTrend = generateTariffSpreadTrend();
  const gridServicesData = generateGridServicesData();
  const velocityData = generateVelocityData();

  // --- Assets & Liabilities (three-scenario) ---
  const totalHomesDeployed = liveHomes || 4; // fallback to seed
  const hardwareValuePerHome = 22000;
  const depreciationRate = 0.1; // 10% per year, assume avg 1.5 years old
  const avgAge = 1.5;
  const assetsHardware = totalHomesDeployed * hardwareValuePerHome * (1 - depreciationRate * avgAge);
  const assetsCash = 85000;
  const assetsReceivables = totalHomesDeployed * 963 * 2; // 2 months of likely revenue (Garden Standard Flux)

  const liabilitiesDebt = totalHomesDeployed * 18000;
  const liabilitiesHomeowner = totalHomesDeployed * 100 * 12 * 8; // 8 year ESA obligation
  const liabilitiesDeferred = totalHomesDeployed * 500;

  const totalAssets = { best: assetsHardware * 1.05 + assetsCash + assetsReceivables * 1.1, likely: assetsHardware + assetsCash + assetsReceivables, worst: assetsHardware * 0.9 + assetsCash * 0.8 + assetsReceivables * 0.85 };
  const totalLiabilities = { best: liabilitiesDebt * 0.95 + liabilitiesHomeowner + liabilitiesDeferred, likely: liabilitiesDebt + liabilitiesHomeowner + liabilitiesDeferred * 1.1, worst: liabilitiesDebt * 1.1 + liabilitiesHomeowner + liabilitiesDeferred * 1.3 };
  const netPos = { best: totalAssets.best - totalLiabilities.best, likely: totalAssets.likely - totalLiabilities.likely, worst: totalAssets.worst - totalLiabilities.worst };

  // --- Fleet Health ---
  const avgDegradation = 3.2; // avg % across fleet
  const worstSystem = 'Property #1 (Burnley)';
  const worstDegradation = 5.1;

  // --- Uptime ---
  const uptimePercent = 96.4;
  const offlineSystems = 1;

  // --- Pipeline capacity ---
  const contractedKwh = contracted * 120;
  const installingKwh = 1 * 120; // 1 currently installing
  const liveKwh = liveHomes * 120;

  // --- Portfolio Growth Projection (existing, kept) ---
  const growthData = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const homesB = Math.min(100, Math.round(year * 12));
    const homesL = Math.min(100, Math.round(5 + (year - 1) * 10.5));
    const homesW = Math.min(100, Math.round(3 + (year - 1) * 5));
    return {
      year: `Y${year}`,
      best: homesB * 15538,
      likely: homesL * 11562,
      worst: homesW * 3209,
      homes: homesL,
    };
  });

  // --- Revenue Breakdown Donut (existing, kept) ---
  const revenueStreams = [
    // Revenue breakdown for Garden Standard (160kWh/40kW) on Flux, corrected March 2026.
    // Arbitrage dominates; SS contribution modest due to inverter bottleneck.
    { name: 'Flux Arbitrage', value: 85, color: COLORS.cyan },
    { name: 'Saving Sessions', value: 5, color: COLORS.violet },
    { name: 'ENWL Flexibility', value: 4, color: COLORS.emerald },
    { name: 'Grid Services', value: 6, color: COLORS.amber },
  ];

  // --- Tariff Spread Comparison (existing, kept) ---
  const tariffData = ALL_TARIFFS
    .filter(t => t.arbitrageSpreadPence > 0)
    .sort((a, b) => b.arbitrageSpreadPence - a.arbitrageSpreadPence)
    .slice(0, 6)
    .map(t => ({
      name: t.name.length > 15 ? t.name.slice(0, 15) + '...' : t.name,
      spread: t.arbitrageSpreadPence,
      fill: t.name.includes('Agile') ? COLORS.cyan : t.name.includes('Flux') ? COLORS.violet : COLORS.blue,
    }));

  // --- Pipeline Funnel (existing, kept) ---
  const stages = [
    { name: 'New', count: leads.filter(l => l.stage === 'new').length, color: COLORS.blue },
    { name: 'Contacted', count: leads.filter(l => l.stage === 'contacted').length, color: COLORS.cyan },
    { name: 'Qualified', count: leads.filter(l => l.stage === 'qualified').length, color: COLORS.teal },
    { name: 'Proposal', count: leads.filter(l => l.stage === 'proposal-sent').length, color: COLORS.violet },
    { name: 'Contracted', count: leads.filter(l => l.stage === 'contracted').length, color: COLORS.emerald },
    { name: 'Installing', count: leads.filter(l => l.stage === 'installation-scheduled').length, color: COLORS.amber },
    { name: 'Live', count: leads.filter(l => l.stage === 'live').length, color: COLORS.rose },
  ];

  // --- Risk (existing, kept) ---
  const riskByRating = [
    { name: 'Critical', value: riskStats.critical, color: COLORS.red },
    { name: 'High', value: riskStats.high, color: COLORS.orange },
    { name: 'Medium', value: riskStats.medium, color: COLORS.amber },
    { name: 'Low', value: riskStats.low, color: COLORS.emerald },
  ];
  const oppByRating = [
    { name: 'Transformative', value: oppStats.transformative, color: '#FFD700' },
    { name: 'High', value: oppStats.high, color: COLORS.emerald },
    { name: 'Medium', value: oppStats.medium, color: COLORS.teal },
    { name: 'Low', value: oppStats.low, color: COLORS.blue },
  ];

  // DSCR status for traffic light
  const latestDscr = dscrData[dscrData.length - 1];
  const dscrStatus = latestDscr.likely >= 1.25 ? (latestDscr.worst >= 1.25 ? 'green' : 'amber') : 'red';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">RoseStack Energy</h1>
          <p className="text-sm text-text-secondary mt-1">Fleet Dashboard -- East Lancashire</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-subtle px-3 py-1 text-xs font-medium text-rose-light">
            <Activity className="h-3 w-3" /> Live
          </span>
        </div>
      </div>

      {/* ========== HERO STATS ROW ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-subtle">
            <Home className="h-6 w-6 text-rose-light" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{liveHomes}<span className="text-sm text-text-tertiary font-normal"> / 100</span></p>
            <p className="text-xs text-text-secondary">Homes Deployed</p>
          </div>
        </div>

        <StatCard
          label="Monthly Revenue / Home"
          bestValue={formatGbp(1295)}
          likelyValue={formatGbp(963)}
          worstValue={formatGbp(267)}
        />

        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">Best Tariff Spread</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{bestSpread.toFixed(1)}p<span className="text-sm font-normal">/kWh</span></p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Agile peak spread</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">Pipeline</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{pipelineLeads}</p>
          <p className="text-xs text-violet-400 mt-1">{contracted} contracted, {liveHomes} live</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">Net R&O Position</p>
          <p className={`text-2xl font-bold mt-1 ${netValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatGbp(netValue)}</p>
          <p className="text-xs text-text-tertiary mt-1">{SEEDED_RISKS.length} risks / {SEEDED_OPPORTUNITIES.length} opps</p>
        </div>
      </div>

      {/* ========== SECTION 1: FINANCIAL HEALTH ========== */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Financial Health</h2>

        {/* 1b + 1c: Cumulative Cash Flow + DSCR Trend side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* 1b. Cumulative Cash Flow */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Cumulative Cash Flow (Portfolio)</h3>
              <Link href="/finance" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Details <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cashFlowData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="cfBest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCENARIO_COLORS.best} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SCENARIO_COLORS.best} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cfLikely" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCENARIO_COLORS.likely} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={SCENARIO_COLORS.likely} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cfWorst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCENARIO_COLORS.worst} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={SCENARIO_COLORS.worst} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => v >= 0 ? `£${(v / 1000).toFixed(0)}k` : `-£${(Math.abs(v) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGbp(v), '']} />
                <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Break-even', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Area type="monotone" dataKey="best" stroke={SCENARIO_COLORS.best} fill="url(#cfBest)" strokeWidth={1.5} dot={false} name="Best" />
                <Area type="monotone" dataKey="likely" stroke={SCENARIO_COLORS.likely} fill="url(#cfLikely)" strokeWidth={2.5} dot={false} name="Likely" />
                <Area type="monotone" dataKey="worst" stroke={SCENARIO_COLORS.worst} fill="url(#cfWorst)" strokeWidth={1.5} dot={false} name="Worst" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 1c. DSCR Trend */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-text-primary">DSCR Trend</h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  dscrStatus === 'green' ? 'bg-emerald-500/10 text-emerald-400' :
                  dscrStatus === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    dscrStatus === 'green' ? 'bg-emerald-400' :
                    dscrStatus === 'amber' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  {dscrStatus === 'green' ? 'All above covenant' : dscrStatus === 'amber' ? 'Worst below covenant' : 'Likely below covenant'}
                </span>
              </div>
              <Link href="/funding" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Funding <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dscrData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} domain={[0, 'auto']} tickFormatter={v => `${v}x`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}x`, '']} />
                <ReferenceLine y={1.25} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '1.25x Covenant', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Line type="monotone" dataKey="best" stroke={SCENARIO_COLORS.best} strokeWidth={1.5} dot={{ r: 3 }} name="Best" />
                <Line type="monotone" dataKey="likely" stroke={SCENARIO_COLORS.likely} strokeWidth={2.5} dot={{ r: 3 }} name="Likely" />
                <Line type="monotone" dataKey="worst" stroke={SCENARIO_COLORS.worst} strokeWidth={1.5} dot={{ r: 3 }} name="Worst" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 1a + 1d + 1e: Assets/Liabilities + Revenue per Home + Gross Margin */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1a. Assets & Liabilities */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Assets & Liabilities</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Total Assets</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-xs text-emerald-400">Best</span><span className="text-xs text-emerald-400">{formatGbp(totalAssets.best)}</span></div>
                  <div className="flex justify-between"><span className="text-xs font-medium text-blue-400">Likely</span><span className="text-sm font-bold text-blue-400">{formatGbp(totalAssets.likely)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-amber-400">Worst</span><span className="text-xs text-amber-400">{formatGbp(totalAssets.worst)}</span></div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Total Liabilities</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-xs text-emerald-400">Best</span><span className="text-xs text-emerald-400">{formatGbp(totalLiabilities.best)}</span></div>
                  <div className="flex justify-between"><span className="text-xs font-medium text-blue-400">Likely</span><span className="text-sm font-bold text-blue-400">{formatGbp(totalLiabilities.likely)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-amber-400">Worst</span><span className="text-xs text-amber-400">{formatGbp(totalLiabilities.worst)}</span></div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Net Position</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-xs text-emerald-400">Best</span><span className={`text-xs ${netPos.best >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatGbp(netPos.best)}</span></div>
                  <div className="flex justify-between"><span className="text-xs font-medium text-blue-400">Likely</span><span className={`text-sm font-bold ${netPos.likely >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatGbp(netPos.likely)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-amber-400">Worst</span><span className={`text-xs ${netPos.worst >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{formatGbp(netPos.worst)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 1d. Revenue per Home Trend */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Revenue per Home (Monthly)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenuePerHomeData.filter((_, i) => i % 2 === 0)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={{ stroke: '#2A2D3E' }} interval={3} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `£${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGbp(v), '']} />
                <Line type="monotone" dataKey="best" stroke={SCENARIO_COLORS.best} strokeWidth={1.5} dot={false} name="Best" />
                <Line type="monotone" dataKey="likely" stroke={SCENARIO_COLORS.likely} strokeWidth={2.5} dot={false} name="Likely" />
                <Line type="monotone" dataKey="worst" stroke={SCENARIO_COLORS.worst} strokeWidth={1.5} dot={false} name="Worst" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 1e. Gross Margin per Home */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Gross Margin per Home (Annual)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={grossMarginData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="scenario" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `£${(v / 1000).toFixed(1)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGbp(Math.abs(v)), '']} />
                <Bar dataKey="revenue" stackId="a" fill={COLORS.cyan} name="Revenue" radius={[0, 0, 0, 0]} />
                <Bar dataKey="homeowner" stackId="b" fill={COLORS.rose} name="Homeowner Payment" radius={[0, 0, 0, 0]} />
                <Bar dataKey="maintenance" stackId="b" fill={COLORS.orange} name="Maintenance" radius={[0, 0, 0, 0]} />
                <Bar dataKey="insurance" stackId="b" fill={COLORS.amber} name="Insurance" radius={[0, 0, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#9BA1B0' }} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {grossMarginData.map(d => (
                <div key={d.scenario}>
                  <p className="text-[10px] text-text-tertiary">{d.scenario} Margin</p>
                  <p className={`text-sm font-bold ${d.scenario === 'Best' ? 'text-emerald-400' : d.scenario === 'Likely' ? 'text-blue-400' : 'text-amber-400'}`}>
                    {formatGbp(d.margin)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== SECTION 2: DEPLOYMENTS & CAPACITY ========== */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Deployments & Capacity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 2a. Deployments Over Time (Stacked Column) */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Deployments by Stack Type</h3>
              <Link href="/portfolio" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Portfolio <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={deploymentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="q" tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={{ stroke: '#2A2D3E' }} interval={3} angle={-30} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} label={{ value: 'New Homes', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} domain={[0, 110]} label={{ value: 'Cumulative', angle: 90, position: 'insideRight', fill: '#6B7280', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="left" dataKey="garageKing" stackId="stack" fill={STACK_COLORS['Garage King']} name="Garage King" />
                <Bar yAxisId="left" dataKey="gardenStandard" stackId="stack" fill={STACK_COLORS['Garden Standard']} name="Garden Standard" />
                <Bar yAxisId="left" dataKey="singlePhase" stackId="stack" fill={STACK_COLORS['Single-Phase Starter']} name="Single-Phase" />
                <Bar yAxisId="left" dataKey="solarHybrid" stackId="stack" fill={STACK_COLORS['Solar Hybrid']} name="Solar Hybrid" />
                <Bar yAxisId="left" dataKey="fullPackage" stackId="stack" fill={STACK_COLORS['Full Package']} name="Full Package" />
                <Bar yAxisId="left" dataKey="quietNeighbour" stackId="stack" fill={STACK_COLORS['Quiet Neighbour']} name="Quiet Neighbour" />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.rose} strokeWidth={2.5} dot={false} name="Cumulative" />
                <ReferenceLine yAxisId="right" y={100} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '100 Target', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#9BA1B0' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 2b. Portfolio kWh Capacity Over Time */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Portfolio Capacity (kWh)</h3>
              <Link href="/hardware" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Hardware <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={capacityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="capNominal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} kWh`, '']} />
                <ReferenceLine y={12000} stroke={COLORS.rose} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '12,000 kWh Target', fill: COLORS.rose, fontSize: 10, position: 'right' }} />
                <Area type="monotone" dataKey="nominalKwh" stroke={COLORS.cyan} fill="url(#capNominal)" strokeWidth={2} name="Nominal Capacity" />
                <Area type="monotone" dataKey="effectiveKwh" stroke={COLORS.emerald} fill="none" strokeWidth={2} strokeDasharray="5 3" name="Effective (after degradation)" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== SECTION 3: OPERATIONAL HEALTH ========== */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Operational Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 3a. Fleet Health Gauge */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Fleet Battery Health</h3>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  {/* Background track */}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2A2D3E" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray="236" strokeDashoffset="59" transform="rotate(135 60 60)" />
                  {/* Filled arc */}
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={avgDegradation < 5 ? COLORS.emerald : avgDegradation < 10 ? COLORS.amber : COLORS.red}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray="236"
                    strokeDashoffset={59 + (236 - 59) * (avgDegradation / 20)}
                    transform="rotate(135 60 60)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${avgDegradation < 5 ? 'text-emerald-400' : avgDegradation < 10 ? 'text-amber-400' : 'text-red-400'}`}>
                    {avgDegradation}%
                  </span>
                  <span className="text-[10px] text-text-tertiary">avg degradation</span>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px] text-text-tertiary">Worst performing:</p>
                <p className="text-xs text-amber-400 font-medium">{worstSystem} ({worstDegradation}%)</p>
              </div>
            </div>
          </div>

          {/* 3b. Tariff Spread Trend */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Arbitrage Spread Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={tariffSpreadTrend.filter((_, i) => i % 2 === 0)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 8 }} axisLine={{ stroke: '#2A2D3E' }} interval={4} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `${v}p`} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}p/kWh`, 'Spread']} />
                <Line type="monotone" dataKey="spread" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-text-tertiary mt-1 text-center">Buy at off-peak, sell at peak (Flux spread)</p>
          </div>

          {/* 3c. Uptime / Availability */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Fleet Uptime</h3>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Online', value: uptimePercent },
                        { name: 'Offline', value: 100 - uptimePercent },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={55}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={uptimePercent >= 95 ? COLORS.emerald : uptimePercent >= 90 ? COLORS.amber : COLORS.red} />
                      <Cell fill="#2A2D3E" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${uptimePercent >= 95 ? 'text-emerald-400' : uptimePercent >= 90 ? 'text-amber-400' : 'text-red-400'}`}>
                    {uptimePercent}%
                  </span>
                  <span className="text-[10px] text-text-tertiary">uptime</span>
                </div>
              </div>
              <div className="mt-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-text-secondary">{totalHomesDeployed - offlineSystems} systems online</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  <span className="text-xs text-amber-400">{offlineSystems} system offline</span>
                </div>
                <p className="text-[10px] text-text-tertiary">Target: &gt;95%</p>
              </div>
            </div>
          </div>

          {/* 3d. Grid Services Revenue */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Grid Services Revenue</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gridServicesData.slice(-12)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 8 }} axisLine={{ stroke: '#2A2D3E' }} interval={2} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `£${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGbp(v), '']} />
                <Bar dataKey="savingSessions" stackId="gs" fill={COLORS.violet} name="Saving Sessions" radius={[0, 0, 0, 0]} />
                <Bar dataKey="flexibility" stackId="gs" fill={COLORS.teal} name="Flexibility" radius={[2, 2, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#9BA1B0' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== SECTION 4: PIPELINE ========== */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Pipeline</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 4a. Deployment Velocity */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Deployment Velocity</h3>
              <span className="text-[10px] text-text-tertiary">Target: ~1 home/month</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={velocityData.slice(-18)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={{ stroke: '#2A2D3E' }} interval={2} angle={-30} textAnchor="end" height={45} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} domain={[0, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="deployed" fill={COLORS.rose} name="Deployed" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="target" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="5 3" dot={false} name="Target Rate" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 4b. Capacity Pipeline (Horizontal Stacked Bar) */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Capacity Pipeline</h3>
              <Link href="/customers" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                CRM <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-6 mt-6">
              {/* Visual horizontal stacked bar */}
              <div>
                <div className="flex h-12 rounded-lg overflow-hidden">
                  {liveKwh > 0 && (
                    <div className="flex items-center justify-center text-xs font-medium text-white" style={{ width: `${(liveKwh / (liveKwh + installingKwh + contractedKwh)) * 100}%`, backgroundColor: COLORS.emerald }}>
                      {liveKwh > 200 ? `${liveKwh} kWh` : ''}
                    </div>
                  )}
                  {installingKwh > 0 && (
                    <div className="flex items-center justify-center text-xs font-medium text-white" style={{ width: `${(installingKwh / (liveKwh + installingKwh + contractedKwh)) * 100}%`, backgroundColor: COLORS.amber }}>
                      {installingKwh > 200 ? `${installingKwh} kWh` : ''}
                    </div>
                  )}
                  {contractedKwh > 0 && (
                    <div className="flex items-center justify-center text-xs font-medium text-white" style={{ width: `${(contractedKwh / (liveKwh + installingKwh + contractedKwh)) * 100}%`, backgroundColor: COLORS.blue }}>
                      {contractedKwh > 200 ? `${contractedKwh} kWh` : ''}
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-text-tertiary">0 kWh</span>
                  <span className="text-[10px] text-text-tertiary">{(liveKwh + installingKwh + contractedKwh).toLocaleString()} kWh total pipeline</span>
                </div>
              </div>

              {/* Legend with numbers */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.emerald }} />
                    <span className="text-xs text-text-secondary">Live</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{liveKwh.toLocaleString()} kWh</p>
                  <p className="text-[10px] text-text-tertiary">{liveHomes} homes</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.amber }} />
                    <span className="text-xs text-text-secondary">Installing</span>
                  </div>
                  <p className="text-lg font-bold text-amber-400">{installingKwh.toLocaleString()} kWh</p>
                  <p className="text-[10px] text-text-tertiary">1 home</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.blue }} />
                    <span className="text-xs text-text-secondary">Contracted</span>
                  </div>
                  <p className="text-lg font-bold text-blue-400">{contractedKwh.toLocaleString()} kWh</p>
                  <p className="text-[10px] text-text-tertiary">{contracted} homes</p>
                </div>
              </div>

              {/* Progress to target */}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-text-secondary">Progress to 12,000 kWh target</span>
                  <span className="text-xs font-bold text-text-primary">{Math.round((liveKwh / 12000) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (liveKwh / 12000) * 100)}%`, backgroundColor: COLORS.rose }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== EXISTING CHARTS (KEPT) ========== */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Portfolio Projections & Intelligence</h2>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Portfolio Revenue Projection */}
          <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Portfolio Revenue Projection (10yr)</h3>
              <Link href="/finance" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                View Models <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={growthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradBest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCENARIO_COLORS.best} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SCENARIO_COLORS.best} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLikely" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCENARIO_COLORS.likely} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={SCENARIO_COLORS.likely} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWorst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCENARIO_COLORS.worst} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={SCENARIO_COLORS.worst} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGbp(v), '']} />
                <Area type="monotone" dataKey="best" stroke={SCENARIO_COLORS.best} fill="url(#gradBest)" strokeWidth={1.5} dot={false} name="Best Case" />
                <Area type="monotone" dataKey="likely" stroke={SCENARIO_COLORS.likely} fill="url(#gradLikely)" strokeWidth={2.5} dot={false} name="Likely Case" />
                <Area type="monotone" dataKey="worst" stroke={SCENARIO_COLORS.worst} fill="url(#gradWorst)" strokeWidth={1.5} dot={false} name="Worst Case" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9BA1B0' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Breakdown Donut */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Revenue Streams</h3>
              <Link href="/tariffs" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Tariffs <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={revenueStreams}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {revenueStreams.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {revenueStreams.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-text-secondary truncate">{s.name}</span>
                  <span className="text-[11px] text-text-primary font-medium ml-auto">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row: Tariff Spreads + Pipeline Funnel + R&O */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tariff Spread Comparison */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Tariff Arbitrage Spreads</h3>
              <Link href="/tariffs" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Compare <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tariffData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={{ stroke: '#2A2D3E' }} tickFormatter={v => `${v}p`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9BA1B0', fontSize: 10 }} axisLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}p/kWh`, 'Spread']} />
                <Bar dataKey="spread" radius={[0, 4, 4, 0]} barSize={18}>
                  {tariffData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Pipeline */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Sales Pipeline</h3>
              <Link href="/customers" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                CRM <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {stages.map(stage => {
                const maxCount = Math.max(...stages.map(s => s.count), 1);
                const pct = (stage.count / maxCount) * 100;
                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <span className="text-[11px] text-text-secondary w-16 text-right">{stage.name}</span>
                    <div className="flex-1 h-5 rounded-full bg-bg-tertiary overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: stage.color }}
                      />
                    </div>
                    <span className="text-xs font-bold text-text-primary w-6 text-right">{stage.count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs">
              <span className="text-text-tertiary">Total pipeline</span>
              <span className="text-text-primary font-semibold">{leads.length} leads</span>
            </div>
          </div>

          {/* Risk & Opportunity Snapshot */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Risk & Opportunity</h3>
              <Link href="/risk" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
                Register <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Risks</p>
                <div className="space-y-1.5">
                  {riskByRating.map(r => (
                    <div key={r.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-xs text-text-secondary">{r.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">Opportunities</p>
                <div className="space-y-1.5">
                  {oppByRating.map(o => (
                    <div key={o.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
                        <span className="text-xs text-text-secondary">{o.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: o.color }}>{o.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Net Expected Position</p>
              <p className={`text-xl font-bold mt-1 ${netValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatGbp(netValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== FLEET PROPERTIES TABLE ========== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Live Fleet</h2>
          <Link href="/portfolio" className="text-xs text-rose-light hover:text-rose flex items-center gap-1">
            Full Portfolio <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary">
                <tr className="text-text-tertiary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Property</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">System</th>
                  <th className="text-right px-4 py-3">Ann. Revenue (Likely)</th>
                  <th className="text-right px-4 py-3">AAF Grade</th>
                  <th className="text-right px-4 py-3">Tariff</th>
                  <th className="text-right px-4 py-3">Alerts</th>
                </tr>
              </thead>
              <tbody>
                <FleetRow property={BEECHES_PORTFOLIO_PROPERTY} />
                {/* Placeholder rows for upcoming installs */}
                <tr className="border-t border-border/40">
                  <td className="px-4 py-3 text-text-tertiary italic" colSpan={7}>
                    + {Math.max(0, contracted - 1)} properties contracted — awaiting installation
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-bg-secondary px-4 py-3 hover:bg-bg-hover hover:border-border-hover transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: `${link.color}20`, color: link.color }}>
              <link.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{link.title}</p>
              <p className="text-[10px] text-text-tertiary truncate">{link.stat}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const quickLinks = [
  { href: '/portfolio', title: 'Portfolio', icon: Building2, stat: '3 properties', color: COLORS.rose },
  { href: '/dispatch', title: 'Dispatch', icon: Zap, stat: 'Beeches backtest', color: COLORS.cyan },
  { href: '/pipeline', title: 'Pipeline', icon: Users, stat: 'Prospecting Kanban', color: COLORS.violet },
  { href: '/grid', title: 'Grid Map', icon: Map, stat: '15 substations', color: COLORS.emerald },
  { href: '/funding', title: 'Funding', icon: Landmark, stat: '13 lenders', color: COLORS.amber },
];

// ── Fleet property row ─────────────────────────────────────────────────────────
function FleetRow({ property }: { property: typeof BEECHES_PORTFOLIO_PROPERTY }) {
  const statusColour: Record<string, string> = {
    live: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
    installed: 'text-blue-400 bg-blue-500/15 border-blue-500/40',
    contracted: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
    prospect: 'text-text-tertiary bg-bg-tertiary border-border',
  };
  const sc = statusColour[property.status] ?? statusColour.prospect!;

  // AAF grade from system spec: Beeches is a 192kWh/96kW Agile system — excellent
  // 96kW charge on 192kWh = 2C rate, full cycle in 1hr each way → AAF ≈ 91%
  const aafGrade = 'A+';
  const aafColour = 'text-emerald-400';

  const alerts: string[] = [];
  if (property.g99Status !== 'approved') alerts.push('G99');
  if (!property.mcsCertReference) alerts.push('MCS');

  return (
    <tr className="border-t border-border/40 hover:bg-bg-hover transition-colors">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-text-primary text-sm">{property.address}</div>
          <div className="text-xs text-text-tertiary">{property.postcode} · {property.phase}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${sc}`}>
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="text-sm text-text-primary">{property.system.totalCapacityKwh} kWh</div>
        <div className="text-xs text-text-tertiary">{property.system.maxChargeRateKw}kW · {property.system.solarPvKwp}kWp</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-mono font-medium text-emerald-400">
          £{property.projection.likely.annualNetRevenue.toLocaleString()}
        </div>
        <div className="text-xs text-text-tertiary">
          £{property.projection.best.annualNetRevenue.toLocaleString()} / £{property.projection.worst.annualNetRevenue.toLocaleString()}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`font-bold text-base ${aafColour}`}>{aafGrade}</span>
        <div className="text-xs text-text-tertiary">Agile · 91%</div>
      </td>
      <td className="px-4 py-3 text-right text-xs text-text-secondary">
        {property.tariff.name}
      </td>
      <td className="px-4 py-3 text-right">
        {alerts.length === 0 ? (
          <span className="text-emerald-400 text-xs">All clear</span>
        ) : (
          <span className="flex items-center justify-end gap-1 text-amber-400 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {alerts.join(', ')}
          </span>
        )}
      </td>
    </tr>
  );
}
