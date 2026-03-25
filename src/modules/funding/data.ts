// ============================================================
// Funding Module — Data Service
// Lender database, deal structures, covenant tracking,
// investor pipeline, stress testing, and data room management.
// ============================================================

import type {
  BatterySystem,
  Tariff,
  ThreeScenarioProjection,
  ThreeScenarioSummary,
  ScenarioType,
} from '@/shared/types';
import {
  calculateAllScenarios,
  summariseScenarios,
  formatGbp,
  getDscrStatus,
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
} from '@/shared/utils/scenarios';

// ============================================================
// Types
// ============================================================

export type LenderType =
  | 'asset-finance'
  | 'green-fund'
  | 'efg-scheme'
  | 'public-body'
  | 'community-finance'
  | 'bank'
  | 'p2p'
  | 'equity';

export type LenderStatus =
  | 'researching'
  | 'contacted'
  | 'in-discussion'
  | 'term-sheet'
  | 'approved'
  | 'rejected'
  | 'on-hold';

export interface Lender {
  id: string;
  name: string;
  type: LenderType;
  description: string;
  minFunding: number;
  maxFunding: number;
  typicalRate: string;
  typicalTerm: string;
  dscrRequirement: number;
  securityRequired: string[];
  trackRecordNeeded: string;
  personalGuarantee: boolean;
  greenFocused: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  status: LenderStatus;
  notes: string;
  lastContacted?: string;
}

export type DealType =
  | 'hire-purchase'
  | 'lease'
  | 'revenue-based'
  | 'equity-seis'
  | 'equity-eis'
  | 'p2p-lending'
  | 'community-shares'
  | 'crowdfunding'
  | 'mezzanine'
  | 'blended';

export interface DealStructure {
  id: string;
  type: DealType;
  name: string;
  description: string;
  typicalTermYears: number;
  typicalRateRange: string;
  fundingRange: string;
  pros: string[];
  cons: string[];
  suitableFor: string;
  taxBenefits: string[];
  securityNeeded: string[];
  timeToFund: string;
  complexity: 'low' | 'medium' | 'high';
}

export type CovenantStatus = 'green' | 'amber' | 'red';

export interface Covenant {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  currentValue: number;
  status: CovenantStatus;
  lender: string;
  facility: string;
  testFrequency: 'monthly' | 'quarterly' | 'annually';
  lastTested: string;
  nextTest: string;
  breachAction: string;
  trend: 'improving' | 'stable' | 'declining';
}

export type InvestorStage =
  | 'identified'
  | 'contacted'
  | 'nda-signed'
  | 'data-room-access'
  | 'term-sheet'
  | 'committed'
  | 'declined';

export interface Investor {
  id: string;
  name: string;
  type: string;
  investmentRange: string;
  stage: InvestorStage;
  contactName: string;
  contactEmail: string;
  lastActivity: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  interestedAmount?: number;
  committedAmount?: number;
}

export interface StressTestResult {
  id: string;
  name: string;
  description: string;
  dscrBest: number;
  dscrLikely: number;
  dscrWorst: number;
  statusBest: CovenantStatus;
  statusLikely: CovenantStatus;
  statusWorst: CovenantStatus;
  impact: string;
}

export type DataRoomCategory =
  | 'financial'
  | 'legal'
  | 'technical'
  | 'commercial'
  | 'compliance'
  | 'insurance'
  | 'corporate';

export type DocumentStatus = 'draft' | 'ready' | 'shared' | 'signed' | 'expired';

export interface DataRoomDocument {
  id: string;
  name: string;
  category: DataRoomCategory;
  description: string;
  status: DocumentStatus;
  version: string;
  lastUpdated: string;
  uploadedBy: string;
  fileSize: string;
  sharedWith: string[];
  confidentiality: 'public' | 'confidential' | 'highly-confidential';
}

// ============================================================
// Seeded Data — UK Lenders
// ============================================================

