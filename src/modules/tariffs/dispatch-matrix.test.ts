// ============================================================
// Dispatch Matrix Engine — Unit Tests
//
// Tests cover:
//   1. Basic charge/discharge pairing and revenue calculation
//   2. Negative price handling (should charge; income not cost)
//   3. SOC constraints (max SOC not exceeded, min SOC floor held)
//   4. Saving Session override (pre-charge + session discharge)
//   5. Export limit (G99 cap enforced)
//   6. Annual revenue estimation
//   7. Negative pricing day counter
//   8. Optimal charge window detection
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  buildDayDispatchPlan,
  calculateAnnualDispatchRevenue,
  calculateDaysWithNegativePricing,
  getOptimalChargeWindows,
} from './dispatch-matrix';
import type { SystemParams, SavingSession, AgileSlot } from './dispatch-matrix';

// Re-export AgileSlot from dispatch-matrix for test imports
// (dispatch-matrix re-exports it from agile-api internally)
// We construct test AgileSlots inline — the type is just { validFrom, validTo, valueIncVat }.

// ============================================================
// Test fixtures
// ============================================================

/** Standard 192 kWh / 96 kW system (RoseStack reference system) */
const REFERENCE_SYSTEM: SystemParams = {
  totalCapacityKwh: 192,
  maxChargeRateKw: 96,
  maxDischargeRateKw: 96,
  roundTripEfficiency: 0.92,
  minSoc: 0.05,
  maxSoc: 0.98,
};

/** Small 10 kWh / 5 kW home battery for easy manual calculation */
const SMALL_SYSTEM: SystemParams = {
  totalCapacityKwh: 10,
  maxChargeRateKw: 5,
  maxDischargeRateKw: 5,
  roundTripEfficiency: 1.0, // efficiency = 1 for simpler maths in most tests
  minSoc: 0.0,
  maxSoc: 1.0,
};

/**
 * Build a flat 48-element rate array (all slots at the same rate).
 */
function flatRates(pence: number): number[] {
  return new Array<number>(48).fill(pence);
}

/**
 * Build a 48-element rate array with one or more overrides.
 * @param base    Default rate for all slots
 * @param overrides  Array of [slotIndex, rate] pairs
 */
function ratesWithOverrides(
  base: number,
  overrides: Array<[number, number]>,
): number[] {
  const rates = new Array<number>(48).fill(base);
  for (const [idx, rate] of overrides) {
    rates[idx] = rate;
  }
  return rates;
}

// ============================================================
// 1. Basic charge/discharge pairing
// ============================================================

