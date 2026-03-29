import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  getRiskRating,
  getRiskRatingColour,
  getRiskRatingBadgeVariant,
  getOpportunityRating,
  getOpportunityRatingColour,
  getOpportunityRatingBadgeVariant,
  buildRiskHeatMap,
  buildOpportunityHeatMap,
  calculateRiskStats,
  calculateOpportunityStats,
  calculateNetPosition,
} from '@/modules/risk/scoring';
import type { RiskItem, OpportunityItem } from '@/shared/types';

// --- Fixtures ---

function makeRisk(overrides: Partial<RiskItem> = {}): RiskItem {
  return {
    id: 'R-001',
    name: 'Test Risk',
    category: 'tariff',
    description: 'Test risk description',
    probability: 3,
    impact: 4,
    score: 12,
    rating: 'high',
    mitigationStrategy: 'Test mitigation',
    mitigationOwner: 'Dave',
    mitigationStatus: 'in-progress',
    lastReviewed: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<OpportunityItem> = {}): OpportunityItem {
  return {
    id: 'O-001',
    name: 'Test Opportunity',
    category: 'hardware-cost',
    description: 'Test opportunity description',
    probability: 4,
    impact: 4,
    score: 16,
    rating: 'transformative',
    captureStrategy: 'Test strategy',
    captureOwner: 'Josh',
    captureStatus: 'researching',
    lastReviewed: new Date('2026-01-01'),
    ...overrides,
  };
}

// --- Score Calculation ---

describe('calculateScore', () => {
  it('should multiply probability by impact', () => {
    expect(calculateScore(3, 4)).toBe(12);
    expect(calculateScore(5, 5)).toBe(25);
    expect(calculateScore(1, 1)).toBe(1);
  });

  it('should return 0 for zero inputs', () => {
    expect(calculateScore(0, 5)).toBe(0);
    expect(calculateScore(5, 0)).toBe(0);
  });
});

// --- Risk Rating ---

describe('getRiskRating', () => {
  it('should return critical for score >= 16', () => {
    expect(getRiskRating(16)).toBe('critical');
    expect(getRiskRating(25)).toBe('critical');
  });

  it('should return high for score 10-15', () => {
    expect(getRiskRating(10)).toBe('high');
    expect(getRiskRating(15)).toBe('high');
  });

  it('should return medium for score 5-9', () => {
    expect(getRiskRating(5)).toBe('medium');
    expect(getRiskRating(9)).toBe('medium');
  });

  it('should return low for score < 5', () => {
    expect(getRiskRating(1)).toBe('low');
    expect(getRiskRating(4)).toBe('low');
  });

  it('boundary: score 16 is critical, 15 is high', () => {
    expect(getRiskRating(16)).toBe('critical');
    expect(getRiskRating(15)).toBe('high');
  });
});

describe('getRiskRatingColour', () => {
  it('should return correct hex colours', () => {
    expect(getRiskRatingColour('critical')).toBe('#EF4444');
    expect(getRiskRatingColour('high')).toBe('#F97316');
    expect(getRiskRatingColour('medium')).toBe('#F59E0B');
    expect(getRiskRatingColour('low')).toBe('#10B981');
  });
});

describe('getRiskRatingBadgeVariant', () => {
  it('should map ratings to badge variants', () => {
    expect(getRiskRatingBadgeVariant('critical')).toBe('danger');
    expect(getRiskRatingBadgeVariant('high')).toBe('warning');
    expect(getRiskRatingBadgeVariant('medium')).toBe('warning');
    expect(getRiskRatingBadgeVariant('low')).toBe('success');
  });
});

// --- Opportunity Rating ---

describe('getOpportunityRating', () => {
  it('should return transformative for score >= 16', () => {
    expect(getOpportunityRating(16)).toBe('transformative');
    expect(getOpportunityRating(25)).toBe('transformative');
  });

  it('should return high for score 10-15', () => {
    expect(getOpportunityRating(10)).toBe('high');
    expect(getOpportunityRating(15)).toBe('high');
  });

  it('should return medium for score 5-9', () => {
    expect(getOpportunityRating(5)).toBe('medium');
    expect(getOpportunityRating(9)).toBe('medium');
  });

  it('should return low for score < 5', () => {
    expect(getOpportunityRating(4)).toBe('low');
    expect(getOpportunityRating(1)).toBe('low');
  });
});

describe('getOpportunityRatingColour', () => {
  it('should return correct hex colours', () => {
    expect(getOpportunityRatingColour('transformative')).toBe('#F59E0B');
    expect(getOpportunityRatingColour('high')).toBe('#10B981');
    expect(getOpportunityRatingColour('medium')).toBe('#06B6D4');
    expect(getOpportunityRatingColour('low')).toBe('#3B82F6');
  });
});

describe('getOpportunityRatingBadgeVariant', () => {
  it('should map ratings to badge variants', () => {
    expect(getOpportunityRatingBadgeVariant('transformative')).toBe('warning');
    expect(getOpportunityRatingBadgeVariant('high')).toBe('success');
    expect(getOpportunityRatingBadgeVariant('medium')).toBe('info');
    expect(getOpportunityRatingBadgeVariant('low')).toBe('default');
  });
});

// --- Heat Map ---

describe('buildRiskHeatMap', () => {
  it('should produce a 5x5 grid', () => {
    const grid = buildRiskHeatMap([]);
    expect(grid).toHaveLength(5);
    for (const row of grid) {
      expect(row).toHaveLength(5);
    }
  });

  it('should place risk in correct cell', () => {
    const risk = makeRisk({ probability: 4, impact: 3, score: 12 });
    const grid = buildRiskHeatMap([risk]);
    // Row 0 = probability 5, row 1 = probability 4
    const cell = grid[1].find(c => c.impact === 3);
    expect(cell?.items).toHaveLength(1);
    expect(cell?.items[0].id).toBe('R-001');
  });

  it('should have correct scores in each cell', () => {
    const grid = buildRiskHeatMap([]);
    // Top-right cell: probability 5, impact 5 = score 25
    expect(grid[0][4].score).toBe(25);
    // Bottom-left cell: probability 1, impact 1 = score 1
    expect(grid[4][0].score).toBe(1);
  });

  it('should handle multiple risks in the same cell', () => {
    const r1 = makeRisk({ id: 'R-001', probability: 3, impact: 3 });
    const r2 = makeRisk({ id: 'R-002', probability: 3, impact: 3 });
    const grid = buildRiskHeatMap([r1, r2]);
    const cell = grid[2].find(c => c.impact === 3)!;
    expect(cell.items).toHaveLength(2);
  });
});

describe('buildOpportunityHeatMap', () => {
  it('should produce a 5x5 grid', () => {
    const grid = buildOpportunityHeatMap([]);
    expect(grid).toHaveLength(5);
    for (const row of grid) {
      expect(row).toHaveLength(5);
    }
  });

  it('should place opportunity in correct cell', () => {
    const opp = makeOpportunity({ probability: 5, impact: 5 });
    const grid = buildOpportunityHeatMap([opp]);
    const cell = grid[0][4];
    expect(cell.items).toHaveLength(1);
    expect(cell.items[0].id).toBe('O-001');
  });
});

// --- Aggregate Stats ---

describe('calculateRiskStats', () => {
  it('should return correct counts by rating', () => {
    const risks = [
      makeRisk({ id: 'R-1', score: 20, rating: 'critical' }),
      makeRisk({ id: 'R-2', score: 12, rating: 'high' }),
      makeRisk({ id: 'R-3', score: 12, rating: 'high' }),
      makeRisk({ id: 'R-4', score: 6, rating: 'medium' }),
      makeRisk({ id: 'R-5', score: 2, rating: 'low' }),
    ];
    const stats = calculateRiskStats(risks);
    expect(stats.total).toBe(5);
    expect(stats.critical).toBe(1);
    expect(stats.high).toBe(2);
    expect(stats.medium).toBe(1);
    expect(stats.low).toBe(1);
  });

  it('should return the highest-scoring risk as topRisk', () => {
    const risks = [
      makeRisk({ id: 'R-low', score: 4 }),
      makeRisk({ id: 'R-high', score: 20 }),
      makeRisk({ id: 'R-med', score: 10 }),
    ];
    const stats = calculateRiskStats(risks);
    expect(stats.topRisk?.id).toBe('R-high');
  });

  it('should return null topRisk for empty array', () => {
    const stats = calculateRiskStats([]);
    expect(stats.topRisk).toBeNull();
    expect(stats.total).toBe(0);
    expect(stats.averageScore).toBe(0);
  });

  it('should calculate average score correctly', () => {
    const risks = [
      makeRisk({ id: 'R-1', score: 10 }),
      makeRisk({ id: 'R-2', score: 20 }),
    ];
    const stats = calculateRiskStats(risks);
    expect(stats.averageScore).toBe(15);
  });
});

describe('calculateOpportunityStats', () => {
  it('should return correct counts by rating', () => {
    const opps = [
      makeOpportunity({ id: 'O-1', score: 20, rating: 'transformative' }),
      makeOpportunity({ id: 'O-2', score: 12, rating: 'high' }),
      makeOpportunity({ id: 'O-3', score: 6, rating: 'medium' }),
      makeOpportunity({ id: 'O-4', score: 3, rating: 'low' }),
    ];
    const stats = calculateOpportunityStats(opps);
    expect(stats.total).toBe(4);
    expect(stats.transformative).toBe(1);
    expect(stats.high).toBe(1);
    expect(stats.medium).toBe(1);
    expect(stats.low).toBe(1);
  });

  it('should sum expected values', () => {
    const opps = [
      makeOpportunity({ id: 'O-1', expectedValue: 50000 }),
      makeOpportunity({ id: 'O-2', expectedValue: 30000 }),
    ];
    const stats = calculateOpportunityStats(opps);
    expect(stats.totalExpectedValue).toBe(80000);
  });

  it('should handle undefined expectedValue', () => {
    const opps = [
      makeOpportunity({ id: 'O-1', expectedValue: undefined }),
    ];
    const stats = calculateOpportunityStats(opps);
    expect(stats.totalExpectedValue).toBe(0);
  });
});

// --- Net Position ---

describe('calculateNetPosition', () => {
  it('should return four items: base, risk, opportunity, net', () => {
    const result = calculateNetPosition(3200000, [], []);
    expect(result).toHaveLength(4);
    expect(result.map(r => r.type)).toEqual(['base', 'risk', 'opportunity', 'net']);
  });

  it('should use baseRevenue for base case', () => {
    const result = calculateNetPosition(3200000, [], []);
    expect(result[0].value).toBe(3200000);
  });

  it('risks should produce negative impact', () => {
    const risks = [makeRisk({ probability: 5, impact: 5, score: 25 })];
    const result = calculateNetPosition(3200000, risks, []);
    expect(result[1].value).toBeLessThan(0);
  });

  it('opportunities should produce positive uplift', () => {
    const opps = [makeOpportunity({ probability: 5, expectedValue: 100000 })];
    const result = calculateNetPosition(3200000, [], opps);
    expect(result[2].value).toBeGreaterThan(0);
  });

  it('net position should equal base + risk + opportunity', () => {
    const risks = [makeRisk({ probability: 3, impact: 4, score: 12 })];
    const opps = [makeOpportunity({ probability: 4, expectedValue: 50000 })];
    const result = calculateNetPosition(3200000, risks, opps);
    const expectedNet = result[0].value + result[1].value + result[2].value;
    expect(result[3].value).toBeCloseTo(expectedNet, 0);
  });
});