export const lenders: Lender[] = [
  {
    id: 'lender-001',
    name: 'Lombard (NatWest)',
    type: 'asset-finance',
    description: 'Major UK asset finance provider, part of NatWest Group. Strong track record in energy asset financing with dedicated green energy team.',
    minFunding: 25000,
    maxFunding: 5000000,
    typicalRate: '5.5%–8.0%',
    typicalTerm: '3–7 years',
    dscrRequirement: 1.25,
    securityRequired: ['Charge on battery assets', 'Assignment of revenue contracts'],
    trackRecordNeeded: '12 months trading + 3 installed systems',
    personalGuarantee: true,
    greenFocused: false,
    contactName: 'Sarah Mitchell',
    contactEmail: 's.mitchell@lombard.co.uk',
    website: 'https://www.lombard.co.uk',
    status: 'researching',
    notes: 'Energy infrastructure team handles battery storage. Requires full business plan and 2-year projections.',
  },
  {
    id: 'lender-002',
    name: 'Close Brothers Asset Finance',
    type: 'asset-finance',
    description: 'Specialist asset finance with renewable energy division. Flexible on early-stage businesses if asset quality is strong.',
    minFunding: 10000,
    maxFunding: 2000000,
    typicalRate: '6.0%–9.0%',
    typicalTerm: '2–5 years',
    dscrRequirement: 1.20,
    securityRequired: ['Charge on battery assets', 'Debenture over company'],
    trackRecordNeeded: '6 months trading, strong management CV',
    personalGuarantee: true,
    greenFocused: false,
    contactName: 'James Park',
    contactEmail: 'j.park@closebrothers.com',
    website: 'https://www.closebrothers.com',
    status: 'researching',
    notes: 'Renewable energy team in Manchester office. More flexible than high street banks on early-stage.',
  },
  {
    id: 'lender-003',
    name: 'Green Finance Institute',
    type: 'green-fund',
    description: 'Government-backed institute connecting green projects with finance. Not a direct lender but facilitates introductions and co-designs financing solutions.',
    minFunding: 50000,
    maxFunding: 10000000,
    typicalRate: 'Varies by product',
    typicalTerm: '5–15 years',
    dscrRequirement: 1.15,
    securityRequired: ['Project-specific'],
    trackRecordNeeded: 'Viable business plan, green credentials',
    personalGuarantee: false,
    greenFocused: true,
    contactName: 'Emma Collins',
    contactEmail: 'e.collins@greenfinanceinstitute.co.uk',
    website: 'https://www.greenfinanceinstitute.co.uk',
    status: 'researching',
    notes: 'Key connector in UK green finance ecosystem. Can design bespoke structures. Worth an early conversation.',
  },
  {
    id: 'lender-004',
    name: 'British Business Bank — EFG Scheme',
    type: 'efg-scheme',
    description: 'Enterprise Finance Guarantee scheme provides government-backed guarantee (75%) to lenders for SMEs lacking security. Current cap £1.2M.',
    minFunding: 1000,
    maxFunding: 1200000,
    typicalRate: '5.0%–8.0% + 2% EFG fee',
    typicalTerm: '1–10 years',
    dscrRequirement: 1.10,
    securityRequired: ['Government guarantee covers 75%', 'Residual personal guarantee may apply'],
    trackRecordNeeded: 'UK-based SME, viable proposition, unable to secure finance otherwise',
    personalGuarantee: false,
    greenFocused: false,
    contactName: 'BBB Enquiries',
    contactEmail: 'enquiries@british-business-bank.co.uk',
    website: 'https://www.british-business-bank.co.uk',
    status: 'researching',
    notes: 'Applied through accredited lenders (NatWest, Lloyds, HSBC etc). 2% annual fee on guaranteed amount. Strong option for first tranche.',
  },
  {
    id: 'lender-005',
    name: 'Triodos Bank',
    type: 'green-fund',
    description: 'Ethical bank focused exclusively on sustainable projects. Strong appetite for community energy and storage. Longer assessment but competitive rates.',
    minFunding: 50000,
    maxFunding: 3000000,
    typicalRate: '4.5%–6.5%',
    typicalTerm: '5–15 years',
    dscrRequirement: 1.20,
    securityRequired: ['Charge on assets', 'Assignment of contracts'],
    trackRecordNeeded: '12 months trading, demonstrable environmental benefit',
    personalGuarantee: false,
    greenFocused: true,
    contactName: 'Marcus Webb',
    contactEmail: 'm.webb@triodos.co.uk',
    website: 'https://www.triodos.co.uk',
    status: 'researching',
    notes: 'Known for financing community energy projects. May offer better terms given green credentials. 8-12 week assessment.',
  },
  {
    id: 'lender-006',
    name: 'Abundance Investment',
    type: 'community-finance',
    description: 'FCA-regulated community investment platform for green energy projects. Issues ISA-eligible debentures to retail investors.',
    minFunding: 100000,
    maxFunding: 5000000,
    typicalRate: '5.0%–7.0%',
    typicalTerm: '5–20 years',
    dscrRequirement: 1.15,
    securityRequired: ['Debenture', 'Ring-fenced SPV'],
    trackRecordNeeded: 'Proven business model, FCA-compliant documentation',
    personalGuarantee: false,
    greenFocused: true,
    contactName: 'Louise Wilson',
    contactEmail: 'l.wilson@abundanceinvestment.com',
    website: 'https://www.abundanceinvestment.com',
    status: 'researching',
    notes: 'Community investment model aligns well with RoseStack values. Requires SPV structure. ISA-eligible is a strong selling point.',
  },
  {
    id: 'lender-007',
    name: 'Ethex',
    type: 'community-finance',
    description: 'Positive investment platform connecting social enterprises with investors. Specialises in community energy share offers.',
    minFunding: 50000,
    maxFunding: 2000000,
    typicalRate: '4.0%–6.0%',
    typicalTerm: '10–20 years',
    dscrRequirement: 1.10,
    securityRequired: ['Community benefit society structure'],
    trackRecordNeeded: 'Community benefit focus, social enterprise credentials',
    personalGuarantee: false,
    greenFocused: true,
    contactName: 'Platform Team',
    contactEmail: 'hello@ethex.org.uk',
    website: 'https://www.ethex.org.uk',
    status: 'researching',
    notes: 'Community share model could work for Phase 2. Requires CBS structure. Strong community engagement angle.',
  },
  {
    id: 'lender-008',
    name: 'Octopus Energy Generation',
    type: 'green-fund',
    description: 'Investment arm of Octopus Energy. Invests in renewable energy generation and storage projects across the UK.',
    minFunding: 250000,
    maxFunding: 20000000,
    typicalRate: '4.0%–6.0%',
    typicalTerm: '10–25 years',
    dscrRequirement: 1.30,
    securityRequired: ['Full security package', 'SPV structure', 'Insurance assignment'],
    trackRecordNeeded: 'Proven technology, contracted revenue, experienced team',
    personalGuarantee: false,
    greenFocused: true,
    contactName: 'Investment Team',
    contactEmail: 'generation@octopus.energy',
    website: 'https://octopusenergygeneration.com',
    status: 'researching',
    notes: 'Strategic fit given Octopus tariff dependency. Could provide both funding and commercial partnership. Phase 2+ conversation.',
  },
  {
    id: 'lender-009',
    name: 'Crowdcube',
    type: 'equity',
    description: 'Leading UK equity crowdfunding platform. SEIS/EIS eligible investments. Strong for early-stage companies with consumer-facing story.',
    minFunding: 50000,
    maxFunding: 5000000,
    typicalRate: 'Equity dilution',
    typicalTerm: 'N/A — equity',
    dscrRequirement: 0,
    securityRequired: ['None — equity investment'],
    trackRecordNeeded: 'Compelling story, some traction, SEIS/EIS advance assurance',
    personalGuarantee: false,
    greenFocused: false,
    contactName: 'Issuer Team',
    contactEmail: 'issuers@crowdcube.com',
    website: 'https://www.crowdcube.com',
    status: 'researching',
    notes: 'SEIS first £150k then EIS for larger round. Green energy + community angle plays well on platform. 6-8 week campaign.',
  },
  {
    id: 'lender-010',
    name: 'Seedrs',
    type: 'equity',
    description: 'UK equity crowdfunding platform (now part of Republic). Strong investor base interested in impact and sustainability.',
    minFunding: 25000,
    maxFunding: 2000000,
    typicalRate: 'Equity dilution',
    typicalTerm: 'N/A — equity',
    dscrRequirement: 0,
    securityRequired: ['None — equity investment'],
    trackRecordNeeded: 'Early-stage acceptable with strong proposition',
    personalGuarantee: false,
    greenFocused: false,
    contactName: 'Launch Team',
    contactEmail: 'launch@seedrs.com',
    website: 'https://www.seedrs.com',
    status: 'researching',
    notes: 'Alternative to Crowdcube. Nominee structure simpler for cap table. Consider for SEIS round.',
  },
  {
    id: 'lender-011',
    name: 'Innovate UK — Energy Catalyst',
    type: 'public-body',
    description: 'Grant funding for innovative energy projects. Non-dilutive funding for R&D and pilot phases.',
    minFunding: 25000,
    maxFunding: 500000,
    typicalRate: 'Grant — no repayment',
    typicalTerm: '12–24 months',
    dscrRequirement: 0,
    securityRequired: ['Match funding required (typically 30-50%)'],
    trackRecordNeeded: 'Innovation element, UK-based company',
    personalGuarantee: false,
    greenFocused: true,
    contactName: 'Competitions Team',
    website: 'https://www.ukri.org/councils/innovate-uk/',
    status: 'researching',
    notes: 'Monitor open competitions. Battery storage + AI optimisation could qualify. Non-dilutive but competitive.',
  },
  {
    id: 'lender-012',
    name: 'Funding Circle',
    type: 'p2p',
    description: 'UK P2P lending platform for SMEs. Quick decisions, flexible terms. Higher rates but faster than traditional lenders.',
    minFunding: 10000,
    maxFunding: 500000,
    typicalRate: '7.0%–12.0%',
    typicalTerm: '1–5 years',
    dscrRequirement: 1.15,
    securityRequired: ['Personal guarantee', 'Debenture'],
    trackRecordNeeded: '12+ months trading, £100k+ revenue',
    personalGuarantee: true,
    greenFocused: false,
    contactName: 'Business Team',
    website: 'https://www.fundingcircle.com',
    status: 'researching',
    notes: 'Good for bridge funding or working capital. Higher rates but fast (days not weeks).',
  },
];

