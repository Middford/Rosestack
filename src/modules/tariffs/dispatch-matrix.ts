// ============================================================
// Dispatch Matrix Engine
//
// Optimises one day of battery operation across 48 half-hour slots.
// Each slot is assigned a dispatch action (charge / discharge / idle /
// solar_charge / saving_session), respecting physical constraints:
//   - Max charge / discharge rate × 0.5 hr = energy per slot
//   - SOC bounds (minSoc → maxSoc)
//   - Round-trip efficiency applied on the charge side
//   - G99 export limit (if applicable)
//
// Slot index mapping (UK local time):
//   index 0  = 00:00–00:30
//   index 1  = 00:30–01:00
//   ...
//   index 47 = 23:30–00:00
//
// All monetary values are in PENCE throughout. Convert to GBP at the callsite
// by dividing by 100.
//
// No external dependencies — pure TypeScript.
// ============================================================

import type { AgileSlot } from './agile-api';

// Re-export AgileSlot so tests and callers can import it from this module.
export type { AgileSlot } from './agile-api';

// Tariff types supported by the dispatch engine
export type DispatchTariffType = 'AGILE' | 'IOF' | 'FLUX';

// CAPACITY_RESERVE: fraction of usable capacity held back as a grid-stability
// reserve. Varies by tariff — IOF requires a larger reserve because the
// inverter must respond to time-of-use windows precisely; Agile is more
// flexible (half-hourly re-dispatch), so a smaller reserve suffices.
// Usage: effectiveMaxSoc = maxSoc - CAPACITY_RESERVE[tariff]
export const CAPACITY_RESERVE: Record<DispatchTariffType, number> = {
  AGILE: 0.05, // 5 % reserve — flexible half-hourly re-dispatch
  IOF: 0.20,   // 20 % reserve — strict ToU windows, larger buffer needed
  FLUX: 0.10,  // 10 % reserve — fixed peak/off-peak windows
};

// --- Public Types ---

export type SlotAction =
  | 'charge'
  | 'discharge'
  | 'idle'
  | 'solar_charge'
  | 'saving_session';

export interface DispatchSlot {
  /** 0–47: 0 = 00:00, 47 = 23:30 */
  slotIndex: number;
  /** Human-readable start time: "00:00", "00:30", … */
  timeLabel: string;
  /** Agile import rate for this slot (pence per kWh, inc VAT) */
  importRatePence: number;
  /** Agile export rate or fixed SEG/Outgoing rate (pence per kWh, inc VAT) */
  exportRatePence: number;
  action: SlotAction;
  /** Battery state of charge at the START of this slot (0–1) */
  socStart: number;
  /** Battery state of charge at the END of this slot (0–1) */
  socEnd: number;
  /**
   * Net energy transferred in kWh during this slot:
   *   positive = energy INTO battery (charging)
   *   negative = energy OUT of battery (discharging)
   */
  energyKwh: number;
  /**
   * Financial result for this slot in pence:
   *   positive = revenue received
   *   negative = cost paid
   */
  revenuePence: number;
  /** Optional annotation (e.g. "Saving Session", "Negative price — free charge") */
  notes?: string;
}

export interface DayDispatchPlan {
  /** YYYY-MM-DD */
  date: string;
  slots: DispatchSlot[];
  summary: {
    totalChargeKwh: number;
    totalDischargeKwh: number;
    /** Total money paid for imported electricity (pence, always >= 0) */
    totalImportCostPence: number;
    /** Total money received for exported electricity (pence, always >= 0) */
    totalExportRevenuePence: number;
    /** Net P&L: exportRevenue - importCost (pence, may be negative) */
    netRevenuePence: number;
    /** Full charge→discharge cycles completed (may be fractional) */
    cyclesCompleted: number;
    /** Revenue from Saving Session export (pence, always >= 0) */
    savingSessionRevenuePence: number;
  };
}

