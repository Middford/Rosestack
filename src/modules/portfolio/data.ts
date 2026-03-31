// ============================================================
// Portfolio Data Service — Seeded sample properties in BB area
// ============================================================

import type { BatterySystem, Tariff, ThreeScenarioProjection, ThreeScenarioSummary } from '@/shared/types';
import { calculateAllScenarios, summariseScenarios, formatGbp } from '@/shared/utils/scenarios';
import { batteries, inverters, solarPanels, heatPumps } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs/data';
import type { PortfolioProperty, PortfolioAlert, PortfolioSummaryStats, TimelineEvent, BulkTariffChangeResult } from './types';
import { BEECHES_PORTFOLIO_PROPERTY } from './beeches-seed';

// --- Build BatterySystem from hardware catalogue ---

function buildSystemFromCatalogue(
  batteryId: string,
  modules: number,
  inverterId: string,
  solarKwp?: number,
  heatPumpModel?: string,
): BatterySystem {
  const bat = batteries.find(b => b.id === batteryId)!;
  const inv = inverters.find(i => i.id === inverterId)!;
  return {
    id: `${batteryId}-${modules}m-${inverterId}`,
    homeId: '',
    inverterModel: `${inv.manufacturer} ${inv.model}`,
    batteryModules: modules,
    totalCapacityKwh: bat.capacityPerModuleKwh * modules,
    batteryChemistry: bat.chemistry,
    solarPvKwp: solarKwp,
    heatPumpModel: heatPumpModel,
    installCost: bat.wholesalePriceGbp * modules + inv.priceGbp,
    annualMaintenanceCost: 150,
    warrantyYears: bat.warrantyYears,
    degradationRatePercent: bat.degradationRatePercent,
    maxChargeRateKw: Math.min(bat.chargeRateKw * modules, inv.maxOutputKw),
    maxDischargeRateKw: Math.min(bat.dischargeRateKw * modules, inv.maxOutputKw),
    roundTripEfficiency: bat.roundTripEfficiency / 100,
  };
}

// --- Seeded Portfolio Properties ---

function generateProjection(system: BatterySystem, tariff: Tariff): { projection: ThreeScenarioProjection; summary: ThreeScenarioSummary } {
  const projection = calculateAllScenarios(system, tariff);
  const summary = summariseScenarios(projection, system);
  return { projection, summary };
}

const iofTariff = ALL_TARIFFS.find(t => t.id === 'octopus-iof')!;
const fluxTariff = ALL_TARIFFS.find(t => t.id === 'octopus-flux')!;
const agileTariff = ALL_TARIFFS.find(t => t.id === 'octopus-agile')!;

const system1 = buildSystemFromCatalogue('bat-sigenergy', 17, 'inv-sigenergy-m1', 8);
const system2 = buildSystemFromCatalogue('bat-givenergy', 2, 'inv-givenergy', 4);
const system3 = buildSystemFromCatalogue('bat-byd-hvs', 3, 'inv-fronius', 6);

const proj1 = generateProjection(system1, iofTariff);
const proj2 = generateProjection(system2, fluxTariff);
const proj3 = generateProjection(system3, agileTariff);

const timeline1: TimelineEvent[] = [
  { id: 'tl-1-1', date: '2025-06-15', type: 'status-change', title: 'Lead created', description: 'Referral from Rovers Community Trust doorknock event' },
  { id: 'tl-1-2', date: '2025-07-01', type: 'status-change', title: 'Qualified', description: '3-phase confirmed by electrician survey. Large detached with rear garden access.' },
  { id: 'tl-1-3', date: '2025-07-20', type: 'status-change', title: 'Contracted', description: 'ESA signed. 10-year agreement. Monthly payment £100.' },
  { id: 'tl-1-4', date: '2025-08-05', type: 'compliance', title: 'G99 submitted', description: 'Application submitted to ENWL. Reference: G99-ENWL-2025-4821' },
  { id: 'tl-1-5', date: '2025-09-12', type: 'compliance', title: 'G99 approved', description: 'Approved within 6 weeks. No curtailment conditions.' },
  { id: 'tl-1-6', date: '2025-10-01', type: 'status-change', title: 'Installed', description: 'Sigenergy 204kWh system installed. 8 x solar panels, rear-facing.' },
  { id: 'tl-1-7', date: '2025-10-08', type: 'compliance', title: 'MCS certified', description: 'MCS certificate issued. Ref: MCS-2025-RS-001' },
  { id: 'tl-1-8', date: '2025-10-10', type: 'status-change', title: 'Commissioned & Live', description: 'System commissioned. Kraken managing charge/discharge on IOF.' },
  { id: 'tl-1-9', date: '2025-12-01', type: 'milestone', title: 'First £1,000 revenue', description: 'Cumulative net revenue passed £1,000 after 52 days live.' },
  { id: 'tl-1-10', date: '2026-03-15', type: 'maintenance', title: 'Scheduled inspection', description: '6-month post-install check. All systems nominal.' },
];

