import { supabase } from "./supabase";

export interface StagingProposal {
  id: string;
  room_id: string;
  source_event_id: string | null;
  proposal_type: string;
  payload: any;
  confidence: number | null;
  provider: string | null;
  status: "pending" | "accepted" | "dismissed" | string;
  created_at: string;
  reviewed_at: string | null;
}

export interface NeedsYouItem {
  id: string;
  room_id: string;
  source_event_id: string | null;
  proposal_id: string | null;
  title: string;
  detail: string | null;
  priority: "low" | "normal" | "high" | "critical" | string;
  status: "open" | "resolved" | "dismissed" | string;
  target_organization_id: string;
  created_at: string;
}

export interface CanonicalObject {
  id: string;
  room_id: string;
  object_type: string;
  payload: any;
  source_event_id: string | null;
  accepted_proposal_id: string | null;
  version_no: number;
  status: "active" | string;
  committed_at: string;
}

export interface ProjectRoomState {
  stagingProposals: StagingProposal[];
  needsYou: NeedsYouItem[];
  canonicalObjects: CanonicalObject[];
}

export interface ExtractedValueItem {
  key: string;
  value: string;
  previous?: string | null;
  quote?: string | null;
}

/**
 * Extract human-readable summary from arbitrary proposal or canonical payload
 */
export function extractProposalSummary(payload: any): string {
  if (!payload || typeof payload !== "object") return "Proposal update";

  if (typeof payload.summary === "string" && payload.summary.trim()) {
    return payload.summary.trim();
  }
  if (typeof payload.description === "string" && payload.description.trim()) {
    return payload.description.trim();
  }
  if (typeof payload.title === "string" && payload.title.trim()) {
    return payload.title.trim();
  }
  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }
  if (Array.isArray(payload.requirementChanges) && payload.requirementChanges.length > 0) {
    const first = payload.requirementChanges[0];
    const field = first?.field || "requirement";
    const proposed = first?.proposed || "";
    return `Proposed change to ${field}: ${proposed}`;
  }
  if (Array.isArray(payload.quoteChanges) && payload.quoteChanges.length > 0) {
    const first = payload.quoteChanges[0];
    const field = first?.field || "commercial term";
    const proposed = first?.proposed || "";
    return `Proposed quote change to ${field}: ${proposed}`;
  }

  return "Staging proposal awaiting review";
}

/**
 * Extract structured changes and key-value attributes from payload
 */
export function extractChangesAndValues(payload: any): ExtractedValueItem[] {
  if (!payload || typeof payload !== "object") return [];
  const items: ExtractedValueItem[] = [];

  // 1. Structured requirement changes
  if (Array.isArray(payload.requirementChanges)) {
    for (const change of payload.requirementChanges) {
      if (change && typeof change === "object") {
        items.push({
          key: String(change.field || "Requirement"),
          value: String(change.proposed ?? ""),
          previous: change.previous ? String(change.previous) : null,
          quote: change.evidenceQuote ? String(change.evidenceQuote) : null,
        });
      }
    }
  }

  // 2. Structured quote changes
  if (Array.isArray(payload.quoteChanges)) {
    for (const change of payload.quoteChanges) {
      if (change && typeof change === "object") {
        items.push({
          key: String(change.field || "Quote Term"),
          value: String(change.proposed ?? ""),
          previous: change.previous ? String(change.previous) : null,
          quote: change.evidenceQuote ? String(change.evidenceQuote) : null,
        });
      }
    }
  }

  // 3. Extracted values / specifications dictionary
  const ext =
    payload.extracted_values ||
    payload.extractedValues ||
    payload.values ||
    payload.specifications;

  if (ext && typeof ext === "object") {
    if (Array.isArray(ext)) {
      for (const val of ext) {
        if (typeof val === "object" && val !== null) {
          items.push({
            key: String(val.key || val.field || val.name || "Item"),
            value: String(val.value ?? val.proposed ?? JSON.stringify(val)),
            previous: val.previous ? String(val.previous) : null,
            quote:
              val.quote || val.evidenceQuote
                ? String(val.quote || val.evidenceQuote)
                : null,
          });
        }
      }
    } else {
      for (const [k, v] of Object.entries(ext)) {
        items.push({
          key: k,
          value: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
        });
      }
    }
  }

  // 4. Fallback to top-level attributes if no structured array found
  if (items.length === 0) {
    const skipKeys = new Set([
      "summary",
      "description",
      "classification",
      "actionable",
      "confidence",
      "evidenceQuote",
      "evidence_quote",
      "evidence",
      "quote",
      "sourceQuote",
      "openQuestions",
      "risks",
      "pendingActions",
      "provider",
    ]);

    for (const [k, v] of Object.entries(payload)) {
      if (!skipKeys.has(k) && v !== null && v !== undefined && v !== "") {
        items.push({
          key: k.replace(/_/g, " "),
          value: typeof v === "object" ? JSON.stringify(v) : String(v),
        });
      }
    }
  }

  return items;
}

