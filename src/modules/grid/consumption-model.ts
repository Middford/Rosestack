// ============================================================
// RoseStack Grid Module — Household Consumption Model
// Models electricity consumption across 48 half-hour slots × 12 months
// ============================================================

export interface ConsumptionInputs {
  // Property basics
  floorAreaSqm: number;           // e.g., 200
  bedrooms: number;               // 1-8
  propertyType: 'detached' | 'semi' | 'terrace' | 'bungalow' | 'farm';
  builtYear: number;              // e.g., 1965
  epcRating: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

  // Occupancy
  occupants: number;              // 1-8
  workFromHome: boolean;

  // Heating
  heatingType: 'gas_boiler' | 'heat_pump' | 'oil_boiler' | 'electric_direct' | 'other';
  heatPumpKw?: number;            // If heat pump: thermal output kW
  heatPumpCop?: number;           // Typical COP (e.g., 3.5)

  // EV
  hasEv: boolean;
  evChargingKw?: number;          // e.g., 7.4 for standard home charger
  evMilesPerWeek?: number;        // e.g., 200

  // Solar
  hasSolar: boolean;
  solarKwp?: number;              // e.g., 6
  solarOrientationFactor?: number; // 0.7 (north) to 1.0 (south)

  // Behaviour
  morningPeakOccupancy: boolean;  // Is house occupied 06:00-09:00?
  eveningPeakOccupancy: boolean;  // Is house occupied 17:00-22:00?
}

// 48×12 matrix: rows = half-hour slots (0-47), columns = months (0-11, Jan-Dec)
export type ConsumptionMatrix = number[][]; // [slotIndex][monthIndex] = kWh

export interface ConsumptionProfile {
  inputs: ConsumptionInputs;
  matrix: ConsumptionMatrix;            // 48×12 = 576 values, kWh per slot per month
  annualTotalKwh: number;               // Sum of all cells × days per month
  monthlyTotals: number[];              // 12 values, kWh per month
  dailyProfileByMonth: number[][];      // [month][slot] = average kWh per day per slot
  peakDemandKw: number;                 // Maximum instantaneous demand (kW, i.e., kWh × 2)
  solarGeneration?: SolarProfile;       // If solar fitted
}

export interface SolarProfile {
  annualGenerationKwh: number;          // Lancashire: 950 kWh/kWp/year
  monthlyGenerationKwh: number[];       // 12 values
  generationMatrix: ConsumptionMatrix;  // 48×12 (generation, positive = generating)
  selfConsumptionKwh: number;           // How much solar used directly vs exported
  exportKwh: number;                    // How much solar exported to grid
}

// ============================================================
// Constants
// ============================================================

// Days per month (non-leap year averages used)
const DAYS_PER_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Lancashire solar monthly factors (Jan-Dec), normalised to sum to 1.0
const RAW_SOLAR_MONTHLY_FACTORS = [
  0.03, 0.05, 0.09, 0.12, 0.14, 0.15, 0.14, 0.12, 0.09, 0.06, 0.03, 0.02,
];
const SOLAR_FACTOR_SUM = RAW_SOLAR_MONTHLY_FACTORS.reduce((a, b) => a + b, 0);
const SOLAR_MONTHLY_FACTORS = RAW_SOLAR_MONTHLY_FACTORS.map((f) => f / SOLAR_FACTOR_SUM);

// Lancashire annual solar yield baseline
const LANCASHIRE_SOLAR_KWH_PER_KWP = 950;

// Solar generation occurs between slots 12-38 (06:00-19:00 in 30-min slots)
// slot = hour * 2, so slot 12 = 06:00, slot 24 = 12:00 (noon), slot 38 = 19:00
const SOLAR_START_SLOT = 12;
const SOLAR_END_SLOT = 38;
const SOLAR_PEAK_SLOT = 24; // Solar noon

// EPC adjustment factors for consumption
const EPC_FACTORS: Record<ConsumptionInputs['epcRating'], number> = {
  A: 0.6,
  B: 0.7,
  C: 0.85,
  D: 1.0,
  E: 1.2,
  F: 1.4,
  G: 1.6,
};

// Seasonal baseload multipliers (winter = Dec/Jan/Feb = months 11, 0, 1)
// Applied to base background load for lighting effects etc.
const SEASONAL_BASELOAD_FACTOR = [
  1.3,  // Jan (0)
  1.2,  // Feb (1)
  1.0,  // Mar (2)
  0.9,  // Apr (3)
  0.8,  // May (4)
  0.8,  // Jun (5)
  0.8,  // Jul (6)
  0.8,  // Aug (7)
  0.9,  // Sep (8)
  1.0,  // Oct (9)
  1.2,  // Nov (10)
  1.3,  // Dec (11)
];

