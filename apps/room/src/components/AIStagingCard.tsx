'use client';

import React, { useState } from 'react';
import { AIProposal, ProposalStatus } from '@/types/domain';
import {
  IconSparkles,
  IconChevronDown,
  IconChevronRight,
  IconCheckCircle2,
  IconX,
  IconCompare,
  IconAlertCircle,
} from './icons';
import { cn } from '@/lib/utils';

interface AIStagingCardProps {
  proposal: AIProposal;
  onConfirmCanonical?: (proposalId: string) => void;
  onDismissProposal?: (proposalId: string) => void;
}

export const AIStagingCard: React.FC<AIStagingCardProps> = ({
  proposal,
  onConfirmCanonical,
  onDismissProposal,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(proposal.status === 'confirmed_canonical');
  const [isDismissed, setIsDismissed] = useState<boolean>(proposal.status === 'dismissed');

  if (isDismissed) {
    return (
      <div className="my-3 p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
        <span className="italic">AI Staging Proposal dismissed by user.</span>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-sky-600 hover:underline font-medium text-[11px]"
        >
          Undo
        </button>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="my-3 p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/70 text-emerald-950 flex items-center justify-between text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <IconCheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-900">
              Promoted to Canonical Project State
            </span>
            <span className="text-emerald-700 ml-1.5 font-normal">
              Quote v3 (RMB 320,000, 45d, 100mm PU) is recorded in Canonical Project State after human confirmation.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold shrink-0">
          CANONICAL
        </span>
      </div>
    );
  }

  return (
    <section
      id="prop-eastframe-v3"
      aria-label="AI Staged Commercial Proposal"
      className="my-3.5 rounded-lg border border-sky-300/80 bg-gradient-to-b from-sky-50/90 to-white shadow-xs overflow-hidden transition-all duration-200"
    >
      {/* Draft Staging Banner Header */}
      <div className="px-3.5 py-1.5 bg-sky-100/70 border-b border-sky-200 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-sky-900 font-semibold uppercase tracking-wider text-[10px]">
          <IconSparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>AI Proposal • Staging Draft</span>
        </div>
        <div className="text-[10px] text-sky-700 font-mono">
          Non-Canonical (Pending Human Confirmation)
        </div>
      </div>

      {/* Main Staging Card Body */}
      <div className="p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{proposal.title}</span>
            </h4>
            <div className="mt-1 text-xs text-slate-700 font-medium">
              <span className="inline-block px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold mr-1.5">
                Quote v3
              </span>
              RMB 320,000; delivery 45 days; panel 75mm to 100mm.
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              {proposal.rationale}
            </p>
          </div>

          {/* Action Buttons: Review and Dismiss */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors flex items-center gap-1 shadow-2xs',
                isExpanded
                  ? 'bg-sky-700 text-white border-sky-700 hover:bg-sky-800'
                  : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
              )}
            >
              <span>{isExpanded ? 'Hide Details' : 'Review'}</span>
              <IconChevronDown
                className={cn('w-3.5 h-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
              />
            </button>

            <button
              onClick={() => {
                setIsDismissed(true);
                onDismissProposal?.(proposal.id);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Expanded Compact Diff & Human Verification Controls */}
        {isExpanded && (
          <div className="mt-3.5 pt-3 border-t border-sky-200/60 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <IconCompare className="w-3.5 h-3.5 text-sky-600" />
              <span>Commercial & Technical Diff (v2 vs v3)</span>
            </div>

            {/* Compact Diff Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {proposal.diffs.map((diff, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs"
                >
                  <div className="text-[10px] text-slate-500 font-medium">
                    {diff.label}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="line-through text-slate-400 font-mono">
                      {diff.previousValue}
                    </span>
                    <span className="text-slate-400 font-mono">→</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {diff.proposedValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Provider Reasoning Callout */}
            <div className="mt-2.5 p-2.5 rounded-md bg-slate-100/80 border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2">
              <IconAlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">
                  Draft rationale:
                </span>{' '}
                Panel upgrade meets R-value ≥ 3.5 thermal goal. Delivery accelerated by 15 days offsets RMB 25,000 variance within project contingency.
              </div>
            </div>

            {/* Human Canonical Confirmation Bar */}
            <div className="mt-3 p-2.5 rounded-md bg-sky-950 text-white flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-[11px] text-slate-300">
                <span className="font-semibold text-white">Human Confirmation Required:</span> AI state remains draft until you verify and record to Canonical State.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setIsConfirmed(true);
                    onConfirmCanonical?.(proposal.id);
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <IconCheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm to Canonical State</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};