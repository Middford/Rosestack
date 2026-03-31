// ============================================================
// Portfolio Module — Local Types
// ============================================================

import type { HomeStatus, PhaseType, PropertyType, BatterySystem, Tariff, ThreeScenarioProjection, ThreeScenarioSummary } from '@/shared/types';
import type { FiveCostMetrics, MonthlyPaybackResult, ExportSensitivityResult } from '@/shared/utils/cost-metrics-types';

export type CyclingStrategy = 'single' | 'double' | 'kraken-managed';
export type PropertyStatusFilter = HomeStatus | 'all';

export interface PortfolioProperty {
  id: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  bedrooms: number;
  phase: PhaseType;
  epcRating: string;
  gardenLocation: string;
  nearestSubstationId: string;
  homeownerName: string;
  homeownerPhone: string;
  homeownerEmail: string;
  esaContractRef: string;
  esaStartDate: string;
  esaEndDate: string;
  monthlyHomeownerPayment: number;
  referralSource: string;
  notes: string;
  status: HomeStatus;
  installDate?: string;
  commissionDate?: string;

  // Hardware assignment
  system: BatterySystem;
  solarPanelModel?: string;
  solarPanelCount?: number;
  solarKwp?: number;
  solarOrientation?: string;
  solarTilt?: number;
  heatPumpModel?: string;
  heatPumpCop?: number;
  installationCost: number;
  g99ApplicationCost: number;
  mcsCertificationCost: number;
  ancillaryCosts: number;
  totalCapitalCost: number;

  // Tariff assignment
  tariff: Tariff;
  tariffId: string;
  cyclingStrategy: CyclingStrategy;
  solarSelfConsumptionEstimate: number;
  savingSessionsParticipation: boolean;
  estimatedSessionsPerYear: number;
  flexibilityParticipation: boolean;
  estimatedFlexRevenue: number;
  segRegistered: boolean;
  segRate: number;

  // Financial projection
  projection: ThreeScenarioProjection;
  summary: ThreeScenarioSummary;

  // Cost metrics (computed, not stored)
  costMetrics?: FiveCostMetrics;
  monthlyPayback?: MonthlyPaybackResult;
  exportSensitivity?: ExportSensitivityResult;

  // Compliance
  g99Status: 'not-applied' | 'submitted' | 'approved' | 'rejected';
  g99Reference?: string;
  mcsCertReference?: string;
  segRegistrationRef?: string;
  insurancePolicy?: string;
  nextInspectionDate?: string;

  // Timeline
  timeline: TimelineEvent[];

  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'status-change' | 'maintenance' | 'tariff-change' | 'milestone' | 'compliance' | 'note';
  title: string;
  description: string;
}

export interface PortfolioAlert {
  id: string;
  propertyId: string;
  address: string;
  type: 'underperforming' | 'renewal' | 'maintenance' | 'g99-delay' | 'degradation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  date: string;
}

export interface PortfolioSummaryStats {
  totalLive: number;
  totalInstalled: number;
  totalPipeline: number;
  totalCapacityKwh: number;
  monthlyRevenueLikely: number;
  avgPaybackProgress: number;
  portfolioDscr: number;
}

export interface BulkTariffChangeResult {
  propertyId: string;
  address: string;
  currentTariff: string;
  newTariff: string;
  currentAnnualRevenue: { best: number; likely: number; worst: number };
  newAnnualRevenue: { best: number; likely: number; worst: number };
  upliftPercent: number;
}

// Wizard step data
export interface WizardPropertyDetails {
  address: string;
  postcode: string;
  propertyType: PropertyType;
  bedrooms: number;
  phase: PhaseType;
  epcRating: string;
  gardenLocation: string;
  nearestSubstationId: string;
  homeownerName: string;
  homeownerPhone: string;
  homeownerEmail: string;
  esaContractRef: string;
  esaStartDate: string;
  esaEndDate: string;
  monthlyHomeownerPayment: number;
  referralSource: string;
  notes: string;
}

export interface WizardHardwareAssignment {
  inverterId: string;
  batteryId: string;
  batteryModules: number;
  solarPanelId?: string;
  solarPanelCount?: number;
  solarOrientation?: string;
  solarTilt?: number;
  heatPumpId?: string;
  installationCost: number;
  g99ApplicationCost: number;
  mcsCertificationCost: number;
  ancillaryCosts: number;
}

export interface WizardTariffAssignment {
  tariffId: string;
  cyclingStrategy: CyclingStrategy;
  solarSelfConsumptionEstimate: number;
  savingSessionsParticipation: boolean;
  estimatedSessionsPerYear: number;
  flexibilityParticipation: boolean;
  estimatedFlexRevenue: number;
  segRegistered: boolean;
  segRate: number;
}
