// ============================================================
// Customer Acquisition Module — Types
// ============================================================

import type { LeadSource } from '@/shared/types';

// ── Legacy stage type (kept for backward compatibility) ────────────────────────
// The new PipelineStatus type replaces this in new code.

/** @deprecated Use PipelineStatus instead */
export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal-sent'
  | 'contracted'
  | 'installation-scheduled'
  | 'live';

// ── New granular pipeline statuses (16 active + 2 terminal) ───────────────────

export type PipelineStatus =
  // Stage 0 — Discovery
  | 'new_lead'
  | 'initial_contact'
  | 'interested'
  | 'property_assessed'
  // Stage 1 — Site Visit
  | 'visit_scheduled'
  | 'visit_complete'
  // Stage 2 — Proposal
  | 'proposal_prepared'
  | 'proposal_sent'
  | 'proposal_reviewing'
  // Stage 3 — Contract
  | 'verbal_agreement'
  | 'contract_sent'
  | 'contracted'
  // Stage 4 — Installation
  | 'g99_submitted'
  | 'g99_approved'
  | 'installation_scheduled'
  // Stage 5 — Live
  | 'installed'
  | 'commissioned'
  | 'live'
  // Terminal
  | 'on_hold'
  | 'lost';

export type PipelineStageNumber = 0 | 1 | 2 | 3 | 4 | 5;

/** Returns the stage number (0-5) for an active PipelineStatus, or null for terminal statuses. */
export function stageNumber(status: PipelineStatus): PipelineStageNumber | null {
  switch (status) {
    case 'new_lead':
    case 'initial_contact':
    case 'interested':
    case 'property_assessed':
      return 0;
    case 'visit_scheduled':
    case 'visit_complete':
      return 1;
    case 'proposal_prepared':
    case 'proposal_sent':
    case 'proposal_reviewing':
      return 2;
    case 'verbal_agreement':
    case 'contract_sent':
    case 'contracted':
      return 3;
    case 'g99_submitted':
    case 'g99_approved':
    case 'installation_scheduled':
      return 4;
    case 'installed':
    case 'commissioned':
    case 'live':
      return 5;
    case 'on_hold':
    case 'lost':
      return null;
  }
}

// ── Stage definitions ──────────────────────────────────────────────────────────

export interface PipelineStageDefinition {
  number: PipelineStageNumber;
  name: string;
  description: string;
  statuses: PipelineStatus[];
  /** Tailwind colour used for badges in this stage */
  color: string;
  /** Whether financial commitment has been made by RoseStack */
  committed: boolean;
  /** Badge variant key for UI components */
  variant: 'default' | 'info' | 'warning' | 'rose' | 'success';
}

// ── G99 assessment ─────────────────────────────────────────────────────────────

export interface G99Assessment {
  probability: number; // 0-1
  expectedWeeks: { min: number; typical: number; max: number };
  factors: string[];
  exportLimitRisk: 'none' | 'low' | 'medium' | 'high';
  recommendedExportLimitKw: number;
}

export function assessG99Probability(params: {
  distanceToSubstationKm: number;
  substationLoadPercent: number; // 0-100
  systemKw: number;
  phaseType: '1-phase' | '3-phase';
  nearbyInstallations?: number;
}): G99Assessment {
  const { distanceToSubstationKm, substationLoadPercent, systemKw, phaseType, nearbyInstallations = 0 } = params;

  // Base probability
  let probability = phaseType === '3-phase' ? 0.85 : 0.70;

  // Substation load penalties
  if (substationLoadPercent > 85) {
    probability -= 0.25;
  } else if (substationLoadPercent > 70) {
    probability -= 0.10;
  }

  // Distance penalty
  if (distanceToSubstationKm > 2) {
    probability -= 0.05;
  }

  // Feeder congestion penalty
  if (nearbyInstallations >= 3) {
    probability -= 0.15;
  }

  // Large system scrutiny
  if (systemKw > 50) {
    probability -= 0.05;
  }

  // Floor
  probability = Math.max(0.10, probability);

  // Timeline (weeks)
  const isLarge = systemKw > 50;
  const isConstrained = substationLoadPercent > 85 || (nearbyInstallations >= 3);

  const baseMin = isLarge ? 12 : 8;
  const baseTypical = isLarge ? 16 : 10;
  const baseMax = isLarge ? 20 : 12;

  const constraintAdd = isConstrained ? 6 : 0;

  const expectedWeeks = {
    min: baseMin,
    typical: baseTypical + constraintAdd,
    max: baseMax + (isConstrained ? 8 : 0),
  };

  // Factors list
  const factors: string[] = [];
  if (phaseType === '1-phase') factors.push('Single-phase supply reduces base approval likelihood');
  if (substationLoadPercent > 85) factors.push(`Substation highly loaded at ${substationLoadPercent}%`);
  else if (substationLoadPercent > 70) factors.push(`Substation moderately loaded at ${substationLoadPercent}%`);
  if (distanceToSubstationKm > 2) factors.push(`Distance to substation ${distanceToSubstationKm.toFixed(1)} km (network impedance risk)`);
  if (nearbyInstallations >= 3) factors.push(`${nearbyInstallations} existing battery installs on same feeder (congestion risk)`);
  if (systemKw > 50) factors.push(`Large system export capacity ${systemKw} kW attracts additional scrutiny`);
  if (factors.length === 0) factors.push('No significant risk factors identified');

  // Export limit risk
  let exportLimitRisk: G99Assessment['exportLimitRisk'] = 'none';
  if (substationLoadPercent > 85 || nearbyInstallations >= 3) exportLimitRisk = 'high';
  else if (substationLoadPercent > 70 || (nearbyInstallations >= 1 && distanceToSubstationKm > 2)) exportLimitRisk = 'medium';
  else if (substationLoadPercent > 55 || nearbyInstallations >= 1) exportLimitRisk = 'low';

  // Recommended export limit
  let recommendedExportLimitKw = systemKw;
  if (exportLimitRisk === 'high') recommendedExportLimitKw = Math.min(systemKw, 16);
  else if (exportLimitRisk === 'medium') recommendedExportLimitKw = Math.min(systemKw, 25);
  else if (exportLimitRisk === 'low') recommendedExportLimitKw = Math.min(systemKw, 50);

  return {
    probability: Math.round(probability * 100) / 100,
    expectedWeeks,
    factors,
    exportLimitRisk,
    recommendedExportLimitKw,
  };
}

