// ============================================================
// Legal & Compliance Module — Seeded Data
// ============================================================

import type {
  ComplianceRequirement,
  G99Application,
  Certification,
  ContractTemplate,
  LegalRisk,
  RegulatoryEvent,
} from './types';

// --- Compliance Requirements ---

export const complianceRequirements: ComplianceRequirement[] = [
  // MCS Certification
  {
    id: 'comp-1',
    category: 'mcs-certification',
    name: 'MCS Installer Certification',
    description:
      'Obtain MCS certification for battery installation. Required for SEG eligibility and consumer trust. Must use MCS-approved installer from the register.',
    status: 'pending',
    owner: 'Dave Middleton',
    dueDate: '2026-06-01',
    criticality: 'critical',
    notes: 'Contacting MCS-certified installers in Lancashire. Annual audit required once certified.',
  },
  {
    id: 'comp-2',
    category: 'mcs-certification',
    name: 'MCS Annual Audit Compliance',
    description:
      'Maintain compliance with MCS annual audit requirements. Covers installation quality, documentation, and consumer protection standards.',
    status: 'not-applicable',
    owner: 'Dave Middleton',
    criticality: 'high',
    notes: 'Not applicable until MCS certification obtained.',
  },
  // G99/G98
  {
    id: 'comp-3',
    category: 'g99-g98',
    name: 'G99 Application Process (ENWL)',
    description:
      'Submit G99 applications for battery systems exceeding 16A per phase to ENWL. G98 for systems up to 16A per phase. Current processing times 6-12 weeks for G99.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-05-01',
    criticality: 'critical',
    notes: 'Need to establish G99 application process with ENWL. Required documents: system design, site plan, single line diagram.',
  },
  {
    id: 'comp-4',
    category: 'g99-g98',
    name: 'G99 Design Submissions',
    description:
      'Prepare and submit required design documentation for each G99 application including single line diagrams, system specifications, and protection settings.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
  },
  {
    id: 'comp-5',
    category: 'g99-g98',
    name: 'Commissioning & Connection Agreements',
    description:
      'Ensure all commissioning certificates and connection agreements are in place before system goes live.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
  },
  // Electrical Regulations
  {
    id: 'comp-6',
    category: 'electrical-regs',
    name: 'BS 7671:2018+A4:2024 — 19th Edition IET Wiring Regulations Amendment 4',
    description:
      'All battery storage installations must comply with BS 7671 (IET Wiring Regulations 18th Edition). Amendment 4 publishes 15 April 2026 and introduces new Chapter 57 dedicated to battery energy storage — covering thermal runaway protection, isolation requirements, location restrictions, ventilation, and documentation. This is the most significant regulatory change for domestic BESS in 2026.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    criticality: 'critical',
    notes: 'Amendment 4 publishes 15 April 2026. Chapter 57 adds specific BESS requirements: thermal runaway containment, isolation switching, location restrictions (distance from habitable rooms), ventilation specs, and mandatory documentation. Review requirements immediately on publication. All installers must be trained on new chapter before Phase 1 installations.',
  },
  // Fire Safety
  {
    id: 'comp-7',
    category: 'fire-safety',
    name: 'PAS 63100:2024 — Battery Fire Safety Standard',
    description:
      'OPEN — RESOLUTION REQUIRED (HIGH PRIORITY). PAS 63100:2024 is the UK BSI specification for fire protection of BESS in dwellings (published March 2024). CONFIRMED: this standard exists and is the correct reference — PAS 8811 does NOT exist. PAS 63100 is not legally mandatory in statute but is effectively mandatory via insurance requirements and installer certification (MCS). Referenced in BS 7671 Amendment 4 Chapter 57. CRITICAL CAPACITY LIMITS: max 40 kWh for typical dwelling installations; max 80 kWh for external/detached garages or fire-rated garages. RoseStack\'s 100-200 kWh systems EXCEED these domestic limits — installations must be in purpose-built external units, not inside the main dwelling. THREE RESOLUTION ROUTES: (A) Multiple enclosures — split battery across separate fire-rated enclosures each under 80kWh with required separation distances; (B) Commercial exemption — site-specific fire risk assessment + Lancashire Fire & Rescue non-domestic classification; (C) Reduce system size — cap installations at 80kWh. Resolution route not yet confirmed for The Beeches (192kWh, 112kWh over limit). Discuss with insurers and Lancashire Fire & Rescue before any further deployments.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    criticality: 'critical',
    notes: 'OPEN — RESOLUTION REQUIRED. PAS 63100:2024 confirmed exists (BSI, March 2024). Standard covers: fire containment, thermal runaway mitigation, ventilation (2x150cm2 openings), separation distances (1m from habitable room windows), smoke+heat detection. The Beeches (192kWh) is 112kWh over the 80kWh external garage limit. Resolution routes: (A) Multiple enclosures each <80kWh; (B) Commercial/non-domestic fire risk assessment and Lancashire Fire & Rescue sign-off; (C) Reduce installed capacity to ≤80kWh. No route confirmed as of April 2026. Risk registered as R-REG-PAS63100-BEECHES (probability: High, impact: High). Do not commission further >80kWh systems until resolution route is confirmed with insurer and Lancashire Fire & Rescue.',
  },
  // Planning Permission
  {
    id: 'comp-8',
    category: 'planning-permission',
    name: 'Planning Permission Thresholds',
    description:
      'Determine planning permission requirements for battery installations. Permitted development rights may apply for domestic battery storage under certain size thresholds.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'medium',
    notes: 'Most domestic battery installations fall under permitted development. Confirm with Burnley/Pendle council for edge cases.',
  },
  // ESA Contract
  {
    id: 'comp-9',
    category: 'esa-contract',
    name: 'ESA Template — Solicitor Review',
    description:
      'Energy Services Agreement template must be professionally drafted and reviewed by a solicitor. Must include all key clauses: 10-year term, monthly payment, access rights, insurance, termination, equipment removal, property sale provisions.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-04-15',
    criticality: 'critical',
  },
  {
    id: 'comp-9b',
    category: 'esa-contract',
    name: 'ESA End-of-Term Options — Draft',
    description:
      'The ESA must define what happens at the end of the 10-year term. Three options must be included in the template for homeowner choice:\n\n' +
      'Option A (Default) — Equipment Removal: RoseStack removes the battery system at its own cost within 90 days of term end. Homeowner has no further liability. Site restored to original condition.\n\n' +
      'Option B — Purchase at Residual Value: Homeowner may purchase the system at 40% of original CAPEX (residual value). Ownership transfers; RoseStack provides warranty documentation and final commissioning report.\n\n' +
      'Option C — Renewed ESA: Parties may agree a renewed 5-year ESA at a reduced homeowner payment (reflecting depreciated asset value). Rates and terms renegotiated at the time.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-06-01',
    criticality: 'high',
    notes: 'Default is Option A (removal). Options B and C require homeowner opt-in. Solicitor must draft all three scenarios. Status: Draft — requires solicitor review.',
  },
  {
    id: 'comp-10',
    category: 'esa-contract',
    name: 'Letter of Authority (LoA) Clause',
    description:
      'CRITICAL: The ESA must include a Letter of Authority granting RoseStack permission to: view homeowner energy accounts, switch tariffs on their behalf, communicate with energy suppliers, manage G99/SEG registrations, and be notified if the homeowner changes supplier. This enables portfolio-wide tariff optimisation.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-04-15',
    criticality: 'critical',
    notes: 'LoA is the key enabler for the tariff optimisation strategy. Must be drafted by solicitor as part of ESA. Covers: account viewing, tariff switching, supplier communication, G99/SEG management, supplier change notification.',
  },
  {
    id: 'comp-11',
    category: 'esa-contract',
    name: 'Supplier Change Notification Clause',
    description:
      'ESA must require homeowner to notify RoseStack before switching energy supplier. RoseStack must approve that the new supplier supports the battery configuration.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
  },
  {
    id: 'comp-12',
    category: 'esa-contract',
    name: 'Land Registry Charge Registration',
    description:
      'Process for registering ESA charge against property at Land Registry. Ensures contract obligations survive property sale.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
    notes: 'Need solicitor advice on whether charge registration is necessary or if a covenant is sufficient.',
  },
  // FCA
  {
    id: 'comp-13',
    category: 'fca',
    name: 'Consumer Credit Assessment',
    description:
      'Determine whether the ESA structure triggers FCA consumer credit regulation. If the homeowner is paying monthly for an energy service, does this constitute credit?',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-05-01',
    criticality: 'critical',
    notes: 'Key legal question. If ESA is structured as a service agreement (not credit), FCA regulation may not apply. Need solicitor opinion.',
  },
  {
    id: 'comp-14',
    category: 'fca',
    name: 'Financial Promotion Rules',
    description:
      'If raising investment: ensure all investor communications comply with FCA financial promotion rules. SEIS/EIS scheme communications must be properly structured.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
  },
  {
    id: 'comp-15',
    category: 'fca',
    name: 'SEIS/EIS Scheme Compliance',
    description:
      'Ensure company structure and activities qualify for SEIS/EIS tax relief for investors. Advance assurance from HMRC recommended.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
    notes: 'Agent 6 (Funding) tracks the investment side. Legal must ensure structural compliance.',
  },
  {
    id: 'comp-16',
    category: 'fca',
    name: 'Crowdfunding Regulations',
    description:
      'If using crowdfunding for investment: comply with FCA crowdfunding regulations. Platform must be FCA-authorised or exempt.',
    status: 'not-applicable',
    owner: 'Dave Middleton',
    criticality: 'medium',
    notes: 'Not applicable until crowdfunding is pursued as a funding route.',
  },
  // SEG Registration
  {
    id: 'comp-17',
    category: 'seg-registration',
    name: 'SEG Generator Registration',
    description:
      'Register as Smart Export Guarantee generator with energy supplier. Requires MCS certification, correct meter configuration, and export payment arrangements.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
    notes: 'Dependent on MCS certification being in place. Need to confirm meter requirements with supplier.',
  },
  {
    id: 'comp-18',
    category: 'seg-registration',
    name: 'Export Meter Configuration',
    description:
      'Ensure correct meter configuration for SEG export payments. Smart meter with export capability required.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'medium',
  },
  // Insurance
  {
    id: 'comp-19',
    category: 'insurance',
    name: 'Product Liability Insurance',
    description:
      'Obtain product liability insurance covering battery system failures, defects, and resulting damage.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-05-15',
    criticality: 'critical',
  },
  {
    id: 'comp-20',
    category: 'insurance',
    name: 'Professional Indemnity Insurance',
    description:
      'Professional indemnity cover for energy services advice, system design, and tariff management activities.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    dueDate: '2026-05-15',
    criticality: 'high',
  },
  {
    id: 'comp-21',
    category: 'insurance',
    name: 'Public Liability Insurance',
    description:
      'Public liability insurance for installation activities and ongoing system maintenance visits.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'high',
  },
  {
    id: 'comp-22',
    category: 'insurance',
    name: 'Battery-Specific Insurance',
    description:
      'Specialist insurance covering battery fire, theft, damage, and performance shortfall. May need specialist broker.',
    status: 'action-needed',
    owner: 'Dave Middleton',
    criticality: 'high',
    notes: 'Investigate specialist energy storage insurance providers. Cover needed for fire, theft, damage, and potentially performance guarantee.',
  },
  {
    id: 'comp-23',
    category: 'insurance',
    name: 'Homeowner Property Insurance Implications',
    description:
      'Ensure homeowners are advised to notify their property insurer about battery installation. Document any impact on premiums.',
    status: 'pending',
    owner: 'Dave Middleton',
    criticality: 'medium',
    notes: 'Include requirement in ESA for homeowner to notify insurer. Track any reported premium changes.',
  },
];

