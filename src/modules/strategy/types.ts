// ============================================================
// Strategy Module — Local Types
// ============================================================

export type CompetitorThreat = 'low' | 'medium' | 'high' | 'critical';

export interface Competitor {
  id: string;
  name: string;
  description: string;
  region: string;
  estimatedPortfolioSize: number;
  threat: CompetitorThreat;
  strengths: string[];
  weaknesses: string[];
  latitude: number;
  longitude: number;
  website?: string;
}

export type PartnershipStage = 'identified' | 'outreach' | 'negotiation' | 'agreed' | 'active';
export type PartnershipType = 'dno' | 'sports-club' | 'housing-developer' | 'solar-installer' | 'ev-installer' | 'social-housing' | 'other';

export interface Partnership {
  id: string;
  name: string;
  type: PartnershipType;
  stage: PartnershipStage;
  contactName?: string;
  contactEmail?: string;
  description: string;
  potentialHomes?: number;
  notes: string;
  lastUpdated: Date;
}

export type TechMaturity = 'emerging' | 'developing' | 'maturing' | 'mature';
export type TechRelevance = 'low' | 'medium' | 'high' | 'critical';

export interface EmergingTech {
  id: string;
  name: string;
  category: string;
  maturity: TechMaturity;
  relevance: TechRelevance;
  description: string;
  timelineYears: number;
  keyPlayers: string[];
  rosestackImplication: string;
}

export type MoatStatus = 'not-started' | 'in-progress' | 'done';

export interface MoatAction {
  id: string;
  strategy: string;
  action: string;
  status: MoatStatus;
  priority: 'low' | 'medium' | 'high';
  owner: string;
  targetDate?: string;
  notes?: string;
}

export type StrategyPhase = 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';

export interface StrategyInitiative {
  id: string;
  name: string;
  phase: StrategyPhase;
  category: 'geographic' | 'vertical' | 'adjacent' | 'moat' | 'partnership';
  startMonth: number;
  durationMonths: number;
  description: string;
  dependencies?: string[];
}
