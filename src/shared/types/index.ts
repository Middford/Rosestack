// ============================================================
// RoseStack Platform — Shared Domain Types
// All agents import from here. Only Agent 0 writes to this file.
// ============================================================

// --- Home / Property ---

export type HomeStatus = 'prospect' | 'qualified' | 'contracted' | 'installed' | 'live' | 'churned';
export type PhaseType = '1-phase' | '3-phase';
export type PropertyType = 'detached' | 'semi' | 'terrace' | 'bungalow' | 'farm' | 'commercial';

export interface Home {
  id: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  phase: PhaseType;
  substationId?: string;
  systemId?: string;
  homeownerId?: string;
  status: HomeStatus;
  epcRating?: string;
  propertyType?: PropertyType;
  gardenAccess?: boolean;
  installDate?: Date;
  contractEndDate?: Date;
  monthlyHomeownerPayment?: number;
  esaContractRef?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Battery System ---

export type BatteryChemistry = 'LFP' | 'NMC' | 'NaIon' | 'Other';

export interface BatterySystem {
  id: string;
  homeId: string;
  inverterModel: string;
  batteryModules: number;
  totalCapacityKwh: number;
  batteryChemistry: BatteryChemistry;
  solarPvKwp?: number;
  heatPumpModel?: string;
  installCost: number;
  annualMaintenanceCost: number;
  warrantyYears: number;
  degradationRatePercent: number;
  maxChargeRateKw: number;
  maxDischargeRateKw: number;
  roundTripEfficiency: number;
}

// --- Tariff ---

export type TariffType = 'fixed' | 'variable' | 'agile' | 'flux' | 'time-of-use';
export type Season = 'summer' | 'winter' | 'all';

export interface TariffRate {
  periodStart: string; // HH:MM
  periodEnd: string;   // HH:MM
  ratePencePerKwh: number;
  season?: Season;
}

export interface Tariff {
  id: string;
  supplier: string;
  name: string;
  type: TariffType;
  importRates: TariffRate[];
  exportRates: TariffRate[];
  standingChargePencePerDay: number;
  validFrom: Date;
  validTo?: Date;
  eligibilityRequirements?: string[];
}

// --- Substation ---

export type ConstraintStatus = 'unconstrained' | 'approaching' | 'constrained';

export interface Substation {
  id: string;
  name: string;
  dnoRegion: string;
  latitude: number;
  longitude: number;
  capacityMva?: number;
  currentLoadPercent?: number;
  constraintStatus: ConstraintStatus;
  flexibilityTenderActive: boolean;
  connectedHomes?: number;
  maxNewConnections?: number;
}

// --- Financial Assumptions ---

export interface FinancialAssumptions {
  energyInflationPercent: number;
  batteryDegradationPercent: number;
  savingSessionsPerYear: number;
  savingSessionRatePencePerKwh: number;
  homeownerPaymentPerMonth: number;
  maintenanceCostPerYear: number;
  insuranceCostPerYear: number;
  cyclesPerDay: number;
  solarGenerationKwhPerYear?: number;
  flexibilityRevenuePerKwhPerYear?: number;
}

// --- Yearly Projection ---

export interface YearlyProjection {
  year: number;
  grossRevenue: number;
  homeownerPayment: number;
  maintenance: number;
  insurance: number;
  netRevenue: number;
  cumulativeRevenue: number;
  batteryCapacityRemaining: number;
  roi: number;
}

// --- Financial Scenario ---

export interface FinancialScenario {
  id: string;
  name: string;
  systemConfig: BatterySystem;
  tariff: Tariff;
  assumptions: FinancialAssumptions;
  projections: YearlyProjection[];
}

// --- Lead / Customer ---

export type LeadSource = 'referral' | 'door-knock' | 'website' | 'club' | 'social' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal-sent' | 'contracted' | 'lost';

export interface Lead {
  id: string;
  homeId: string;
  name: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  referredBy?: string;
  status: LeadStatus;
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Three-Scenario Financial Standard
// Used by EVERY module that displays financial data.
// ============================================================

export type ScenarioType = 'best' | 'likely' | 'worst';

export interface ScenarioAssumptions {
  type: ScenarioType;
  energyInflationPercent: number;
  batteryDegradationPercent: number;
  iofSpreadChangePercent: number;
  savingSessionsPerYear: number;
  savingSessionRatePencePerKwh: number;
  flexibilityRevenuePerHomePerYear: number;
  hardwareCostChangePercent: number;
  installCostChangePercent: number;
  homeownerChurnPercent: number;
  deploymentPacePercent: number;
  interestRateSpreadPercent: number;
  cyclesPerDay: number;
  solarSelfConsumptionPercent: number;
  maintenanceCostChangePercent: number;
}

export interface ThreeScenarioProjection {
  best: YearlyProjection[];
  likely: YearlyProjection[];
  worst: YearlyProjection[];
}

export interface ThreeScenarioSummary {
  best: ScenarioSummaryMetrics;
  likely: ScenarioSummaryMetrics;
  worst: ScenarioSummaryMetrics;
}

export interface ScenarioSummaryMetrics {
  paybackMonths: number;
  tenYearIrr: number;
  tenYearNpv: number;
  annualNetRevenue: number;
  dscr: number;
}

// --- Risk & Opportunities ---

export type RiskCategory = 'tariff' | 'energy-market' | 'regulatory' | 'technology' | 'operational' | 'financial' | 'competitive';
export type OpportunityCategory = 'hardware-cost' | 'revenue-enhancement' | 'grid-flexibility' | 'policy-tailwind' | 'business-model' | 'competitive-advantage';
export type RiskRating = 'low' | 'medium' | 'high' | 'critical';
export type OpportunityRating = 'low' | 'medium' | 'high' | 'transformative';
export type MitigationStatus = 'not-started' | 'in-progress' | 'implemented' | 'tested';
export type CaptureStatus = 'not-started' | 'researching' | 'in-progress' | 'captured' | 'missed';

export interface RiskItem {
  id: string;
  name: string;
  category: RiskCategory;
  description: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  score: number;       // probability * impact
  rating: RiskRating;
  mitigationStrategy: string;
  mitigationOwner: string;
  mitigationStatus: MitigationStatus;
  residualScore?: number;
  triggerThreshold?: string;
  contingencyPlan?: string;
  lastReviewed: Date;
}

export interface OpportunityItem {
  id: string;
  name: string;
  category: OpportunityCategory;
  description: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  score: number;       // probability * impact
  rating: OpportunityRating;
  captureStrategy: string;
  captureOwner: string;
  captureStatus: CaptureStatus;
  expectedValue?: number;
  triggerThreshold?: string;
  dependencies?: string[];
  investmentRequired?: string;
  lastReviewed: Date;
}

// --- AI Agent ---

export type AgentTrigger = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface AgentConfig {
  id: string;
  name: string;
  module: string;
  trigger: AgentTrigger;
  systemPrompt: string;
  description: string;
}

export interface AgentOutput {
  id: string;
  agentId: string;
  timestamp: Date;
  content: string;
  citations: string[];
  metadata?: Record<string, unknown>;
}