// --- G99 Pipeline (Sample) ---

export const g99Applications: G99Application[] = [
  {
    id: 'g99-1',
    homeId: 'home-001',
    address: '14 Rossendale Road, Burnley, BB11 2QT',
    dnoRegion: 'ENWL',
    applicationType: 'G99',
    stage: 'submitted',
    submissionDate: '2026-03-10',
    expectedApprovalDate: '2026-05-21',
    capacityKw: 11.5,
    referenceNumber: 'ENWL-G99-2026-00142',
    notes: 'Standard G99 application for 11.5kW battery system. 3-phase property.',
    updatedAt: '2026-03-10',
  },
  {
    id: 'g99-2',
    homeId: 'home-002',
    address: '7 Colne Road, Brierfield, BB9 5LR',
    dnoRegion: 'ENWL',
    applicationType: 'G98',
    stage: 'connected',
    submissionDate: '2026-01-15',
    expectedApprovalDate: '2026-02-28',
    actualApprovalDate: '2026-02-20',
    capacityKw: 5.0,
    referenceNumber: 'ENWL-G98-2026-00087',
    notes: 'G98 notification — under 16A per phase. Single-phase property.',
    updatedAt: '2026-03-01',
  },
  {
    id: 'g99-3',
    homeId: 'home-003',
    address: '22 Manchester Road, Nelson, BB9 7EQ',
    dnoRegion: 'ENWL',
    applicationType: 'G99',
    stage: 'dno-review',
    submissionDate: '2026-02-20',
    expectedApprovalDate: '2026-05-01',
    capacityKw: 11.5,
    referenceNumber: 'ENWL-G99-2026-00156',
    notes: 'Awaiting DNO review. Substation capacity check in progress.',
    updatedAt: '2026-03-15',
  },
  {
    id: 'g99-4',
    homeId: 'home-004',
    address: '5 Blackburn Road, Accrington, BB5 1LF',
    dnoRegion: 'ENWL',
    applicationType: 'G99',
    stage: 'pre-submission',
    capacityKw: 11.5,
    notes: 'Preparing documentation. Awaiting single line diagram from installer.',
    updatedAt: '2026-03-20',
  },
  {
    id: 'g99-5',
    homeId: 'home-005',
    address: '31 Todmorden Road, Burnley, BB10 4AB',
    dnoRegion: 'ENWL',
    applicationType: 'G99',
    stage: 'design-approval',
    submissionDate: '2026-02-01',
    expectedApprovalDate: '2026-04-15',
    capacityKw: 11.5,
    referenceNumber: 'ENWL-G99-2026-00131',
    notes: 'Design approved by DNO. Awaiting commissioning date.',
    updatedAt: '2026-03-18',
  },
];

