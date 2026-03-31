// ============================================================
// Customer Acquisition — Seeded Data
// Lead data, referral data, campaign data, club partnerships
// ============================================================

import type {
  CrmLead,
  Lead,
  Referral,
  ReferrerProfile,
  Campaign,
  ClubPartnership,
  EmailTemplate,
  PipelineStage,
  PipelineStatus,
  PipelineStageDefinition,
} from './types';
import { assessG99Probability } from './types';
import type { LeadSource } from '@/shared/types';

// ── Pipeline stage definitions (new 6-stage model) ────────────────────────────

export const PIPELINE_STAGE_DEFINITIONS: PipelineStageDefinition[] = [
  {
    number: 0,
    name: 'Discovery',
    description: 'Initial lead capture through to property assessment',
    statuses: ['new_lead', 'initial_contact', 'interested', 'property_assessed'],
    color: 'bg-slate-500',
    committed: false,
    variant: 'default',
  },
  {
    number: 1,
    name: 'Site Visit',
    description: 'Site visit booked and completed, survey report prepared',
    statuses: ['visit_scheduled', 'visit_complete'],
    color: 'bg-blue-500',
    committed: false,
    variant: 'info',
  },
  {
    number: 2,
    name: 'Proposal',
    description: 'Personalised proposal being built, sent, and reviewed',
    statuses: ['proposal_prepared', 'proposal_sent', 'proposal_reviewing'],
    color: 'bg-amber-500',
    committed: false,
    variant: 'warning',
  },
  {
    number: 3,
    name: 'Contract',
    description: 'Verbal agreement through to signed ESA — property enters portfolio',
    statuses: ['verbal_agreement', 'contract_sent', 'contracted'],
    color: 'bg-rose-500',
    committed: true,
    variant: 'rose',
  },
  {
    number: 4,
    name: 'Installation',
    description: 'G99 application, approval, and install scheduling',
    statuses: ['g99_submitted', 'g99_approved', 'installation_scheduled'],
    color: 'bg-purple-500',
    committed: true,
    variant: 'default',
  },
  {
    number: 5,
    name: 'Live',
    description: 'Hardware installed, commissioned, and earning revenue',
    statuses: ['installed', 'commissioned', 'live'],
    color: 'bg-emerald-500',
    committed: true,
    variant: 'success',
  },
];

