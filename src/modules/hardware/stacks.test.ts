// ============================================================
// Hardware Module — Reference Stacks Tests
// ============================================================

import {
  referenceStacks,
  getAllStacks,
  getStackById,
  getStacksByPhase,
  getStacksByLocation,
  getStacksByMaxNoise,
  getStacksByMinCapacity,
  getStacksByMaxFootprint,
  getIofCompatibleStacks,
  getStacksForGardenSize,
  estimateAnnualRevenuePence,
  calculatePaybackMonths,
  calculateNoiseAtDistance,
  calculateCompoundNoise,
} from './stacks';

// --- Basic data integrity ---

describe('referenceStacks data integrity', () => {
  test('all stacks have unique IDs', () => {
    const ids = referenceStacks.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all stacks have positive capacity', () => {
    for (const stack of referenceStacks) {
      expect(stack.totalCapacityKwh).toBeGreaterThan(0);
    }
  });

  test('all stacks have positive charge and discharge rates', () => {
    for (const stack of referenceStacks) {
      expect(stack.maxChargeRateKw).toBeGreaterThan(0);
      expect(stack.maxDischargeRateKw).toBeGreaterThan(0);
    }
  });

  test('all stacks have noise profiles with positive values', () => {
    for (const stack of referenceStacks) {
      expect(stack.noise.atOneMetre).toBeGreaterThan(0);
      expect(stack.noise.atNearestRoom).toBeGreaterThanOrEqual(0);
      expect(stack.noise.nearestRoomDistanceM).toBeGreaterThan(0);
    }
  });

  test('noise at nearest room is less than noise at 1m', () => {
    for (const stack of referenceStacks) {
      expect(stack.noise.atNearestRoom).toBeLessThan(stack.noise.atOneMetre);
    }
  });

  test('all stacks have positive costs in pence', () => {
    for (const stack of referenceStacks) {
      expect(stack.wholesaleCostPence).toBeGreaterThan(0);
      expect(stack.installationCostPence).toBeGreaterThan(0);
      expect(stack.totalCostPence).toBeGreaterThan(0);
    }
  });

  test('total cost equals sum of component costs', () => {
    for (const stack of referenceStacks) {
      const expected =
        stack.wholesaleCostPence +
        stack.installationCostPence +
        stack.phaseUpgradeCostPence +
        stack.g99CostPence;
      // Allow small rounding differences from intermediate calculations
      expect(Math.abs(stack.totalCostPence - expected)).toBeLessThanOrEqual(100);
    }
  });

  test('all stacks have at least 1 pro and 1 con', () => {
    for (const stack of referenceStacks) {
      expect(stack.pros.length).toBeGreaterThanOrEqual(1);
      expect(stack.cons.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('all stacks have installation notes', () => {
    for (const stack of referenceStacks) {
      expect(stack.installationNotes.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('all footprints have positive dimensions', () => {
    for (const stack of referenceStacks) {
      expect(stack.footprint.totalFootprintM2).toBeGreaterThan(0);
      expect(stack.footprint.installedWidthMm).toBeGreaterThan(0);
      expect(stack.footprint.installedDepthMm).toBeGreaterThan(0);
      expect(stack.footprint.installedHeightMm).toBeGreaterThan(0);
      expect(stack.footprint.totalWeightKg).toBeGreaterThan(0);
    }
  });

  test('there are exactly 6 reference stacks', () => {
    expect(referenceStacks.length).toBe(6);
  });
});

// --- Getter functions ---

describe('getAllStacks', () => {
  test('returns all stacks', () => {
    expect(getAllStacks().length).toBe(6);
  });
});

describe('getStackById', () => {
  test('returns correct stack', () => {
    const stack = getStackById('stack-garage-king');
    expect(stack).toBeDefined();
    expect(stack!.name).toBe('Garage King');
  });

  test('returns undefined for unknown ID', () => {
    expect(getStackById('nonexistent')).toBeUndefined();
  });
});

// --- Filter functions ---

describe('getStacksByPhase', () => {
  test('single-phase returns only single-phase stacks', () => {
    const stacks = getStacksByPhase('1-phase');
    expect(stacks.length).toBeGreaterThanOrEqual(1);
    for (const s of stacks) {
      expect(s.phaseRequirement).toBe('1-phase');
    }
  });

  test('3-phase returns multiple stacks', () => {
    const stacks = getStacksByPhase('3-phase');
    expect(stacks.length).toBeGreaterThanOrEqual(3);
  });
});

describe('getStacksByLocation', () => {
  test('garage location returns stacks with garage as preferred or alternative', () => {
    const stacks = getStacksByLocation('garage');
    expect(stacks.length).toBeGreaterThanOrEqual(2);
  });

  test('garden-enclosure returns stacks', () => {
    const stacks = getStacksByLocation('garden-enclosure');
    expect(stacks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('getStacksByMaxNoise', () => {
  test('30 dB limit returns only the quietest stacks', () => {
    const stacks = getStacksByMaxNoise(30);
    for (const s of stacks) {
      expect(s.noise.atNearestRoom).toBeLessThanOrEqual(30);
    }
  });

  test('50 dB limit returns all stacks', () => {
    const stacks = getStacksByMaxNoise(50);
    expect(stacks.length).toBe(6);
  });
});

describe('getStacksByMinCapacity', () => {
  test('150kWh minimum filters out smaller stacks', () => {
    const stacks = getStacksByMinCapacity(150);
    for (const s of stacks) {
      expect(s.totalCapacityKwh).toBeGreaterThanOrEqual(150);
    }
    expect(stacks.length).toBeGreaterThanOrEqual(1);
  });

  test('50kWh minimum returns all stacks', () => {
    const stacks = getStacksByMinCapacity(50);
    expect(stacks.length).toBe(6);
  });
});

describe('getStacksByMaxFootprint', () => {
  test('4m2 limit filters out larger stacks', () => {
    const stacks = getStacksByMaxFootprint(4);
    for (const s of stacks) {
      expect(s.footprint.totalFootprintM2).toBeLessThanOrEqual(4);
    }
  });
});

describe('getIofCompatibleStacks', () => {
  test('all returned stacks are IOF compatible', () => {
    const stacks = getIofCompatibleStacks();
    for (const s of stacks) {
      expect(s.iofCompatible).toBe(true);
    }
    // All 6 stacks should be IOF compatible
    expect(stacks.length).toBe(6);
  });
});

describe('getStacksForGardenSize', () => {
  test('tiny garden (2x2) returns garage stacks and smallest garden stacks', () => {
    const stacks = getStacksForGardenSize(2, 2);
    expect(stacks.length).toBeGreaterThanOrEqual(1);
  });

  test('large garden (10x20) returns all stacks', () => {
    const stacks = getStacksForGardenSize(10, 20);
    expect(stacks.length).toBe(6);
  });
});

// --- Revenue calculation ---

describe('estimateAnnualRevenuePence', () => {
  test('returns three scenarios with best > likely > worst', () => {
    for (const stack of referenceStacks) {
      const revenue = estimateAnnualRevenuePence(stack);
      expect(revenue.best).toBeGreaterThan(revenue.likely);
      expect(revenue.likely).toBeGreaterThan(revenue.worst);
    }
  });

  test('larger capacity stacks earn more revenue', () => {
    const garageKing = getStackById('stack-garage-king')!;
    const singlePhase = getStackById('stack-single-phase-starter')!;
    const garageRevenue = estimateAnnualRevenuePence(garageKing);
    const singleRevenue = estimateAnnualRevenuePence(singlePhase);
    expect(garageRevenue.likely).toBeGreaterThan(singleRevenue.likely);
  });

  test('all revenue values are positive integers', () => {
    for (const stack of referenceStacks) {
      const revenue = estimateAnnualRevenuePence(stack);
      expect(revenue.best).toBeGreaterThan(0);
      expect(revenue.likely).toBeGreaterThan(0);
      expect(revenue.worst).toBeGreaterThan(0);
      expect(Number.isInteger(revenue.best)).toBe(true);
      expect(Number.isInteger(revenue.likely)).toBe(true);
      expect(Number.isInteger(revenue.worst)).toBe(true);
    }
  });
});

// --- Payback calculation ---

describe('calculatePaybackMonths', () => {
  test('returns three scenarios with worst > likely > best', () => {
    for (const stack of referenceStacks) {
      const payback = calculatePaybackMonths(stack);
      expect(payback.worst).toBeGreaterThan(payback.likely);
      expect(payback.likely).toBeGreaterThan(payback.best);
    }
  });

  test('payback periods are positive', () => {
    for (const stack of referenceStacks) {
      const payback = calculatePaybackMonths(stack);
      expect(payback.best).toBeGreaterThan(0);
      expect(payback.likely).toBeGreaterThan(0);
      expect(payback.worst).toBeGreaterThan(0);
    }
  });

  test('payback periods are reasonable (under 10 years)', () => {
    for (const stack of referenceStacks) {
      const payback = calculatePaybackMonths(stack);
      expect(payback.likely).toBeLessThan(120); // 10 years
    }
  });
});

// --- Noise calculation ---

describe('calculateNoiseAtDistance', () => {
  test('noise at 1m equals source level', () => {
    expect(calculateNoiseAtDistance(45, 1)).toBeCloseTo(45, 0);
  });

  test('noise drops ~6 dB per doubling of distance', () => {
    const at2m = calculateNoiseAtDistance(45, 2);
    const at4m = calculateNoiseAtDistance(45, 4);
    // Should drop by ~6 dB between 2m and 4m
    expect(at2m - at4m).toBeCloseTo(6, 0);
  });

  test('wall attenuation reduces noise further', () => {
    const withoutWall = calculateNoiseAtDistance(45, 5, 0);
    const withWall = calculateNoiseAtDistance(45, 5, 30);
    expect(withWall).toBeLessThan(withoutWall);
    expect(withoutWall - withWall).toBeCloseTo(30, 0);
  });

  test('noise never goes below 0', () => {
    expect(calculateNoiseAtDistance(20, 100, 50)).toBe(0);
  });

  test('zero distance returns source level', () => {
    expect(calculateNoiseAtDistance(45, 0)).toBe(45);
  });
});

describe('calculateCompoundNoise', () => {
  test('single source returns original dB', () => {
    expect(calculateCompoundNoise(45, 1)).toBe(45);
  });

  test('doubling sources adds ~3 dB', () => {
    const compound = calculateCompoundNoise(45, 2);
    expect(compound).toBeCloseTo(48, 0);
  });

  test('10 sources add ~10 dB', () => {
    const compound = calculateCompoundNoise(45, 10);
    expect(compound).toBeCloseTo(55, 0);
  });

  test('zero sources returns 0', () => {
    expect(calculateCompoundNoise(45, 0)).toBe(0);
  });
});
