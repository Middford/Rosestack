// ============================================================
// Projects Module — Types
// ============================================================

/** Three-scenario projection (best/likely/worst) */
export interface ScenarioTriple {
  best: number;
  likely: number;
  worst: number;
}

// Project = composition of home + system + financial model
export interface Project {
  id: string;
  // Property
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  phase: '1-phase' | '3-phase';
  propertyType?: string;
  bedrooms?: number;
  gardenAccess?: boolean;
  epcRating?: string;
  // Homeowner
  homeownerName?: string;
  homeownerEmail?: string;
  homeownerPhone?: string;
  monthlyHomeownerPayment: number;
  esaContractRef?: string;
  // Hardware
  batteryId: string;
  batteryStacks: number;
  inverterId: string;
  inverterCount: number;
  solarKwp: number;
  exportLimitKw: number;
  // Household
  dailyConsumptionKwh: number;
  hasHeatPump: boolean;
  evCount: number;
  // Tariff
  tariffName: 'flux' | 'agile' | 'iof';
  // Dates & Status
  pipelineStatus: string;
  targetInstallDate: string | null; // ISO date
  installDate?: string;
  status: string;
  // Financial
  capex: ProjectCapex;
  annualRevenue: ScenarioTriple; // GBP
  // Overrides (null = use default)
  installationCostOverride: number | null;
  maintenanceCostOverride: number | null;
  solarCostOverride: number | null;
  insuranceCostAnnual: number;
  g99ApplicationCost: number;
  // Meta
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCapex {
  batteryHardware: number;
  inverterHardware: number;
  solarCost: number;
  installationLabour: number;
  phaseUpgradeCost: number;
  g99Application: number;
  contingency: number;
  totalCapex: number;
}

export interface CashflowSettings {
  id?: string;
  facilitySize: number;
  interestRatePercent: number;
  g99FeeDefault: number;
  insuranceDefault: number;
  maintenanceDefault: number;
  homeownerPaymentDefault: number;
  horizonMonths: number;
}

export interface CashflowMonth {
  month: string; // YYYY-MM
  monthIndex: number; // 0-based from start
  // Costs
  g99Costs: number;
  capexDrawdown: number;
  ongoingCosts: number; // maintenance + insurance + homeowner payments
  interestCharge: number;
  totalCosts: number;
  // Revenue (three scenarios)
  revenue: ScenarioTriple;
  // Facility
  drawdown: number;
  repayment: number;
  facilityBalance: number;
  // Net position
  netCashFlow: ScenarioTriple;
  cumulativeCashFlow: ScenarioTriple;
  // Project counts
  projectsInBuild: number;
  projectsLive: number;
}

export interface CashflowResult {
  months: CashflowMonth[];
  peakBorrowing: ScenarioTriple;
  breakEvenMonth: { best: number | null; likely: number | null; worst: number | null };
  totalCapexDeployed: number;
  totalProjectCount: number;
  liveProjectCount: number;
  settings: CashflowSettings;
}

export type FinancialPhase = 'pre-build' | 'build' | 'operational';

/** Lightweight input for the cashflow engine — can be built from DB rows without full Project */
export interface CashflowProjectInput {
  address: string;
  targetInstallDate: string | null;
  capex: ProjectCapex;
  annualRevenue: ScenarioTriple;
  monthlyHomeownerPayment: number;
  insuranceCostAnnual: number;
  maintenanceCostOverride: number | null;
}