// --- Certifications ---

export const certifications: Certification[] = [
  {
    id: 'cert-1',
    type: 'MCS',
    name: 'MCS Battery Storage Installation',
    status: 'not-started',
    provider: 'MCS (via certified installer)',
    cost: 1500,
    notes: 'Required for SEG eligibility. Must use MCS-registered installer. Annual fee applies.',
  },
  {
    id: 'cert-2',
    type: 'SEG',
    name: 'Smart Export Guarantee Registration',
    status: 'not-started',
    provider: 'Energy supplier (e.g., Octopus Energy)',
    notes: 'Dependent on MCS certification. Register with each supplier where homes are contracted.',
  },
  {
    id: 'cert-3',
    type: 'NICEIC',
    name: 'NICEIC Approved Contractor (Installer)',
    status: 'pending',
    provider: 'NICEIC',
    notes: 'Installer must hold NICEIC or NAPIT certification for electrical work.',
  },
  {
    id: 'cert-4',
    type: 'other',
    name: 'Companies House — Active Status',
    status: 'active',
    issuedDate: '2025-11-01',
    provider: 'Companies House',
    reference: 'SC123456',
    notes: 'Company registered and active.',
  },
  {
    id: 'cert-5',
    type: 'other',
    name: 'ICO Data Protection Registration',
    status: 'pending',
    provider: 'Information Commissioner\'s Office',
    cost: 40,
    notes: 'Required for processing homeowner personal data. Annual renewal.',
  },
];