const timeline2: TimelineEvent[] = [
  { id: 'tl-2-1', date: '2025-09-01', type: 'status-change', title: 'Lead created', description: 'Website enquiry from homeowner' },
  { id: 'tl-2-2', date: '2025-09-15', type: 'status-change', title: 'Qualified', description: 'Single-phase semi. Good rear garden. EPC C.' },
  { id: 'tl-2-3', date: '2025-10-10', type: 'status-change', title: 'Contracted', description: 'ESA signed. 10-year term.' },
  { id: 'tl-2-4', date: '2025-11-01', type: 'compliance', title: 'G99 submitted', description: 'Application to ENWL.' },
  { id: 'tl-2-5', date: '2025-12-20', type: 'compliance', title: 'G99 approved', description: 'Approved after 7 weeks.' },
  { id: 'tl-2-6', date: '2026-01-15', type: 'status-change', title: 'Installed', description: 'GivEnergy 19kWh system installed with 4kWp solar.' },
  { id: 'tl-2-7', date: '2026-01-20', type: 'status-change', title: 'Commissioned & Live', description: 'System live on Octopus Flux.' },
];

const timeline3: TimelineEvent[] = [
  { id: 'tl-3-1', date: '2025-11-10', type: 'status-change', title: 'Lead created', description: 'Referral from existing homeowner at 22 Maple Drive' },
  { id: 'tl-3-2', date: '2025-11-25', type: 'status-change', title: 'Qualified', description: '3-phase farmhouse. Large garden. EPC D.' },
  { id: 'tl-3-3', date: '2025-12-15', type: 'status-change', title: 'Contracted', description: 'ESA signed. 10-year term. £120/month payment.' },
  { id: 'tl-3-4', date: '2026-01-10', type: 'compliance', title: 'G99 submitted', description: 'Application to ENWL.' },
  { id: 'tl-3-5', date: '2026-03-01', type: 'status-change', title: 'Installed', description: 'BYD 15.36kWh system with 6kWp solar array.' },
];

