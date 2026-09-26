"use client";

import { useState } from "react";
import {
  CanonicalObject,
  NeedsYouItem,
  ProjectRoomState,
  StagingProposal,
  extractChangesAndValues,
  extractEvidenceQuote,
  extractProposalSummary,
  formatConfidence,
} from "@/lib/project-state";

interface ProjectStatePanelProps {
  state: ProjectRoomState;
  stateStatus: "idle" | "active" | "unavailable";
  reviewingProposalId: string | null;
  actionError: string | null;
  onReview: (
    proposalId: string | null,
    action: "accept" | "dismiss",
    needsYouId?: string,
  ) => Promise<void>;
  onViewSource: (sourceEventId: string | null | undefined) => void;
  isMobile?: boolean;
}

export function ProjectStatePanel({
  state,
  stateStatus,
  reviewingProposalId,
  actionError,
  onReview,
  onViewSource,
  isMobile = false,
}: ProjectStatePanelProps) {
  const [expandedProposalIds, setExpandedProposalIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpand = (id: string) => {
    setExpandedProposalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const { stagingProposals, needsYou, canonicalObjects } = state;

  // Staging drafts not already represented by Needs You
  const needsYouProposalIds = new Set(
    needsYou.map((ny) => ny.proposal_id).filter(Boolean),
  );
  const unrepresentedDrafts = stagingProposals.filter(
    (p) => !needsYouProposalIds.has(p.id),
  );

  const renderPriorityBadge = (priority: string) => {
    const p = (priority || "normal").toLowerCase();
    if (p === "critical") {
      return (
        <span className="rounded bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          Critical
        </span>
      );
    }
    if (p === "high") {
      return (
        <span className="rounded bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          High
        </span>
      );
    }
    if (p === "low") {
      return (
        <span className="rounded bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider">
          Low
        </span>
      );
    }
    return (
      <span className="rounded bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
        Normal
      </span>
    );
  };

  return (
    <div className={`space-y-4 ${isMobile ? "text-xs" : "text-xs"}`}>
      {/* Agent Status Notification */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                stateStatus === "active"
                  ? "bg-emerald-500 animate-pulse"
                  : stateStatus === "unavailable"
                  ? "bg-amber-400"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-[12px]">Project Agent</span>
          </div>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              stateStatus === "active"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {stateStatus === "active" ? "Active" : "Unavailable"}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          {stateStatus === "active"
            ? "Project agent active"
            : "Project agent unavailable; messaging continues normally"}
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-700">
          ⚠️ {actionError}
        </div>
      )}

      {/* 1. NEEDS YOU SECTION */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/90 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-xs">Needs You</span>
            <span
              className={`flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                needsYou.length > 0
                  ? "bg-amber-500 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {needsYou.length}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Requires Input</span>
        </div>

        <div className="p-3 space-y-3">
          {needsYou.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-slate-500">
              <div className="text-[11px] font-medium text-slate-700">
                No items needing your action
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                New decisions or approvals will appear here.
              </div>
            </div>
          ) : (
            needsYou.map((item) => {
              const associatedProposal = item.proposal_id
                ? stagingProposals.find((p) => p.id === item.proposal_id)
                : null;
              const proposalPayload = associatedProposal?.payload;
              const summary =
                proposalPayload
                  ? extractProposalSummary(proposalPayload)
                  : item.detail || item.title;
              const extracted = proposalPayload
                ? extractChangesAndValues(proposalPayload)
                : [];
              const quote = proposalPayload
                ? extractEvidenceQuote(proposalPayload)
                : null;
              const confidence = formatConfidence(
                associatedProposal?.confidence ?? proposalPayload?.confidence,
              );
              const provider =
                associatedProposal?.provider || proposalPayload?.provider;
              const isExpanded = expandedProposalIds.has(item.id);
              const proposalIdToReview = item.proposal_id || associatedProposal?.id;
              const isReviewing = Boolean(
                proposalIdToReview &&
                  reviewingProposalId === proposalIdToReview,
              );
              const sourceEventId =
                item.source_event_id || associatedProposal?.source_event_id;

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 hover:border-slate-300 transition"
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderPriorityBadge(item.priority)}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-900 text-xs leading-snug">
                        {item.title}
                      </div>
                    </div>
                  </div>

                  {/* Detail or summary preview */}
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    {summary}
                  </div>

                  {/* Extracted values summary preview (collapsed) */}
                  {!isExpanded && extracted.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                      {extracted.slice(0, 2).map((val, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700"
                        >
                          <b className="font-semibold">{val.key}:</b> {val.value}
                        </span>
                      ))}
                      {extracted.length > 2 && (
                        <span className="text-[10px] text-slate-400">
                          +{extracted.length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded Review Details */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2.5 pt-2.5 border-t border-slate-200">
                      {/* Summary */}
                      <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-800 leading-relaxed border border-slate-100">
                        <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">
                          Proposal Summary
                        </span>
                        {summary}
                      </div>

                      {/* Extracted Values */}
                      {extracted.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider">
                            Extracted Values
                          </span>
                          <div className="rounded border border-slate-200 divide-y divide-slate-100 text-[11px] overflow-hidden bg-white">
                            {extracted.map((val, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 flex items-start justify-between gap-2"
                              >
                                <span className="font-medium text-slate-600 shrink-0">
                                  {val.key}
                                </span>
                                <div className="text-right">
                                  {val.previous && (
                                    <span className="text-slate-400 line-through mr-1 text-[10px]">
                                      {val.previous}
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-900">
                                    {val.value}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence Quote */}
                      {quote && (
                        <div className="rounded border-l-2 border-sky-400 bg-sky-50/60 p-2 text-[11px] text-slate-700 italic">
                          <span className="font-semibold not-italic text-sky-800 text-[10px] uppercase tracking-wider block mb-0.5">
                            Evidence Quote
                          </span>
                          “{quote}”
                        </div>
                      )}

                      {/* Provider & Confidence */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <div>
                          {provider && (
                            <span>
                              Provider:{" "}
                              <strong className="text-slate-700">
                                {provider}
                              </strong>
                            </span>
                          )}
                          {confidence && (
                            <span className="ml-2">
                              Confidence:{" "}
                              <strong className="text-slate-700">
                                {confidence}
                              </strong>
                            </span>
                          )}
                        </div>

                        {/* Source link */}
                        {sourceEventId && (
                          <button
                            type="button"
                            onClick={() => onViewSource(sourceEventId)}
                            className="font-medium text-sky-600 hover:text-sky-800 underline flex items-center gap-0.5"
                          >
                            <span>View Source</span>
                            <span>↗</span>
                          </button>
                        )}
                      </div>

                      {/* Accept & Dismiss action controls */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {proposalIdToReview ? (
                          <>
                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() =>
                                void onReview(proposalIdToReview, "accept", item.id)
                              }
                              className="flex-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-1"
                            >
                              {isReviewing ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <span>✓ Accept · 采纳</span>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() =>
                                void onReview(proposalIdToReview, "dismiss", item.id)
                              }
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50 transition"
                            >
                              Dismiss · 忽略
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isReviewing}
                            onClick={() => void onReview(null, "dismiss", item.id)}
                            className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            Dismiss · 忽略
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="rounded-md px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 transition"
                        >
                          Collapse
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buttons when collapsed */}
                  {!isExpanded && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="rounded bg-sky-50 border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition flex items-center gap-1"
                      >
                        <span>Review · 审核</span>
                        <span>▾</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {sourceEventId && (
                          <button
                            type="button"
                            onClick={() => onViewSource(sourceEventId)}
                            className="text-[10px] text-slate-500 hover:text-sky-600 transition"
                          >
                            Source ↗
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() =>
                            void onReview(
                              proposalIdToReview || null,
                              "dismiss",
                              item.id,
                            )
                          }
                          className="rounded px-2 py-1 text-[10px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. STAGING DRAFTS (Not represented by Needs You) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/90 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-xs">Staging Drafts</span>
            <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-[10px] font-bold text-slate-700">
              {unrepresentedDrafts.length}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Pending Review</span>
        </div>

        <div className="p-3 space-y-3">
          {unrepresentedDrafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-slate-500">
              <div className="text-[11px] font-medium text-slate-700">
                No unassigned staging drafts
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Resident agent creates drafts as project conversation progresses.
              </div>
            </div>
          ) : (
            unrepresentedDrafts.map((draft) => {
              const summary = extractProposalSummary(draft.payload);
              const extracted = extractChangesAndValues(draft.payload);
              const quote = extractEvidenceQuote(draft.payload);
              const confidence = formatConfidence(
                draft.confidence ?? draft.payload?.confidence,
              );
              const provider = draft.provider || draft.payload?.provider;
              const isExpanded = expandedProposalIds.has(draft.id);
              const isReviewing = reviewingProposalId === draft.id;

              return (
                <div
                  key={draft.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 hover:border-slate-300 transition"
                >
                  {/* Draft Header with Required Label */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[9px] font-bold tracking-wide">
                        Agent Draft - not canonical
                      </span>
                      {draft.proposal_type && (
                        <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-medium uppercase">
                          {draft.proposal_type}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {draft.created_at
                        ? new Date(draft.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    {summary}
                  </div>

                  {/* Extracted preview */}
                  {!isExpanded && extracted.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                      {extracted.slice(0, 2).map((val, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700"
                        >
                          <b className="font-semibold">{val.key}:</b> {val.value}
                        </span>
                      ))}
                      {extracted.length > 2 && (
                        <span className="text-[10px] text-slate-400">
                          +{extracted.length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2.5 pt-2.5 border-t border-slate-200">
                      {extracted.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider">
                            Extracted Values
                          </span>
                          <div className="rounded border border-slate-200 divide-y divide-slate-100 text-[11px] overflow-hidden bg-white">
                            {extracted.map((val, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 flex items-start justify-between gap-2"
                              >
                                <span className="font-medium text-slate-600 shrink-0">
                                  {val.key}
                                </span>
                                <span className="font-semibold text-slate-900 text-right">
                                  {val.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {quote && (
                        <div className="rounded border-l-2 border-amber-400 bg-amber-50/60 p-2 text-[11px] text-slate-700 italic">
                          <span className="font-semibold not-italic text-amber-800 text-[10px] uppercase tracking-wider block mb-0.5">
                            Evidence Quote
                          </span>
                          “{quote}”
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <div>
                          {provider && <span>Provider: {provider}</span>}
                          {confidence && (
                            <span className="ml-2">Confidence: {confidence}</span>
                          )}
                        </div>
                        {draft.source_event_id && (
                          <button
                            type="button"
                            onClick={() => onViewSource(draft.source_event_id)}
                            className="font-medium text-sky-600 hover:text-sky-800 underline"
                          >
                            View Source ↗
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => void onReview(draft.id, "accept")}
                          className="flex-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-1"
                        >
                          {isReviewing ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <span>Accept · 采纳</span>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => void onReview(draft.id, "dismiss")}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50 transition"
                        >
                          Dismiss · 忽略
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExpand(draft.id)}
                          className="rounded-md px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 transition"
                        >
                          Collapse
                        </button>
                      </div>
                    </div>
                  )}

                  {!isExpanded && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleExpand(draft.id)}
                        className="rounded bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition flex items-center gap-1"
                      >
                        <span>Review · 审核</span>
                        <span>▾</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {draft.source_event_id && (
                          <button
                            type="button"
                            onClick={() => onViewSource(draft.source_event_id)}
                            className="text-[10px] text-slate-500 hover:text-sky-600 transition"
                          >
                            Source ↗
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => void onReview(draft.id, "dismiss")}
                          className="text-[10px] text-slate-500 hover:text-rose-600 transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. CANONICAL STATE SECTION */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/90 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-xs">Canonical State</span>
            <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-emerald-100 text-emerald-800 px-1.5 text-[10px] font-bold">
              {canonicalObjects.length}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">Committed</span>
        </div>

        <div className="p-3 space-y-3">
          {canonicalObjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-slate-500">
              <div className="text-[11px] font-medium text-slate-700">
                No canonical state established yet
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Accepted proposals will establish immutable canonical project specifications.
              </div>
            </div>
          ) : (
            canonicalObjects.map((obj) => {
              const summary = extractProposalSummary(obj.payload);
              const extracted = extractChangesAndValues(obj.payload);
              const formattedDate = obj.committed_at
                ? new Date(obj.committed_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={obj.id}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 space-y-2"
                >
                  {/* Object Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Canonical · v{obj.version_no || 1}
                      </span>
                      {obj.object_type && (
                        <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[9px] font-medium">
                          {obj.object_type}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Summary / Title */}
                  <div className="text-[11px] font-semibold text-slate-900 leading-snug">
                    {summary}
                  </div>

                  {/* Extracted values */}
                  {extracted.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-emerald-100">
                      <div className="rounded border border-emerald-100 divide-y divide-emerald-50 text-[10px] overflow-hidden bg-white/90">
                        {extracted.map((val, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 flex items-start justify-between gap-2"
                          >
                            <span className="font-medium text-slate-600">
                              {val.key}
                            </span>
                            <span className="font-semibold text-slate-900 text-right">
                              {val.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source event link */}
                  {obj.source_event_id && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => onViewSource(obj.source_event_id)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-0.5"
                      >
                        <span>View Source Message</span>
                        <span>↗</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}