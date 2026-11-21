import {
  Organization,
  Project,
  Room,
  RoomEvent,
  MessageEvent,
  FileEvent,
  SystemEvent,
  AIProposal,
  RequirementItem,
  QuoteComparisonItem,
  DecisionItem,
  PendingAction,
  ContextProjection,
} from '@/types/domain';

export const CURRENT_USER = {
  id: 'usr-buyer-lead',
  name: 'Tanawat Chen (Project Director)',
  organizationId: 'org-apex-buyer',
  organizationName: 'Apex Living Modular (Thailand)',
  role: 'Lead Procurement & Project Director',
};

export const BUYER_ORGANIZATION: Organization = {
  id: 'org-apex-buyer',
  name: 'Apex Living Modular',
  code: 'APEX',
  role: 'buyer',
  domain: 'apexmodular.asia',
  badge: 'Buyer Organization',
};

export const SUPPLIER_EASTFRAME_ORG: Organization = {
  id: 'org-eastframe-supplier',
  name: 'EastFrame Steel Co., Ltd.',
  code: 'EASTFRAME',
  role: 'supplier',
  domain: 'eastframe-steel.cn',
  badge: 'Primary Steel Fabricator',
};

export const SUPPLIER_SIAM_ORG: Organization = {
  id: 'org-siam-panels',
  name: 'Siam Panels Ltd.',
  code: 'SIAM-PANEL',
  role: 'supplier',
  domain: 'siampanels.co.th',
  badge: 'Envelope & Cladding Partner',
};

export const ACTIVE_PROJECT: Project = {
  id: 'proj-bkk-prefab',
  name: 'Bangkok Prefab Office',
  code: 'BKK-MOD-2026-08',
  organizationId: 'org-apex-buyer',
  phase: 'Phase 2: Technical & Commercial Alignment',
  status: 'active',
  description: '4-Story Modular Prefabricated Commercial Office (Rama IX District, Bangkok). Fast-track steel frame with high thermal envelope.',
  targetBudget: {
    amount: 300000,
    currency: 'RMB',
  },
  createdAt: '2026-08-15T08:00:00Z',
  updatedAt: '2026-09-25T13:40:00Z',
};

export const MOCK_ROOMS: Room[] = [
  {
    id: 'room-buyer-internal',
    projectId: 'proj-bkk-prefab',
    name: 'Buyer Internal',
    type: 'internal',
    boundary: {
      id: 'bnd-internal',
      type: 'buyer_internal',
      label: 'Buyer Internal Room',
      description: 'Confidential to Apex Living Modular team only. External suppliers have zero visibility.',
      confidentialityNotice: 'RESTRICTED INTERNAL: External suppliers (EastFrame, Siam Panels) cannot see messages, draft revisions, or internal margin analysis here.',
      confidentialityLevel: 'confidential_internal',
      allowedOrganizationIds: ['org-apex-buyer'],
    },
    unreadCount: 0,
    needsYouCount: 1,
    participantCount: 6,
    lastActivityAt: '2026-09-25T11:20:00Z',
  },
  {
    id: 'room-eastframe-steel',
    projectId: 'proj-bkk-prefab',
    name: 'EastFrame Steel',
    type: 'supplier',
    counterpartyOrgName: 'EastFrame Steel Co., Ltd.',
    boundary: {
      id: 'bnd-eastframe',
      type: 'external_supplier',
      label: 'External Supplier Room',
      description: 'Shared bilateral collaboration channel with EastFrame Steel Co., Ltd.',
      confidentialityNotice: 'EXTERNAL COUNTERPARTY: Messages and files sent here are visible to EastFrame Steel Co., Ltd. (China). Statements represent binding corporate exchange.',
      confidentialityLevel: 'external_counterparty',
      counterpartyOrganizationId: 'org-eastframe-supplier',
      counterpartyOrganizationName: 'EastFrame Steel Co., Ltd.',
      allowedOrganizationIds: ['org-apex-buyer', 'org-eastframe-supplier'],
    },
    unreadCount: 2,
    needsYouCount: 2,
    participantCount: 9,
    lastActivityAt: '2026-09-25T13:42:00Z',
  },
  {
    id: 'room-siam-panels',
    projectId: 'proj-bkk-prefab',
    name: 'Siam Panels',
    type: 'supplier',
    counterpartyOrgName: 'Siam Panels Ltd.',
    boundary: {
      id: 'bnd-siam',
      type: 'external_supplier',
      label: 'External Supplier Room',
      description: 'Shared bilateral channel with Siam Panels Ltd. (Thailand local envelope fabrication).',
      confidentialityNotice: 'EXTERNAL COUNTERPARTY: Messages and files sent here are visible to Siam Panels Ltd. (Bangkok).',
      confidentialityLevel: 'external_counterparty',
      counterpartyOrganizationId: 'org-siam-panels',
      counterpartyOrganizationName: 'Siam Panels Ltd.',
      allowedOrganizationIds: ['org-apex-buyer', 'org-siam-panels'],
    },
    unreadCount: 0,
    needsYouCount: 0,
    participantCount: 5,
    lastActivityAt: '2026-09-24T16:15:00Z',
  },
];