export const PORTFOLIO_PROPERTIES: PortfolioProperty[] = [
  {
    id: 'port-001',
    address: '22 Maple Drive',
    postcode: 'BB2 4HN',
    latitude: 53.698,
    longitude: -2.460,
    propertyType: 'detached',
    bedrooms: 5,
    phase: '3-phase',
    epcRating: 'C',
    gardenLocation: 'Rear, side access, driveway',
    nearestSubstationId: 'enwl-bb2-001',
    homeownerName: 'Margaret Thompson',
    homeownerPhone: '07712 345678',
    homeownerEmail: 'm.thompson@email.co.uk',
    esaContractRef: 'ESA-RS-2025-001',
    esaStartDate: '2025-07-20',
    esaEndDate: '2035-07-20',
    monthlyHomeownerPayment: 100,
    referralSource: 'Rovers Community Trust',
    notes: 'Very enthusiastic early adopter. Happy to be a reference customer.',
    status: 'live',
    installDate: '2025-10-01',
    commissionDate: '2025-10-10',
    system: { ...system1, homeId: 'port-001' },
    solarPanelModel: 'JA Solar 400W',
    solarPanelCount: 20,
    solarKwp: 8,
    solarOrientation: 'South-facing',
    solarTilt: 35,
    installationCost: 8500,
    g99ApplicationCost: 350,
    mcsCertificationCost: 500,
    ancillaryCosts: 2200,
    totalCapitalCost: system1.installCost + 8500 + 350 + 500 + 2200,
    tariff: iofTariff,
    tariffId: 'octopus-iof',
    cyclingStrategy: 'kraken-managed',
    solarSelfConsumptionEstimate: 35,
    savingSessionsParticipation: true,
    estimatedSessionsPerYear: 25,
    flexibilityParticipation: true,
    estimatedFlexRevenue: 500,
    segRegistered: true,
    segRate: 15,
    projection: proj1.projection,
    summary: proj1.summary,
    g99Status: 'approved',
    g99Reference: 'G99-ENWL-2025-4821',
    mcsCertReference: 'MCS-2025-RS-001',
    segRegistrationRef: 'SEG-OCT-2025-7742',
    insurancePolicy: 'Hiscox Commercial Battery Storage - Policy HBC-2025-11234',
    nextInspectionDate: '2026-04-10',
    timeline: timeline1,
    createdAt: '2025-06-15',
    updatedAt: '2026-03-15',
  },
  {
    id: 'port-002',
    address: '7 Mill Close',
    postcode: 'BB5 3RQ',
    latitude: 53.754,
    longitude: -2.364,
    propertyType: 'semi',
    bedrooms: 3,
    phase: '1-phase',
    epcRating: 'C',
    gardenLocation: 'Rear garden with side gate access',
    nearestSubstationId: 'enwl-bb5-001',
    homeownerName: 'James & Sarah Whitaker',
    homeownerPhone: '07798 654321',
    homeownerEmail: 'j.whitaker@email.co.uk',
    esaContractRef: 'ESA-RS-2025-002',
    esaStartDate: '2025-10-10',
    esaEndDate: '2035-10-10',
    monthlyHomeownerPayment: 80,
    referralSource: 'Website enquiry',
    notes: 'Interested in reducing energy bills. Has EV (Nissan Leaf).',
    status: 'live',
    installDate: '2026-01-15',
    commissionDate: '2026-01-20',
    system: { ...system2, homeId: 'port-002' },
    solarPanelModel: 'Trina Solar 380W',
    solarPanelCount: 10,
    solarKwp: 4,
    solarOrientation: 'South-west',
    solarTilt: 30,
    installationCost: 4200,
    g99ApplicationCost: 350,
    mcsCertificationCost: 500,
    ancillaryCosts: 1200,
    totalCapitalCost: system2.installCost + 4200 + 350 + 500 + 1200,
    tariff: fluxTariff,
    tariffId: 'octopus-flux',
    cyclingStrategy: 'double',
    solarSelfConsumptionEstimate: 40,
    savingSessionsParticipation: true,
    estimatedSessionsPerYear: 25,
    flexibilityParticipation: false,
    estimatedFlexRevenue: 0,
    segRegistered: true,
    segRate: 15,
    projection: proj2.projection,
    summary: proj2.summary,
    g99Status: 'approved',
    g99Reference: 'G99-ENWL-2025-5912',
    mcsCertReference: 'MCS-2026-RS-002',
    segRegistrationRef: 'SEG-OCT-2026-1198',
    insurancePolicy: 'Hiscox Commercial Battery Storage - Policy HBC-2026-11302',
    nextInspectionDate: '2026-07-15',
    timeline: timeline2,
    createdAt: '2025-09-01',
    updatedAt: '2026-03-10',
  },
  {
    id: 'port-003',
    address: '14 Ribchester Lane',
    postcode: 'BB7 2DA',
    latitude: 53.871,
    longitude: -2.392,
    propertyType: 'farm',
    bedrooms: 6,
    phase: '3-phase',
    epcRating: 'D',
    gardenLocation: 'Large grounds, outbuilding available',
    nearestSubstationId: 'enwl-bb7-001',
    homeownerName: 'Robert Hargreaves',
    homeownerPhone: '07654 789012',
    homeownerEmail: 'r.hargreaves@farmmail.co.uk',
    esaContractRef: 'ESA-RS-2025-003',
    esaStartDate: '2025-12-15',
    esaEndDate: '2035-12-15',
    monthlyHomeownerPayment: 120,
    referralSource: 'Referral from Margaret Thompson (port-001)',
    notes: 'Large farmhouse in Ribble Valley. Outbuilding ideal for battery installation. Existing oil boiler - good heat pump candidate.',
    status: 'installed',
    installDate: '2026-03-01',
    system: { ...system3, homeId: 'port-003' },
    solarPanelModel: 'Canadian Solar 410W',
    solarPanelCount: 15,
    solarKwp: 6,
    solarOrientation: 'South',
    solarTilt: 40,
    installationCost: 5800,
    g99ApplicationCost: 350,
    mcsCertificationCost: 500,
    ancillaryCosts: 1800,
    totalCapitalCost: system3.installCost + 5800 + 350 + 500 + 1800,
    tariff: agileTariff,
    tariffId: 'octopus-agile',
    cyclingStrategy: 'double',
    solarSelfConsumptionEstimate: 30,
    savingSessionsParticipation: true,
    estimatedSessionsPerYear: 25,
    flexibilityParticipation: true,
    estimatedFlexRevenue: 300,
    segRegistered: true,
    segRate: 15,
    projection: proj3.projection,
    summary: proj3.summary,
    g99Status: 'submitted',
    g99Reference: 'G99-ENWL-2026-0234',
    insurancePolicy: 'Hiscox Commercial Battery Storage - Policy HBC-2026-11415',
    nextInspectionDate: '2026-09-01',
    timeline: timeline3,
    createdAt: '2025-11-10',
    updatedAt: '2026-03-01',
  },
];

