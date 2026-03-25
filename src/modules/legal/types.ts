// ============================================================
// Legal & Compliance Module — Domain Types
// ============================================================

export type ComplianceStatus = 'compliant' | 'pending' | 'action-needed' | 'not-applicable';
export type ComplianceCategory =
  | 'mcs-certification'
  | 'g99-g98'
  | 'electrical-regs'
  | 'esa-contract'
  | 'fca'
  | 'seg-registration'
  | 'insurance'
  | 'fire-safety'
  | 'planning-permission';

export interface ComplianceRequirement {
  id: string;
  category: ComplianceCategory;
  name: string;
  description: string;
  status: ComplianceStatus;
  owner: string;
  dueDate?: string;
  notes?: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  linkedDocuments?: string[];
}

// --- G99 Pipeline ---

export type G99Stage =
  | 'pre-submission'
  | 'submitted'
  | 'dno-review'
  | 'design-approval'
  | 'commissioning'
  | 'connected'
  | 'rejected';

export interface G99Application {
  id: string;
  homeId: string;
  address: string;
  dnoRegion: string;
  applicationType: 'G98' | 'G99';
  stage: G99Stage;
  submissionDate?: string;
  expectedApprovalDate?: string;
  actualApprovalDate?: string;
  referenceNumber?: string;
  capacityKw: number;
  notes?: string;
  updatedAt: string;
}

// --- Certification Tracker ---

export type CertificationType = 'MCS' | 'SEG' | 'NICEIC' | 'NAPIT' | 'other';
export type CertificationStatus = 'active' | 'pending' | 'expired' | 'renewal-due' | 'not-started';

export interface Certification {
  id: string;
  type: CertificationType;
  name: string;
  status: CertificationStatus;
  issuedDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  provider: string;
  reference?: string;
  cost?: number;
  notes?: string;
}

// --- Contract Library ---

export type ContractType = 'ESA' | 'NDA' | 'investor-agreement' | 'installer-agreement' | 'other';
export type ContractStatus = 'draft' | 'review' | 'approved' | 'active' | 'expired' | 'superseded';

export interface ContractTemplate {
  id: string;
  type: ContractType;
  name: string;
  version: string;
  status: ContractStatus;
  createdDate: string;
  lastModified: string;
  owner: string;
  description: string;
  keyClauses?: string[];
  hasLoaClause?: boolean;
}

// --- Risk Register ---

export type LegalRiskCategory =
  | 'regulatory'
  | 'contractual'
  | 'compliance'
  | 'litigation'
  | 'data-protection'
  | 'financial-regulation';

export type LegalRiskStatus = 'open' | 'mitigating' | 'closed' | 'accepted';

export interface LegalRisk {
  id: string;
  name: string;
  category: LegalRiskCategory;
  description: string;
  probability: number; // 1-5
  impact: number; // 1-5
  score: number;
  status: LegalRiskStatus;
  mitigation: string;
  owner: string;
  identifiedDate: string;
  reviewDate: string;
}

// --- Regulatory Calendar ---

export type CalendarEventType = 'deadline' | 'renewal' | 'consultation' | 'audit' | 'review' | 'filing';

export interface RegulatoryEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  description: string;
  owner: string;
  completed: boolean;
  linkedRequirementId?: string;
}