/**
 * Stable Mock Events for EastFrame Steel room
 */
export const EASTFRAME_ROOM_EVENTS: RoomEvent[] = [
  {
    id: 'evt-sys-verify-boundary',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T09:00:00Z',
    type: 'system',
    actor: {
      id: 'sys-sourcerating',
      name: 'SourceRating Audit Daemon',
      organizationId: 'sys',
      organizationName: 'SourceRating Core',
      role: 'Cryptographic Boundary Enforcement',
      isAi: false,
    },
    systemAction: 'BOUNDARY_VERIFIED',
    detail: 'External room boundary confirmed: Bilateral channel active between Apex Living Modular and EastFrame Steel Co., Ltd. All artifacts watermarked.',
  } as SystemEvent,
  {
    id: 'msg-initial-context',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T09:15:00Z',
    type: 'message',
    actor: {
      id: 'usr-tanawat',
      name: 'Tanawat Chen',
      organizationId: 'org-apex-buyer',
      organizationName: 'Apex Living Modular',
      role: 'Project Director',
    },
    text: 'Good morning EastFrame team. We reviewed Quote v2 for the Rama IX Bangkok Prefab Office. While the steel framework sizing is compliant with TIS 107-2533, the 75mm wall panels do not meet our Bangkok climate energy model. Our structural architect requires upgrading the exterior envelope to 100mm PU fireproof insulated sandwich panels.',
  } as MessageEvent,
  {
    id: 'msg-spec-req',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T09:22:00Z',
    type: 'message',
    actor: {
      id: 'usr-somchai',
      name: 'Priya Somchai',
      organizationId: 'org-apex-buyer',
      organizationName: 'Apex Living Modular',
      role: 'Lead MEP & Energy Specialist',
    },
    text: 'Attached structural spec requirement: The 100mm core is needed to achieve thermal insulation R-value >= 3.5. Also, can your engineering team confirm if the column connection plates have been revised for 1.8 kPa wind load resistance?',
  } as MessageEvent,
  {
    id: 'msg-eastframe-reply',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T11:05:00Z',
    type: 'message',
    actor: {
      id: 'usr-wanglin',
      name: 'Wang Lin (王林)',
      organizationId: 'org-eastframe-supplier',
      organizationName: 'EastFrame Steel Co., Ltd.',
      role: 'Export Commercial Lead',
    },
    text: 'Tanawat总、Priya工程师好！收到关于100mm保温芯板升级的要求。我们技术部门刚才完成了节点应力重新核算：柱连接板与M24高强螺栓规格完全能满足1.8 kPa风载。我们重新核算了BOM成本，并压缩了冷弯型钢车间排产周期。最新Quotation v3已经生成，附带了详细的钢构与墙板清单。',
  } as MessageEvent,
  {
    id: 'file-quote-v3',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T11:10:00Z',
    type: 'file',
    actor: {
      id: 'usr-wanglin',
      name: 'Wang Lin (王林)',
      organizationId: 'org-eastframe-supplier',
      organizationName: 'EastFrame Steel Co., Ltd.',
      role: 'Export Commercial Lead',
    },
    fileName: 'Quotation_EastFrame.pdf',
    fileUrl: '/mock/Quotation_EastFrame_v3.pdf',
    fileSize: '2.4 MB',
    mimeType: 'application/pdf',
    version: 'v3',
    supersedesVersion: 'v2',
    checksum: 'sha256:8f2a1b94d7c0e5a61129b8c005e81d77a',
    summary: 'Commercial Quote v3 (EastFrame Steel): Upgraded PU core 100mm, optimized production schedule, total RMB 320,000 CIF Laem Chabang.',
    provenanceMessageId: 'msg-quote-v3',
  } as FileEvent,
  {
    id: 'msg-quote-v3',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T11:12:00Z',
    type: 'message',
    actor: {
      id: 'usr-wanglin',
      name: 'Wang Lin (王林)',
      organizationId: 'org-eastframe-supplier',
      organizationName: 'EastFrame Steel Co., Ltd.',
      role: 'Export Commercial Lead',
    },
    text: 'Please review Quotation_EastFrame.pdf v3 (supersedes v2). The adjusted package total is RMB 320,000 (was RMB 295,000). To compensate for the lead time on the 100mm PU panels, we have arranged priority modular staging: delivery to Laem Chabang Port will be 45 calendar days instead of 60 days.',
  } as MessageEvent,
  {
    id: 'prop-eastframe-v3',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T11:13:00Z',
    type: 'proposal',
    actor: {
      id: 'ai-sourcerating-stager',
      name: 'SourceRating Intelligence',
      organizationId: 'sys',
      organizationName: 'SourceRating Staging Engine',
      role: 'AI Context Projection Daemon',
      isAi: true,
    },
    triggerEventId: 'file-quote-v3',
    status: 'staged_draft',
    title: 'AI noticed a commercial change in Quotation_EastFrame.pdf v3',
    rationale: 'Derived from uploaded Quotation_EastFrame.pdf v3 superseding v2. Staged as non-binding draft pending human sign-off.',
    quoteVersion: 'v3',
    quoteTotalRmb: 320000,
    deliveryDays: 45,
    panelThicknessFromMm: 75,
    panelThicknessToMm: 100,
    diffs: [
      {
        field: 'totalPrice',
        label: 'Commercial Price',
        previousValue: 'RMB 295,000',
        proposedValue: 'RMB 320,000 (+8.4%)',
        significance: 'commercial',
      },
      {
        field: 'leadTime',
        label: 'Fabrication & Delivery',
        previousValue: '60 Calendar Days',
        proposedValue: '45 Calendar Days (-15d)',
        significance: 'schedule',
      },
      {
        field: 'panelThickness',
        label: 'Wall Panel Insulation Core',
        previousValue: '75mm PU Core',
        proposedValue: '100mm PU Fireproof Core',
        significance: 'technical',
      },
    ],
    stagedAt: '2026-09-25T11:13:00Z',
  } as AIProposal,
  {
    id: 'msg-engineer-question',
    roomId: 'room-eastframe-steel',
    timestamp: '2026-09-25T13:40:00Z',
    type: 'message',
    actor: {
      id: 'usr-somchai',
      name: 'Priya Somchai',
      organizationId: 'org-apex-buyer',
      organizationName: 'Apex Living Modular',
      role: 'Lead MEP & Energy Specialist',
    },
    text: 'Wang Lin, 45 days delivery is very favorable for our schedule. Does the RMB 320,000 CIF quotation include sea container bracing and moisture desiccant bags for monsoon transport?',
  } as MessageEvent,
];