// ============================================================
// Seeded Data — Deal Structures
// ============================================================

export const dealStructures: DealStructure[] = [
  {
    id: 'deal-hp',
    type: 'hire-purchase',
    name: 'Hire Purchase',
    description: 'Traditional asset finance. Fixed monthly payments over agreed term. RoseStack owns the equipment from day one (beneficial ownership) with full ownership transferring at end of term.',
    typicalTermYears: 5,
    typicalRateRange: '5.5%–8.0%',
    fundingRange: '£10k–£2M per facility',
    pros: [
      'Immediate beneficial ownership of battery assets',
      'Fixed, predictable monthly payments',
      'Capital allowances claimable (Annual Investment Allowance)',
      'Well-understood by UK lenders',
      'Battery asset retains value as security',
    ],
    cons: [
      'Requires deposit (typically 10-20%)',
      'Personal guarantee usually required for early-stage',
      'Asset on balance sheet (affects gearing)',
      'Less flexible than lease for upgrades',
    ],
    suitableFor: 'First 10-50 installations. Most likely first funding route.',
    taxBenefits: ['Annual Investment Allowance (AIA) — 100% first-year allowance', 'Writing down allowance if beyond AIA cap'],
    securityNeeded: ['Charge on battery equipment', 'Assignment of ESA contracts', 'Personal guarantee (early stage)'],
    timeToFund: '2–4 weeks',
    complexity: 'low',
  },
  {
    id: 'deal-lease',
    type: 'lease',
    name: 'Finance Lease',
    description: 'Lease the battery equipment from a finance company. Lower upfront cost but no ownership at end of primary period. Secondary rental period typically at peppercorn rent.',
    typicalTermYears: 5,
    typicalRateRange: '6.0%–9.0%',
    fundingRange: '£10k–£5M per facility',
    pros: [
      'Lower upfront cost (no deposit typically)',
      'Off-balance sheet treatment possible (operating lease)',
      'Easier to upgrade equipment at end of term',
      'VAT spread across rental payments',
    ],
    cons: [
      'No ownership — lessor retains title',
      'Total cost higher than HP over term',
      'Less capital allowances available',
      'Residual value risk if technology changes',
    ],
    suitableFor: 'When preserving cash is priority or if planning technology upgrades.',
    taxBenefits: ['Lease payments fully deductible as business expense'],
    securityNeeded: ['Lessor retains title to equipment', 'Assignment of ESA revenue'],
    timeToFund: '2–4 weeks',
    complexity: 'low',
  },
  {
    id: 'deal-revenue',
    type: 'revenue-based',
    name: 'Revenue-Based Finance',
    description: 'Repayments flex with revenue — pay a percentage of monthly revenue until a fixed multiple is repaid. Ideal for businesses with variable income.',
    typicalTermYears: 3,
    typicalRateRange: '1.2x–1.8x multiple',
    fundingRange: '£10k–£500k',
    pros: [
      'Payments flex with revenue — lower in quiet months',
      'No fixed term — early repayment if revenue strong',
      'No equity dilution',
      'Quick decision and funding',
    ],
    cons: [
      'Higher total cost than traditional debt',
      'Revenue share reduces cash available for growth',
      'Requires consistent revenue stream to qualify',
      'Still relatively uncommon for energy assets',
    ],
    suitableFor: 'Working capital or bridge funding alongside asset finance.',
    taxBenefits: ['Repayments may be partially deductible'],
    securityNeeded: ['Access to bank account / payment data', 'Assignment of specific revenue streams'],
    timeToFund: '1–2 weeks',
    complexity: 'medium',
  },
  {
    id: 'deal-seis',
    type: 'equity-seis',
    name: 'SEIS Equity Round',
    description: 'Seed Enterprise Investment Scheme. First £250k of equity investment qualifies for 50% income tax relief for investors. Hugely attractive for angels.',
    typicalTermYears: 0,
    typicalRateRange: 'Equity dilution',
    fundingRange: '£10k–£250k (SEIS cap)',
    pros: [
      '50% income tax relief for investors — very attractive',
      'CGT exemption on gains after 3 years',
      'Loss relief available — downside protection for investors',
      'No repayment obligation',
      'Strategic angels can add value beyond capital',
    ],
    cons: [
      'Equity dilution — giving up ownership',
      'Must be trading less than 3 years',
      'Advance assurance process takes 4-6 weeks',
      'Limited to £250k total SEIS investment',
      'Must spend 70% within 3 years',
    ],
    suitableFor: 'First external funding round. Friends & family + angel investors.',
    taxBenefits: ['50% income tax relief', 'CGT exemption', 'Loss relief', 'CGT reinvestment relief'],
    securityNeeded: ['None — equity investment'],
    timeToFund: '4–8 weeks (including HMRC advance assurance)',
    complexity: 'medium',
  },
  {
    id: 'deal-eis',
    type: 'equity-eis',
    name: 'EIS Equity Round',
    description: 'Enterprise Investment Scheme. Larger equity rounds with 30% income tax relief for investors. Can raise up to £5M per year.',
    typicalTermYears: 0,
    typicalRateRange: 'Equity dilution',
    fundingRange: '£250k–£5M per year',
    pros: [
      '30% income tax relief for investors',
      'CGT exemption after 3 years',
      'Loss relief and CGT deferral available',
      'Larger amounts available than SEIS',
      'Well understood by angel networks and VCs',
    ],
    cons: [
      'Greater equity dilution for larger rounds',
      'Must be qualifying trade (energy services qualifies)',
      'Cannot have gross assets over £15M',
      'More complex compliance requirements',
      'Investors expect board seats at scale',
    ],
    suitableFor: 'Series A / growth round after proving the model with SEIS.',
    taxBenefits: ['30% income tax relief', 'CGT exemption', 'Loss relief', 'CGT deferral'],
    securityNeeded: ['None — equity investment'],
    timeToFund: '6–12 weeks',
    complexity: 'high',
  },
  {
    id: 'deal-p2p',
    type: 'p2p-lending',
    name: 'P2P Lending',
    description: 'Peer-to-peer lending through platforms like Funding Circle. Faster than banks, suitable for smaller amounts or bridging.',
    typicalTermYears: 3,
    typicalRateRange: '7.0%–12.0%',
    fundingRange: '£10k–£500k',
    pros: [
      'Fast decision (days not weeks)',
      'Less documentation than traditional lenders',
      'Online process, minimal meetings',
      'Good for bridging or working capital',
    ],
    cons: [
      'Higher interest rates',
      'Personal guarantee typically required',
      'Shorter terms available',
      'Not suitable for large-scale asset finance',
    ],
    suitableFor: 'Bridge funding, working capital, or topping up asset finance.',
    taxBenefits: ['Interest payments tax deductible'],
    securityNeeded: ['Personal guarantee', 'Company debenture'],
    timeToFund: '3–7 days',
    complexity: 'low',
  },
  {
    id: 'deal-community',
    type: 'community-shares',
    name: 'Community Share Offer',
    description: 'Issue shares through a Community Benefit Society. Local investors buy shares in the energy project, creating community ownership and engagement.',
    typicalTermYears: 20,
    typicalRateRange: '3.0%–5.0% target interest',
    fundingRange: '£50k–£2M',
    pros: [
      'Strong community engagement and buy-in',
      'Tax relief for investors (SITR)',
      'Aligns with RoseStack community values',
      'Long-term patient capital',
      'Local PR and marketing benefit',
    ],
    cons: [
      'Requires Community Benefit Society registration',
      'Complex regulatory requirements',
      'Time-consuming community engagement process',
      'Slower to raise than institutional capital',
      'FCA considerations for financial promotions',
    ],
    suitableFor: 'Phase 2 — once model proven. Perfect for neighbourhood clusters.',
    taxBenefits: ['Social Investment Tax Relief (SITR) — 30%', 'Community organisation tax benefits'],
    securityNeeded: ['CBS structure', 'Community benefit asset lock'],
    timeToFund: '3–6 months',
    complexity: 'high',
  },
  {
    id: 'deal-crowdfund',
    type: 'crowdfunding',
    name: 'Equity Crowdfunding',
    description: 'Raise equity through platforms like Crowdcube or Seedrs. SEIS/EIS eligible. Great for building a community of investor-advocates.',
    typicalTermYears: 0,
    typicalRateRange: 'Equity dilution',
    fundingRange: '£50k–£5M',
    pros: [
      'Builds community of investor-advocates',
      'Marketing benefit — crowdfunding campaign is PR',
      'SEIS/EIS compatible',
      'Democratic — many small investors',
      'Proves market validation',
    ],
    cons: [
      'Platform fees (5-7% + success fee)',
      'Public failure if campaign does not reach target',
      'Large number of small shareholders to manage',
      'Requires significant marketing effort',
      'Due diligence and campaign preparation takes months',
    ],
    suitableFor: 'After 10+ installed homes, alongside or after SEIS angel round.',
    taxBenefits: ['SEIS/EIS relief passes through to investors'],
    securityNeeded: ['None — equity investment'],
    timeToFund: '3–4 months (including preparation)',
    complexity: 'high',
  },
  {
    id: 'deal-mezzanine',
    type: 'mezzanine',
    name: 'Mezzanine / Blended Finance',
    description: 'Subordinated debt sitting between senior debt and equity. Higher rate than senior debt but less dilutive than equity. Often used alongside asset finance.',
    typicalTermYears: 5,
    typicalRateRange: '10.0%–15.0%',
    fundingRange: '£100k–£2M',
    pros: [
      'Less dilutive than equity',
      'Can bridge gap between senior debt and equity',
      'Interest payments are tax deductible',
      'Flexible repayment structures available',
    ],
    cons: [
      'Higher cost than senior debt',
      'Subordinated — repaid after senior debt',
      'Often includes warrants or conversion rights',
      'Complex documentation',
    ],
    suitableFor: 'Growth phase — filling gap between asset finance and equity to scale faster.',
    taxBenefits: ['Interest payments fully tax deductible'],
    securityNeeded: ['Second charge on assets', 'Subordination agreement with senior lender'],
    timeToFund: '4–8 weeks',
    complexity: 'high',
  },
];

