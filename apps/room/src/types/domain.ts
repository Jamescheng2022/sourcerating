/**
 * SourceRating V4 P1 Domain Types
 * Core entities for Project Room collaboration, provenance, AI staging, and canonical state.
 */

export type OrganizationRole = 'buyer' | 'supplier' | 'subcontractor';

export interface Organization {
  id: string;
  name: string;
  code: string;
  role: OrganizationRole;
  domain?: string;
  badge?: string;
}

export type ProjectStatus = 'active' | 'in_review' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  phase: string;
  status: ProjectStatus;
  description?: string;
  targetBudget?: {
    amount: number;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type BoundaryType = 'buyer_internal' | 'external_supplier';
export type ConfidentialityLevel = 'confidential_internal' | 'external_counterparty';

export interface RoomBoundary {
  id: string;
  type: BoundaryType;
  label: string;
  description: string;
  confidentialityNotice: string;
  confidentialityLevel: ConfidentialityLevel;
  counterpartyOrganizationId?: string;
  counterpartyOrganizationName?: string;
  allowedOrganizationIds: string[];
}

export type RoomType = 'internal' | 'supplier';

export interface Room {
  id: string;
  projectId: string;
  name: string;
  type: RoomType;
  boundary: RoomBoundary;
  counterpartyOrgName?: string;
  unreadCount: number;
  needsYouCount: number;
  participantCount: number;
  lastActivityAt: string;
}

export type RoomEventType = 'message' | 'file' | 'system' | 'proposal';

export interface EventActor {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: string;
  isAi?: boolean;
}

export interface RoomEventBase {
  id: string;
  roomId: string;
  timestamp: string;
  type: RoomEventType;
  actor: EventActor;
}

export interface MessageEvent extends RoomEventBase {
  type: 'message';
  text: string;
  mentions?: string[];
  isPinned?: boolean;
  replyToId?: string;
  quoteRef?: {
    text: string;
    author: string;
  };
}

export interface FileEvent extends RoomEventBase {
  type: 'file';
  fileName: string;
  fileUrl: string;
  fileSize: string;
  mimeType: string;
  version: string;
  supersedesVersion?: string;
  checksum?: string;
  summary?: string;
  provenanceMessageId?: string;
}

export interface SystemEvent extends RoomEventBase {
  type: 'system';
  systemAction: string;
  detail: string;
  associatedEventId?: string;
}

export type ProposalStatus = 'staged_draft' | 'under_review' | 'confirmed_canonical' | 'dismissed';

export interface ProposalDiff {
  field: string;
  label: string;
  previousValue: string;
  proposedValue: string;
  significance: 'commercial' | 'technical' | 'schedule';
}

export interface AIProposal extends RoomEventBase {
  type: 'proposal';
  triggerEventId: string;
  status: ProposalStatus;
  title: string;
  rationale: string;
  quoteVersion: string;
  quoteTotalRmb: number;
  deliveryDays: number;
  panelThicknessFromMm: number;
  panelThicknessToMm: number;
  diffs: ProposalDiff[];
  stagedAt: string;
  reviewedAt?: string;
  canonicalConfirmedAt?: string;
  confirmedBy?: string;
}

export type RoomEvent = MessageEvent | FileEvent | SystemEvent | AIProposal;

export type ActionUrgency = 'critical' | 'high' | 'medium' | 'normal';
export type ActionType = 'commercial_review' | 'spec_signoff' | 'supplier_response' | 'general';
export type ActionStatus = 'pending' | 'resolved';

export interface PendingAction {
  id: string;
  roomId: string;
  title: string;
  description: string;
  urgency: ActionUrgency;
  sourceEventId: string;
  actionType: ActionType;
  status: ActionStatus;
  dueDate?: string;
  assignedRole: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
  raisedBy: string;
  assignedToOrg: string;
  sourceEventId: string;
  status: 'open' | 'answered';
  createdAt: string;
}

/**
 * ContextProjection
 * Materialized aggregate projection derived from room events and files for decision assistance.
 */
export interface ContextProjection {
  recentImportantEvents: RoomEvent[];
  openQuestions: OpenQuestion[];
  pendingActions: PendingAction[];
  activeFiles: FileEvent[];
}

/**
 * DecisionGateway replaceable provider abstraction.
 * Supports swappable intelligence models (Rules engine, JEV, DeepSeek Flash)
 * without coupling any provider to the frontend UI.
 */
export type DecisionProviderType = 'rules' | 'jev' | 'deepseek_flash' | 'custom';

export interface DecisionProviderInfo {
  id: string;
  name: string;
  type: DecisionProviderType;
  version: string;
  latencyClass: 'instant' | 'subsecond' | 'async';
  description: string;
}

export interface ProposalEvaluationResult {
  suggestedAction: 'recommend_confirm' | 'flag_discrepancy' | 'require_human_audit';
  confidence: number;
  rationale: string;
  riskFactors: string[];
}

export interface CanonicalCommitment {
  success: boolean;
  canonicalEventId: string;
  appliedAt: string;
  canonicalRecordId: string;
}

export interface DecisionGateway {
  getActiveProvider(): DecisionProviderInfo;
  setProvider(providerType: DecisionProviderType): void;
  listAvailableProviders(): DecisionProviderInfo[];
  projectContext(roomId: string, events: RoomEvent[]): Promise<ContextProjection>;
  evaluateProposal(proposal: AIProposal, context: ContextProjection): Promise<ProposalEvaluationResult>;
  confirmCanonical(proposalId: string, authorizer: string, rationale?: string): Promise<CanonicalCommitment>;
  dismissProposal(proposalId: string, reason?: string): Promise<boolean>;
}

/**
 * UI State Drawer domain models
 */
export interface RequirementItem {
  id: string;
  category: 'Structural' | 'Thermal' | 'Compliance' | 'Electrical';
  label: string;
  targetValue: string;
  currentValue: string;
  status: 'verified' | 'pending_confirmation' | 'deviation';
  sourceEventId: string;
}

export interface QuoteComparisonItem {
  id: string;
  vendorName: string;
  version: string;
  totalAmountRmb: number;
  leadTimeDays: number;
  panelSpec: string;
  warranty: string;
  isLatest: boolean;
  sourceEventId: string;
}

export interface DecisionItem {
  id: string;
  title: string;
  canonicalStatus: 'canonical_confirmed' | 'staged_draft' | 'superseded';
  decidedBy: string;
  effectiveDate: string;
  sourceEventId: string;
}