/**
 * Stable Mock Events for Buyer Internal room
 */
export const BUYER_INTERNAL_EVENTS: RoomEvent[] = [
  {
    id: 'evt-sys-internal-bnd',
    roomId: 'room-buyer-internal',
    timestamp: '2026-09-25T08:00:00Z',
    type: 'system',
    actor: {
      id: 'sys-sourcerating',
      name: 'SourceRating Audit Daemon',
      organizationId: 'sys',
      organizationName: 'SourceRating Core',
      role: 'Cryptographic Boundary Enforcement',
      isAi: false,
    },
    systemAction: 'CONFIDENTIAL_MODE_ENGAGED',
    detail: 'Buyer Internal Room isolation confirmed. External counterparties (EastFrame, Siam Panels) strictly excluded from this channel.',
  } as SystemEvent,
  {
    id: 'msg-internal-margin',
    roomId: 'room-buyer-internal',
    timestamp: '2026-09-25T08:30:00Z',
    type: 'message',
    actor: {
      id: 'usr-tanawat',
      name: 'Tanawat Chen',
      organizationId: 'org-apex-buyer',
      organizationName: 'Apex Living Modular',
      role: 'Project Director',
    },
    text: 'Team, our Rama IX project target budget ceiling is RMB 300,000. EastFrame’s initial quote was RMB 295,000, but they will likely charge ~RMB 25,000 extra for the 100mm PU upgrade. If they hit RMB 320,000 with a 45-day lead time, can we absorb that in the foundation contingency buffer?',
  } as MessageEvent,
  {
    id: 'msg-internal-finance',
    roomId: 'room-buyer-internal',
    timestamp: '2026-09-25T08:45:00Z',
    type: 'message',
    actor: {
      id: 'usr-korn',
      name: 'Korn Kittisak',
      organizationId: 'org-apex-buyer',
      organizationName: 'Apex Living Modular',
      role: 'Commercial Controller',
    },
    text: 'Yes, we have 40,000 RMB contingency allocated for logistics and weather buffer. If EastFrame commits to 45 days delivery instead of 60 days, we save roughly 3 weeks on site crane rental in Bangkok, which nets out positive.',
  } as MessageEvent,
  {
    id: 'msg-decision-anchor',
    roomId: 'room-buyer-internal',
    timestamp: '2026-09-25T09:10:00Z',
    type: 'message',
    actor: {
      id: 'usr-somchai',
      name: 'Priya Somchai',
      organizationId: 'org-apex-buyer',
      organizationName: 'Apex Living Modular',
      role: 'Lead MEP & Energy Specialist',
    },
    text: 'Canonical sign-off: Foundation anchor bolt specification is locked at M24 Grade 8.8 hot-dip galvanized. I have updated the engineering register accordingly.',
  } as MessageEvent,
];