// ── Legacy PIPELINE_STAGES constant (kept for backward compatibility) ──────────
// New code should use PIPELINE_STAGE_DEFINITIONS from data.ts

/** @deprecated Use PIPELINE_STAGE_DEFINITIONS from data.ts for the new 6-stage pipeline */
export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-indigo-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { key: 'proposal-sent', label: 'Proposal Sent', color: 'bg-amber-500' },
  { key: 'contracted', label: 'Contracted', color: 'bg-emerald-500' },
  { key: 'installation-scheduled', label: 'Installation Scheduled', color: 'bg-teal-500' },
  { key: 'live', label: 'Live', color: 'bg-green-500' },
];

// ── Activity / Follow-up (unchanged) ──────────────────────────────────────────

export type ActivityType = 'call' | 'visit' | 'email' | 'note' | 'stage-change' | 'follow-up';

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  userId?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  dueDate: Date;
  description: string;
  completed: boolean;
}

// ── Lead — updated to use PipelineStatus ─────────────────────────────────────

/** Full lead record. Uses PipelineStatus for the new 16-status pipeline. */
export interface Lead {
  id: string;
  /** homeId ties this lead to the Grid module's property record once contracted */
  homeId?: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  postcode: string;
  source: LeadSource;
  referredBy?: string;
  status: PipelineStatus;
  propertyScore: number;
  engagementScore: number;
  totalScore: number;
  activities: Activity[];
  followUps: FollowUp[];
  estimatedSystemSize: string;
  estimatedAnnualRevenue: number;
  daysInCurrentStatus: number;
  g99Assessment?: G99Assessment;
  createdAt: Date;
  updatedAt: Date;
}

/** @deprecated Use Lead instead */
export interface CrmLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  postcode: string;
  source: LeadSource;
  referredBy?: string;
  /** @deprecated Use Lead.status (PipelineStatus) */
  stage: PipelineStage;
  propertyScore: number;
  engagementScore: number;
  totalScore: number;
  activities: Activity[];
  followUps: FollowUp[];
  estimatedSystemSize: string;
  estimatedAnnualRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Referral ───────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrerName: string;
  referrerCode: string;
  referrerLeadId: string;
  refereeName: string;
  refereeLeadId?: string;
  status: 'pending' | 'contacted' | 'converted' | 'lost';
  rewardAmount: number;
  rewardPaid: boolean;
  createdAt: Date;
}

export interface ReferrerProfile {
  leadId: string;
  name: string;
  code: string;
  totalReferrals: number;
  convertedReferrals: number;
  totalRewardsEarned: number;
  totalRewardsPaid: number;
  referrals: Referral[];
}

// ── Campaign ───────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  type: 'door-knock' | 'leaflet' | 'social' | 'club-event' | 'email' | 'other';
  area: string;
  postcode: string;
  startDate: Date;
  endDate?: Date;
  doorsKnocked?: number;
  leadsGenerated: number;
  conversions: number;
  cost: number;
  notes?: string;
}

// ── Club Partnership ───────────────────────────────────────────────────────────

export interface ClubPartnership {
  id: string;
  clubName: string;
  clubType: 'cricket' | 'bowling' | 'rugby' | 'football' | 'golf' | 'other';
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  status: 'initial-contact' | 'in-discussion' | 'agreed' | 'active' | 'inactive';
  sponsorshipAmount?: number;
  referralsPipeline: number;
  referralsConverted: number;
  notes?: string;
  lastContact: Date;
}

// ── Revenue Attribution ────────────────────────────────────────────────────────

export interface RevenueAttribution {
  channel: LeadSource;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averagePropertyScore: number;
  averageAnnualRevenue: number;
  totalProjectedRevenue: number;
  costPerAcquisition: number;
}

// ── Email Templates ────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'welcome' | 'monthly-statement' | 'annual-summary' | 'referral-invite';
  subject: string;
  sections: EmailSection[];
}

export interface EmailSection {
  heading: string;
  content: string;
  showScenarios?: boolean;
}

// ── Proposal ───────────────────────────────────────────────────────────────────

export interface ProposalData {
  leadName: string;
  address: string;
  postcode: string;
  systemSize: string;
  batteryCapacity: string;
  monthlyPayment: number;
  bestAnnualSaving: number;
  likelyAnnualSaving: number;
  worstAnnualSaving: number;
  bestPaybackYears: number;
  likelyPaybackYears: number;
  worstPaybackYears: number;
  co2SavedPerYear: number;
  referralLink: string;
}