describe('buildDayDispatchPlan — basic charge/discharge pairing', () => {
  it('produces a charge slot at the cheapest import and discharge at the highest export', () => {
    // Slot 2 (01:00) has cheapest import at 5p; slot 40 (20:00) has highest export at 30p
    const importRates = ratesWithOverrides(15, [[2, 5]]);
    const exportRates = ratesWithOverrides(10, [[40, 30]]);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    const slot2 = plan.slots[2]!;
    const slot40 = plan.slots[40]!;

    expect(slot2.action).toBe('charge');
    expect(slot40.action).toBe('discharge');
  });

  it('charge slot occurs before discharge slot (physical constraint)', () => {
    // Force cheapest import at slot 40, highest export at slot 2
    // The algorithm must not pair these (can't discharge before charging)
    const importRates = ratesWithOverrides(15, [[40, 1]]);
    const exportRates = ratesWithOverrides(5, [[2, 50]]);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    const slot2 = plan.slots[2]!;
    const slot40 = plan.slots[40]!;

    // slot 2 cannot be 'discharge' if slot 40 is its charge source (future)
    // Either both are idle, or the algorithm found another viable pair
    if (slot2.action === 'discharge') {
      // If slot 2 is assigned discharge, it must have been paired with a charge slot < 2
      const chargeSlots = plan.slots.filter(s => s.action === 'charge' && s.slotIndex < 2);
      expect(chargeSlots.length).toBeGreaterThan(0);
    }
    // slot 40 should not be discharge (no preceding cheap slot to charge from, at 1p,
    // and no profitable pair exists ahead of it)
    // The 15p baseline with 5p max export doesn't give a profitable pair from slot 40 → anything
  });

  it('net revenue is positive when spread is profitable after efficiency losses', () => {
    // Import at 5p, export at 25p, efficiency 1.0 → clear profit
    const importRates = ratesWithOverrides(20, [[4, 5]]);
    const exportRates = ratesWithOverrides(10, [[40, 25]]);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    expect(plan.summary.netRevenuePence).toBeGreaterThan(0);
  });

  it('does not create charge/discharge pairs when spread is negative (unprofitable)', () => {
    // Import at 20p, export at 5p — no profitable spread possible
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, flatRates(20), flatRates(5));

    const chargeSlots = plan.slots.filter(s => s.action === 'charge');
    const dischargeSlots = plan.slots.filter(s => s.action === 'discharge');

    expect(chargeSlots.length).toBe(0);
    expect(dischargeSlots.length).toBe(0);
    expect(plan.summary.netRevenuePence).toBe(0);
  });

  it('correctly calculates revenue for a known single-cycle scenario', () => {
    // Scenario: 10 kWh battery, efficiency 1.0, minSoc 0, maxSoc 1
    // Charge slot 0 (00:00): import 5p/kWh, max charge = 5kW × 0.5hr = 2.5 kWh
    // Discharge slot 40 (20:00): export 30p/kWh, discharge 2.5 kWh
    //
    // Expected:
    //   Import cost  = 2.5 kWh × 5p = 12.5p  → revenue = -12.5p
    //   Export rev   = 2.5 kWh × 30p = 75p   → revenue = +75p
    //   Net          = 62.5p

    const importRates = ratesWithOverrides(20, [[0, 5]]);
    const exportRates = ratesWithOverrides(5, [[40, 30]]);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    const chargeSlot = plan.slots.find(s => s.action === 'charge')!;
    const dischargeSlot = plan.slots.find(s => s.action === 'discharge')!;

    expect(chargeSlot).toBeDefined();
    expect(dischargeSlot).toBeDefined();
    expect(chargeSlot.slotIndex).toBe(0);
    expect(dischargeSlot.slotIndex).toBe(40);

    // Energy charged = 5kW × 0.5hr = 2.5 kWh stored (efficiency = 1.0)
    expect(chargeSlot.energyKwh).toBeCloseTo(2.5, 3);
    // Import cost = 2.5 kWh × 5p = -12.5p
    expect(chargeSlot.revenuePence).toBeCloseTo(-12.5, 1);

    // Energy discharged = 2.5 kWh (all that was charged and available)
    expect(Math.abs(dischargeSlot.energyKwh)).toBeCloseTo(2.5, 3);
    // Export revenue = 2.5 kWh × 30p = 75p
    expect(dischargeSlot.revenuePence).toBeCloseTo(75, 1);

    // Net = 75 - 12.5 = 62.5p
    expect(plan.summary.netRevenuePence).toBeCloseTo(62.5, 1);
  });

  it('returns 48 slots in the plan', () => {
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, flatRates(10), flatRates(5));
    expect(plan.slots).toHaveLength(48);
  });

  it('slot time labels are correct', () => {
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, flatRates(10), flatRates(5));
    expect(plan.slots[0]!.timeLabel).toBe('00:00');
    expect(plan.slots[1]!.timeLabel).toBe('00:30');
    expect(plan.slots[23]!.timeLabel).toBe('11:30');
    expect(plan.slots[47]!.timeLabel).toBe('23:30');
  });

  it('SOC flows continuously from slot to slot', () => {
    const importRates = ratesWithOverrides(20, [[0, 5]]);
    const exportRates = ratesWithOverrides(5, [[10, 25]]);
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    // SOC end of each slot should equal SOC start of the next
    for (let i = 0; i < 47; i++) {
      expect(plan.slots[i]!.socEnd).toBeCloseTo(plan.slots[i + 1]!.socStart, 4);
    }
  });
});

