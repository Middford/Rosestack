// ============================================================
// Hardware Module — Local Types
// ============================================================

export type HardwareCategory = 'battery' | 'inverter' | 'solar' | 'heat-pump';

export interface BatterySpec {
  id: string;
  manufacturer: string;
  model: string;
  category: 'battery';
  capacityPerModuleKwh: number;
  maxModulesPerString: number;
  chemistry: 'LFP' | 'NMC' | 'NaIon';
  cycleLife: number;
  degradationRatePercent: number;
  roundTripEfficiency: number;
  chargeRateKw: number;
  dischargeRateKw: number;
  ipRating: string;
  weightKg: number;
  operatingTempMin: number;
  operatingTempMax: number;
  warrantyYears: number;
  wholesalePriceGbp: number;
  mcsCertified: boolean;
  iofCompatible: boolean;
  compatibleInverters: string[];
  imageUrl?: string;
}

export interface InverterSpec {
  id: string;
  manufacturer: string;
  model: string;
  category: 'inverter';
  maxPvInputKw: number;
  maxBatteryCapacityKwh: number;
  mpptTrackers: number;
  hybrid: boolean;
  threePhase: boolean;
  g99Compliant: boolean;
  iofCompatible: boolean;
  octopusApiIntegration: boolean;
  homeAssistantCompatible: boolean;
  priceGbp: number;
  warrantyYears: number;
  maxOutputKw: number;
  imageUrl?: string;
}

export interface SolarPanelSpec {
  id: string;
  manufacturer: string;
  model: string;
  category: 'solar';
  wattage: number;
  efficiency: number;
  panelType: 'monocrystalline' | 'polycrystalline' | 'thin-film';
  warrantyYears: number;
  degradationRatePercent: number;
  dimensions: string;
  weightKg: number;
  priceGbp: number;
  tempCoefficientPercent: number;
}

export interface HeatPumpSpec {
  id: string;
  manufacturer: string;
  model: string;
  category: 'heat-pump';
  copRating: number;
  copAtMinus5: number;
  heatingCapacityKw: number;
  noiseDb: number;
  refrigerant: string;
  mcsCertified: boolean;
  priceGbp: number;
  warrantyYears: number;
  suitableForLancashire: boolean;
  smartTariffIntegration: boolean;
}

export type HardwareItem = BatterySpec | InverterSpec | SolarPanelSpec | HeatPumpSpec;

export interface SystemConfig {
  battery: BatterySpec | null;
  batteryModules: number;
  inverter: InverterSpec | null;
  solarPanel: SolarPanelSpec | null;
  solarPanelCount: number;
  heatPump: HeatPumpSpec | null;
}

export interface SystemCostBreakdown {
  batteryCost: number;
  inverterCost: number;
  solarCost: number;
  heatPumpCost: number;
  installationEstimate: number;
  totalCost: number;
}

export interface CompatibilityEntry {
  batteryId: string;
  inverterId: string;
  compatible: boolean;
  iofEligible: boolean;
  notes?: string;
}

export type SortField = 'manufacturer' | 'model' | 'price' | 'capacity' | 'efficiency' | 'warranty';
export type SortDirection = 'asc' | 'desc';
