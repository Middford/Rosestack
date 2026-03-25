// ============================================================
// Hardware Module — Service Layer
// ============================================================

import { batteries, inverters, solarPanels, heatPumps, compatibilityMatrix } from './data';
import type {
  BatterySpec,
  InverterSpec,
  SolarPanelSpec,
  HeatPumpSpec,
  HardwareItem,
  HardwareCategory,
  SystemConfig,
  SystemCostBreakdown,
  CompatibilityEntry,
  SortField,
  SortDirection,
} from './types';

// --- Getters ---

export function getAllBatteries(): BatterySpec[] {
  return batteries;
}

export function getAllInverters(): InverterSpec[] {
  return inverters;
}

export function getAllSolarPanels(): SolarPanelSpec[] {
  return solarPanels;
}

export function getAllHeatPumps(): HeatPumpSpec[] {
  return heatPumps;
}

export function getBatteryById(id: string): BatterySpec | undefined {
  return batteries.find(b => b.id === id);
}

export function getInverterById(id: string): InverterSpec | undefined {
  return inverters.find(i => i.id === id);
}

export function getSolarPanelById(id: string): SolarPanelSpec | undefined {
  return solarPanels.find(s => s.id === id);
}

export function getHeatPumpById(id: string): HeatPumpSpec | undefined {
  return heatPumps.find(h => h.id === id);
}

// --- Search & Filter ---

export function searchHardware(
  query: string,
  category?: HardwareCategory,
): HardwareItem[] {
  const q = query.toLowerCase();
  let items: HardwareItem[] = [];

  if (!category || category === 'battery') items = items.concat(batteries);
  if (!category || category === 'inverter') items = items.concat(inverters);
  if (!category || category === 'solar') items = items.concat(solarPanels);
  if (!category || category === 'heat-pump') items = items.concat(heatPumps);

  if (!q) return items;

  return items.filter(item =>
    item.manufacturer.toLowerCase().includes(q) ||
    item.model.toLowerCase().includes(q)
  );
}

export function filterBatteries(filters: {
  chemistry?: string;
  mcsCertified?: boolean;
  iofCompatible?: boolean;
  minCapacity?: number;
  maxPrice?: number;
}): BatterySpec[] {
  return batteries.filter(b => {
    if (filters.chemistry && b.chemistry !== filters.chemistry) return false;
    if (filters.mcsCertified !== undefined && b.mcsCertified !== filters.mcsCertified) return false;
    if (filters.iofCompatible !== undefined && b.iofCompatible !== filters.iofCompatible) return false;
    if (filters.minCapacity && b.capacityPerModuleKwh < filters.minCapacity) return false;
    if (filters.maxPrice && b.wholesalePriceGbp > filters.maxPrice) return false;
    return true;
  });
}

export function filterInverters(filters: {
  threePhase?: boolean;
  hybrid?: boolean;
  iofCompatible?: boolean;
  maxPrice?: number;
}): InverterSpec[] {
  return inverters.filter(i => {
    if (filters.threePhase !== undefined && i.threePhase !== filters.threePhase) return false;
    if (filters.hybrid !== undefined && i.hybrid !== filters.hybrid) return false;
    if (filters.iofCompatible !== undefined && i.iofCompatible !== filters.iofCompatible) return false;
    if (filters.maxPrice && i.priceGbp > filters.maxPrice) return false;
    return true;
  });
}

// --- Sorting ---

function getItemPrice(item: HardwareItem): number {
  if (item.category === 'battery') return (item as BatterySpec).wholesalePriceGbp;
  if (item.category === 'inverter') return (item as InverterSpec).priceGbp;
  if (item.category === 'solar') return (item as SolarPanelSpec).priceGbp;
  return (item as HeatPumpSpec).priceGbp;
}

function getItemCapacity(item: HardwareItem): number {
  if (item.category === 'battery') return (item as BatterySpec).capacityPerModuleKwh;
  if (item.category === 'inverter') return (item as InverterSpec).maxOutputKw;
  if (item.category === 'solar') return (item as SolarPanelSpec).wattage;
  return (item as HeatPumpSpec).heatingCapacityKw;
}

function getItemEfficiency(item: HardwareItem): number {
  if (item.category === 'battery') return (item as BatterySpec).roundTripEfficiency;
  if (item.category === 'solar') return (item as SolarPanelSpec).efficiency;
  if (item.category === 'heat-pump') return (item as HeatPumpSpec).copRating;
  return 0;
}