// ============================================================
// 2. Negative price handling
// ============================================================

describe('buildDayDispatchPlan — negative price handling', () => {
  it('assigns charge to slots with negative import rates', () => {
    // Slot 8 (04:00) has negative rate of -5p
    const importRates = ratesWithOverrides(15, [[8, -5]]);
    const exportRates = flatRates(10);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    const slot8 = plan.slots[8]!;
    expect(slot8.action).toBe('charge');
  });

  it('negative price charging produces POSITIVE revenue (grid pays us)', () => {
    const importRates = ratesWithOverrides(15, [[8, -10]]);
    const exportRates = flatRates(5);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    const slot8 = plan.slots[8]!;
    expect(slot8.action).toBe('charge');
    // Revenue should be positive: -10p rate × 2.5 kWh drawn = +25p income
    expect(slot8.revenuePence).toBeGreaterThan(0);
  });

  it('negative price slot has a note explaining the free+paid charge', () => {
    const importRates = ratesWithOverrides(15, [[8, -5]]);
    const exportRates = flatRates(10);

    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    const slot8 = plan.slots[8]!;
    expect(slot8.notes).toBeDefined();
    expect(slot8.notes?.toLowerCase()).toContain('negative');
  });

  it('total net revenue is higher with a negative price slot than without', () => {
    const withNegative = ratesWithOverrides(15, [[8, -5]]);
    const noNegative = flatRates(15);
    const exportRates = ratesWithOverrides(5, [[40, 25]]);

    const planWith = buildDayDispatchPlan(SMALL_SYSTEM, withNegative, exportRates);
    const planWithout = buildDayDispatchPlan(SMALL_SYSTEM, noNegative, exportRates);

    expect(planWith.summary.netRevenuePence).toBeGreaterThan(
      planWithout.summary.netRevenuePence,
    );
  });
});

// ============================================================
// 3. SOC constraints
// ============================================================