// ============================================================
// Seeded Data — Covenants
// ============================================================

function covenantStatus(current: number, threshold: number, isMinimum: boolean): CovenantStatus {
  if (isMinimum) {
    if (current >= threshold * 1.15) return 'green';
    if (current >= threshold) return 'amber';
    return 'red';
  }
  if (current <= threshold * 0.85) return 'green';
  if (current <= threshold) return 'amber';
  return 'red';
}

export const covenants: Covenant[] = [
  {
    id: 'cov-001',
    name: 'Debt Service Coverage Ratio',
    metric: 'DSCR',
    threshold: 1.25,
    currentValue: 1.48,
    status: 'green',
    lender: 'Lombard (NatWest)',
    facility: 'Asset Finance Facility A',
    testFrequency: 'quarterly',
    lastTested: '2026-01-15',
    nextTest: '2026-04-15',
    breachAction: 'Cash sweep — excess cash applied to debt reduction. 30 day cure period.',
    trend: 'stable',
  },
  {
    id: 'cov-002',
    name: 'Loan-to-Value Ratio',
    metric: 'LTV',
    threshold: 80,
    currentValue: 68,
    status: 'green',
    lender: 'Lombard (NatWest)',
    facility: 'Asset Finance Facility A',
    testFrequency: 'annually',
    lastTested: '2026-01-15',
    nextTest: '2027-01-15',
    breachAction: 'Additional security required or partial prepayment.',
    trend: 'improving',
  },
  {
    id: 'cov-003',
    name: 'Minimum Revenue',
    metric: 'Revenue',
    threshold: 120000,
    currentValue: 145000,
    status: 'green',
    lender: 'Close Brothers',
    facility: 'Expansion Facility',
    testFrequency: 'quarterly',
    lastTested: '2026-01-15',
    nextTest: '2026-04-15',
    breachAction: 'Drawdown restriction on uncommitted facility.',
    trend: 'improving',
  },
  {
    id: 'cov-004',
    name: 'Interest Coverage Ratio',
    metric: 'ICR',
    threshold: 2.0,
    currentValue: 2.35,
    status: 'green',
    lender: 'Triodos Bank',
    facility: 'Green Energy Loan',
    testFrequency: 'quarterly',
    lastTested: '2026-01-15',
    nextTest: '2026-04-15',
    breachAction: 'Step-up rate applies (+1% margin) until cured.',
    trend: 'stable',
  },
  {
    id: 'cov-005',
    name: 'Homeowner Default Rate',
    metric: 'Default %',
    threshold: 5,
    currentValue: 1.2,
    status: 'green',
    lender: 'Lombard (NatWest)',
    facility: 'Asset Finance Facility A',
    testFrequency: 'monthly',
    lastTested: '2026-03-01',
    nextTest: '2026-04-01',
    breachAction: 'Review of collection procedures, potential facility freeze.',
    trend: 'stable',
  },
  {
    id: 'cov-006',
    name: 'Portfolio DSCR (Stressed)',
    metric: 'Stressed DSCR',
    threshold: 1.10,
    currentValue: 1.18,
    status: 'amber',
    lender: 'Triodos Bank',
    facility: 'Green Energy Loan',
    testFrequency: 'quarterly',
    lastTested: '2026-01-15',
    nextTest: '2026-04-15',
    breachAction: 'Equity injection required within 60 days or facility reduction.',
    trend: 'declining',
  },
];