// ── Status labels ──────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<PipelineStatus, string> = {
  new_lead: 'New Lead',
  initial_contact: 'Initial Contact',
  interested: 'Interested',
  property_assessed: 'Property Assessed',
  visit_scheduled: 'Visit Scheduled',
  visit_complete: 'Visit Complete',
  proposal_prepared: 'Proposal Prepared',
  proposal_sent: 'Proposal Sent',
  proposal_reviewing: 'Reviewing Proposal',
  verbal_agreement: 'Verbal Agreement',
  contract_sent: 'Contract Sent',
  contracted: 'Contracted',
  g99_submitted: 'G99 Submitted',
  g99_approved: 'G99 Approved',
  installation_scheduled: 'Install Scheduled',
  installed: 'Installed',
  commissioned: 'Commissioned',
  live: 'Live',
  on_hold: 'On Hold',
  lost: 'Lost',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeDate(daysAgo: number): Date {
  const d = new Date('2026-03-25');
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function makeActivity(
  leadId: string,
  daysAgo: number,
  type: 'call' | 'visit' | 'email' | 'note' | 'stage-change',
  desc: string,
) {
  return { id: `act-${leadId}-${daysAgo}`, leadId, type, description: desc, timestamp: makeDate(daysAgo) };
}

function makeFollowUp(leadId: string, daysFromNow: number, desc: string, completed = false) {
  const d = new Date('2026-03-25');
  d.setDate(d.getDate() + daysFromNow);
  return { id: `fu-${leadId}-${daysFromNow}`, leadId, dueDate: d, description: desc, completed };
}

/** Map new PipelineStatus back to legacy PipelineStage for CrmLead compatibility */
function toLegacyStage(status: PipelineStatus): PipelineStage {
  switch (status) {
    case 'new_lead': return 'new';
    case 'initial_contact': return 'contacted';
    case 'interested': return 'contacted';
    case 'property_assessed': return 'qualified';
    case 'visit_scheduled': return 'qualified';
    case 'visit_complete': return 'qualified';
    case 'proposal_prepared': return 'qualified';
    case 'proposal_sent': return 'proposal-sent';
    case 'proposal_reviewing': return 'proposal-sent';
    case 'verbal_agreement': return 'contracted';
    case 'contract_sent': return 'contracted';
    case 'contracted': return 'contracted';
    case 'g99_submitted': return 'installation-scheduled';
    case 'g99_approved': return 'installation-scheduled';
    case 'installation_scheduled': return 'installation-scheduled';
    case 'installed': return 'live';
    case 'commissioned': return 'live';
    case 'live': return 'live';
    case 'on_hold': return 'new';
    case 'lost': return 'new';
  }
}

// ── Lead seed data ─────────────────────────────────────────────────────────────

const leadSeeds: Array<{
  id: string;
  homeId?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  source: LeadSource;
  referredBy?: string;
  status: PipelineStatus;
  propertyScore: number;
  engagementScore: number;
  systemSize: string;
  systemKw: number;
  revenue: number;
  daysAgo: number;
  daysInCurrentStatus: number;
  distanceToSubstationKm?: number;
  substationLoadPercent?: number;
  phaseType?: '1-phase' | '3-phase';
  nearbyInstallations?: number;
}> = [
  // The Beeches — first entry, linked to homeId 00000000-0000-0000-0000-000000000001
  {
    id: 'lead-000',
    homeId: '00000000-0000-0000-0000-000000000001',
    name: 'The Beeches (Dave Middleton)',
    email: 'dave@rosestack.co.uk',
    phone: '07700 100000',
    address: 'The Beeches, Clitheroe Road, Whalley',
    postcode: 'BB7 9TG',
    source: 'other',
    status: 'live',
    propertyScore: 95,
    engagementScore: 100,
    systemSize: '13.5 kWh',
    systemKw: 6,
    revenue: 1650,
    daysAgo: 365,
    daysInCurrentStatus: 180,
    distanceToSubstationKm: 0.3,
    substationLoadPercent: 45,
    phaseType: '3-phase',
    nearbyInstallations: 0,
  },
  { id: 'lead-001', name: 'James Hartley', email: 'james.hartley@email.com', phone: '07700 900123', address: '14 Whalley Road, Clitheroe', postcode: 'BB7 1AA', source: 'referral', referredBy: 'lead-010', status: 'live', propertyScore: 82, engagementScore: 95, systemSize: '13.5 kWh', systemKw: 6, revenue: 1420, daysAgo: 120, daysInCurrentStatus: 60, distanceToSubstationKm: 0.5, substationLoadPercent: 50, phaseType: '3-phase', nearbyInstallations: 1 },
  { id: 'lead-002', name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '07700 900456', address: '8 Preston New Road, Blackburn', postcode: 'BB2 3AA', source: 'door-knock', status: 'contracted', propertyScore: 74, engagementScore: 88, systemSize: '10.0 kWh', systemKw: 5, revenue: 1180, daysAgo: 90, daysInCurrentStatus: 20, distanceToSubstationKm: 1.2, substationLoadPercent: 65, phaseType: '1-phase', nearbyInstallations: 0 },
  { id: 'lead-003', name: 'David Thompson', email: 'dthompson@email.com', phone: '07700 900789', address: '22 Ribble Valley Way, Wilpshire', postcode: 'BB1 9EF', source: 'club', referredBy: 'club-001', status: 'installation_scheduled', propertyScore: 88, engagementScore: 92, systemSize: '13.5 kWh', systemKw: 6, revenue: 1560, daysAgo: 75, daysInCurrentStatus: 10, distanceToSubstationKm: 0.8, substationLoadPercent: 72, phaseType: '3-phase', nearbyInstallations: 1 },
  { id: 'lead-004', name: 'Emma Richardson', email: 'emma.r@email.com', phone: '07700 901234', address: '5 Mellor Lane, Mellor', postcode: 'BB2 7EH', source: 'website', status: 'proposal_reviewing', propertyScore: 79, engagementScore: 70, systemSize: '13.5 kWh', systemKw: 6, revenue: 1350, daysAgo: 30, daysInCurrentStatus: 5 },
  { id: 'lead-005', name: 'Robert Blackburn', email: 'rob.b@email.com', phone: '07700 901567', address: '31 Longridge Road, Ribchester', postcode: 'BB7 4PQ', source: 'referral', referredBy: 'lead-001', status: 'interested', propertyScore: 71, engagementScore: 65, systemSize: '10.0 kWh', systemKw: 5, revenue: 1100, daysAgo: 21, daysInCurrentStatus: 8 },
  { id: 'lead-006', name: 'Catherine Walker', email: 'cwalker@email.com', phone: '07700 901890', address: '17 Pendle View, Barrowford', postcode: 'BB9 6AQ', source: 'door-knock', status: 'initial_contact', propertyScore: 63, engagementScore: 40, systemSize: '10.0 kWh', systemKw: 5, revenue: 980, daysAgo: 14, daysInCurrentStatus: 7 },
  { id: 'lead-007', name: 'Michael Greenwood', email: 'mgreenwood@email.com', phone: '07700 902123', address: '9 Calder Close, Whalley', postcode: 'BB7 9SQ', source: 'social', status: 'new_lead', propertyScore: 85, engagementScore: 20, systemSize: '13.5 kWh', systemKw: 6, revenue: 1480, daysAgo: 5, daysInCurrentStatus: 5 },
  { id: 'lead-008', name: 'Lisa Hargreaves', email: 'lisa.h@email.com', phone: '07700 902456', address: '42 Bolton Road, Darwen', postcode: 'BB3 1QQ', source: 'website', status: 'new_lead', propertyScore: 56, engagementScore: 15, systemSize: '5.0 kWh', systemKw: 3, revenue: 720, daysAgo: 3, daysInCurrentStatus: 3 },
  { id: 'lead-009', name: 'Andrew Pickup', email: 'apickup@email.com', phone: '07700 902789', address: '6 Rossendale Drive, Haslingden', postcode: 'BB4 5QJ', source: 'club', referredBy: 'club-002', status: 'initial_contact', propertyScore: 68, engagementScore: 45, systemSize: '10.0 kWh', systemKw: 5, revenue: 1050, daysAgo: 10, daysInCurrentStatus: 4 },
  { id: 'lead-010', name: 'Margaret Duxbury', email: 'mduxbury@email.com', phone: '07700 903012', address: '28 Clitheroe Road, Sabden', postcode: 'BB7 9DX', source: 'door-knock', status: 'live', propertyScore: 76, engagementScore: 90, systemSize: '13.5 kWh', systemKw: 6, revenue: 1380, daysAgo: 180, daysInCurrentStatus: 90, distanceToSubstationKm: 1.8, substationLoadPercent: 55, phaseType: '3-phase', nearbyInstallations: 0 },
  { id: 'lead-011', name: 'Peter Nuttall', email: 'pnuttall@email.com', phone: '07700 903345', address: '15 Read Lane, Read', postcode: 'BB12 7PQ', source: 'referral', referredBy: 'lead-010', status: 'proposal_sent', propertyScore: 72, engagementScore: 75, systemSize: '10.0 kWh', systemKw: 5, revenue: 1150, daysAgo: 18, daysInCurrentStatus: 6 },
  { id: 'lead-012', name: 'Karen Whitehead', email: 'kwhitehead@email.com', phone: '07700 903678', address: '3 Hyndburn Avenue, Great Harwood', postcode: 'BB6 7AZ', source: 'social', status: 'new_lead', propertyScore: 60, engagementScore: 10, systemSize: '10.0 kWh', systemKw: 5, revenue: 890, daysAgo: 1, daysInCurrentStatus: 1 },
  { id: 'lead-013', name: 'John Aspin', email: 'jaspin@email.com', phone: '07700 903901', address: '19 Burnley Road, Padiham', postcode: 'BB12 8HP', source: 'door-knock', status: 'property_assessed', propertyScore: 65, engagementScore: 60, systemSize: '10.0 kWh', systemKw: 5, revenue: 1020, daysAgo: 25, daysInCurrentStatus: 7 },
  { id: 'lead-014', name: 'Susan Crossley', email: 'scrossley@email.com', phone: '07700 904234', address: '7 Wilpshire Drive, Wilpshire', postcode: 'BB1 9DE', source: 'referral', referredBy: 'lead-001', status: 'initial_contact', propertyScore: 83, engagementScore: 50, systemSize: '13.5 kWh', systemKw: 6, revenue: 1500, daysAgo: 8, daysInCurrentStatus: 4 },
  { id: 'lead-015', name: 'Thomas Hindle', email: 'thindle@email.com', phone: '07700 904567', address: '24 Accrington Road, Burnley', postcode: 'BB5 2AB', source: 'website', status: 'new_lead', propertyScore: 58, engagementScore: 5, systemSize: '5.0 kWh', systemKw: 3, revenue: 750, daysAgo: 2, daysInCurrentStatus: 2 },
  { id: 'lead-016', name: 'Rachel Bury', email: 'rbury@email.com', phone: '07700 904890', address: '11 Langho Close, Langho', postcode: 'BB7 9TH', source: 'club', referredBy: 'club-001', status: 'proposal_sent', propertyScore: 80, engagementScore: 78, systemSize: '13.5 kWh', systemKw: 6, revenue: 1400, daysAgo: 22, daysInCurrentStatus: 8 },
  { id: 'lead-017', name: 'William Haworth', email: 'whaworth@email.com', phone: '07700 905123', address: '36 Haslingden Road, Rawtenstall', postcode: 'BB4 6QR', source: 'door-knock', status: 'g99_submitted', propertyScore: 70, engagementScore: 85, systemSize: '10.0 kWh', systemKw: 5, revenue: 1120, daysAgo: 60, daysInCurrentStatus: 14, distanceToSubstationKm: 1.5, substationLoadPercent: 78, phaseType: '1-phase', nearbyInstallations: 2 },
  { id: 'lead-018', name: 'Helen Ingham', email: 'hingham@email.com', phone: '07700 905456', address: '2 Padiham Road, Burnley', postcode: 'BB12 6TQ', source: 'referral', referredBy: 'lead-010', status: 'interested', propertyScore: 67, engagementScore: 55, systemSize: '10.0 kWh', systemKw: 5, revenue: 1000, daysAgo: 16, daysInCurrentStatus: 6 },
];

// ── Build Lead[] (new type) ────────────────────────────────────────────────────

export const newLeads: Lead[] = leadSeeds.map(s => {
  const inStage3Plus = ['verbal_agreement', 'contract_sent', 'contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live'].includes(s.status);

  const g99Assessment =
    inStage3Plus && s.distanceToSubstationKm !== undefined
      ? assessG99Probability({
          distanceToSubstationKm: s.distanceToSubstationKm,
          substationLoadPercent: s.substationLoadPercent ?? 50,
          systemKw: s.systemKw,
          phaseType: s.phaseType ?? '1-phase',
          nearbyInstallations: s.nearbyInstallations,
        })
      : undefined;

  return {
    id: s.id,
    homeId: s.homeId,
    name: s.name,
    email: s.email,
    phone: s.phone,
    address: s.address,
    postcode: s.postcode,
    source: s.source,
    referredBy: s.referredBy,
    status: s.status,
    propertyScore: s.propertyScore,
    engagementScore: s.engagementScore,
    totalScore: Math.round(s.propertyScore * 0.6 + s.engagementScore * 0.4),
    activities: [
      makeActivity(s.id, s.daysAgo, 'note', `Lead created from ${s.source}`),
      ...(s.status !== 'new_lead' ? [makeActivity(s.id, s.daysAgo - 2, 'call', 'Initial contact call')] : []),
      ...(['property_assessed', 'visit_scheduled', 'visit_complete', 'proposal_prepared', 'proposal_sent', 'proposal_reviewing', 'verbal_agreement', 'contract_sent', 'contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live'].includes(s.status)
        ? [makeActivity(s.id, s.daysAgo - 5, 'visit', 'Property assessment visit')]
        : []),
      ...(['proposal_sent', 'proposal_reviewing', 'verbal_agreement', 'contract_sent', 'contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live'].includes(s.status)
        ? [makeActivity(s.id, s.daysAgo - 10, 'email', 'Proposal sent via email')]
        : []),
    ],
    followUps: ['new_lead', 'initial_contact', 'interested', 'property_assessed', 'visit_scheduled', 'proposal_sent', 'proposal_reviewing'].includes(s.status)
      ? [makeFollowUp(s.id, 3, `Follow up with ${s.name}`)]
      : [],
    estimatedSystemSize: s.systemSize,
    estimatedAnnualRevenue: s.revenue,
    daysInCurrentStatus: s.daysInCurrentStatus,
    g99Assessment,
    createdAt: makeDate(s.daysAgo),
    updatedAt: makeDate(Math.max(0, s.daysAgo - 5)),
  };
});

// ── Build CrmLead[] (legacy type, preserves backward compat) ──────────────────

export const leads: CrmLead[] = leadSeeds.map(s => ({
  id: s.id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  address: s.address,
  postcode: s.postcode,
  source: s.source,
  referredBy: s.referredBy,
  stage: toLegacyStage(s.status),
  propertyScore: s.propertyScore,
  engagementScore: s.engagementScore,
  totalScore: Math.round(s.propertyScore * 0.6 + s.engagementScore * 0.4),
  activities: [
    makeActivity(s.id, s.daysAgo, 'note', `Lead created from ${s.source}`),
    ...(s.status !== 'new_lead' ? [makeActivity(s.id, s.daysAgo - 2, 'call', 'Initial contact call')] : []),
    ...(['property_assessed', 'visit_scheduled', 'visit_complete', 'proposal_prepared', 'proposal_sent', 'proposal_reviewing', 'verbal_agreement', 'contract_sent', 'contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live'].includes(s.status)
      ? [makeActivity(s.id, s.daysAgo - 5, 'visit', 'Property assessment visit')]
      : []),
    ...(['proposal_sent', 'proposal_reviewing', 'verbal_agreement', 'contract_sent', 'contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live'].includes(s.status)
      ? [makeActivity(s.id, s.daysAgo - 10, 'email', 'Proposal sent via email')]
      : []),
  ],
  followUps: ['new_lead', 'initial_contact', 'interested', 'property_assessed', 'visit_scheduled', 'proposal_sent', 'proposal_reviewing'].includes(s.status)
    ? [makeFollowUp(s.id, 3, `Follow up with ${s.name}`)]
    : [],
  estimatedSystemSize: s.systemSize,
  estimatedAnnualRevenue: s.revenue,
  createdAt: makeDate(s.daysAgo),
  updatedAt: makeDate(Math.max(0, s.daysAgo - 5)),
}));

// ── Referral Data ──────────────────────────────────────────────────────────────

export const referrals: Referral[] = [
  { id: 'ref-001', referrerName: 'Margaret Duxbury', referrerCode: 'DUXBURY28', referrerLeadId: 'lead-010', refereeName: 'James Hartley', refereeLeadId: 'lead-001', status: 'converted', rewardAmount: 200, rewardPaid: true, createdAt: makeDate(130) },
  { id: 'ref-002', referrerName: 'Margaret Duxbury', referrerCode: 'DUXBURY28', referrerLeadId: 'lead-010', refereeName: 'Peter Nuttall', refereeLeadId: 'lead-011', status: 'contacted', rewardAmount: 250, rewardPaid: false, createdAt: makeDate(20) },
  { id: 'ref-003', referrerName: 'Margaret Duxbury', referrerCode: 'DUXBURY28', referrerLeadId: 'lead-010', refereeName: 'Helen Ingham', refereeLeadId: 'lead-018', status: 'contacted', rewardAmount: 300, rewardPaid: false, createdAt: makeDate(18) },
  { id: 'ref-004', referrerName: 'James Hartley', referrerCode: 'HARTLEY14', referrerLeadId: 'lead-001', refereeName: 'Robert Blackburn', refereeLeadId: 'lead-005', status: 'contacted', rewardAmount: 200, rewardPaid: false, createdAt: makeDate(25) },
  { id: 'ref-005', referrerName: 'James Hartley', referrerCode: 'HARTLEY14', referrerLeadId: 'lead-001', refereeName: 'Susan Crossley', refereeLeadId: 'lead-014', status: 'pending', rewardAmount: 250, rewardPaid: false, createdAt: makeDate(10) },
];

export function getReferrerProfiles(): ReferrerProfile[] {
  const profileMap = new Map<string, ReferrerProfile>();

  for (const ref of referrals) {
    let profile = profileMap.get(ref.referrerLeadId);
    if (!profile) {
      profile = {
        leadId: ref.referrerLeadId,
        name: ref.referrerName,
        code: ref.referrerCode,
        totalReferrals: 0,
        convertedReferrals: 0,
        totalRewardsEarned: 0,
        totalRewardsPaid: 0,
        referrals: [],
      };
      profileMap.set(ref.referrerLeadId, profile);
    }
    profile.totalReferrals++;
    if (ref.status === 'converted') profile.convertedReferrals++;
    profile.totalRewardsEarned += ref.rewardAmount;
    if (ref.rewardPaid) profile.totalRewardsPaid += ref.rewardAmount;
    profile.referrals.push(ref);
  }

  return Array.from(profileMap.values()).sort((a, b) => b.totalReferrals - a.totalReferrals);
}

// ── Campaign Data ──────────────────────────────────────────────────────────────

export const campaigns: Campaign[] = [
  { id: 'camp-001', name: 'Clitheroe Door Knock - Phase 1', type: 'door-knock', area: 'Clitheroe Town Centre', postcode: 'BB7', startDate: makeDate(90), endDate: makeDate(85), doorsKnocked: 120, leadsGenerated: 8, conversions: 2, cost: 150, notes: 'Focused on large detached properties on Whalley Road corridor' },
  { id: 'camp-002', name: 'Wilpshire Premium Homes', type: 'door-knock', area: 'Wilpshire & Langho', postcode: 'BB1', startDate: makeDate(60), endDate: makeDate(55), doorsKnocked: 85, leadsGenerated: 6, conversions: 1, cost: 120, notes: 'High affluence area, good three-phase likelihood' },
  { id: 'camp-003', name: 'Facebook Energy Costs Campaign', type: 'social', area: 'East Lancashire', postcode: 'BB1-BB12', startDate: makeDate(45), leadsGenerated: 4, conversions: 0, cost: 250, notes: 'Targeted homeowners 35-65 with energy cost content' },
  { id: 'camp-004', name: 'Whalley Cricket Club Event', type: 'club-event', area: 'Whalley', postcode: 'BB7', startDate: makeDate(30), leadsGenerated: 3, conversions: 1, cost: 75, notes: 'Presented at AGM, strong interest from committee members' },
  { id: 'camp-005', name: 'Darwen Leaflet Drop', type: 'leaflet', area: 'Darwen', postcode: 'BB3', startDate: makeDate(20), leadsGenerated: 2, conversions: 0, cost: 180, notes: '500 leaflets distributed to BB3 detached homes' },
  { id: 'camp-006', name: 'Burnley Rural Door Knock', type: 'door-knock', area: 'Padiham & Read', postcode: 'BB12', startDate: makeDate(15), doorsKnocked: 65, leadsGenerated: 3, conversions: 0, cost: 100, notes: 'Mixed results — good properties but lower engagement' },
];

// ── Club Partnership Data ──────────────────────────────────────────────────────

export const clubPartnerships: ClubPartnership[] = [
  { id: 'club-001', clubName: 'Whalley Cricket Club', clubType: 'cricket', contactName: 'Brian Marsden', contactPhone: '07700 800111', contactEmail: 'brian@whalleycc.co.uk', status: 'active', sponsorshipAmount: 500, referralsPipeline: 4, referralsConverted: 1, notes: 'Sponsor for 2026 season. AGM presentation went well. Several committee members have large homes.', lastContact: makeDate(5) },
  { id: 'club-002', clubName: 'Clitheroe Bowling Club', clubType: 'bowling', contactName: 'Dorothy Hartley', contactPhone: '07700 800222', contactEmail: 'dorothy@clitheroebowls.co.uk', status: 'active', sponsorshipAmount: 250, referralsPipeline: 2, referralsConverted: 0, notes: 'Older membership demographic. Good word-of-mouth potential.', lastContact: makeDate(12) },
  { id: 'club-003', clubName: 'Blackburn RUFC', clubType: 'rugby', contactName: 'Steve Whittaker', contactPhone: '07700 800333', contactEmail: 'steve@blackburnrufc.co.uk', status: 'in-discussion', referralsPipeline: 0, referralsConverted: 0, notes: 'Initial meeting held. Interested in clubhouse installation + member referrals. Large membership base in BB1/BB2.', lastContact: makeDate(8) },
  { id: 'club-004', clubName: 'Ribble Valley Golf Club', clubType: 'golf', contactName: 'Martin Ainsworth', contactPhone: '07700 800444', contactEmail: 'martin@rvgolf.co.uk', status: 'initial-contact', referralsPipeline: 0, referralsConverted: 0, notes: 'High affluence membership. Perfect demographic. Awaiting committee meeting.', lastContact: makeDate(15) },
  { id: 'club-005', clubName: 'Padiham FC', clubType: 'football', contactName: 'Andy Brennan', contactPhone: '07700 800555', status: 'initial-contact', referralsPipeline: 0, referralsConverted: 0, notes: 'Community club with good local presence. Lower affluence area but high visibility.', lastContact: makeDate(20) },
];

// ── Email Templates ────────────────────────────────────────────────────────────

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'tpl-welcome',
    name: 'Welcome Pack',
    type: 'welcome',
    subject: 'Welcome to RoseStack Energy — Your Installation Guide',
    sections: [
      { heading: 'Welcome to RoseStack', content: 'Congratulations on your new RoseStack energy system! This email contains everything you need to know about what happens next.' },
      { heading: 'What to Expect', content: 'Your battery system has been installed and is now being optimised for your energy tariff. Over the next few days, our team will fine-tune the charging and discharging schedule to maximise your savings.' },
      { heading: 'How It Works', content: 'Your battery charges when electricity is cheapest (typically overnight) and discharges when it is most expensive. You do not need to do anything — our system handles this automatically. You will continue to use your energy supplier app (e.g. Octopus) as normal.' },
      { heading: 'Your Monthly Payment', content: 'Your fixed monthly payment of [AMOUNT] covers everything: the battery system, maintenance, insurance, and monitoring. No hidden costs.' },
      { heading: 'Need Help?', content: 'Contact us at hello@rosestack.co.uk or call 01200 200 300. We aim to respond within 24 hours.' },
      { heading: 'Refer a Friend', content: 'Know someone who could benefit? Share your unique referral link: rosestack.co.uk/refer/[CODE]. You will earn rewards for every successful referral!' },
    ],
  },
  {
    id: 'tpl-monthly',
    name: 'Monthly Statement',
    type: 'monthly-statement',
    subject: 'Your RoseStack Monthly Statement — [MONTH] [YEAR]',
    sections: [
      { heading: 'Monthly Summary', content: 'Here is your RoseStack energy statement for [MONTH] [YEAR].' },
      { heading: 'Payment', content: 'Monthly payment received: [AMOUNT]. Cumulative payments to date: [CUMULATIVE].' },
      { heading: 'System Performance', content: 'System status: [STATUS]. Energy arbitraged this month: [KWH] kWh. Estimated savings generated: [SAVINGS].', showScenarios: true },
      { heading: 'Referral Balance', content: 'Referral rewards earned: [REWARDS]. Share your link: rosestack.co.uk/refer/[CODE].' },
    ],
  },
  {
    id: 'tpl-annual',
    name: 'Annual Summary',
    type: 'annual-summary',
    subject: 'Your RoseStack Annual Summary — [YEAR]',
    sections: [
      { heading: 'Year in Review', content: 'Here is your annual summary for [YEAR] with your RoseStack energy system.' },
      { heading: 'Financial Summary', content: 'Total payments received: [TOTAL]. System value to date: [VALUE].', showScenarios: true },
      { heading: 'Environmental Impact', content: 'Estimated CO2 saved: [CO2] kg. Equivalent to [TREES] trees planted.' },
      { heading: 'System Health', content: 'Battery health: [HEALTH]%. Maintenance visits: [VISITS]. Next scheduled maintenance: [NEXT_MAINT].' },
      { heading: 'Contract Update', content: 'Contract anniversary: [ANNIVERSARY]. Remaining term: [REMAINING] years.' },
      { heading: 'Referral Summary', content: 'Total referrals made: [REF_COUNT]. Rewards earned: [REF_REWARDS].' },
    ],
  },
  {
    id: 'tpl-referral',
    name: 'Referral Invite',
    type: 'referral-invite',
    subject: '[REFERRER_NAME] thinks you would love RoseStack Energy',
    sections: [
      { heading: 'You Have Been Referred', content: '[REFERRER_NAME] is a RoseStack homeowner and thought you might be interested in our proposition.' },
      { heading: 'What Is RoseStack?', content: 'We install a battery storage system in your home at no upfront cost. You pay a fixed monthly amount (typically around £100) and we handle everything: the battery, maintenance, insurance, and tariff optimisation.' },
      { heading: 'Your Projected Savings', content: 'Based on typical homes in your area, our system generates significant energy savings through intelligent battery cycling.', showScenarios: true },
      { heading: 'Get in Touch', content: 'Interested? Reply to this email or call us on 01200 200 300. No obligation, no pressure.' },
    ],
  },
];