// --- Contract Library ---

export const contractTemplates: ContractTemplate[] = [
  {
    id: 'contract-1',
    type: 'ESA',
    name: 'Energy Services Agreement (Homeowner)',
    version: '0.1-draft',
    status: 'draft',
    createdDate: '2026-03-01',
    lastModified: '2026-03-20',
    owner: 'Dave Middleton',
    description:
      'Master ESA template for homeowner contracts. 10-year term, monthly payment structure.',
    keyClauses: [
      '10-year fixed term',
      'Monthly homeowner payment (currently £100/month)',
      'RoseStack equipment ownership and access rights',
      'Insurance obligations (both parties)',
      'Termination provisions and early exit fees',
      'Equipment removal at end of term',
      'Property sale — contract transfers to new owner',
      'LETTER OF AUTHORITY (LoA) — CRITICAL',
      'Supplier change notification requirement',
      'Maintenance and repair obligations',
      'Data collection and usage rights',
      'Force majeure',
      'Dispute resolution',
    ],
    hasLoaClause: true,
  },
  {
    id: 'contract-2',
    type: 'NDA',
    name: 'Mutual Non-Disclosure Agreement',
    version: '1.0',
    status: 'approved',
    createdDate: '2026-01-15',
    lastModified: '2026-01-15',
    owner: 'Dave Middleton',
    description: 'Standard mutual NDA for use with potential investors, partners, and suppliers.',
    keyClauses: [
      'Mutual confidentiality obligations',
      '2-year term',
      'Exclusions for public information',
      'Return/destruction of confidential information',
    ],
  },
  {
    id: 'contract-3',
    type: 'investor-agreement',
    name: 'SEIS Investment Agreement',
    version: '0.1-draft',
    status: 'draft',
    createdDate: '2026-02-01',
    lastModified: '2026-03-10',
    owner: 'Dave Middleton',
    description:
      'Template for SEIS-qualifying investment rounds. Includes share subscription and shareholder agreement terms.',
    keyClauses: [
      'Share subscription terms',
      'SEIS qualifying conditions',
      'Pre-emption rights',
      'Tag-along / drag-along',
      'Board composition',
      'Information rights',
    ],
  },
  {
    id: 'contract-4',
    type: 'installer-agreement',
    name: 'Installer Services Agreement',
    version: '0.1-draft',
    status: 'draft',
    createdDate: '2026-03-05',
    lastModified: '2026-03-15',
    owner: 'Dave Middleton',
    description:
      'Agreement with MCS-certified installer covering installation standards, warranties, and service levels.',
    keyClauses: [
      'MCS compliance requirements',
      'Installation standards and warranty',
      'Service level agreements',
      'Insurance requirements',
      'Health and safety obligations',
      'Defect liability period',
    ],
  },
];