// ============================================================
// Seeded Data — Investor Pipeline
// ============================================================

export const investors: Investor[] = [
  {
    id: 'inv-001',
    name: 'North West Angels',
    type: 'Angel Network',
    investmentRange: '£25k–£250k',
    stage: 'contacted',
    contactName: 'Richard Barnes',
    contactEmail: 'r.barnes@nwangels.co.uk',
    lastActivity: '2026-03-10',
    nextAction: 'Send pitch deck and financial model',
    nextActionDate: '2026-03-28',
    notes: 'Interested in SEIS round. Want to see 3-month trading data.',
  },
  {
    id: 'inv-002',
    name: 'GreenTech Capital',
    type: 'Impact VC',
    investmentRange: '£100k–£1M',
    stage: 'nda-signed',
    contactName: 'Dr Priya Sharma',
    contactEmail: 'p.sharma@greentechcap.com',
    lastActivity: '2026-03-15',
    nextAction: 'Provide data room access',
    nextActionDate: '2026-03-25',
    notes: 'Focus on UK energy transition. NDA signed 15 March. Want full financial model and sensitivity analysis.',
    interestedAmount: 250000,
  },
  {
    id: 'inv-003',
    name: 'Community Energy Lancashire',
    type: 'Community Group',
    investmentRange: '£50k–£200k',
    stage: 'data-room-access',
    contactName: 'Pat Thornton',
    contactEmail: 'pat@celancs.org',
    lastActivity: '2026-03-18',
    nextAction: 'Present to board meeting',
    nextActionDate: '2026-04-05',
    notes: 'Community share offer model. Board considering co-investment in Rossendale cluster. Reviewing data room.',
    interestedAmount: 150000,
  },
  {
    id: 'inv-004',
    name: 'Mason Family Office',
    type: 'Family Office',
    investmentRange: '£50k–£500k',
    stage: 'term-sheet',
    contactName: 'Tom Mason',
    contactEmail: 't.mason@masonfamily.co.uk',
    lastActivity: '2026-03-20',
    nextAction: 'Finalise term sheet and get legal review',
    nextActionDate: '2026-03-30',
    notes: 'SEIS investment. Term sheet at £100k for 8% equity. Legal review in progress.',
    interestedAmount: 100000,
  },
  {
    id: 'inv-005',
    name: 'Octopus Ventures',
    type: 'VC',
    investmentRange: '£500k–£5M',
    stage: 'identified',
    contactName: 'Investment Team',
    contactEmail: 'ventures@octopusgroup.com',
    lastActivity: '',
    nextAction: 'Warm introduction via Octopus Energy contact',
    nextActionDate: '2026-04-15',
    notes: 'Strategic potential given Octopus tariff relationship. Phase 2 conversation — need more traction first.',
  },
  {
    id: 'inv-006',
    name: 'Lancashire Pension Fund',
    type: 'Institutional',
    investmentRange: '£1M–£10M',
    stage: 'identified',
    contactName: 'ESG Team',
    contactEmail: 'esg@lancashirepension.co.uk',
    lastActivity: '',
    nextAction: 'Research ESG investment criteria and approach',
    nextActionDate: '2026-05-01',
    notes: 'Long-term institutional capital for Phase 2+. Need substantial track record before approaching.',
  },
];