/**
 * Extract evidence quote snippet from payload
 */
export function extractEvidenceQuote(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;

  if (typeof payload.evidenceQuote === "string" && payload.evidenceQuote.trim()) {
    return payload.evidenceQuote.trim();
  }
  if (typeof payload.evidence_quote === "string" && payload.evidence_quote.trim()) {
    return payload.evidence_quote.trim();
  }
  if (typeof payload.evidence === "string" && payload.evidence.trim()) {
    return payload.evidence.trim();
  }
  if (typeof payload.quote === "string" && payload.quote.trim()) {
    return payload.quote.trim();
  }
  if (typeof payload.sourceQuote === "string" && payload.sourceQuote.trim()) {
    return payload.sourceQuote.trim();
  }

  if (Array.isArray(payload.requirementChanges) && payload.requirementChanges.length > 0) {
    const q = payload.requirementChanges[0]?.evidenceQuote;
    if (typeof q === "string" && q.trim()) return q.trim();
  }
  if (Array.isArray(payload.quoteChanges) && payload.quoteChanges.length > 0) {
    const q = payload.quoteChanges[0]?.evidenceQuote;
    if (typeof q === "string" && q.trim()) return q.trim();
  }

  return null;
}

/**
 * Format confidence percentage nicely
 */
export function formatConfidence(confidence: number | null | undefined): string | null {
  if (confidence === null || confidence === undefined || isNaN(Number(confidence))) {
    return null;
  }
  const num = Number(confidence);
  if (num >= 0 && num <= 1) {
    return `${Math.round(num * 100)}%`;
  }
  return `${Math.round(num)}%`;
}

/**
 * Load pending staging proposals, open Needs You, and recent active canonical objects for active room.
 * Resilient against single query failure; will never throw to keep chat messaging unaffected.
 */
export async function loadProjectRoomState(
  roomId: string,
): Promise<{ ok: boolean; data?: ProjectRoomState; error?: string }> {
  if (!roomId) {
    return { ok: false, error: "No room ID provided" };
  }

  try {
    const [proposalsRes, needsYouRes, canonicalRes] = await Promise.all([
      supabase
        .from("staging_proposals")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("needs_you")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      supabase
        .from("canonical_objects")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "active")
        .order("committed_at", { ascending: false })
        .limit(20),
    ]);

    const hasAnyError = Boolean(
      proposalsRes.error || needsYouRes.error || canonicalRes.error,
    );

    if (hasAnyError) {
      console.warn("Project room state partial/full query error:", {
        proposalsError: proposalsRes.error?.message,
        needsYouError: needsYouRes.error?.message,
        canonicalError: canonicalRes.error?.message,
      });

      // If all three failed, return ok: false
      if (proposalsRes.error && needsYouRes.error && canonicalRes.error) {
        return {
          ok: false,
          error:
            proposalsRes.error.message ||
            needsYouRes.error.message ||
            "Unable to query project state",
        };
      }
    }

    return {
      ok: true,
      data: {
        stagingProposals: (proposalsRes.data as StagingProposal[]) || [],
        needsYou: (needsYouRes.data as NeedsYouItem[]) || [],
        canonicalObjects: (canonicalRes.data as CanonicalObject[]) || [],
      },
    };
  } catch (err: any) {
    console.warn("Exception loading project room state:", err);
    return {
      ok: false,
      error: err?.message || "Failed to query project state",
    };
  }
}

/**
 * Review staging proposal via RPC review_staging_proposal
 * Parameters: p_proposal_id, p_action = accept | dismiss, p_actor_organization_id, p_payload_override = null
 */
export async function executeReviewStagingProposal(params: {
  proposalId: string;
  action: "accept" | "dismiss";
  actorOrganizationId?: string | null;
  payloadOverride?: any;
}): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("review_staging_proposal", {
      p_proposal_id: params.proposalId,
      p_action: params.action,
      p_actor_organization_id: params.actorOrganizationId || null,
      p_payload_override: params.payloadOverride ?? null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || `Failed to ${params.action} proposal`,
    };
  }
}