// --- ESA Template Key Clause Details ---

export const esaClauseDetails = {
  term: {
    title: '10-Year Fixed Term',
    summary: 'Agreement runs for 10 years from installation completion date.',
    detail:
      'The ESA has a fixed term of 10 years commencing from the date of successful commissioning of the battery system. Neither party may terminate early except under the specific termination provisions.',
  },
  monthlyPayment: {
    title: 'Monthly Homeowner Payment',
    summary: 'Homeowner pays a fixed monthly fee for the energy service.',
    detail:
      'The homeowner pays £100/month (subject to annual review linked to CPI). Payment covers the energy storage service — the homeowner does not own the equipment.',
  },
  accessRights: {
    title: 'Equipment Access Rights',
    summary: 'RoseStack has right to access equipment for maintenance and monitoring.',
    detail:
      'The homeowner grants RoseStack reasonable access to the battery system for maintenance, monitoring, upgrades, and repairs. Access must be arranged with reasonable notice except in emergencies.',
  },
  insurance: {
    title: 'Insurance Obligations',
    summary: 'Both parties have insurance obligations.',
    detail:
      'RoseStack maintains product liability, professional indemnity, and equipment insurance. The homeowner must notify their property insurer of the installation and maintain adequate home insurance.',
  },
  termination: {
    title: 'Termination Provisions',
    summary: 'Limited termination rights with early exit fees.',
    detail:
      'Early termination by the homeowner triggers a buyout fee based on remaining contract value. RoseStack may terminate for material breach after a cure period. Force majeure provisions apply.',
  },
  equipmentRemoval: {
    title: 'Equipment Removal',
    summary: 'RoseStack removes equipment at end of term or offers purchase option.',
    detail:
      'At the end of the 10-year term, RoseStack will either remove the equipment and make good, or offer the homeowner the option to purchase the system at fair market value.',
  },
  propertySale: {
    title: 'Property Sale Provisions',
    summary: 'ESA transfers to new property owner on sale.',
    detail:
      'If the homeowner sells the property, the ESA obligations transfer to the new owner. The homeowner must notify RoseStack of any intended sale and ensure the buyer is made aware of the ESA before exchange of contracts.',
  },
  letterOfAuthority: {
    title: 'Letter of Authority (LoA)',
    summary:
      'CRITICAL: Grants RoseStack authority to manage homeowner energy accounts and tariff switching.',
    detail:
      'The LoA grants RoseStack permission to: (1) View the homeowner\'s energy account with their supplier; (2) Switch the homeowner\'s tariff on their behalf; (3) Communicate with the energy supplier regarding the battery system; (4) Manage G99/SEG registrations associated with the property; (5) Be notified if the homeowner changes supplier. This clause is the key enabler for portfolio-wide tariff optimisation without homeowner involvement.',
    isCritical: true,
  },
  supplierChange: {
    title: 'Supplier Change Notification',
    summary: 'Homeowner must notify RoseStack before switching energy supplier.',
    detail:
      'The homeowner must notify RoseStack at least 30 days before switching energy supplier. RoseStack must confirm the new supplier supports the battery configuration before the switch proceeds.',
  },
};