// --- Portfolio Summary Stats ---

export function calculatePortfolioStats(properties: PortfolioProperty[]): PortfolioSummaryStats {
  const live = properties.filter(p => p.status === 'live');
  const installed = properties.filter(p => p.status === 'installed');
  const pipeline = properties.filter(p => p.status === 'contracted' || p.status === 'qualified' || p.status === 'prospect');

  const totalCapacityKwh = properties
    .filter(p => p.status === 'live' || p.status === 'installed')
    .reduce((sum, p) => sum + p.system.totalCapacityKwh, 0);

  const monthlyRevenueLikely = live.reduce((sum, p) => {
    const year1 = p.summary.likely.annualNetRevenue;
    return sum + year1 / 12;
  }, 0);

  const avgPaybackProgress = live.length > 0
    ? live.reduce((sum, p) => {
        const monthsLive = p.commissionDate
          ? Math.max(1, Math.floor((Date.now() - new Date(p.commissionDate).getTime()) / (30 * 24 * 60 * 60 * 1000)))
          : 0;
        const paybackMonths = p.summary.likely.paybackMonths;
        return sum + Math.min(100, (monthsLive / paybackMonths) * 100);
      }, 0) / live.length
    : 0;

  const portfolioDscr = properties.length > 0
    ? properties.reduce((sum, p) => sum + p.summary.likely.dscr, 0) / properties.length
    : 0;

  return {
    totalLive: live.length,
    totalInstalled: installed.length,
    totalPipeline: pipeline.length,
    totalCapacityKwh: Math.round(totalCapacityKwh * 10) / 10,
    monthlyRevenueLikely: Math.round(monthlyRevenueLikely),
    avgPaybackProgress: Math.round(avgPaybackProgress),
    portfolioDscr: Math.round(portfolioDscr * 100) / 100,
  };
}

// --- Portfolio Alerts ---

