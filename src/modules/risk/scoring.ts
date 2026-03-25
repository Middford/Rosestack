// ============================================================
// RoseStack Platform — Risk & Opportunity Scoring Engine
// Agent 10: Risk & Opportunities Manager
// ============================================================

import type { RiskItem, OpportunityItem, RiskRating, OpportunityRating } from '@/shared/types';

// --- Score Calculation ---

export function calculateScore(probability: number, impact: number): number {
  return probability * impact;
}

// --- Risk Rating ---

export function getRiskRating(score: number): RiskRating {
  if (score >= 16) return 'critical';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export function getRiskRatingColour(rating: RiskRating): string {
  const colours: Record<RiskRating, string> = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#10B981',
  };
  return colours[rating];
}

export function getRiskRatingBadgeVariant(rating: RiskRating): 'danger' | 'warning' | 'success' | 'default' {
  const variants: Record<RiskRating, 'danger' | 'warning' | 'success' | 'default'> = {
    critical: 'danger',
    high: 'warning',
    medium: 'warning',
    low: 'success',
  };
  return variants[rating];
}

// --- Opportunity Rating ---

export function getOpportunityRating(score: number): OpportunityRating {
  if (score >= 16) return 'transformative';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export function getOpportunityRatingColour(rating: OpportunityRating): string {
  const colours: Record<OpportunityRating, string> = {
    transformative: '#F59E0B',
    high: '#10B981',
    medium: '#06B6D4',
    low: '#3B82F6',
  };
  return colours[rating];
}

export function getOpportunityRatingBadgeVariant(rating: OpportunityRating): 'warning' | 'success' | 'info' | 'default' {
  const variants: Record<OpportunityRating, 'warning' | 'success' | 'info' | 'default'> = {
    transformative: 'warning',
    high: 'success',
    medium: 'info',
    low: 'default',
  };
  return variants[rating];
}

// --- Heat Map Helpers ---

export interface HeatMapCell {
  probability: number;
  impact: number;
  items: Array<{ id: string; name: string }>;
  score: number;
}

export function buildRiskHeatMap(risks: RiskItem[]): HeatMapCell[][] {
  const grid: HeatMapCell[][] = [];
  for (let p = 5; p >= 1; p--) {
    const row: HeatMapCell[] = [];
    for (let i = 1; i <= 5; i++) {
      const cellItems = risks.filter(r => r.probability === p && r.impact === i);
      row.push({
        probability: p,
        impact: i,
        items: cellItems.map(r => ({ id: r.id, name: r.name })),
        score: p * i,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function buildOpportunityHeatMap(opportunities: OpportunityItem[]): HeatMapCell[][] {
  const grid: HeatMapCell[][] = [];
  for (let p = 5; p >= 1; p--) {
    const row: HeatMapCell[] = [];
    for (let i = 1; i <= 5; i++) {
      const cellItems = opportunities.filter(o => o.probability === p && o.impact === i);
      row.push({
        probability: p,
        impact: i,
        items: cellItems.map(o => ({ id: o.id, name: o.name })),
        score: p * i,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function getRiskHeatMapCellColour(score: number): string {
  if (score >= 16) return 'bg-red-900/40 border-red-500/30';
  if (score >= 10) return 'bg-orange-900/30 border-orange-500/20';
  if (score >= 5) return 'bg-amber-900/20 border-amber-500/15';
  return 'bg-emerald-900/15 border-emerald-500/10';
}

export function getOpportunityHeatMapCellColour(score: number): string {
  if (score >= 16) return 'bg-amber-900/40 border-amber-400/30';
  if (score >= 10) return 'bg-emerald-900/30 border-emerald-500/20';
  if (score >= 5) return 'bg-cyan-900/20 border-cyan-500/15';
  return 'bg-blue-900/15 border-blue-500/10';
}

// --- Aggregate Stats ---

export interface RiskStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  averageScore: number;
  topRisk: RiskItem | null;
  totalFinancialExposure: number;
}

export function calculateRiskStats(risks: RiskItem[]): RiskStats {
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  return {
    total: risks.length,
    critical: risks.filter(r => r.rating === 'critical').length,
    high: risks.filter(r => r.rating === 'high').length,
    medium: risks.filter(r => r.rating === 'medium').length,
    low: risks.filter(r => r.rating === 'low').length,
    averageScore: risks.length ? Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length * 10) / 10 : 0,
    topRisk: sorted[0] ?? null,
    totalFinancialExposure: risks.reduce((sum, r) => sum + r.score * 2000, 0),
  };
}

export interface OpportunityStats {
  total: number;
  transformative: number;
  high: number;
  medium: number;
  low: number;
  averageScore: number;
  topOpportunity: OpportunityItem | null;
  totalExpectedValue: number;
}

export function calculateOpportunityStats(opportunities: OpportunityItem[]): OpportunityStats {
  const sorted = [...opportunities].sort((a, b) => b.score - a.score);
  return {
    total: opportunities.length,
    transformative: opportunities.filter(o => o.rating === 'transformative').length,
    high: opportunities.filter(o => o.rating === 'high').length,
    medium: opportunities.filter(o => o.rating === 'medium').length,
    low: opportunities.filter(o => o.rating === 'low').length,
    averageScore: opportunities.length ? Math.round(opportunities.reduce((s, o) => s + o.score, 0) / opportunities.length * 10) / 10 : 0,
    topOpportunity: sorted[0] ?? null,
    totalExpectedValue: opportunities.reduce((sum, o) => sum + (o.expectedValue ?? 0), 0),
  };
}

// --- Net Position ---

export interface NetPositionItem {
  label: string;
  value: number;
  type: 'base' | 'risk' | 'opportunity' | 'net';
}

export function calculateNetPosition(
  baseRevenue: number,
  risks: RiskItem[],
  opportunities: OpportunityItem[],
): NetPositionItem[] {
  const riskImpact = risks.reduce((sum, r) => sum + (r.probability / 5) * (r.score * 500), 0);
  const oppUplift = opportunities.reduce((sum, o) => sum + (o.probability / 5) * ((o.expectedValue ?? 0) * 0.3), 0);

  return [
    { label: 'Base Case Revenue', value: baseRevenue, type: 'base' },
    { label: 'Risk-Adjusted Impact', value: -riskImpact, type: 'risk' },
    { label: 'Opportunity Uplift', value: oppUplift, type: 'opportunity' },
    { label: 'Net Expected Position', value: baseRevenue - riskImpact + oppUplift, type: 'net' },
  ];
}