// --- Legal Risk Register ---

export const legalRisks: LegalRisk[] = [
  {
    id: 'risk-1',
    name: 'ESA triggers FCA consumer credit regulation',
    category: 'financial-regulation',
    description:
      'If the ESA is deemed a consumer credit agreement by the FCA, RoseStack would need a consumer credit licence. This would add significant regulatory burden and cost.',
    probability: 3,
    impact: 5,
    score: 15,
    status: 'open',
    mitigation:
      'Structure ESA as a service agreement, not credit. Obtain solicitor opinion confirming non-credit classification.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-01',
    reviewDate: '2026-04-01',
  },
  {
    id: 'risk-2',
    name: 'G99 application delays',
    category: 'regulatory',
    description:
      'ENWL G99 processing times may exceed 12 weeks, delaying installations and revenue. Grid capacity constraints may lead to rejections.',
    probability: 4,
    impact: 3,
    score: 12,
    status: 'mitigating',
    mitigation:
      'Submit G99 applications early in the sales pipeline. Build 12-week buffer into project timelines. Maintain good relationship with ENWL.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-01',
    reviewDate: '2026-04-15',
  },
  {
    id: 'risk-3',
    name: 'LoA clause challenged by supplier or homeowner',
    category: 'contractual',
    description:
      'Energy suppliers may not accept the LoA, or homeowners may resist granting broad authority. This would undermine the tariff optimisation strategy.',
    probability: 2,
    impact: 5,
    score: 10,
    status: 'open',
    mitigation:
      'Confirm Octopus Energy supports third-party fleet management (Kraken API). Draft LoA with clear, transparent language. Explain benefits to homeowners clearly.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-05',
    reviewDate: '2026-04-15',
  },
  {
    id: 'risk-4',
    name: 'Planning permission required for battery installations',
    category: 'regulatory',
    description:
      'Some installations may require planning permission if they exceed permitted development thresholds. Local authority interpretation varies.',
    probability: 2,
    impact: 3,
    score: 6,
    status: 'mitigating',
    mitigation:
      'Research permitted development rights for battery storage in Burnley/Pendle. Pre-check with local planning authority for first installations.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-01',
    reviewDate: '2026-05-01',
  },
  {
    id: 'risk-5',
    name: 'Homeowner contract enforceability on property sale',
    category: 'contractual',
    description:
      'Risk that ESA obligations do not effectively transfer to new property owners, leaving RoseStack with stranded assets.',
    probability: 2,
    impact: 4,
    score: 8,
    status: 'open',
    mitigation:
      'Register charge or covenant at Land Registry. Include clear transfer provisions in ESA. Solicitor to advise on best mechanism.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-10',
    reviewDate: '2026-04-15',
  },
  {
    id: 'risk-6',
    name: 'Fire safety regulation changes',
    category: 'regulatory',
    description:
      'Evolving fire safety standards for battery storage could impose additional requirements or restrict certain installations.',
    probability: 3,
    impact: 3,
    score: 9,
    status: 'open',
    mitigation:
      'Monitor BEIS and fire safety consultations. Use high-quality LFP chemistry (lower fire risk). Maintain dialogue with Lancashire Fire & Rescue.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-01',
    reviewDate: '2026-06-01',
  },
  {
    id: 'risk-7',
    name: 'Data protection (GDPR) non-compliance',
    category: 'data-protection',
    description:
      'Processing homeowner personal data, energy consumption data, and financial data requires GDPR compliance. LoA adds complexity as data is shared with suppliers.',
    probability: 2,
    impact: 4,
    score: 8,
    status: 'open',
    mitigation:
      'Register with ICO. Prepare privacy notice and data processing agreement. Include data provisions in ESA.',
    owner: 'Dave Middleton',
    identifiedDate: '2026-03-15',
    reviewDate: '2026-04-30',
  },
];

