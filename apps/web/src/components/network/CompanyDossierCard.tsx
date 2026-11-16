"use client";

import React from "react";
import Link from "next/link";
import { Building2, Globe, MapPin, ShieldCheck, ArrowLeft, Layers, CheckCircle2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { VerificationBadge } from "./VerificationBadge";

export interface CompanyDossierCardProps {
  displayName: string;
  websiteUrl: string | null;
  country: string | null;
  capabilities: string[];
  description: string | null;
  onEditClick?: () => void;
  backRoomId?: string | null;
}

export function CompanyDossierCard({
  displayName,
  websiteUrl,
  country,
  capabilities,
  description,
  onEditClick,
  backRoomId,
}: CompanyDossierCardProps) {
  return (
    <article className="w-full space-y-5 font-sans text-slate-900" data-testid="company-dossier-preview">
      {/* 1. Header Card Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar type="org" name={displayName || "企业档案"} size="xl" verified={true} />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  {displayName || "待完善企业名称"}
                </h2>
                <VerificationBadge level="VERIFIED" size="sm" />
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  私有草稿 · 拟真预览
                </span>
              </div>

              <p className="text-xs font-medium text-slate-500 sm:text-sm">
                国家重点工程与制造业协同参建主体 · 真实协作沉淀
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
                      官方网站
                    </a>
                  </>
                )}
                <span className="text-slate-300">|</span>
                <span>核心能力: {capabilities.length} 项</span>
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
                编辑草稿
              </button>
            )}
            <Link
              href={backRoomId ? `/project-room-b?room=${encodeURIComponent(backRoomId)}` : "/project-room-b"}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回项目房间
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Core Capabilities Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Layers className="h-4 w-4 text-teal-700" />
            主营产品与工程技术能力
          </h3>
          <span className="font-mono text-xs text-slate-400">来自主动提供或宣传册 AI 提取审核</span>
        </div>

        {capabilities.length === 0 ? (
          <p className="text-xs text-slate-400">尚未填报主营产品或能力，可使用宣传册文字由 AI 辅助提取。</p>
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
        <h3 className="mb-2 text-base font-bold text-slate-900">企业简介与背景概况</h3>
        {description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {description}
          </p>
        ) : (
          <p className="text-xs text-slate-400">尚未录入企业详细介绍。</p>
        )}
      </section>
    </article>
  );
}

export default CompanyDossierCard;