// Heat demand distribution across months (Lancashire, ~12,000 kWh/yr for 200sqm detached)
// Winter (Dec, Jan, Feb) = 25% each, Spring/Autumn = 12.5% each, Summer = low
const HEAT_DEMAND_MONTHLY_FRACTION = [
  0.25,  // Jan
  0.25,  // Feb
  0.12,  // Mar
  0.06,  // Apr
  0.02,  // May
  0.005, // Jun
  0.005, // Jul
  0.01,  // Aug
  0.04,  // Sep
  0.08,  // Oct
  0.12,  // Nov
  0.25,  // Dec
];

// Normalise heat demand fractions to sum to 1.0
const HEAT_DEMAND_SUM = HEAT_DEMAND_MONTHLY_FRACTION.reduce((a, b) => a + b, 0);
const HEAT_DEMAND_MONTHLY = HEAT_DEMAND_MONTHLY_FRACTION.map((f) => f / HEAT_DEMAND_SUM);

// Heat pump runs mostly overnight and morning slots
// Slot ranges: overnight 22:00-06:00 (slots 44-47, 0-11) + morning (12-18)
const HEAT_PUMP_SLOT_WEIGHTS: number[] = new Array(48).fill(0);
for (let s = 0; s < 48; s++) {
  if (s <= 11) {
    // Overnight 00:00-05:59: high weight
    HEAT_PUMP_SLOT_WEIGHTS[s] = 1.0;
  } else if (s >= 12 && s <= 18) {
    // Morning 06:00-09:00: high weight
    HEAT_PUMP_SLOT_WEIGHTS[s] = 0.9;
  } else if (s >= 44) {
    // Late evening 22:00+: medium weight
    HEAT_PUMP_SLOT_WEIGHTS[s] = 0.8;
  } else {
    // Daytime: low weight (defrost cycles, DHW)
    HEAT_PUMP_SLOT_WEIGHTS[s] = 0.2;
  }
}
const HEAT_PUMP_WEIGHT_SUM = HEAT_PUMP_SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
const HEAT_PUMP_SLOT_FRACTIONS = HEAT_PUMP_SLOT_WEIGHTS.map((w) => w / HEAT_PUMP_WEIGHT_SUM);

// EV consumption: 3.5 miles/kWh (typical EV efficiency including charging losses)
const EV_MILES_PER_KWH = 3.5;
// EV charging typically slots 20:00-07:00 (slots 40-47, 0-13)
const EV_CHARGING_SLOTS: number[] = [];
for (let s = 40; s <= 47; s++) EV_CHARGING_SLOTS.push(s);
for (let s = 0; s <= 13; s++) EV_CHARGING_SLOTS.push(s);

// ============================================================
// Solar bell-curve generation profile
// ============================================================