/**
 * Stable Mock Events for Siam Panels room
 */
export const SIAM_PANELS_EVENTS: RoomEvent[] = [
  {
    id: 'evt-sys-siam-bnd',
    roomId: 'room-siam-panels',
    timestamp: '2026-09-24T14:00:00Z',
    type: 'system',
    actor: {
      id: 'sys-sourcerating',
      name: 'SourceRating Audit Daemon',
      organizationId: 'sys',
      organizationName: 'SourceRating Core',
      role: 'Cryptographic Boundary Enforcement',
      isAi: false,
    },
    systemAction: 'BOUNDARY_VERIFIED',
    detail: 'Bilateral external channel active with Siam Panels Ltd.',
  } as SystemEvent,
  {
    id: 'msg-siam-1',
    roomId: 'room-siam-panels',
    timestamp: '2026-09-24T16:00:00Z',
    type: 'message',
    actor: {
      id: 'usr-siam-rep',
      name: 'Chatchai V.',
      organizationId: 'org-siam-panels',
      organizationName: 'Siam Panels Ltd.',
      role: 'Sales Director',
    },
    text: 'Sawadee krub Tanawat. We submitted Quote v2 for alternative locally manufactured EPS sandwich panels at RMB 345,000 with 55 days lead time. Let us know if you need full fire-rating certification lab tests.',
  } as MessageEvent,
];

/**
 * Project State Drawer Mock Data with Provenance Anchors
 */
export const MOCK_REQUIREMENTS: RequirementItem[] = [
  {
    id: 'req-1',
    category: 'Thermal',
    label: 'Wall Panel Thickness & Core',
    targetValue: '100mm PU Fireproof Core',
    currentValue: '100mm (Upgraded from 75mm in Quote v3)',
    status: 'pending_confirmation',
    sourceEventId: 'prop-eastframe-v3',
  },
  {
    id: 'req-2',
    category: 'Thermal',
    label: 'Thermal Resistance (Envelope)',
    targetValue: 'R-value >= 3.5 (m²·K)/W',
    currentValue: 'R-value 3.7 (Met with 100mm PU)',
    status: 'verified',
    sourceEventId: 'msg-spec-req',
  },
  {
    id: 'req-3',
    category: 'Structural',
    label: 'Wind Load Resistance (Bangkok)',
    targetValue: '1.8 kPa Ultimate Limit State',
    currentValue: '1.8 kPa (Validated with M24 bolts)',
    status: 'verified',
    sourceEventId: 'msg-eastframe-reply',
  },
  {
    id: 'req-4',
    category: 'Compliance',
    label: 'Fire Rating Standard',
    targetValue: 'TIS 432-2549 Class A Non-combustible',
    currentValue: 'Class A Core Certified',
    status: 'verified',
    sourceEventId: 'file-quote-v3',
  },
];