// ── Helper functions ───────────────────────────────────────────────────────────

/** Get CrmLead[] by legacy stage (backward compat) */
export function getLeadsByStage(stage: PipelineStage): CrmLead[] {
  return leads.filter(l => l.stage === stage);
}

/** Get Lead[] by PipelineStatus */
export function getLeadsByStatus(status: PipelineStatus): Lead[] {
  return newLeads.filter(l => l.status === status);
}

/** Get Lead[] by stage number (0-5) */
export function getLeadsByStageNumber(stageNum: number): Lead[] {
  return newLeads.filter(l => {
    const stage = PIPELINE_STAGE_DEFINITIONS.find(s => s.statuses.includes(l.status as PipelineStatus));
    return stage?.number === stageNum;
  });
}

export function getLeadById(id: string): CrmLead | undefined {
  return leads.find(l => l.id === id);
}

export function getNewLeadById(id: string): Lead | undefined {
  return newLeads.find(l => l.id === id);
}

// ── Revenue Attribution ────────────────────────────────────────────────────────

export function getRevenueAttribution(): import('./types').RevenueAttribution[] {
  const channels: LeadSource[] = ['referral', 'door-knock', 'website', 'club', 'social', 'other'];
  const campaignCosts: Record<string, number> = {};

  for (const c of campaigns) {
    const src = c.type === 'door-knock' ? 'door-knock'
      : c.type === 'social' ? 'social'
      : c.type === 'club-event' ? 'club'
      : c.type === 'leaflet' ? 'door-knock'
      : 'other';
    campaignCosts[src] = (campaignCosts[src] || 0) + c.cost;
  }

  const liveStatuses: PipelineStatus[] = ['contracted', 'g99_submitted', 'g99_approved', 'installation_scheduled', 'installed', 'commissioned', 'live'];

  return channels.map(channel => {
    const channelLeads = newLeads.filter(l => l.source === channel);
    const converted = channelLeads.filter(l => liveStatuses.includes(l.status));
    const totalLeads = channelLeads.length;
    const convertedLeads = converted.length;

    return {
      channel,
      totalLeads,
      convertedLeads,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      averagePropertyScore: totalLeads > 0 ? Math.round(channelLeads.reduce((s, l) => s + l.propertyScore, 0) / totalLeads) : 0,
      averageAnnualRevenue: convertedLeads > 0 ? Math.round(converted.reduce((s, l) => s + l.estimatedAnnualRevenue, 0) / convertedLeads) : 0,
      totalProjectedRevenue: converted.reduce((s, l) => s + l.estimatedAnnualRevenue, 0),
      costPerAcquisition: convertedLeads > 0 ? Math.round((campaignCosts[channel] || 0) / convertedLeads) : campaignCosts[channel] || 0,
    };
  }).filter(a => a.totalLeads > 0);
}

// ── Referral reward calculation ────────────────────────────────────────────────

export function calculateReferralReward(referralNumber: number): number {
  if (referralNumber <= 1) return 200;
  if (referralNumber === 2) return 250;
  return 300; // 3rd+ referral
}