function buildSolarSlotWeights(): number[] {
  const weights = new Array(48).fill(0);
  const range = SOLAR_END_SLOT - SOLAR_START_SLOT;
  const sigma = range / 4; // Standard deviation for bell curve

  for (let s = SOLAR_START_SLOT; s <= SOLAR_END_SLOT; s++) {
    const delta = s - SOLAR_PEAK_SLOT;
    weights[s] = Math.exp(-0.5 * (delta / sigma) ** 2);
  }

  // Normalise to sum to 1.0
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

const SOLAR_SLOT_FRACTIONS = buildSolarSlotWeights();

// ============================================================
// Core consumption model
// ============================================================

function buildBaseConsumptionMatrix(inputs: ConsumptionInputs): ConsumptionMatrix {
  const {
    floorAreaSqm,
    occupants,
    epcRating,
    morningPeakOccupancy,
    eveningPeakOccupancy,
    workFromHome,
  } = inputs;

  const epcFactor = EPC_FACTORS[epcRating];
  // Floor area scaling: larger properties use more, but not linearly
  const areaSqm = Math.max(floorAreaSqm, 20);
  const areaFactor = (areaSqm / 100) ** 0.7;

  // matrix[slot][month]
  const matrix: ConsumptionMatrix = Array.from({ length: 48 }, () => new Array(12).fill(0));

  for (let month = 0; month < 12; month++) {
    const seasonalFactor = SEASONAL_BASELOAD_FACTOR[month];

    for (let slot = 0; slot < 48; slot++) {
      // --- Base background load (fridge, standby, router, etc.) ---
      let slotKwh = 0.2 * seasonalFactor;

      // --- Morning peak 06:00-09:00 (slots 12-17) ---
      if (morningPeakOccupancy && slot >= 12 && slot <= 17) {
        slotKwh += 0.8 * occupants;
      }

      // --- Evening peak 17:00-22:00 (slots 34-43) ---
      if (eveningPeakOccupancy && slot >= 34 && slot <= 43) {
        slotKwh += 1.0 * occupants;
      }

      // --- WFH: +0.15 kWh per slot during 08:00-18:00 (slots 16-35) ---
      // This is an average across the month (5/7 weekdays fraction)
      if (workFromHome && slot >= 16 && slot <= 35) {
        slotKwh += 0.15 * (5 / 7);
      }

      // Apply area and EPC factors
      slotKwh *= areaFactor * epcFactor;

      matrix[slot][month] = slotKwh;
    }
  }

  return matrix;
}

function addHeatingToMatrix(
  matrix: ConsumptionMatrix,
  inputs: ConsumptionInputs,
): ConsumptionMatrix {
  const { heatingType, heatPumpCop, floorAreaSqm, epcRating } = inputs;

  // Only heat pump and electric direct contribute to electricity consumption
  if (heatingType === 'gas_boiler' || heatingType === 'oil_boiler' || heatingType === 'other') {
    // Minimal electricity for circulators: ~200 kWh/yr spread evenly
    const slotKwh = 200 / (365.25 * 48);
    for (let slot = 0; slot < 48; slot++) {
      for (let month = 0; month < 12; month++) {
        matrix[slot][month] += slotKwh;
      }
    }
    return matrix;
  }

  // Estimate annual heat demand: 12,000 kWh/yr baseline for 200sqm detached
  // Scale by floor area and EPC rating
  const baseHeatDemand = 12000;
  const areaSqm = Math.max(floorAreaSqm, 20);
  const areaFactor = (areaSqm / 200) ** 0.9;
  const epcFactor = EPC_FACTORS[epcRating];
  const annualHeatDemandKwh = baseHeatDemand * areaFactor * epcFactor;

  let annualElectricityForHeatKwh: number;

  if (heatingType === 'heat_pump') {
    const cop = heatPumpCop ?? 3.0;
    annualElectricityForHeatKwh = annualHeatDemandKwh / cop;
  } else {
    // electric_direct: COP = 1.0
    annualElectricityForHeatKwh = annualHeatDemandKwh;
  }

  for (let month = 0; month < 12; month++) {
    const monthlyElectricityKwh = annualElectricityForHeatKwh * HEAT_DEMAND_MONTHLY[month];
    const daysInMonth = DAYS_PER_MONTH[month];
    // Per-slot allocation across the month: total / days / slots-per-day weighted by slot fraction
    // monthlyElectricityKwh total across all days in month
    const perSlotMonthlyKwh = monthlyElectricityKwh; // total for the month, split by fractions

    for (let slot = 0; slot < 48; slot++) {
      // The matrix stores kWh per slot per month (i.e., total for all days in that month)
      // So we distribute the monthly electricity across slots via fractions
      matrix[slot][month] += perSlotMonthlyKwh * HEAT_PUMP_SLOT_FRACTIONS[slot];
    }
  }

  return matrix;
}

function addEvToMatrix(matrix: ConsumptionMatrix, inputs: ConsumptionInputs): ConsumptionMatrix {
  if (!inputs.hasEv) return matrix;

  const chargingKw = inputs.evChargingKw ?? 7.4;
  const milesPerWeek = inputs.evMilesPerWeek ?? 150;

  // Weekly electricity consumption for EV
  const weeklyKwh = milesPerWeek / EV_MILES_PER_KWH;
  const annualKwh = weeklyKwh * 52;
  const monthlyKwh = annualKwh / 12;

  // Distribute across EV charging slots (overnight) equally
  const slotFraction = 1 / EV_CHARGING_SLOTS.length;
  // kWh per slot per month = monthlyKwh / numSlots (spread evenly across charging slots)
  // But also cap by charger rate: chargingKw × 0.5hr = chargingKw/2 per slot
  const maxPerSlot = chargingKw / 2; // kWh per 30-min slot per day
  const maxMonthlyPerSlot = maxPerSlot * DAYS_PER_MONTH[0]; // Use typical month

  for (let month = 0; month < 12; month++) {
    const daysInMonth = DAYS_PER_MONTH[month];
    const maxMonthly = maxPerSlot * daysInMonth * EV_CHARGING_SLOTS.length;
    const actualMonthlyKwh = Math.min(monthlyKwh, maxMonthly);
    const perSlot = actualMonthlyKwh * slotFraction;

    for (const slot of EV_CHARGING_SLOTS) {
      matrix[slot][month] += perSlot;
    }
  }

  return matrix;
}

function buildSolarProfile(inputs: ConsumptionInputs, consumptionMatrix: ConsumptionMatrix): SolarProfile {
  const { solarKwp = 0, solarOrientationFactor = 0.95 } = inputs;

  const annualGenerationKwh = solarKwp * LANCASHIRE_SOLAR_KWH_PER_KWP * solarOrientationFactor;

  // Monthly generation matrix: [slot][month] = kWh generated in that slot for the whole month
  const generationMatrix: ConsumptionMatrix = Array.from({ length: 48 }, () => new Array(12).fill(0));
  const monthlyGenerationKwh: number[] = new Array(12).fill(0);

  for (let month = 0; month < 12; month++) {
    const monthlyTotal = annualGenerationKwh * SOLAR_MONTHLY_FACTORS[month];
    monthlyGenerationKwh[month] = monthlyTotal;

    for (let slot = SOLAR_START_SLOT; slot <= SOLAR_END_SLOT; slot++) {
      generationMatrix[slot][month] = monthlyTotal * SOLAR_SLOT_FRACTIONS[slot];
    }
  }

  // Self-consumption: solar generation used directly (when consumption > generation per slot)
  let selfConsumptionKwh = 0;
  let exportKwh = 0;

  for (let month = 0; month < 12; month++) {
    for (let slot = 0; slot < 48; slot++) {
      const gen = generationMatrix[slot][month];
      const cons = consumptionMatrix[slot][month];
      const selfUsed = Math.min(gen, cons);
      selfConsumptionKwh += selfUsed;
      exportKwh += gen - selfUsed;
    }
  }

  return {
    annualGenerationKwh,
    monthlyGenerationKwh,
    generationMatrix,
    selfConsumptionKwh,
    exportKwh,
  };
}

// ============================================================
// Public API
// ============================================================

export function buildConsumptionProfile(inputs: ConsumptionInputs): ConsumptionProfile {
  // Build base consumption matrix
  let matrix = buildBaseConsumptionMatrix(inputs);

  // Add heating contribution
  matrix = addHeatingToMatrix(matrix, inputs);

  // Add EV charging
  matrix = addEvToMatrix(matrix, inputs);

  // Calculate monthly totals (sum across all slots for each month)
  const monthlyTotals: number[] = new Array(12).fill(0);
  for (let month = 0; month < 12; month++) {
    for (let slot = 0; slot < 48; slot++) {
      monthlyTotals[month] += matrix[slot][month];
    }
  }

  // Annual total
  const annualTotalKwh = monthlyTotals.reduce((a, b) => a + b, 0);

  // Daily profile by month: average kWh per day per slot
  const dailyProfileByMonth: number[][] = Array.from({ length: 12 }, (_, month) =>
    Array.from({ length: 48 }, (__, slot) => matrix[slot][month] / DAYS_PER_MONTH[month]),
  );

  // Peak demand: max slot value × 2 (convert kWh/30min to kW)
  let peakSlotKwh = 0;
  for (let slot = 0; slot < 48; slot++) {
    for (let month = 0; month < 12; month++) {
      // Convert monthly total to daily average for peak calculation
      const dailyKwh = matrix[slot][month] / DAYS_PER_MONTH[month];
      if (dailyKwh > peakSlotKwh) peakSlotKwh = dailyKwh;
    }
  }
  const peakDemandKw = peakSlotKwh * 2; // kWh per 30-min slot × 2 = kW

  // Solar generation (optional)
  let solarGeneration: SolarProfile | undefined;
  if (inputs.hasSolar && (inputs.solarKwp ?? 0) > 0) {
    solarGeneration = buildSolarProfile(inputs, matrix);
  }

  return {
    inputs,
    matrix,
    annualTotalKwh,
    monthlyTotals,
    dailyProfileByMonth,
    peakDemandKw,
    solarGeneration,
  };
}

export function getNetDemandAfterSolar(profile: ConsumptionProfile): ConsumptionMatrix {
  const { matrix, solarGeneration } = profile;

  if (!solarGeneration) {
    // Return a deep copy of the consumption matrix
    return matrix.map((row) => [...row]);
  }

  const netMatrix: ConsumptionMatrix = Array.from({ length: 48 }, () => new Array(12).fill(0));
  for (let slot = 0; slot < 48; slot++) {
    for (let month = 0; month < 12; month++) {
      // Net = consumption - generation; negative = exporting
      netMatrix[slot][month] = matrix[slot][month] - solarGeneration.generationMatrix[slot][month];
    }
  }

  return netMatrix;
}

export function estimateAnnualBillWithoutBattery(
  profile: ConsumptionProfile,
  avgImportRatePence: number,
  avgExportRatePence: number,
): number {
  const netMatrix = getNetDemandAfterSolar(profile);

  let importCostPence = 0;
  let exportRevenuePence = 0;

  for (let slot = 0; slot < 48; slot++) {
    for (let month = 0; month < 12; month++) {
      const net = netMatrix[slot][month];
      if (net > 0) {
        importCostPence += net * avgImportRatePence;
      } else {
        // Negative = exporting — net is negative so negate it
        exportRevenuePence += (-net) * avgExportRatePence;
      }
    }
  }

  // Return net annual cost in pounds
  return (importCostPence - exportRevenuePence) / 100;
}