export const MOCK_QUOTE_COMPARISONS: QuoteComparisonItem[] = [
  {
    id: 'qc-eastframe-v3',
    vendorName: 'EastFrame Steel Co., Ltd. (Quote v3)',
    version: 'v3',
    totalAmountRmb: 320000,
    leadTimeDays: 45,
    panelSpec: '100mm PU Core (Fireproof)',
    warranty: '10 Years Structural / 5 Years Coating',
    isLatest: true,
    sourceEventId: 'msg-quote-v3',
  },
  {
    id: 'qc-eastframe-v2',
    vendorName: 'EastFrame Steel Co., Ltd. (Quote v2 - Superseded)',
    version: 'v2',
    totalAmountRmb: 295000,
    leadTimeDays: 60,
    panelSpec: '75mm PU Core (Thermal R=2.8)',
    warranty: '10 Years Structural',
    isLatest: false,
    sourceEventId: 'file-quote-v3',
  },
  {
    id: 'qc-siam-v2',
    vendorName: 'Siam Panels Ltd. (Quote v2)',
    version: 'v2',
    totalAmountRmb: 345000,
    leadTimeDays: 55,
    panelSpec: '75mm Local EPS Panel',
    warranty: '5 Years Envelope',
    isLatest: true,
    sourceEventId: 'msg-siam-1',
  },
];

export const MOCK_DECISIONS: DecisionItem[] = [
  {
    id: 'dec-1',
    title: 'Foundation Anchor Bolts Specification (M24 Grade 8.8 HDG)',
    canonicalStatus: 'canonical_confirmed',
    decidedBy: 'Priya Somchai (Lead Engineer)',
    effectiveDate: '2026-09-25 09:10',
    sourceEventId: 'msg-decision-anchor',
  },
  {
    id: 'dec-2',
    title: 'Wall Panel Spec Upgrade (75mm -> 100mm PU) & Price RMB 320,000',
    canonicalStatus: 'staged_draft',
    decidedBy: 'AI Staging Engine (Pending Human Sign-off)',
    effectiveDate: 'Staged 2026-09-25 11:13',
    sourceEventId: 'prop-eastframe-v3',
  },
];

export const MOCK_NEEDS_YOU: PendingAction[] = [
  {
    id: 'act-1',
    roomId: 'room-eastframe-steel',
    title: 'Confirm Quote v3 Commercial & Spec Changes',
    description: 'Review EastFrame’s Quote v3 (+RMB 25,000, 45d delivery, 100mm panel upgrade). Human sign-off required to commit to Canonical Project State.',
    urgency: 'high',
    sourceEventId: 'prop-eastframe-v3',
    actionType: 'commercial_review',
    status: 'pending',
    assignedRole: 'Project Director',
  },
  {
    id: 'act-2',
    roomId: 'room-eastframe-steel',
    title: 'Answer Port Clearance Query',
    description: 'Confirm if CIF Laem Chabang pricing includes heavy container devanning and desiccant packing for monsoon transit.',
    urgency: 'medium',
    sourceEventId: 'msg-engineer-question',
    actionType: 'supplier_response',
    status: 'pending',
    assignedRole: 'Commercial Lead',
  },
];

export const MOCK_CONTEXT_PROJECTION: ContextProjection = {
  recentImportantEvents: EASTFRAME_ROOM_EVENTS.slice(-4),
  openQuestions: [
    {
      id: 'q-1',
      question: 'Does RMB 320,000 quote include sea container bracing and moisture desiccant bags for monsoon transport?',
      raisedBy: 'Priya Somchai (Apex Modular)',
      assignedToOrg: 'EastFrame Steel Co., Ltd.',
      sourceEventId: 'msg-engineer-question',
      status: 'open',
      createdAt: '2026-09-25T13:40:00Z',
    },
  ],
  pendingActions: MOCK_NEEDS_YOU,
  activeFiles: [
    EASTFRAME_ROOM_EVENTS.find((e) => e.type === 'file') as FileEvent,
  ],
};