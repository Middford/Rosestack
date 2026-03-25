// ============================================================
// Product Design Module — Types
// RoseStack own-brand sodium-ion battery system
// ============================================================

export type CellChemistry = 'Na-ion' | 'LFP' | 'NMC';

export type CellSupplierStatus = 'mass-production' | 'pilot' | 'development' | 'announced';

export interface SodiumIonCellSpec {
  id: string;
  manufacturer: string;
  model: string;
  origin: string;
  chemistry: CellChemistry;
  energyDensityWhKg: number;
  nominalVoltage: number;
  capacityAh: number;
  cycleLife: number;
  operatingTempMin: number;
  operatingTempMax: number;
  chargeTempMin: number;
  chargeTempMax: number;
  fastChargeMinutes?: number;
  coldPerformanceRetention?: number;
  estimatedCellPriceUsdKwh: number;
  estimatedPackPriceUsdKwh: number;
  productionCapacityGwh: number;
  status: CellSupplierStatus;
  exportToUk: boolean;
  moqKwh?: number;
  certifications: string[];
  notes: string;
}

export type PackSizeOption = '5kWh' | '8kWh' | '12kWh';

export interface PackDesign {
  id: string;
  name: string;
  nominalCapacityKwh: number;
  cellsInSeries: number;
  cellsInParallel: number;
  totalCells: number;
  nominalVoltageV: number;
  maxChargeRateKw: number;
  maxDischargeRateKw: number;
  weightKg: number;
  dimensionsMm: { width: number; height: number; depth: number };
  ipRating: string;
  bmsType: string;
  thermalManagement: string;
  estimatedBomGbp: number;
}

export interface BmsOption {
  id: string;
  name: string;
  manufacturer: string;
  protocol: string;
  voltageRangeMin: number;
  voltageRangeMax: number;
  cellCountMax: number;
  sodiumIonCompatible: boolean;
  canBus: boolean;
  rs485: boolean;
  priceGbp: number;
  notes: string;
}

export type InverterCompatibility = 'native' | 'compatible' | 'possible' | 'incompatible';

export interface InverterOption {
  id: string;
  manufacturer: string;
  model: string;
  type: 'hybrid' | 'ac-coupled' | 'off-grid';
  maxOutputKw: number;
  thirdPartyBattery: boolean;
  canBmsProtocol: boolean;
  openProtocol: boolean;
  iofCompatible: boolean;
  octopusApiIntegration: boolean;
  homeAssistantCompatible: boolean;
  g99Compliant: boolean;
  priceGbp: number;
  sodiumIonCompatibility: InverterCompatibility;
  whiteLabel: boolean;
  notes: string;
}

export interface CostLineItem {
  category: string;
  description: string;
  unitCostGbp: number;
  quantity: number;
  totalGbp: number;
}

export interface CostModel {
  id: string;
  name: string;
  capacityKwh: number;
  lineItems: CostLineItem[];
  totalBomGbp: number;
  marginPercent: number;
  retailPriceGbp: number;
  pricePerKwhGbp: number;
  comparisonRetailGbp: number;
  savingsPercent: number;
}

export type RegulatoryStatus = 'not-started' | 'in-progress' | 'submitted' | 'achieved';

export interface RegulatoryMilestone {
  id: string;
  name: string;
  description: string;
  standard: string;
  status: RegulatoryStatus;
  estimatedCostGbp: number;
  estimatedWeeks: number;
  startDate?: string;
  targetDate: string;
  dependencies: string[];
  notes: string;
}

export type ManufacturingStrategy = 'full-china-oem' | 'china-cells-uk-assembly' | 'full-uk';

export interface ManufacturingOption {
  id: string;
  strategy: ManufacturingStrategy;
  name: string;
  description: string;
  cellSource: string;
  assemblyLocation: string;
  estimatedUnitCostGbp: number;
  setupCostGbp: number;
  leadTimeWeeks: number;
  minOrderUnits: number;
  qualityControl: string;
  brandValue: string;
  grantEligibility: boolean;
  grantsAvailable: string[];
  risks: string[];
  advantages: string[];
}

export interface ImportLogistics {
  route: string;
  shippingCostPerUnit: number;
  customsDutyPercent: number;
  vatPercent: number;
  transitDays: number;
  certifications: string[];
  regulations: string[];
}
