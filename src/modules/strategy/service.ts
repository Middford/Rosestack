// ============================================================
// Strategy Module — Service Layer
// ============================================================

import { competitors, partnerships, emergingTech, moatActions, strategyInitiatives } from './data';
import type {
  Competitor,
  Partnership,
  PartnershipStage,
  EmergingTech,
  TechMaturity,
  TechRelevance,
  MoatAction,
  MoatStatus,
  StrategyInitiative,
  StrategyPhase,
  CompetitorThreat,
} from './types';

// --- Competitors ---

export function getAllCompetitors(): Competitor[] {
  return competitors;
}

export function getCompetitorById(id: string): Competitor | undefined {
  return competitors.find(c => c.id === id);
}

export function getCompetitorsByThreat(threat: CompetitorThreat): Competitor[] {
  return competitors.filter(c => c.threat === threat);
}

export function getTotalCompetitorPortfolio(): number {
  return competitors.reduce((sum, c) => sum + c.estimatedPortfolioSize, 0);
}

// --- Partnerships ---

export function getAllPartnerships(): Partnership[] {
  return partnerships;
}

export function getPartnershipsByStage(stage: PartnershipStage): Partnership[] {
  return partnerships.filter(p => p.stage === stage);
}

export function getPartnershipsByStageGrouped(): Record<PartnershipStage, Partnership[]> {
  const stages: PartnershipStage[] = ['identified', 'outreach', 'negotiation', 'agreed', 'active'];
  const grouped = {} as Record<PartnershipStage, Partnership[]>;
  for (const stage of stages) {
    grouped[stage] = partnerships.filter(p => p.stage === stage);
  }
  return grouped;
}

export function getTotalPotentialHomes(): number {
  return partnerships.reduce((sum, p) => sum + (p.potentialHomes ?? 0), 0);
}

// --- Emerging Tech ---

export function getAllEmergingTech(): EmergingTech[] {
  return emergingTech;
}

export function getEmergingTechByMaturity(maturity: TechMaturity): EmergingTech[] {
  return emergingTech.filter(t => t.maturity === maturity);
}

export function getEmergingTechByRelevance(relevance: TechRelevance): EmergingTech[] {
  return emergingTech.filter(t => t.relevance === relevance);
}

// --- Moat Actions ---

export function getAllMoatActions(): MoatAction[] {
  return moatActions;
}

export function getMoatActionsByStatus(status: MoatStatus): MoatAction[] {
  return moatActions.filter(a => a.status === status);
}

export function getMoatProgress(): { done: number; inProgress: number; notStarted: number; total: number } {
  return {
    done: moatActions.filter(a => a.status === 'done').length,
    inProgress: moatActions.filter(a => a.status === 'in-progress').length,
    notStarted: moatActions.filter(a => a.status === 'not-started').length,
    total: moatActions.length,
  };
}

// --- Strategy Initiatives ---

export function getAllInitiatives(): StrategyInitiative[] {
  return strategyInitiatives;
}

export function getInitiativesByPhase(phase: StrategyPhase): StrategyInitiative[] {
  return strategyInitiatives.filter(i => i.phase === phase);
}

export function getPhaseLabel(phase: StrategyPhase): string {
  const labels: Record<StrategyPhase, string> = {
    'phase-1': 'Phase 1: Foundation (M1-6)',
    'phase-2': 'Phase 2: Growth (M7-18)',
    'phase-3': 'Phase 3: Regional Scale (M19-36)',
    'phase-4': 'Phase 4: National (M37-60)',
  };
  return labels[phase];
}
