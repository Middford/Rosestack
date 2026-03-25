// ============================================================
// Customer Acquisition — Seeded Data
// Lead data, referral data, campaign data, club partnerships
// ============================================================

import type {
  CrmLead,
  Referral,
  ReferrerProfile,
  Campaign,
  ClubPartnership,
  EmailTemplate,
  PipelineStage,
} from './types';
import type { LeadSource } from '@/shared/types';

// --- Seeded Lead Data ---

function makeDate(daysAgo: number): Date {
  const d = new Date('2026-03-25');
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function makeActivity(leadId: string, daysAgo: number, type: 'call' | 'visit' | 'email' | 'note' | 'stage-change', desc: string) {
  return { id: `act-${leadId}-${daysAgo}`, leadId, type, description: desc, timestamp: makeDate(daysAgo) };
}

function makeFollowUp(leadId: string, daysFromNow: number, desc: string, completed = false) {
  const d = new Date('2026-03-25');
  d.setDate(d.getDate() + daysFromNow);
  return { id: `fu-${leadId}-${daysFromNow}`, leadId, dueDate: d, description: desc, completed };
}

const leadSeeds: Array<{
  id: string; name: string; email: string; phone: string;
  address: string; postcode: string; source: LeadSource;
  referredBy?: string; stage: PipelineStage;
  propertyScore: number; engagementScore: number;
  systemSize: string; revenue: number; daysAgo: number;
}> = [
  { id: 'lead-001', name: 'James Hartley', email: 'james.hartley@email.com', phone: '07700 900123', address: '14 Whalley Road, Clitheroe', postcode: 'BB7 1AA', source: 'referral', referredBy: 'lead-010', stage: 'live', propertyScore: 82, engagementScore: 95, systemSize: '13.5 kWh', revenue: 1420, daysAgo: 120 },
  { id: 'lead-002', name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '07700 900456', address: '8 Preston New Road, Blackburn', postcode: 'BB2 3AA', source: 'door-knock', stage: 'contracted', propertyScore: 74, engagementScore: 88, systemSize: '10.0 kWh', revenue: 1180, daysAgo: 90 },
  { id: 'lead-003', name: 'David Thompson', email: 'dthompson@email.com', phone: '07700 900789', address: '22 Ribble Valley Way, Wilpshire', postcode: 'BB1 9EF', source: 'club', referredBy: 'club-001', stage: 'installation-scheduled', propertyScore: 88, engagementScore: 92, systemSize: '13.5 kWh', revenue: 1560, daysAgo: 75 },
  { id: 'lead-004', name: 'Emma Richardson', email: 'emma.r@email.com', phone: '07700 901234', address: '5 Mellor Lane, Mellor', postcode: 'BB2 7EH', source: 'website', stage: 'proposal-sent', propertyScore: 79, engagementScore: 70, systemSize: '13.5 kWh', revenue: 1350, daysAgo: 30 },
  { id: 'lead-005', name: 'Robert Blackburn', email: 'rob.b@email.com', phone: '07700 901567', address: '31 Longridge Road, Ribchester', postcode: 'BB7 4PQ', source: 'referral', referredBy: 'lead-001', stage: 'qualified', propertyScore: 71, engagementScore: 65, systemSize: '10.0 kWh', revenue: 1100, daysAgo: 21 },
  { id: 'lead-006', name: 'Catherine Walker', email: 'cwalker@email.com', phone: '07700 901890', address: '17 Pendle View, Barrowford', postcode: 'BB9 6AQ', source: 'door-knock', stage: 'contacted', propertyScore: 63, engagementScore: 40, systemSize: '10.0 kWh', revenue: 980, daysAgo: 14 },
  { id: 'lead-007', name: 'Michael Greenwood', email: 'mgreenwood@email.com', phone: '07700 902123', address: '9 Calder Close, Whalley', postcode: 'BB7 9SQ', source: 'social', stage: 'new', propertyScore: 85, engagementScore: 20, systemSize: '13.5 kWh', revenue: 1480, daysAgo: 5 },
  { id: 'lead-008', name: 'Lisa Hargreaves', email: 'lisa.h@email.com', phone: '07700 902456', address: '42 Bolton Road, Darwen', postcode: 'BB3 1QQ', source: 'website', stage: 'new', propertyScore: 56, engagementScore: 15, systemSize: '5.0 kWh', revenue: 720, daysAgo: 3 },
  { id: 'lead-009', name: 'Andrew Pickup', email: 'apickup@email.com', phone: '07700 902789', address: '6 Rossendale Drive, Haslingden', postcode: 'BB4 5QJ', source: 'club', referredBy: 'club-002', stage: 'contacted', propertyScore: 68, engagementScore: 45, systemSize: '10.0 kWh', revenue: 1050, daysAgo: 10 },
  { id: 'lead-010', name: 'Margaret Duxbury', email: 'mduxbury@email.com', phone: '07700 903012', address: '28 Clitheroe Road, Sabden', postcode: 'BB7 9DX', source: 'door-knock', stage: 'live', propertyScore: 76, engagementScore: 90, systemSize: '13.5 kWh', revenue: 1380, daysAgo: 180 },
  { id: 'lead-011', name: 'Peter Nuttall', email: 'pnuttall@email.com', phone: '07700 903345', address: '15 Read Lane, Read', postcode: 'BB12 7PQ', source: 'referral', referredBy: 'lead-010', stage: 'proposal-sent', propertyScore: 72, engagementScore: 75, systemSize: '10.0 kWh', revenue: 1150, daysAgo: 18 },
  { id: 'lead-012', name: 'Karen Whitehead', email: 'kwhitehead@email.com', phone: '07700 903678', address: '3 Hyndburn Avenue, Great Harwood', postcode: 'BB6 7AZ', source: 'social', stage: 'new', propertyScore: 60, engagementScore: 10, systemSize: '10.0 kWh', revenue: 890, daysAgo: 1 },
  { id: 'lead-013', name: 'John Aspin', email: 'jaspin@email.com', phone: '07700 903901', address: '19 Burnley Road, Padiham', postcode: 'BB12 8HP', source: 'door-knock', stage: 'qualified', propertyScore: 65, engagementScore: 60, systemSize: '10.0 kWh', revenue: 1020, daysAgo: 25 },
  { id: 'lead-014', name: 'Susan Crossley', email: 'scrossley@email.com', phone: '07700 904234', address: '7 Wilpshire Drive, Wilpshire', postcode: 'BB1 9DE', source: 'referral', referredBy: 'lead-001', stage: 'contacted', propertyScore: 83, engagementScore: 50, systemSize: '13.5 kWh', revenue: 1500, daysAgo: 8 },
  { id: 'lead-015', name: 'Thomas Hindle', email: 'thindle@email.com', phone: '07700 904567', address: '24 Accrington Road, Burnley', postcode: 'BB5 2AB', source: 'website', stage: 'new', propertyScore: 58, engagementScore: 5, systemSize: '5.0 kWh', revenue: 750, daysAgo: 2 },
  { id: 'lead-016', name: 'Rachel Bury', email: 'rbury@email.com', phone: '07700 904890', address: '11 Langho Close, Langho', postcode: 'BB7 9TH', source: 'club', referredBy: 'club-001', stage: 'proposal-sent', propertyScore: 80, engagementScore: 78, systemSize: '13.5 kWh', revenue: 1400, daysAgo: 22 },
  { id: 'lead-017', name: 'William Haworth', email: 'whaworth@email.com', phone: '07700 905123', address: '36 Haslingden Road, Rawtenstall', postcode: 'BB4 6QR', source: 'door-knock', stage: 'contracted', propertyScore: 70, engagementScore: 85, systemSize: '10.0 kWh', revenue: 1120, daysAgo: 60 },
  { id: 'lead-018', name: 'Helen Ingham', email: 'hingham@email.com', phone: '07700 905456', address: '2 Padiham Road, Burnley', postcode: 'BB12 6TQ', source: 'referral', referredBy: 'lead-010', stage: 'qualified', propertyScore: 67, engagementScore: 55, systemSize: '10.0 kWh', revenue: 1000, daysAgo: 16 },
];

export const leads: CrmLead[] = leadSeeds.map(s => ({
  id: s.id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  address: s.address,
  postcode: s.postcode,
  source: s.source,
  referredBy: s.referredBy,
  stage: s.stage,
  propertyScore: s.propertyScore,
  engagementScore: s.engagementScore,
  totalScore: Math.round(s.propertyScore * 0.6 + s.engagementScore * 0.4),
  activities: [
    makeActivity(s.id, s.daysAgo, 'note', `Lead created from ${s.source}`),
    ...(s.stage !== 'new' ? [makeActivity(s.id, s.daysAgo - 2, 'call', 'Initial contact call')] : []),
    ...(s.stage === 'qualified' || s.stage === 'proposal-sent' || s.stage === 'contracted' || s.stage === 'installation-scheduled' || s.stage === 'live' ? [makeActivity(s.id, s.daysAgo - 5, 'visit', 'Property assessment visit')] : []),
    ...(s.stage === 'proposal-sent' || s.stage === 'contracted' || s.stage === 'installation-scheduled' || s.stage === 'live' ? [makeActivity(s.id, s.daysAgo - 10, 'email', 'Proposal sent via email')] : []),
  ],
  followUps: s.stage === 'new' || s.stage === 'contacted' || s.stage === 'qualified' || s.stage === 'proposal-sent'
    ? [makeFollowUp(s.id, 3, `Follow up with ${s.name}`)]
    : [],
  estimatedSystemSize: s.systemSize,
  estimatedAnnualRevenue: s.revenue,
  createdAt: makeDate(s.daysAgo),
  updatedAt: makeDate(Math.max(0, s.daysAgo - 5)),
}));

// --- Referral Data ---

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

// --- Campaign Data ---

export const campaigns: Campaign[] = [
  { id: 'camp-001', name: 'Clitheroe Door Knock - Phase 1', type: 'door-knock', area: 'Clitheroe Town Centre', postcode: 'BB7', startDate: makeDate(90), endDate: makeDate(85), doorsKnocked: 120, leadsGenerated: 8, conversions: 2, cost: 150, notes: 'Focused on large detached properties on Whalley Road corridor' },
  { id: 'camp-002', name: 'Wilpshire Premium Homes', type: 'door-knock', area: 'Wilpshire & Langho', postcode: 'BB1', startDate: makeDate(60), endDate: makeDate(55), doorsKnocked: 85, leadsGenerated: 6, conversions: 1, cost: 120, notes: 'High affluence area, good three-phase likelihood' },
  { id: 'camp-003', name: 'Facebook Energy Costs Campaign', type: 'social', area: 'East Lancashire', postcode: 'BB1-BB12', startDate: makeDate(45), leadsGenerated: 4, conversions: 0, cost: 250, notes: 'Targeted homeowners 35-65 with energy cost content' },
  { id: 'camp-004', name: 'Whalley Cricket Club Event', type: 'club-event', area: 'Whalley', postcode: 'BB7', startDate: makeDate(30), leadsGenerated: 3, conversions: 1, cost: 75, notes: 'Presented at AGM, strong interest from committee members' },
  { id: 'camp-005', name: 'Darwen Leaflet Drop', type: 'leaflet', area: 'Darwen', postcode: 'BB3', startDate: makeDate(20), leadsGenerated: 2, conversions: 0, cost: 180, notes: '500 leaflets distributed to BB3 detached homes' },
  { id: 'camp-006', name: 'Burnley Rural Door Knock', type: 'door-knock', area: 'Padiham & Read', postcode: 'BB12', startDate: makeDate(15), doorsKnocked: 65, leadsGenerated: 3, conversions: 0, cost: 100, notes: 'Mixed results — good properties but lower engagement' },
];

// --- Club Partnership Data ---

export const clubPartnerships: ClubPartnership[] = [
  { id: 'club-001', clubName: 'Whalley Cricket Club', clubType: 'cricket', contactName: 'Brian Marsden', contactPhone: '07700 800111', contactEmail: 'brian@whalleycc.co.uk', status: 'active', sponsorshipAmount: 500, referralsPipeline: 4, referralsConverted: 1, notes: 'Sponsor for 2026 season. AGM presentation went well. Several committee members have large homes.', lastContact: makeDate(5) },
  { id: 'club-002', clubName: 'Clitheroe Bowling Club', clubType: 'bowling', contactName: 'Dorothy Hartley', contactPhone: '07700 800222', contactEmail: 'dorothy@clitheroebowls.co.uk', status: 'active', sponsorshipAmount: 250, referralsPipeline: 2, referralsConverted: 0, notes: 'Older membership demographic. Good word-of-mouth potential.', lastContact: makeDate(12) },
  { id: 'club-003', clubName: 'Blackburn RUFC', clubType: 'rugby', contactName: 'Steve Whittaker', contactPhone: '07700 800333', contactEmail: 'steve@blackburnrufc.co.uk', status: 'in-discussion', referralsPipeline: 0, referralsConverted: 0, notes: 'Initial meeting held. Interested in clubhouse installation + member referrals. Large membership base in BB1/BB2.', lastContact: makeDate(8) },
  { id: 'club-004', clubName: 'Ribble Valley Golf Club', clubType: 'golf', contactName: 'Martin Ainsworth', contactPhone: '07700 800444', contactEmail: 'martin@rvgolf.co.uk', status: 'initial-contact', referralsPipeline: 0, referralsConverted: 0, notes: 'High affluence membership. Perfect demographic. Awaiting committee meeting.', lastContact: makeDate(15) },
  { id: 'club-005', clubName: 'Padiham FC', clubType: 'football', contactName: 'Andy Brennan', contactPhone: '07700 800555', status: 'initial-contact', referralsPipeline: 0, referralsConverted: 0, notes: 'Community club with good local presence. Lower affluence area but high visibility.', lastContact: makeDate(20) },
];

// --- Email Templates ---

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
      { heading: 'Need Help?', content: 'Contact us at hello@rosestack.co.uk or call 01onal 200 300. We aim to respond within 24 hours.' },
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
      { heading: 'Get in Touch', content: 'Interested? Reply to this email or call us on 01onal 200 300. No obligation, no pressure.' },
    ],
  },
];

// --- Helper: Get leads by stage ---

export function getLeadsByStage(stage: PipelineStage): CrmLead[] {
  return leads.filter(l => l.stage === stage);
}

export function getLeadById(id: string): CrmLead | undefined {
  return leads.find(l => l.id === id);
}

// --- Revenue Attribution ---

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

  return channels.map(channel => {
    const channelLeads = leads.filter(l => l.source === channel);
    const converted = channelLeads.filter(l => l.stage === 'contracted' || l.stage === 'installation-scheduled' || l.stage === 'live');
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

// --- Referral reward calculation ---

export function calculateReferralReward(referralNumber: number): number {
  if (referralNumber <= 1) return 200;
  if (referralNumber === 2) return 250;
  return 300; // 3rd+ referral
}