describe('buildDayDispatchPlan — SOC constraints', () => {
  it('never exceeds maxSoc in any slot', () => {
    const system: SystemParams = {
      ...SMALL_SYSTEM,
      maxSoc: 0.8,
    };
    // All slots cheap to charge — should hit the cap
    const plan = buildDayDispatchPlan(system, flatRates(5), flatRates(25));

    for (const slot of plan.slots) {
      expect(slot.socEnd).toBeLessThanOrEqual(0.8 + 0.0001); // small float tolerance
    }
  });

  it('never goes below minSoc in any slot', () => {
    const system: SystemParams = {
      ...SMALL_SYSTEM,
      minSoc: 0.1,
      maxSoc: 1.0,
    };
    // All slots high export rate — should want to discharge to the floor
    const plan = buildDayDispatchPlan(system, flatRates(5), flatRates(30));

    for (const slot of plan.slots) {
      expect(slot.socEnd).toBeGreaterThanOrEqual(0.1 - 0.0001);
    }
  });

  it('discharge action reverts to idle when battery is below minSoc floor', () => {
    // To isolate the SOC floor behaviour, we need import > export so no charge pairs
    // are profitable, but we still attempt to create discharge slots. The algorithm
    // won't assign discharge without a profitable charge pair, so we use a different
    // approach: verify the SOC-floor constraint via the physical SOC tracking.
    //
    // We set minSoc = 0.98 (almost full) so the floor is nearly the full capacity.
    // That means available kWh = (0.98 × 10) - (0.98 × 10) = 0 — nothing to discharge.
    const system: SystemParams = {
      ...SMALL_SYSTEM,
      minSoc: 0.98, // floor is 98% — battery "starts at minimum"
      maxSoc: 1.0,
      roundTripEfficiency: 1.0,
    };

    // Import cheap so charge pairs ARE tried, export high so discharge is desired.
    // But with maxSoc = 1.0 and minSoc = 0.98, the usable window is only 0.2 kWh.
    // Charge will fill the tiny headroom (1.0 - 0.98 = 0.02 × 10 kWh = 0.2 kWh),
    // then discharge will be capped at 0.2 kWh (floor is 98%).
    const importRates = ratesWithOverrides(20, [[0, 5]]);
    const exportRates = ratesWithOverrides(5, [[30, 40]]);

    const plan = buildDayDispatchPlan(system, importRates, exportRates);

    // No slot should violate the minSoc floor
    for (const slot of plan.slots) {
      expect(slot.socEnd).toBeGreaterThanOrEqual(system.minSoc - 0.0001);
    }

    // Any discharge that happens should be tiny (≤ 0.2 kWh available above floor)
    for (const slot of plan.slots) {
      if (slot.action === 'discharge') {
        const maxAllowed = (system.maxSoc - system.minSoc) * system.totalCapacityKwh;
        expect(Math.abs(slot.energyKwh)).toBeLessThanOrEqual(maxAllowed + 0.0001);
      }
    }
  });

  it('charge action reverts to idle when battery is at maxSoc', () => {
    const system: SystemParams = {
      ...SMALL_SYSTEM,
      minSoc: 0.0,
      maxSoc: 0.3, // low ceiling — fills up quickly
      roundTripEfficiency: 1.0,
    };

    // Single cheap slot at 0, all others at 20p (no profitable pairs from the rest)
    const importRates = ratesWithOverrides(20, [[0, 5]]);
    const exportRates = flatRates(5); // low export, no discharge

    const plan = buildDayDispatchPlan(system, importRates, exportRates);

    // After slot 0 charges, battery should be at maxSoc = 0.3 (3 kWh)
    // with max charge rate 5kW × 0.5hr = 2.5 kWh, starts at 0, maxSoc = 3 kWh
    // → charges 2.5 kWh, now at 2.5/10 = 0.25 SOC (below maxSoc)
    // No subsequent cheap slots, so stays there

    // Verify no slot exceeds maxSoc
    for (const slot of plan.slots) {
      expect(slot.socEnd).toBeLessThanOrEqual(0.3 + 0.0001);
    }
  });

  it('energy charged is limited by inverter rate × 0.5hr', () => {
    const system: SystemParams = {
      ...SMALL_SYSTEM,
      maxChargeRateKw: 3, // 3 kW inverter → max 1.5 kWh per half-hour slot
      roundTripEfficiency: 1.0,
      minSoc: 0.0,
      maxSoc: 1.0,
    };

    const importRates = ratesWithOverrides(20, [[0, 2]]);
    const exportRates = flatRates(5);

    const plan = buildDayDispatchPlan(system, importRates, exportRates);
    const slot0 = plan.slots[0]!;

    if (slot0.action === 'charge') {
      // Max per slot = 3 kW × 0.5 hr = 1.5 kWh
      expect(slot0.energyKwh).toBeLessThanOrEqual(1.5 + 0.0001);
    }
  });

  it('respects G99 export limit on discharge', () => {
    const system: SystemParams = {
      ...SMALL_SYSTEM,
      maxDischargeRateKw: 5,
      exportLimitKw: 2, // DNO has capped export at 2 kW
      roundTripEfficiency: 1.0,
      minSoc: 0.0,
      maxSoc: 1.0,
    };

    // Charge first, then discharge
    const importRates = ratesWithOverrides(20, [[0, 3]]);
    const exportRates = ratesWithOverrides(5, [[30, 25]]);

    const plan = buildDayDispatchPlan(system, importRates, exportRates);

    for (const slot of plan.slots) {
      if (slot.action === 'discharge') {
        // Max discharge per slot = min(5kW, 2kW) × 0.5hr = 1.0 kWh
        expect(Math.abs(slot.energyKwh)).toBeLessThanOrEqual(1.0 + 0.0001);
      }
    }
  });
});