// ============================================================
// Seeded Data — Data Room
// ============================================================

export const dataRoomDocuments: DataRoomDocument[] = [
  {
    id: 'doc-001',
    name: 'RoseStack Business Plan 2026-2030',
    category: 'corporate',
    description: 'Comprehensive 5-year business plan covering market opportunity, operational model, financial projections, and growth strategy.',
    status: 'ready',
    version: '2.1',
    lastUpdated: '2026-03-15',
    uploadedBy: 'Dave Middleton',
    fileSize: '4.2 MB',
    sharedWith: ['GreenTech Capital', 'Community Energy Lancashire'],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-002',
    name: 'Financial Model — 3 Scenario',
    category: 'financial',
    description: 'Detailed per-home and portfolio financial model with Best/Likely/Worst case projections over 10 and 20 years.',
    status: 'ready',
    version: '3.0',
    lastUpdated: '2026-03-20',
    uploadedBy: 'Dave Middleton',
    fileSize: '2.8 MB',
    sharedWith: ['GreenTech Capital', 'Community Energy Lancashire', 'Mason Family Office'],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-003',
    name: 'Pitch Deck',
    category: 'corporate',
    description: '15-slide investor pitch deck covering problem, solution, market, traction, team, and ask.',
    status: 'ready',
    version: '1.4',
    lastUpdated: '2026-03-18',
    uploadedBy: 'Dave Middleton',
    fileSize: '8.5 MB',
    sharedWith: ['North West Angels'],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-004',
    name: 'Energy Services Agreement (Template)',
    category: 'legal',
    description: 'Template ESA contract including Letter of Authority clause, 10-year term, payment terms, and termination provisions.',
    status: 'ready',
    version: '1.2',
    lastUpdated: '2026-03-10',
    uploadedBy: 'Legal Advisor',
    fileSize: '1.1 MB',
    sharedWith: ['GreenTech Capital'],
    confidentiality: 'highly-confidential',
  },
  {
    id: 'doc-005',
    name: 'Technical Specification — Battery Systems',
    category: 'technical',
    description: 'Technical details of battery systems, installation methodology, monitoring platform, and maintenance procedures.',
    status: 'ready',
    version: '1.0',
    lastUpdated: '2026-02-28',
    uploadedBy: 'Dave Middleton',
    fileSize: '3.4 MB',
    sharedWith: ['GreenTech Capital', 'Community Energy Lancashire'],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-006',
    name: 'Insurance Policy Schedule',
    category: 'insurance',
    description: 'Product liability, professional indemnity, public liability, and battery-specific insurance documentation.',
    status: 'draft',
    version: '0.3',
    lastUpdated: '2026-03-05',
    uploadedBy: 'Dave Middleton',
    fileSize: '0.8 MB',
    sharedWith: [],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-007',
    name: 'MCS Certification Application',
    category: 'compliance',
    description: 'MCS certification application documents, installer qualifications, and compliance evidence.',
    status: 'draft',
    version: '0.1',
    lastUpdated: '2026-02-15',
    uploadedBy: 'Dave Middleton',
    fileSize: '2.1 MB',
    sharedWith: [],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-008',
    name: 'SEIS Advance Assurance Application',
    category: 'legal',
    description: 'HMRC SEIS advance assurance application with supporting documents.',
    status: 'draft',
    version: '0.2',
    lastUpdated: '2026-03-12',
    uploadedBy: 'Dave Middleton',
    fileSize: '1.5 MB',
    sharedWith: [],
    confidentiality: 'highly-confidential',
  },
  {
    id: 'doc-009',
    name: 'Cap Table',
    category: 'corporate',
    description: 'Current and projected capitalisation table showing ownership structure pre and post SEIS round.',
    status: 'ready',
    version: '1.1',
    lastUpdated: '2026-03-20',
    uploadedBy: 'Dave Middleton',
    fileSize: '0.3 MB',
    sharedWith: ['Mason Family Office'],
    confidentiality: 'highly-confidential',
  },
  {
    id: 'doc-010',
    name: 'NDA Template',
    category: 'legal',
    description: 'Standard mutual NDA for use with potential investors and lenders.',
    status: 'ready',
    version: '1.0',
    lastUpdated: '2026-01-20',
    uploadedBy: 'Legal Advisor',
    fileSize: '0.2 MB',
    sharedWith: [],
    confidentiality: 'public',
  },
  {
    id: 'doc-011',
    name: 'G99 Application Pack (Sample)',
    category: 'compliance',
    description: 'Sample G99 grid connection application for ENWL demonstrating the process and typical requirements.',
    status: 'ready',
    version: '1.0',
    lastUpdated: '2026-02-20',
    uploadedBy: 'Dave Middleton',
    fileSize: '1.8 MB',
    sharedWith: ['GreenTech Capital'],
    confidentiality: 'confidential',
  },
  {
    id: 'doc-012',
    name: 'Information Memorandum',
    category: 'financial',
    description: 'Detailed IM for debt lenders covering business overview, asset details, cash flow analysis, and risk mitigation.',
    status: 'draft',
    version: '0.5',
    lastUpdated: '2026-03-22',
    uploadedBy: 'Dave Middleton',
    fileSize: '5.2 MB',
    sharedWith: [],
    confidentiality: 'confidential',
  },
];

