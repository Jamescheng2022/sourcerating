import {
  DecisionGateway,
  DecisionProviderInfo,
  DecisionProviderType,
  ContextProjection,
  AIProposal,
  ProposalEvaluationResult,
  CanonicalCommitment,
  RoomEvent,
} from '@/types/domain';

/**
 * Replaceable Intelligence Providers Catalog
 * SourceRating supports dynamic routing across rules engines, JEV, and DeepSeek Flash
 */
export const AVAILABLE_PROVIDERS: DecisionProviderInfo[] = [
  {
    id: 'provider-deepseek-flash',
    name: 'DeepSeek Flash adapter',
    type: 'deepseek_flash',
    version: 'runtime-configured',
    latencyClass: 'subsecond',
    description: 'Replaceable low-latency model adapter for classification, routing, and structured extraction.',
  },
  {
    id: 'provider-jev',
    name: 'JEV decision/compaction adapter (shadow)',
    type: 'jev',
    version: 'runtime-configured',
    latencyClass: 'instant',
    description: 'Optional fast typed-decision and context-compaction challenger. Never a canonical authority.',
  },
  {
    id: 'provider-rules',
    name: 'Baseline Rules Engine',
    type: 'rules',
    version: 'p1',
    latencyClass: 'instant',
    description: 'Deterministic baseline rules used for safe fallbacks and comparison against model providers.'
  },
];

/**
 * In-memory client implementation of DecisionGateway
 * Demonstrates provider pluggability without hardcoding UI behavior to any single LLM or rule engine.
 */
export class ProjectRoomDecisionGatewayClient implements DecisionGateway {
  private activeProviderType: DecisionProviderType;

  constructor(initialProviderType: DecisionProviderType = 'deepseek_flash') {
    this.activeProviderType = initialProviderType;
  }

  getActiveProvider(): DecisionProviderInfo {
    const provider = AVAILABLE_PROVIDERS.find((p) => p.type === this.activeProviderType);
    return provider || AVAILABLE_PROVIDERS[0];
  }

  setProvider(providerType: DecisionProviderType): void {
    const exists = AVAILABLE_PROVIDERS.some((p) => p.type === providerType);
    if (exists) {
      this.activeProviderType = providerType;
    }
  }

  listAvailableProviders(): DecisionProviderInfo[] {
    return AVAILABLE_PROVIDERS;
  }

  async projectContext(roomId: string, events: RoomEvent[]): Promise<ContextProjection> {
    const recentImportantEvents = events.slice(-10);
    const activeFiles = events.filter((e): e is import('@/types/domain').FileEvent => e.type === 'file');

    return {
      recentImportantEvents,
      openQuestions: [
        {
          id: 'q-101',
          question: 'Does the RMB 320,000 quote include CIF Laem Chabang port customs clearing?',
          raisedBy: 'Priya Somchai (Apex Commercial)',
          assignedToOrg: 'EastFrame Steel Co., Ltd.',
          sourceEventId: 'msg-quote-v3',
          status: 'open',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      pendingActions: [
        {
          id: 'act-201',
          roomId,
          title: 'Confirm EastFrame panel thickness spec (75mm -> 100mm)',
          description: 'AI noticed spec upgrade in Quote v3 (+RMB 25,000). Human confirmation required to update Canonical Project State.',
          urgency: 'high',
          sourceEventId: 'prop-eastframe-v3',
          actionType: 'spec_signoff',
          status: 'pending',
          assignedRole: 'Lead Structural Engineer',
        },
      ],
      activeFiles,
    };
  }

  async evaluateProposal(
    proposal: AIProposal,
    _context: ContextProjection
  ): Promise<ProposalEvaluationResult> {
    // Behavior tailored by swappable provider
    if (this.activeProviderType === 'deepseek_flash') {
      return {
        suggestedAction: 'recommend_confirm',
        confidence: 0.94,
        rationale:
          'DeepSeek Flash verified that 100mm PU panel aligns with the Bangkok project specification for thermal insulation (R >= 3.5). The RMB 25,000 cost variance is within the 10% contingency buffer.',
        riskFactors: [
          'Verify foundation dead-load margin for +3.2kg/sqm additional panel weight.',
          'Lead time compressed from 60 days to 45 days requires expedited raw material booking.',
        ],
      };
    } else if (this.activeProviderType === 'jev') {
      return {
        suggestedAction: 'flag_discrepancy',
        confidence: 0.88,
        rationale:
          'JEV Rule Validator passed thermal check, but detected unconfirmed payment milestone split (30/40/30).',
        riskFactors: ['Payment terms must be acknowledged before final PO emission.'],
      };
    } else {
      return {
        suggestedAction: 'require_human_audit',
        confidence: 0.75,
        rationale: 'Rules engine identified nominal thickness change. Manual engineer review required.',
        riskFactors: ['Spec change requires human signature.'],
      };
    }
  }

  async confirmCanonical(
    proposalId: string,
    authorizer: string,
    rationale?: string
  ): Promise<CanonicalCommitment> {
    return {
      success: true,
      canonicalEventId: `canonical-${Date.now()}`,
      canonicalRecordId: `CANONICAL-SPEC-${proposalId.slice(-6).toUpperCase()}`,
      appliedAt: new Date().toISOString(),
    };
  }

  async dismissProposal(_proposalId: string, _reason?: string): Promise<boolean> {
    return true;
  }
}

// Singleton helper for UI components
let singletonClient: ProjectRoomDecisionGatewayClient | null = null;

export function getDecisionGateway(): ProjectRoomDecisionGatewayClient {
  if (!singletonClient) {
    singletonClient = new ProjectRoomDecisionGatewayClient('deepseek_flash');
  }
  return singletonClient;
}