// --- Regulatory Calendar ---

export const regulatoryEvents: RegulatoryEvent[] = [
  {
    id: 'evt-1',
    title: 'ESA Template — Solicitor Review Deadline',
    type: 'deadline',
    date: '2026-04-15',
    description: 'Solicitor must complete review of ESA template including LoA clause.',
    owner: 'Dave Middleton',
    completed: false,
    linkedRequirementId: 'comp-9',
  },
  {
    id: 'evt-2',
    title: 'FCA Consumer Credit Assessment Due',
    type: 'deadline',
    date: '2026-05-01',
    description: 'Solicitor opinion on whether ESA triggers FCA consumer credit regulation.',
    owner: 'Dave Middleton',
    completed: false,
    linkedRequirementId: 'comp-13',
  },
  {
    id: 'evt-3',
    title: 'Insurance Package — Obtain Quotes',
    type: 'deadline',
    date: '2026-05-15',
    description: 'Obtain quotes for product liability, professional indemnity, public liability, and battery-specific insurance.',
    owner: 'Dave Middleton',
    completed: false,
    linkedRequirementId: 'comp-19',
  },
  {
    id: 'evt-4',
    title: 'MCS Certification Target Date',
    type: 'deadline',
    date: '2026-06-01',
    description: 'Target date for completing MCS certification process (via installer).',
    owner: 'Dave Middleton',
    completed: false,
    linkedRequirementId: 'comp-1',
  },
  {
    id: 'evt-5',
    title: 'ICO Registration Renewal',
    type: 'renewal',
    date: '2026-11-01',
    description: 'Annual renewal of ICO data protection registration.',
    owner: 'Dave Middleton',
    completed: false,
  },
  {
    id: 'evt-6',
    title: 'Ofgem Consultation — Flexibility Markets',
    type: 'consultation',
    date: '2026-06-30',
    description: 'Ofgem consultation on flexibility market reform. Respond if relevant to battery storage operations.',
    owner: 'Dave Middleton',
    completed: false,
  },
  {
    id: 'evt-7',
    title: 'BS 7671 Amendment 4 — Chapter 57 Review (URGENT)',
    type: 'review',
    date: '2026-04-15',
    description: 'BS 7671 Amendment 4 publishes 15 April 2026 with new Chapter 57 on battery storage. Review all requirements for thermal runaway, isolation, location restrictions, ventilation, and documentation. Update installation procedures before any Phase 1 deployments.',
    owner: 'Dave Middleton',
    completed: false,
    linkedRequirementId: 'comp-6',
  },
  {
    id: 'evt-8',
    title: 'G99 Pipeline — Quarterly Review',
    type: 'review',
    date: '2026-06-30',
    description: 'Quarterly review of all G99/G98 applications in pipeline. Assess processing times and any DNO issues.',
    owner: 'Dave Middleton',
    completed: false,
  },
  {
    id: 'evt-9',
    title: 'Companies House Annual Confirmation',
    type: 'filing',
    date: '2026-11-01',
    description: 'Annual confirmation statement due at Companies House.',
    owner: 'Dave Middleton',
    completed: false,
  },
  {
    id: 'evt-10',
    title: 'SEIS Advance Assurance Application',
    type: 'deadline',
    date: '2026-04-30',
    description: 'Submit SEIS advance assurance application to HMRC ahead of first investment round.',
    owner: 'Dave Middleton',
    completed: false,
    linkedRequirementId: 'comp-15',
  },
];