function getItemWarranty(item: HardwareItem): number {
  return item.warrantyYears;
}

export function sortHardware<T extends HardwareItem>(
  items: T[],
  field: SortField,
  direction: SortDirection,
): T[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    switch (field) {
      case 'manufacturer': valA = a.manufacturer; valB = b.manufacturer; break;
      case 'model': valA = a.model; valB = b.model; break;
      case 'price': valA = getItemPrice(a); valB = getItemPrice(b); break;
      case 'capacity': valA = getItemCapacity(a); valB = getItemCapacity(b); break;
      case 'efficiency': valA = getItemEfficiency(a); valB = getItemEfficiency(b); break;
      case 'warranty': valA = getItemWarranty(a); valB = getItemWarranty(b); break;
      default: return 0;
    }

    if (typeof valA === 'string') {
      const cmp = valA.localeCompare(valB as string);
      return direction === 'asc' ? cmp : -cmp;
    }
    return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });
  return sorted;
}

// --- Compatibility ---

export function getCompatibilityMatrix(): CompatibilityEntry[] {
  return compatibilityMatrix;
}

export function getCompatibleInverters(batteryId: string): CompatibilityEntry[] {
  return compatibilityMatrix.filter(e => e.batteryId === batteryId && e.compatible);
}

export function getCompatibleBatteries(inverterId: string): CompatibilityEntry[] {
  return compatibilityMatrix.filter(e => e.inverterId === inverterId && e.compatible);
}

export function checkCompatibility(batteryId: string, inverterId: string): CompatibilityEntry | undefined {
  return compatibilityMatrix.find(
    e => e.batteryId === batteryId && e.inverterId === inverterId,
  );
}

// --- System Builder ---

const INSTALLATION_BASE_COST = 3500;
const INSTALLATION_PER_MODULE = 200;
const SOLAR_INSTALL_PER_PANEL = 150;
const HEAT_PUMP_INSTALL = 2500;

export function calculateSystemCost(config: SystemConfig): SystemCostBreakdown {
  const batteryCost = config.battery
    ? config.battery.wholesalePriceGbp * config.batteryModules
    : 0;
  const inverterCost = config.inverter ? config.inverter.priceGbp : 0;
  const solarCost = config.solarPanel
    ? config.solarPanel.priceGbp * config.solarPanelCount
    : 0;
  const heatPumpCost = config.heatPump ? config.heatPump.priceGbp : 0;

  const installationEstimate =
    INSTALLATION_BASE_COST +
    (config.battery ? INSTALLATION_PER_MODULE * config.batteryModules : 0) +
    (config.solarPanel ? SOLAR_INSTALL_PER_PANEL * config.solarPanelCount : 0) +
    (config.heatPump ? HEAT_PUMP_INSTALL : 0);

  return {
    batteryCost,
    inverterCost,
    solarCost,
    heatPumpCost,
    installationEstimate,
    totalCost: batteryCost + inverterCost + solarCost + heatPumpCost + installationEstimate,
  };
}

export function checkSystemCompatibility(config: SystemConfig): {
  compatible: boolean;
  iofEligible: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let compatible = true;
  let iofEligible = false;

  if (config.battery && config.inverter) {
    const entry = checkCompatibility(config.battery.id, config.inverter.id);
    if (!entry || !entry.compatible) {
      compatible = false;
      warnings.push(`${config.battery.model} is not compatible with ${config.inverter.model}`);
    } else {
      iofEligible = entry.iofEligible;
    }

    const totalCapacity = config.battery.capacityPerModuleKwh * config.batteryModules;
    if (totalCapacity > config.inverter.maxBatteryCapacityKwh) {
      warnings.push(
        `Total battery capacity (${totalCapacity}kWh) exceeds inverter max (${config.inverter.maxBatteryCapacityKwh}kWh)`,
      );
    }

    if (config.batteryModules > config.battery.maxModulesPerString) {
      warnings.push(
        `Module count (${config.batteryModules}) exceeds max per string (${config.battery.maxModulesPerString})`,
      );
    }
  }

  if (config.solarPanel && config.inverter) {
    const totalPvKw = (config.solarPanel.wattage * config.solarPanelCount) / 1000;
    if (totalPvKw > config.inverter.maxPvInputKw) {
      warnings.push(
        `Total PV (${totalPvKw.toFixed(1)}kW) exceeds inverter max PV input (${config.inverter.maxPvInputKw}kW)`,
      );
    }
  }

  return { compatible, iofEligible, warnings };
}