// ============================================================
// Stress Testing
// ============================================================

export function runStressTests(
  system: BatterySystem,
  tariff: Tariff,
  annualDebtService: number = 5000,
): StressTestResult[] {
  function getDscrFromScenario(
    overrides: {
      best?: Record<string, number>;
      likely?: Record<string, number>;
      worst?: Record<string, number>;
    },
  ) {
    const projection = calculateAllScenarios(system, tariff, overrides, 10);
    const summary = summariseScenarios(projection, system, annualDebtService);
    return {
      dscrBest: summary.best.dscr,
      dscrLikely: summary.likely.dscr,
      dscrWorst: summary.worst.dscr,
    };
  }

  function statusFromDscr(dscr: number, threshold: number = 1.25): CovenantStatus {
    if (dscr >= threshold) return 'green';
    if (dscr >= threshold * 0.9) return 'amber';
    return 'red';
  }

  const tests: StressTestResult[] = [];

  // Test 1: Energy prices drop 20%
  const t1 = getDscrFromScenario({
    best: { energyInflationPercent: -10 },
    likely: { energyInflationPercent: -15 },
    worst: { energyInflationPercent: -20 },
  });
  tests.push({
    id: 'stress-001',
    name: 'Energy Price Drop 20%',
    description: 'What if wholesale energy prices fall 20%, compressing IOF spreads and reducing arbitrage revenue?',
    ...t1,
    statusBest: statusFromDscr(t1.dscrBest),
    statusLikely: statusFromDscr(t1.dscrLikely),
    statusWorst: statusFromDscr(t1.dscrWorst),
    impact: 'Reduces daily arbitrage revenue significantly. DSCR may approach covenant threshold.',
  });

  // Test 2: Degradation at 3% instead of 2%
  const t2 = getDscrFromScenario({
    best: { batteryDegradationPercent: 2.5 },
    likely: { batteryDegradationPercent: 3 },
    worst: { batteryDegradationPercent: 4 },
  });
  tests.push({
    id: 'stress-002',
    name: 'Battery Degradation 3%/yr',
    description: 'What if battery degradation is 3% per year instead of the expected 2%? Higher than warranty assumptions.',
    ...t2,
    statusBest: statusFromDscr(t2.dscrBest),
    statusLikely: statusFromDscr(t2.dscrLikely),
    statusWorst: statusFromDscr(t2.dscrWorst),
    impact: 'Reduced effective capacity impacts both arbitrage and flexibility revenue.',
  });

  // Test 3: Saving Sessions discontinued
  const t3 = getDscrFromScenario({
    best: { savingSessionsPerYear: 5 },
    likely: { savingSessionsPerYear: 0 },
    worst: { savingSessionsPerYear: 0, savingSessionRatePencePerKwh: 0 },
  });
  tests.push({
    id: 'stress-003',
    name: 'Saving Sessions Cancelled',
    description: 'What if National Grid ESO discontinues the DFS/Saving Sessions programme entirely?',
    ...t3,
    statusBest: statusFromDscr(t3.dscrBest),
    statusLikely: statusFromDscr(t3.dscrLikely),
    statusWorst: statusFromDscr(t3.dscrWorst),
    impact: 'Loss of £800-2000+ per home per year in Saving Session revenue.',
  });

  // Test 4: Interest rate spike
  const t4 = getDscrFromScenario({
    best: { interestRateSpreadPercent: 4 },
    likely: { interestRateSpreadPercent: 5 },
    worst: { interestRateSpreadPercent: 6 },
  });
  tests.push({
    id: 'stress-004',
    name: 'Interest Rate Spike +3%',
    description: 'What if base rates rise 3%, increasing all floating-rate debt servicing costs?',
    ...t4,
    statusBest: statusFromDscr(t4.dscrBest),
    statusLikely: statusFromDscr(t4.dscrLikely),
    statusWorst: statusFromDscr(t4.dscrWorst),
    impact: 'Increases debt servicing costs. Fixed-rate facilities unaffected.',
  });

  // Test 5: 5% homeowner churn
  const t5 = getDscrFromScenario({
    best: { homeownerChurnPercent: 3 },
    likely: { homeownerChurnPercent: 5 },
    worst: { homeownerChurnPercent: 10 },
  });
  tests.push({
    id: 'stress-005',
    name: 'Homeowner Churn 5%+',
    description: 'What if homeowner churn reaches 5%, requiring battery decommissioning and redeployment?',
    ...t5,
    statusBest: statusFromDscr(t5.dscrBest),
    statusLikely: statusFromDscr(t5.dscrLikely),
    statusWorst: statusFromDscr(t5.dscrWorst),
    impact: 'Lost revenue during transition, redeployment costs, and potential asset write-downs.',
  });

  // Test 6: Tariff spread compression
  const t6 = getDscrFromScenario({
    best: { iofSpreadChangePercent: -15 },
    likely: { iofSpreadChangePercent: -25 },
    worst: { iofSpreadChangePercent: -40 },
  });
  tests.push({
    id: 'stress-006',
    name: 'Tariff Spread Compression 25%',
    description: 'What if IOF tariff spreads compress 25% as more batteries enter the market?',
    ...t6,
    statusBest: statusFromDscr(t6.dscrBest),
    statusLikely: statusFromDscr(t6.dscrLikely),
    statusWorst: statusFromDscr(t6.dscrWorst),
    impact: 'Core arbitrage revenue reduced. Flexibility and Saving Sessions become more important.',
  });

  // Test 7: Combined worst case
  const t7 = getDscrFromScenario({
    best: { energyInflationPercent: -5, batteryDegradationPercent: 2.5, iofSpreadChangePercent: -10 },
    likely: { energyInflationPercent: -10, batteryDegradationPercent: 3, iofSpreadChangePercent: -20, savingSessionsPerYear: 10 },
    worst: { energyInflationPercent: -15, batteryDegradationPercent: 4, iofSpreadChangePercent: -30, savingSessionsPerYear: 5, homeownerChurnPercent: 5 },
  });
  tests.push({
    id: 'stress-007',
    name: 'Combined Stress (Armageddon)',
    description: 'Multiple stresses simultaneously: energy price drop + degradation + spread compression + reduced sessions + churn.',
    ...t7,
    statusBest: statusFromDscr(t7.dscrBest),
    statusLikely: statusFromDscr(t7.dscrLikely),
    statusWorst: statusFromDscr(t7.dscrWorst),
    impact: 'Extreme scenario. Tests whether business survives multiple simultaneous shocks.',
  });

  return tests;
}

