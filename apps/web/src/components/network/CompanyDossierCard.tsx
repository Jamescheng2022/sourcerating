"use client";

import React from "react";
import Link from "next/link";
import { Building2, Globe, MapPin, ArrowLeft, Layers, CheckCircle2, Lock } from "lucide-react";
import { Avatar } from "./Avatar";
import { VerificationBadge, VerificationLevel } from "./VerificationBadge";

export interface CompanyDossierCardProps {
  displayName: string;
  websiteUrl?: string | null;
  country?: string | null;
  capabilities?: string[];
  description?: string | null;
  onEditClick?: () => void;
  backRoomId?: string | null;
  isRestricted?: boolean;
  restrictedReason?: string | null;
  verificationLevel?: VerificationLevel | null;
  verified?: boolean;
  isDraft?: boolean;
}

export function CompanyDossierCard({
  displayName,
  websiteUrl = null,
  country = null,
  capabilities = [],
  description = null,
  onEditClick,
  backRoomId = null,
  isRestricted = false,
  restrictedReason = null,
  verificationLevel = null,
  verified = false,
  isDraft = false,
}: CompanyDossierCardProps) {
  return (
    <article
      className="w-full space-y-5 font-sans text-slate-900"
      data-testid={isRestricted ? "company-restricted-view" : "company-dossier-preview"}
    >
      {/* 1. Header Card Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar type="org" name={displayName || "Company"} size="xl" verified={verified} />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  {displayName || "Unnamed Company"}
                </h2>

                {/* Truthful verification badges & privacy status */}
                {isRestricted ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    <Lock className="h-3 w-3 text-slate-500" />
                    Private Profile · Limited to Project Collaboration
                  </span>
                ) : isDraft ? (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                    Private Draft · Realistic Preview
                  </span>
                ) : verified ? (
                  <VerificationBadge level="VERIFIED" size="sm" />
                ) : verificationLevel ? (
                  <VerificationBadge level={verificationLevel} size="sm" />
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                    Unverified
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-500 sm:text-sm">
                {isRestricted
                  ? (restrictedReason || "This company has not published a public profile. Name is visible only within authorized collaboration projects.")
                  : "Company Profile & Engineering Capabilities · Verified Collaboration History"}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-mono text-xs text-slate-600">
                {country && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {country}
                  </span>
                )}
                {websiteUrl && (
                  <>
                    <span className="text-slate-300">|</span>
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Official Website
                    </a>
                  </>
                )}
                {!isRestricted && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>Capabilities: {capabilities.length}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            {onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit Draft
              </button>
            )}
            <Link
              href={backRoomId ? `/project-room-b?room=${encodeURIComponent(backRoomId)}` : "/project-room-b"}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Project Room
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Core Capabilities Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Layers className="h-4 w-4 text-teal-700" />
            Core Products & Engineering Capabilities
          </h3>
          <span className="font-mono text-xs text-slate-400">
            {isRestricted ? "Protected by privacy policy" : "Self-declared or AI-extracted from brochure"}
          </span>
        </div>

        {isRestricted ? (
          <p className="text-xs text-slate-400">
            Core products and technical capabilities are private and not disclosed outside this collaboration project.
          </p>
        ) : capabilities.length === 0 ? (
          <p className="text-xs text-slate-400">No capabilities recorded yet. You can extract them using brochure text with AI.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {capabilities.map((cap, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/80 px-3 py-1.5 text-xs font-medium text-teal-900"
              >
                <CheckCircle2 className="h-3 w-3 text-teal-600" />
                {cap}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 3. Company Description Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-2 text-base font-bold text-slate-900">Company Overview & Background</h3>
        {isRestricted ? (
          <p className="text-xs text-slate-400">
            Detailed company description is private. Only basic identification is displayed within authorized collaboration rooms.
          </p>
        ) : description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {description}
          </p>
        ) : (
          <p className="text-xs text-slate-400">No company description provided yet.</p>
        )}
      </section>
    </article>
  );
}

export default CompanyDossierCard;