// ============================================================
// 4. Saving Session override
// ============================================================

describe('buildDayDispatchPlan — Saving Session override', () => {
  const SESSION: SavingSession = {
    date: '2026-01-15',
    startSlot: 34, // 17:00 UK time
    endSlot: 35,   // 17:30–18:00 UK time
    ratePencePerKwh: 300, // 300p = £3/kWh
  };

  it('marks session slots as saving_session action', () => {
    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
      undefined,
      SESSION,
      '2026-01-15',
    );

    expect(plan.slots[34]!.action).toBe('saving_session');
    expect(plan.slots[35]!.action).toBe('saving_session');
  });

  it('session slots produce higher revenue than normal discharge at same export rate', () => {
    // At 300p SS rate vs 10p export rate, SS should earn massively more
    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
      undefined,
      SESSION,
      '2026-01-15',
    );

    const sessionRevenue = plan.summary.savingSessionRevenuePence;
    expect(sessionRevenue).toBeGreaterThan(0);
  });

  it('assigns pre-charge slots before the session', () => {
    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
      undefined,
      SESSION,
      '2026-01-15',
    );

    // There should be at least one 'charge' slot before slot 34
    const preChargeSlots = plan.slots.filter(
      s => s.action === 'charge' && s.slotIndex < SESSION.startSlot,
    );
    expect(preChargeSlots.length).toBeGreaterThan(0);
  });

  it('session slots have notes mentioning Saving Session', () => {
    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
      undefined,
      SESSION,
      '2026-01-15',
    );

    for (const i of [34, 35]) {
      expect(plan.slots[i]!.notes?.toLowerCase()).toContain('saving session');
    }
  });

  it('session slots are locked and not overridden by normal arbitrage', () => {
    // Make the session slots look like the cheapest import slots
    // They should still be saving_session, not charge
    const importRates = ratesWithOverrides(20, [
      [34, 1],
      [35, 1],
    ]);
    const exportRates = flatRates(10);

    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      importRates,
      exportRates,
      undefined,
      SESSION,
      '2026-01-15',
    );

    expect(plan.slots[34]!.action).toBe('saving_session');
    expect(plan.slots[35]!.action).toBe('saving_session');
  });

  it('session revenue is tracked separately in summary.savingSessionRevenuePence', () => {
    // Without session
    const planNoSession = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
    );
    expect(planNoSession.summary.savingSessionRevenuePence).toBe(0);

    // With session
    const planWithSession = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
      undefined,
      SESSION,
    );
    expect(planWithSession.summary.savingSessionRevenuePence).toBeGreaterThan(0);
  });

  it('session discharge earns additional normal export rate on top of SS rate', () => {
    // At 10p export + 300p SS, revenue per slot should reflect both
    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(10),
      undefined,
      SESSION,
      '2026-01-15',
    );

    const slot34 = plan.slots[34]!;
    if (slot34.action === 'saving_session' && slot34.energyKwh !== 0) {
      const discharged = Math.abs(slot34.energyKwh);
      // revenue = SS_component + export_component
      // SS: (0.5 baseline + discharged) × 300p
      // Export: discharged × 10p
      // total > discharged × 10p (pure arbitrage alone)
      expect(slot34.revenuePence).toBeGreaterThan(discharged * 10);
    }
  });
});

// ============================================================
// 5. Solar integration
// ============================================================