// ============================================================
// Deal Structure Recommendation Engine
// ============================================================

export interface DealRecommendation {
  primary: DealStructure;
  secondary?: DealStructure;
  reasoning: string;
  suggestedSplit?: string;
  totalAvailable: string;
  estimatedCostOfCapital: string;
  timelineWeeks: number;
}

export function recommendDealStructure(
  fundingRequired: number,
  stage: 'pre-revenue' | 'early-revenue' | 'growth' | 'scale',
  hasPersonalGuaranteeCapacity: boolean,
  seisEligible: boolean,
): DealRecommendation {
  if (stage === 'pre-revenue') {
    if (seisEligible && fundingRequired <= 250000) {
      return {
        primary: dealStructures.find(d => d.type === 'equity-seis')!,
        reasoning: 'Pre-revenue stage with SEIS eligibility — 50% tax relief makes this the most investor-friendly route. Angels get significant downside protection.',
        totalAvailable: '£250k (SEIS cap)',
        estimatedCostOfCapital: 'Equity dilution (typically 10-20% at this stage)',
        timelineWeeks: 8,
      };
    }
    return {
      primary: dealStructures.find(d => d.type === 'equity-seis')!,
      secondary: dealStructures.find(d => d.type === 'hire-purchase')!,
      reasoning: 'SEIS for initial equity, then HP for asset finance once first installations prove the model. EFG scheme can de-risk the HP facility.',
      suggestedSplit: `SEIS: £150k equity + HP: £${((fundingRequired - 150000) / 1000).toFixed(0)}k asset finance`,
      totalAvailable: `£${(fundingRequired / 1000).toFixed(0)}k combined`,
      estimatedCostOfCapital: 'Blended ~8-10% WACC',
      timelineWeeks: 10,
    };
  }

  if (stage === 'early-revenue') {
    return {
      primary: dealStructures.find(d => d.type === 'hire-purchase')!,
      secondary: fundingRequired > 200000
        ? dealStructures.find(d => d.type === 'equity-eis')!
        : undefined,
      reasoning: 'HP asset finance for battery assets (EFG-backed if needed), supplemented by EIS equity for larger requirements. Revenue track record strengthens HP application.',
      suggestedSplit: fundingRequired > 200000
        ? `HP: £${(fundingRequired * 0.7 / 1000).toFixed(0)}k + EIS: £${(fundingRequired * 0.3 / 1000).toFixed(0)}k`
        : undefined,
      totalAvailable: `£${(fundingRequired / 1000).toFixed(0)}k`,
      estimatedCostOfCapital: 'Blended ~7-9% WACC',
      timelineWeeks: 6,
    };
  }

  if (stage === 'growth') {
    return {
      primary: dealStructures.find(d => d.type === 'hire-purchase')!,
      secondary: dealStructures.find(d => d.type === 'community-shares')!,
      reasoning: 'Scale HP facility with proven track record for lower rates. Community shares for neighbourhood clusters align with values and provide patient capital.',
      suggestedSplit: `HP: £${(fundingRequired * 0.6 / 1000).toFixed(0)}k + Community: £${(fundingRequired * 0.4 / 1000).toFixed(0)}k`,
      totalAvailable: `£${(fundingRequired / 1000).toFixed(0)}k+`,
      estimatedCostOfCapital: 'Blended ~5-7% WACC',
      timelineWeeks: 12,
    };
  }

  // Scale
  return {
    primary: dealStructures.find(d => d.type === 'hire-purchase')!,
    secondary: dealStructures.find(d => d.type === 'mezzanine')!,
    reasoning: 'Institutional-grade HP facility at competitive rates, topped up with mezzanine for faster scaling. Consider Abundance/community debentures for diversification.',
    suggestedSplit: `Senior HP: £${(fundingRequired * 0.7 / 1000).toFixed(0)}k + Mezzanine: £${(fundingRequired * 0.3 / 1000).toFixed(0)}k`,
    totalAvailable: `£${(fundingRequired / 1000).toFixed(0)}k+`,
    estimatedCostOfCapital: 'Blended ~6-8% WACC',
    timelineWeeks: 8,
  };
}

// ============================================================
// Summary helpers
// ============================================================

export function getLendersByType(type: LenderType): Lender[] {
  return lenders.filter(l => l.type === type);
}

export function getLendersByStatus(status: LenderStatus): Lender[] {
  return lenders.filter(l => l.status === status);
}

export function getInvestorsByStage(stage: InvestorStage): Investor[] {
  return investors.filter(i => i.stage === stage);
}

export function getDocumentsByCategory(category: DataRoomCategory): DataRoomDocument[] {
  return dataRoomDocuments.filter(d => d.category === category);
}

export function getTotalPipelineValue(): { interested: number; committed: number } {
  return investors.reduce(
    (acc, inv) => ({
      interested: acc.interested + (inv.interestedAmount ?? 0),
      committed: acc.committed + (inv.committedAmount ?? 0),
    }),
    { interested: 0, committed: 0 },
  );
}

export function getCovenantSummary(): { green: number; amber: number; red: number } {
  return covenants.reduce(
    (acc, cov) => ({ ...acc, [cov.status]: acc[cov.status] + 1 }),
    { green: 0, amber: 0, red: 0 },
  );
}

export { formatGbp, getDscrStatus };