export interface SystemParams {
  /** Nameplate battery capacity (kWh) */
  totalCapacityKwh: number;
  /** Maximum inverter charge rate (kW) */
  maxChargeRateKw: number;
  /** Maximum inverter discharge rate (kW) */
  maxDischargeRateKw: number;
  /**
   * Round-trip efficiency (0–1), e.g. 0.92.
   * Applied to charging: 1 kWh into the battery costs 1/efficiency kWh from the grid.
   * Equivalently, charging 1 kWh from the grid stores efficiency kWh.
   */
  roundTripEfficiency: number;
  /** Minimum allowed SOC (0–1), e.g. 0.05 */
  minSoc: number;
  /** Maximum allowed SOC (0–1), e.g. 0.98 */
  maxSoc: number;
  /** Solar PV capacity (kWp), optional */
  solarKwp?: number;
  /**
   * G99 export limit (kW). If set, discharge is capped at this value.
   * Applies when the DNO has restricted export at the connection point.
   */
  exportLimitKw?: number;
}

export interface SavingSession {
  /** YYYY-MM-DD — must match the plan date */
  date: string;
  /** First slot index of the saving session (inclusive) */
  startSlot: number;
  /** Last slot index of the saving session (inclusive) */
  endSlot: number;
  /** Saving Session reward rate (pence per kWh of measured reduction) */
  ratePencePerKwh: number;
}

// --- Internal helpers ---