export function generateAlerts(properties: PortfolioProperty[]): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];

  for (const p of properties) {
    // G99 pending > 8 weeks
    if (p.g99Status === 'submitted') {
      const submitted = p.timeline.find(e => e.type === 'compliance' && e.title.includes('G99 submitted'));
      if (submitted) {
        const weeks = Math.floor((Date.now() - new Date(submitted.date).getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeks > 8) {
          alerts.push({
            id: `alert-g99-${p.id}`,
            propertyId: p.id,
            address: `${p.address}, ${p.postcode}`,
            type: 'g99-delay',
            severity: 'warning',
            title: `G99 pending ${weeks} weeks`,
            description: `G99 application for ${p.address} has been pending for ${weeks} weeks (submitted ${submitted.date}). ENWL target is 8 weeks.`,
            date: new Date().toISOString().split('T')[0],
          });
        }
      }
    }

    // ESA renewal within 12 months
    if (p.esaEndDate) {
      const monthsToEnd = Math.floor((new Date(p.esaEndDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000));
      if (monthsToEnd <= 12 && monthsToEnd > 0) {
        alerts.push({
          id: `alert-renewal-${p.id}`,
          propertyId: p.id,
          address: `${p.address}, ${p.postcode}`,
          type: 'renewal',
          severity: 'info',
          title: `ESA renewal in ${monthsToEnd} months`,
          description: `ESA contract for ${p.address} expires ${p.esaEndDate}. Begin renewal discussions.`,
          date: new Date().toISOString().split('T')[0],
        });
      }
    }

    // Maintenance due
    if (p.nextInspectionDate) {
      const daysUntil = Math.floor((new Date(p.nextInspectionDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysUntil <= 30 && daysUntil >= 0) {
        alerts.push({
          id: `alert-maint-${p.id}`,
          propertyId: p.id,
          address: `${p.address}, ${p.postcode}`,
          type: 'maintenance',
          severity: 'info',
          title: `Inspection due in ${daysUntil} days`,
          description: `Scheduled inspection for ${p.address} on ${p.nextInspectionDate}.`,
          date: new Date().toISOString().split('T')[0],
        });
      }
    }

    // Underperforming (simulated — worst scenario below threshold)
    if (p.status === 'live' && p.summary.worst.annualNetRevenue < 0) {
      alerts.push({
        id: `alert-underperf-${p.id}`,
        propertyId: p.id,
        address: `${p.address}, ${p.postcode}`,
        type: 'underperforming',
        severity: 'warning',
        title: 'Worst-case scenario shows negative returns',
        description: `${p.address} shows negative annual revenue in worst case (${formatGbp(p.summary.worst.annualNetRevenue)}). Review tariff assignment.`,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }

  return alerts;
}

// --- Bulk Tariff Change Modelling ---

export function modelBulkTariffChange(
  properties: PortfolioProperty[],
  newTariffId: string,
): BulkTariffChangeResult[] {
  const newTariff = ALL_TARIFFS.find(t => t.id === newTariffId);
  if (!newTariff) return [];

  return properties.map(p => {
    const newProjection = calculateAllScenarios(p.system, newTariff);
    const newSummary = summariseScenarios(newProjection, p.system);

    const currentLikely = p.summary.likely.annualNetRevenue;
    const newLikely = newSummary.likely.annualNetRevenue;
    const uplift = currentLikely !== 0 ? ((newLikely - currentLikely) / Math.abs(currentLikely)) * 100 : 0;

    return {
      propertyId: p.id,
      address: `${p.address}, ${p.postcode}`,
      currentTariff: p.tariff.name,
      newTariff: newTariff.name,
      currentAnnualRevenue: {
        best: p.summary.best.annualNetRevenue,
        likely: currentLikely,
        worst: p.summary.worst.annualNetRevenue,
      },
      newAnnualRevenue: {
        best: newSummary.best.annualNetRevenue,
        likely: newLikely,
        worst: newSummary.worst.annualNetRevenue,
      },
      upliftPercent: Math.round(uplift * 10) / 10,
    };
  });
}

// --- CSV Export ---

export function generatePortfolioCsv(properties: PortfolioProperty[]): string {
  const headers = [
    'Address', 'Postcode', 'Status', 'Property Type', 'Phase', 'EPC',
    'System', 'Capacity (kWh)', 'Tariff', 'Monthly Revenue (Likely)',
    'Payback (months)', 'DSCR', 'Total Capex', 'Install Date',
    'Homeowner', 'ESA Ref', 'G99 Status',
  ];

  const rows = properties.map(p => [
    p.address,
    p.postcode,
    p.status,
    p.propertyType,
    p.phase,
    p.epcRating,
    p.system.inverterModel,
    p.system.totalCapacityKwh,
    p.tariff.name,
    Math.round(p.summary.likely.annualNetRevenue / 12),
    p.summary.likely.paybackMonths,
    p.summary.likely.dscr,
    p.totalCapitalCost,
    p.installDate || '',
    p.homeownerName,
    p.esaContractRef,
    p.g99Status,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ============================================================
// DEMO_PROPERTIES — canonical list for UI when database is unavailable.
// The Beeches (port-000) is always first as the flagship demo property.
// ============================================================

export const DEMO_PROPERTIES: PortfolioProperty[] = [
  BEECHES_PORTFOLIO_PROPERTY as unknown as PortfolioProperty,
  ...PORTFOLIO_PROPERTIES,
];

// Re-export
export { formatGbp };