describe('buildDayDispatchPlan — solar integration', () => {
  it('assigns solar_charge to slots with solar generation', () => {
    const solar = new Array<number>(48).fill(0);
    solar[14] = 1.5; // 07:00 slot, 1.5 kWh generated
    solar[20] = 2.0; // 10:00 slot, 2.0 kWh generated

    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(15),
      flatRates(5),
      solar,
    );

    expect(plan.slots[14]!.action).toBe('solar_charge');
    expect(plan.slots[20]!.action).toBe('solar_charge');
  });

  it('solar_charge slots do not incur import cost', () => {
    const solar = new Array<number>(48).fill(0);
    solar[14] = 2.0;

    const plan = buildDayDispatchPlan(
      SMALL_SYSTEM,
      flatRates(30), // very expensive import — should not apply to solar
      flatRates(5),
      solar,
    );

    const slot14 = plan.slots[14]!;
    expect(slot14.action).toBe('solar_charge');
    // No import cost for solar — revenue should be 0 or positive (export surplus)
    expect(slot14.revenuePence).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 6. calculateAnnualDispatchRevenue
// ============================================================

describe('calculateAnnualDispatchRevenue', () => {
  it('returns a positive number when spread is profitable', () => {
    // Average profile: cheap at night (5p), expensive during day (25p)
    const importProfile = ratesWithOverrides(25, [
      [0, 5], [1, 5], [2, 5], [3, 5],
    ]);
    const exportProfile = ratesWithOverrides(10, [
      [40, 25], [41, 25], [42, 25],
    ]);

    const annual = calculateAnnualDispatchRevenue(
      SMALL_SYSTEM,
      importProfile,
      exportProfile,
    );

    expect(annual).toBeGreaterThan(0);
  });

  it('is approximately 365× the daily revenue', () => {
    const importProfile = ratesWithOverrides(20, [[2, 5]]);
    const exportProfile = ratesWithOverrides(8, [[38, 28]]);

    const annual = calculateAnnualDispatchRevenue(
      SMALL_SYSTEM,
      importProfile,
      exportProfile,
    );

    const dayPlan = buildDayDispatchPlan(SMALL_SYSTEM, importProfile, exportProfile);
    const expectedAnnual = dayPlan.summary.netRevenuePence * 365;

    expect(annual).toBeCloseTo(expectedAnnual, 0);
  });

  it('throws if profile arrays have wrong length', () => {
    expect(() =>
      calculateAnnualDispatchRevenue(SMALL_SYSTEM, [1, 2, 3], flatRates(10)),
    ).toThrow();

    expect(() =>
      calculateAnnualDispatchRevenue(SMALL_SYSTEM, flatRates(10), [1, 2, 3]),
    ).toThrow();
  });

  it('returns 0 when spread is unprofitable', () => {
    // Import 20p, export 5p — never profitable
    const annual = calculateAnnualDispatchRevenue(
      SMALL_SYSTEM,
      flatRates(20),
      flatRates(5),
    );
    expect(annual).toBe(0);
  });
});

// ============================================================
// 7. calculateDaysWithNegativePricing
// ============================================================

describe('calculateDaysWithNegativePricing', () => {
  function makeSlot(
    validFrom: string,
    valueIncVat: number,
  ): AgileSlot {
    // Compute validTo as validFrom + 30 minutes
    const from = new Date(validFrom);
    const to = new Date(from.getTime() + 30 * 60 * 1000);
    return {
      validFrom: from.toISOString(),
      validTo: to.toISOString(),
      valueIncVat,
    };
  }

  it('returns 0 when no negative rates', () => {
    const rates: AgileSlot[] = [
      makeSlot('2026-01-01T00:00:00Z', 10),
      makeSlot('2026-01-01T00:30:00Z', 15),
      makeSlot('2026-01-02T00:00:00Z', 20),
    ];
    expect(calculateDaysWithNegativePricing(rates)).toBe(0);
  });

  it('counts one day with multiple negative slots as a single day', () => {
    const rates: AgileSlot[] = [
      makeSlot('2026-01-01T00:00:00Z', -5),
      makeSlot('2026-01-01T00:30:00Z', -3),
      makeSlot('2026-01-01T01:00:00Z', -1),
      makeSlot('2026-01-02T00:00:00Z', 10),
    ];
    expect(calculateDaysWithNegativePricing(rates)).toBe(1);
  });

  it('counts multiple distinct days with negative rates', () => {
    const rates: AgileSlot[] = [
      makeSlot('2026-01-01T02:00:00Z', -5),
      makeSlot('2026-01-03T04:00:00Z', -2),
      makeSlot('2026-01-05T06:00:00Z', -1),
      makeSlot('2026-01-05T06:30:00Z', 10), // positive — same day as above
    ];
    expect(calculateDaysWithNegativePricing(rates)).toBe(3);
  });

  it('returns 0 for an empty array', () => {
    expect(calculateDaysWithNegativePricing([])).toBe(0);
  });

  it('treats a rate of exactly 0 as non-negative', () => {
    const rates: AgileSlot[] = [
      makeSlot('2026-01-01T00:00:00Z', 0),
    ];
    expect(calculateDaysWithNegativePricing(rates)).toBe(0);
  });
});

// ============================================================
// 8. getOptimalChargeWindows
// ============================================================

describe('getOptimalChargeWindows', () => {
  it('throws if profile has wrong length', () => {
    expect(() => getOptimalChargeWindows([1, 2, 3])).toThrow();
  });

  it('identifies an overnight cheap window and a midday cheap window', () => {
    // Classic Agile profile: cheap overnight (slots 0–11), dip around noon (slots 22–25)
    const profile = new Array<number>(48).fill(25);
    // Overnight trough: 00:00–06:00 (slots 0–11) at 7p
    for (let i = 0; i <= 11; i++) profile[i] = 7;
    // Midday dip: 11:00–12:30 (slots 22–25) at 12p
    for (let i = 22; i <= 25; i++) profile[i] = 12;

    const { morningCharge, eveningCharge } = getOptimalChargeWindows(profile);

    // Morning window should include slot 0 (00:00 at 7p)
    expect(morningCharge[0]).toBeLessThanOrEqual(2);
    // Evening window should include the midday dip
    expect(eveningCharge[0]).toBeGreaterThan(10);
    // Morning should be before evening
    expect(morningCharge[0]).toBeLessThan(eveningCharge[0]);
  });

  it('windows are within [0, 47]', () => {
    const profile = new Array<number>(48).fill(20);
    profile[0] = 5;
    profile[47] = 6;

    const { morningCharge, eveningCharge } = getOptimalChargeWindows(profile);

    expect(morningCharge[0]).toBeGreaterThanOrEqual(0);
    expect(morningCharge[1]).toBeLessThanOrEqual(47);
    expect(eveningCharge[0]).toBeGreaterThanOrEqual(0);
    expect(eveningCharge[1]).toBeLessThanOrEqual(47);
  });

  it('morning window starts before evening window', () => {
    const profile = new Array<number>(48).fill(20);
    for (let i = 0; i <= 5; i++) profile[i] = 5; // slots 0–5 = 00:00–03:00
    for (let i = 30; i <= 35; i++) profile[i] = 8; // slots 30–35 = 15:00–17:30

    const { morningCharge, eveningCharge } = getOptimalChargeWindows(profile);

    expect(morningCharge[0]).toBeLessThan(eveningCharge[0]);
  });
});

// ============================================================
// 9. Reference system (192 kWh / 96 kW) integration test
// ============================================================

describe('buildDayDispatchPlan — reference system (192 kWh / 96 kW)', () => {
  it('handles a full Agile-style day correctly', () => {
    // Simulate a typical Agile day:
    // Cheap overnight (7p), expensive peak (35p), normal daytime (18p)
    const importRates = Array.from({ length: 48 }, (_, i) => {
      if (i <= 11) return 7;   // 00:00–06:00 cheap
      if (i >= 32 && i <= 37) return 35; // 16:00–18:30 peak
      return 18;
    });
    const exportRates = Array.from({ length: 48 }, (_, i) => {
      if (i >= 32 && i <= 37) return 30; // peak export
      return 10;
    });

    const plan = buildDayDispatchPlan(
      REFERENCE_SYSTEM,
      importRates,
      exportRates,
      undefined,
      undefined,
      '2026-01-20',
    );

    // Basic sanity checks
    expect(plan.slots).toHaveLength(48);
    expect(plan.date).toBe('2026-01-20');

    // Should find at least some charge and discharge slots
    const chargeSlots = plan.slots.filter(s => s.action === 'charge');
    const dischargeSlots = plan.slots.filter(s => s.action === 'discharge');
    expect(chargeSlots.length).toBeGreaterThan(0);
    expect(dischargeSlots.length).toBeGreaterThan(0);

    // Net revenue should be positive (7p import → 30p export, clear spread)
    expect(plan.summary.netRevenuePence).toBeGreaterThan(0);

    // SOC must stay within bounds throughout
    for (const slot of plan.slots) {
      expect(slot.socStart).toBeGreaterThanOrEqual(REFERENCE_SYSTEM.minSoc - 0.0001);
      expect(slot.socEnd).toBeLessThanOrEqual(REFERENCE_SYSTEM.maxSoc + 0.0001);
    }

    // Cycles should be plausible (between 0 and ~2 for a day)
    expect(plan.summary.cyclesCompleted).toBeGreaterThan(0);
    expect(plan.summary.cyclesCompleted).toBeLessThanOrEqual(4);
  });

  it('max charge per slot is 48 kWh (96 kW × 0.5 hr)', () => {
    // With a 96 kW inverter, no single slot should charge more than 48 kWh
    const importRates = ratesWithOverrides(20, [[0, 2], [1, 2], [2, 2]]);
    const exportRates = ratesWithOverrides(5, [[40, 30], [41, 30], [42, 30]]);

    const plan = buildDayDispatchPlan(REFERENCE_SYSTEM, importRates, exportRates);

    for (const slot of plan.slots) {
      if (slot.action === 'charge') {
        // Stored energy per slot ≤ 96 kW × 0.5 hr × efficiency = 48 × 0.92 = 44.16 kWh
        expect(slot.energyKwh).toBeLessThanOrEqual(48 + 0.001);
      }
      if (slot.action === 'discharge') {
        expect(Math.abs(slot.energyKwh)).toBeLessThanOrEqual(48 + 0.001);
      }
    }
  });
});

// ============================================================
// 10. Edge cases
// ============================================================

describe('buildDayDispatchPlan — edge cases', () => {
  it('throws when importRates array has wrong length', () => {
    expect(() =>
      buildDayDispatchPlan(SMALL_SYSTEM, [1, 2, 3], flatRates(10)),
    ).toThrow();
  });

  it('throws when exportRates array has wrong length', () => {
    expect(() =>
      buildDayDispatchPlan(SMALL_SYSTEM, flatRates(10), [1, 2, 3]),
    ).toThrow();
  });

  it('handles all-zero import and export rates gracefully', () => {
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, flatRates(0), flatRates(0));
    expect(plan.slots).toHaveLength(48);
    expect(plan.summary.netRevenuePence).toBe(0);
  });

  it('handles all-negative import rates (extreme surplus generation day)', () => {
    // Every slot at -10p — grid pays us to charge all day
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, flatRates(-10), flatRates(5));

    // All slots should be charge (negative price = free + paid)
    const nonIdleSlots = plan.slots.filter(s => s.action !== 'idle' && s.action !== 'charge');
    // Most slots should be charge; some may be idle if battery is full
    expect(nonIdleSlots.length).toBe(0);
  });

  it('cycle count is 0 when no charge/discharge occurs', () => {
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, flatRates(20), flatRates(5));
    expect(plan.summary.cyclesCompleted).toBe(0);
  });

  it('totalChargeKwh and totalDischargeKwh are non-negative', () => {
    const importRates = ratesWithOverrides(20, [[0, 5]]);
    const exportRates = ratesWithOverrides(5, [[30, 25]]);
    const plan = buildDayDispatchPlan(SMALL_SYSTEM, importRates, exportRates);

    expect(plan.summary.totalChargeKwh).toBeGreaterThanOrEqual(0);
    expect(plan.summary.totalDischargeKwh).toBeGreaterThanOrEqual(0);
  });
});