function slotLabel(index: number): string {
  const totalMinutes = index * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Clamp a value to [lo, hi] */
function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// Core Algorithm: buildDayDispatchPlan
// ============================================================

/**
 * Build the optimal dispatch plan for a single day.
 *
 * Priority order (highest to lowest):
 *   1. Saving Session slots (pre-charge + hold + discharge)
 *   2. Solar charge during daytime (slots 14–35, 07:00–17:30)
 *   3. Cheapest import / highest export pairing for normal arbitrage
 *
 * @param params          Physical system parameters
 * @param importRates     48 import rates p/kWh (index 0 = 00:00)
 * @param exportRates     48 export rates p/kWh (index 0 = 00:00)
 * @param solarGenerationKwh  48-slot array of solar generation per slot (kWh), optional
 * @param savingSession   Optional Saving Session event for this day
 * @param date            YYYY-MM-DD string for the plan
 * @returns               Fully resolved DayDispatchPlan
 */
export function buildDayDispatchPlan(
  params: SystemParams,
  importRates: number[],
  exportRates: number[],
  solarGenerationKwh?: number[],
  savingSession?: SavingSession,
  date: string = 'unknown',
  tariffType: DispatchTariffType = 'AGILE',
): DayDispatchPlan {
  // ---- Validate and normalise inputs ----
  if (importRates.length !== 48 || exportRates.length !== 48) {
    throw new Error('importRates and exportRates must each have exactly 48 elements');
  }

  const {
    totalCapacityKwh,
    maxChargeRateKw,
    maxDischargeRateKw,
    roundTripEfficiency,
    minSoc,
    exportLimitKw,
  } = params;

  // Apply tariff-specific capacity reserve on top of the system maxSoc.
  // CAPACITY_RESERVE[tariff] is held back to ensure the battery always has
  // headroom to respond without breaching physical limits.
  const maxSoc = Math.max(params.minSoc, params.maxSoc - CAPACITY_RESERVE[tariffType]);

  const effectiveDischargeRateKw = exportLimitKw
    ? Math.min(maxDischargeRateKw, exportLimitKw)
    : maxDischargeRateKw;

  // Maximum energy per 0.5-hr slot in kWh
  const maxChargePerSlot = maxChargeRateKw * 0.5;
  const maxDischargePerSlot = effectiveDischargeRateKw * 0.5;

  // Minimum / maximum stored energy (kWh) from SOC limits
  const minStoredKwh = totalCapacityKwh * minSoc;
  const maxStoredKwh = totalCapacityKwh * maxSoc;

  // ---- Initialise slot skeleton ----
  type SlotDraft = {
    slotIndex: number;
    timeLabel: string;
    importRatePence: number;
    exportRatePence: number;
    action: SlotAction;
    locked: boolean; // locked = already assigned (cannot be overwritten by greedy pass)
    notes?: string;
  };

  const drafts: SlotDraft[] = Array.from({ length: 48 }, (_, i) => ({
    slotIndex: i,
    timeLabel: slotLabel(i),
    importRatePence: round2(importRates[i] ?? 0),
    exportRatePence: round2(exportRates[i] ?? 0),
    action: 'idle' as SlotAction,
    locked: false,
  }));

  // ---- Step 1: Saving Session override (highest priority) ----

  let savingSessionPreChargeSlots: number[] = [];

  if (savingSession) {
    const { startSlot, endSlot } = savingSession;
    const sessionSlotCount = endSlot - startSlot + 1;

    // Mark session slots as saving_session and lock them
    for (let i = startSlot; i <= endSlot && i < 48; i++) {
      drafts[i]!.action = 'saving_session';
      drafts[i]!.locked = true;
      drafts[i]!.notes = `Saving Session @ ${savingSession.ratePencePerKwh}p/kWh`;
    }

    // Pre-charge: fill slots immediately before the session to reach maxSoc.
    // We need enough energy to discharge at full rate for all session slots.
    const energyNeededForSession = Math.min(
      effectiveDischargeRateKw * (sessionSlotCount * 0.5),
      (maxSoc - minSoc) * totalCapacityKwh,
    );

    // Walk backwards from startSlot - 1 to assign pre-charge slots
    let energyToPreCharge = energyNeededForSession;
    const preChargeEnd = startSlot - 1;

    // Identify candidate pre-charge slots (cheapest unlocked slots before session)
    const preChargeCandidates = drafts
      .filter(d => d.slotIndex <= preChargeEnd && !d.locked)
      .map(d => ({ index: d.slotIndex, rate: d.importRatePence }))
      .sort((a, b) => a.rate - b.rate);

    for (const candidate of preChargeCandidates) {
      if (energyToPreCharge <= 0) break;
      const slot = drafts[candidate.index]!;
      // Assign as 'charge' (will be physically resolved in SOC-tracking pass)
      slot.action = 'charge';
      slot.locked = true;
      slot.notes = 'Pre-charge for Saving Session';
      savingSessionPreChargeSlots.push(candidate.index);
      // Estimate energy this slot can contribute (coarse — refined in SOC pass)
      energyToPreCharge -= maxChargePerSlot;
    }
  }

  // ---- Step 2: Solar integration ----
  // Daytime slots 14–35 = 07:00–17:30 UTC (approx UK summer daytime)
  // In winter BST→GMT shifts this, but as a heuristic this works well enough.
  // For precise solar, the caller should provide solarGenerationKwh per slot.

  if (solarGenerationKwh && solarGenerationKwh.length === 48) {
    for (let i = 0; i < 48; i++) {
      const solar = solarGenerationKwh[i] ?? 0;
      if (solar > 0 && !drafts[i]!.locked) {
        drafts[i]!.action = 'solar_charge';
        drafts[i]!.locked = true;
        drafts[i]!.notes = `Solar: ${round2(solar)} kWh generated`;
      }
    }
  }

  // ---- Step 3: Greedy charge/discharge pairing for remaining unlocked slots ----

  // Rank unlocked slots
  const unlocked = drafts.filter(d => !d.locked);

  // For negative import prices: always charge (it's profitable — free + paid)
  for (const slot of unlocked) {
    if (slot.importRatePence < 0) {
      slot.action = 'charge';
      slot.locked = true;
      slot.notes = `Negative price: ${slot.importRatePence}p — free charge + payment`;
    }
  }

  // Remaining unlocked after negative-price assignment
  const remaining = drafts.filter(d => !d.locked);

  // Sort by import rate ascending → cheapest for charging
  const chargeByRate = [...remaining].sort(
    (a, b) => a.importRatePence - b.importRatePence,
  );
  // Sort by export rate descending → highest for discharging
  const dischargeByRate = [...remaining].sort(
    (a, b) => b.exportRatePence - a.exportRatePence,
  );

  // Pair charge and discharge slots.
  // Only take pairs where spread > 0 (profitable after round-trip losses).
  // Spread = exportRate - (importRate / efficiency)
  // We pair greedily: cheapest import with highest export, checking each pair is viable.
  const assignedIndices = new Set<number>(
    drafts.filter(d => d.locked).map(d => d.slotIndex),
  );

  let chargePtr = 0;
  let dischargePtr = 0;

  while (chargePtr < chargeByRate.length && dischargePtr < dischargeByRate.length) {
    // Advance past already-assigned slots
    while (chargePtr < chargeByRate.length && assignedIndices.has(chargeByRate[chargePtr]!.slotIndex)) {
      chargePtr++;
    }
    while (dischargePtr < dischargeByRate.length && assignedIndices.has(dischargeByRate[dischargePtr]!.slotIndex)) {
      dischargePtr++;
    }

    if (chargePtr >= chargeByRate.length || dischargePtr >= dischargeByRate.length) break;

    const chargeSlot = chargeByRate[chargePtr]!;
    const dischargeSlot = dischargeByRate[dischargePtr]!;

    // Physical constraint: charge must happen before discharge
    // (can't discharge what hasn't been charged yet).
    // If charge slot is AFTER discharge slot, skip this discharge candidate.
    if (chargeSlot.slotIndex >= dischargeSlot.slotIndex) {
      // Try next discharge candidate
      dischargePtr++;
      continue;
    }

    // Profitability check (accounting for round-trip efficiency)
    const effectiveImportCost = chargeSlot.importRatePence / roundTripEfficiency;
    const spread = dischargeSlot.exportRatePence - effectiveImportCost;

    if (spread <= 0) {
      // No profitable pairs remain — stop pairing
      break;
    }

    // Assign this pair
    chargeSlot.action = 'charge';
    chargeSlot.locked = true;
    dischargeSlot.action = 'discharge';
    dischargeSlot.locked = true;
    assignedIndices.add(chargeSlot.slotIndex);
    assignedIndices.add(dischargeSlot.slotIndex);

    chargePtr++;
    dischargePtr++;
  }

  // All remaining unlocked slots stay 'idle'.

  // ---- Step 4: SOC tracking pass ----
  // Walk slots 0→47, apply each action, enforce physical constraints,
  // track actual SOC, and compute per-slot revenue.

  const resolvedSlots: DispatchSlot[] = [];
  let soc = params.minSoc; // start the day at minimum SOC

  // For Saving Session: track total session revenue separately
  let savingSessionRevenuePence = 0;

  for (let i = 0; i < 48; i++) {
    const draft = drafts[i]!;
    const socStart = round4(soc);
    const storedKwh = soc * totalCapacityKwh;

    let action = draft.action;
    let energyKwh = 0;
    let revenuePence = 0;
    let notes = draft.notes;

    switch (action) {
      case 'charge':
      case 'solar_charge': {
        // How much energy can we physically push in?
        const headroom = maxStoredKwh - storedKwh; // kWh of space in battery
        const solarAvailable = action === 'solar_charge'
          ? (solarGenerationKwh?.[i] ?? maxChargePerSlot)
          : maxChargePerSlot;
        const rateLimit = Math.min(maxChargePerSlot, solarAvailable);

        // For solar_charge, energy into battery is solar generation (already generated)
        // For grid charge, energy drawn from grid = energy stored / efficiency
        let energyIntoGrid: number;
        let energyIntoBattery: number;

        if (action === 'solar_charge') {
          // Solar energy does not pass through the meter in the same way
          // Still limited by inverter and headroom
          energyIntoBattery = clamp(rateLimit, 0, headroom);
          energyIntoGrid = 0; // no grid import cost for solar
        } else {
          // Grid charge: energy drawn from grid × efficiency = energy stored
          const maxFromGrid = rateLimit; // kWh drawn from grid
          energyIntoBattery = clamp(maxFromGrid * roundTripEfficiency, 0, headroom);
          energyIntoGrid = energyIntoBattery / roundTripEfficiency;
        }

        if (energyIntoBattery < 0.001) {
          // Battery is full — downgrade to idle
          action = 'idle';
          energyKwh = 0;
          revenuePence = 0;
        } else {
          energyKwh = round4(energyIntoBattery); // positive = energy added to battery
          const gridCostPence = draft.importRatePence * energyIntoGrid;

          if (draft.importRatePence < 0) {
            // Negative rate: grid PAYS us to take electricity
            revenuePence = round2(-gridCostPence); // becomes positive (income)
          } else {
            revenuePence = round2(-gridCostPence); // cost = negative revenue
          }

          soc = clamp((storedKwh + energyIntoBattery) / totalCapacityKwh, 0, 1);
        }
        break;
      }

      case 'discharge':
      case 'saving_session': {
        // How much can we physically push out?
        const available = storedKwh - minStoredKwh; // kWh available above floor
        const rateLimit = maxDischargePerSlot;
        const energyFromBattery = clamp(rateLimit, 0, available);

        if (energyFromBattery < 0.001) {
          // Battery is empty — downgrade to idle
          action = 'idle';
          energyKwh = 0;
          revenuePence = 0;
          if (notes?.includes('Saving Session')) {
            notes = 'Saving Session — insufficient SOC (battery depleted)';
          }
        } else {
          energyKwh = round4(-energyFromBattery); // negative = energy leaves battery

          if (action === 'saving_session' && savingSession) {
            // For Saving Session, revenue is based on the session rate applied to
            // the measured reduction (household baseline + export kWh).
            // We track this separately; the export itself also earns export rate
            // via the normal export mechanism.
            const HOUSEHOLD_BASELINE_KWH = 1.0 / 2; // per half-hour slot (~0.5 kWh)
            const reductionKwh = HOUSEHOLD_BASELINE_KWH + energyFromBattery;
            const ssRevenuePence = reductionKwh * savingSession.ratePencePerKwh;
            // Also earn normal export rate on exported energy
            const normalExportPence = energyFromBattery * draft.exportRatePence;
            revenuePence = round2(ssRevenuePence + normalExportPence);
            savingSessionRevenuePence += round2(ssRevenuePence);
          } else {
            // Normal discharge: earn export rate on energy exported
            revenuePence = round2(energyFromBattery * draft.exportRatePence);
          }

          soc = clamp((storedKwh - energyFromBattery) / totalCapacityKwh, 0, 1);
        }
        break;
      }

      case 'idle':
      default:
        // No energy flow, no cost or revenue
        energyKwh = 0;
        revenuePence = 0;
        soc = soc; // unchanged
        break;
    }

    const socEnd = round4(soc);

    resolvedSlots.push({
      slotIndex: i,
      timeLabel: draft.timeLabel,
      importRatePence: draft.importRatePence,
      exportRatePence: draft.exportRatePence,
      action,
      socStart,
      socEnd,
      energyKwh,
      revenuePence,
      notes,
    });
  }

  // ---- Step 5: Build summary ----

  let totalChargeKwh = 0;
  let totalDischargeKwh = 0;
  let totalImportCostPence = 0;
  let totalExportRevenuePence = 0;

  for (const slot of resolvedSlots) {
    if (slot.energyKwh > 0) {
      totalChargeKwh += slot.energyKwh;
      if (slot.action === 'charge') {
        // Import cost = energy drawn from grid (reversed from stored kWh)
        const gridKwh = slot.energyKwh / roundTripEfficiency;
        totalImportCostPence += Math.max(0, gridKwh * slot.importRatePence);
      }
    } else if (slot.energyKwh < 0) {
      totalDischargeKwh += Math.abs(slot.energyKwh);
      totalExportRevenuePence += Math.max(0, slot.revenuePence);
    }
  }

  // Net revenue across all slots
  const netRevenuePence = round2(
    resolvedSlots.reduce((sum, s) => sum + s.revenuePence, 0),
  );

  // Cycle count: one full cycle = totalCapacityKwh charged and discharged
  const cyclesCompleted = round4(
    totalCapacityKwh > 0
      ? Math.min(totalChargeKwh, totalDischargeKwh) / totalCapacityKwh
      : 0,
  );

  return {
    date,
    slots: resolvedSlots,
    summary: {
      totalChargeKwh: round4(totalChargeKwh),
      totalDischargeKwh: round4(totalDischargeKwh),
      totalImportCostPence: round2(totalImportCostPence),
      totalExportRevenuePence: round2(totalExportRevenuePence),
      netRevenuePence,
      cyclesCompleted,
      savingSessionRevenuePence: round2(savingSessionRevenuePence),
    },
  };
}

// ============================================================
// Annual Revenue Estimation from 48-Slot Average Profile
// ============================================================

/**
 * Estimate annual dispatch revenue from the average 48-slot price profile.
 *
 * Uses the same greedy pairing algorithm as buildDayDispatchPlan but operates
 * on the statistical average profile (e.g. from getAverageProfileByHalfHour)
 * rather than a specific day's prices. Multiplies the resulting daily net
 * revenue by 365 to get an annual estimate.
 *
 * @param params          System physical parameters
 * @param agileProfile48  48-element array of average import p/kWh per slot
 * @param exportProfile48 48-element array of average export p/kWh per slot
 * @returns               Estimated annual net revenue in pence
 */
export function calculateAnnualDispatchRevenue(
  params: SystemParams,
  agileProfile48: number[],
  exportProfile48: number[],
): number {
  if (agileProfile48.length !== 48 || exportProfile48.length !== 48) {
    throw new Error('Both profile arrays must have exactly 48 elements');
  }

  // Build a representative day plan using the average profile
  const dayPlan = buildDayDispatchPlan(
    params,
    agileProfile48,
    exportProfile48,
    undefined,
    undefined,
    'average-profile',
  );

  const dailyRevenuePence = dayPlan.summary.netRevenuePence;
  return round2(dailyRevenuePence * 365);
}

// ============================================================
// Days with Negative Pricing
// ============================================================

/**
 * Count the number of calendar days in the dataset that contain at least
 * one slot with a negative import rate.
 * Negative prices occur when there is surplus renewable generation —
 * grid pays consumers to take electricity, making them ideal free-charge
 * opportunities.
 */
export function calculateDaysWithNegativePricing(rates: AgileSlot[]): number {
  const datesWithNegative = new Set<string>();

  for (const slot of rates) {
    if (slot.valueIncVat < 0) {
      // Use just the date portion of the ISO string (UTC date)
      const datePart = slot.validFrom.slice(0, 10);
      datesWithNegative.add(datePart);
    }
  }

  return datesWithNegative.size;
}

// ============================================================
// Optimal Charge Windows
// ============================================================

/**
 * Identify the two cheapest charge windows in a 48-slot daily profile.
 *
 * Returns:
 *   morningCharge — typically overnight/early morning cheap window
 *   eveningCharge — post-solar afternoon dip (if present in profile)
 *
 * Each window is a [startSlot, endSlot] tuple (inclusive).
 * Algorithm: find the two lowest-cost contiguous slot ranges, separated
 * by at least 6 slots (3 hours) so they represent genuinely distinct windows.
 *
 * @param profile48  48 average import p/kWh values
 */
export function getOptimalChargeWindows(
  profile48: number[],
): { morningCharge: [number, number]; eveningCharge: [number, number] } {
  if (profile48.length !== 48) {
    throw new Error('profile48 must have exactly 48 elements');
  }

  // Find the single cheapest slot
  let cheapestIdx = 0;
  for (let i = 1; i < 48; i++) {
    if ((profile48[i] ?? Infinity) < (profile48[cheapestIdx] ?? Infinity)) {
      cheapestIdx = i;
    }
  }

  // Expand the cheapest window outward while the rate stays within 20% of the minimum
  const minRate = profile48[cheapestIdx]!;
  const threshold = minRate + Math.abs(minRate) * 0.2 + 2; // 20% + 2p tolerance

  const window1 = expandWindow(profile48, cheapestIdx, threshold);

  // Find the cheapest slot outside the first window (with a gap of >= 6 slots)
  const MINIMUM_GAP = 6;
  let secondIdx = -1;
  let secondRate = Infinity;

  for (let i = 0; i < 48; i++) {
    // Must be outside the first window plus gap
    const outsideWindow =
      i < Math.max(0, window1[0] - MINIMUM_GAP) ||
      i > Math.min(47, window1[1] + MINIMUM_GAP);
    if (outsideWindow && (profile48[i] ?? Infinity) < secondRate) {
      secondRate = profile48[i]!;
      secondIdx = i;
    }
  }

  let window2: [number, number];
  if (secondIdx >= 0) {
    const threshold2 = secondRate + Math.abs(secondRate) * 0.2 + 2;
    window2 = expandWindow(profile48, secondIdx, threshold2);
  } else {
    // Fallback: default off-peak window (00:00–06:00 = slots 0–11)
    window2 = [0, 11];
  }

  // Assign morning vs evening based on slot index
  // "Morning" = earlier in the day; conventional overnight trough is slots 0–11
  const [windowA, windowB] =
    window1[0] <= window2[0]
      ? [window1, window2]
      : [window2, window1];

  return {
    morningCharge: windowA,
    eveningCharge: windowB,
  };
}

/**
 * Expand a window from a centre index while the profile rate stays below
 * a given threshold. Stays within [0, 47].
 */
function expandWindow(
  profile: number[],
  centreIdx: number,
  threshold: number,
): [number, number] {
  let lo = centreIdx;
  let hi = centreIdx;

  // Expand left
  while (lo > 0 && (profile[lo - 1] ?? Infinity) <= threshold) {
    lo--;
  }
  // Expand right
  while (hi < 47 && (profile[hi + 1] ?? Infinity) <= threshold) {
    hi++;
  }

  return [lo, hi];
}
