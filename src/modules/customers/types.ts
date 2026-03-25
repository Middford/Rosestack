// ============================================================
// Customer Acquisition Module — Types
// ============================================================

import type { LeadSource } from '@/shared/types';

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal-sent'
  | 'contracted'
  | 'installation-scheduled'
  | 'live';

export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-indigo-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { key: 'proposal-sent', label: 'Proposal Sent', color: 'bg-amber-500' },
  { key: 'contracted', label: 'Contracted', color: 'bg-emerald-500' },
  { key: 'installation-scheduled', label: 'Installation Scheduled', color: 'bg-teal-500' },
  { key: 'live', label: 'Live', color: 'bg-green-500' },
];

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

export interface CrmLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  postcode: string;
  source: LeadSource;
  referredBy?: string;
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
