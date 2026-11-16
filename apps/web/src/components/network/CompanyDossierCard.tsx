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
            <Avatar type="org" name={displayName || "企业档案"} size="xl" verified={verified} />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  {displayName || "待完善企业名称"}
                </h2>

                {/* Truthful verification badges & privacy status */}
                {isRestricted ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    <Lock className="h-3 w-3 text-slate-500" />
                    私有档案 · 仅限项目协作
                  </span>
                ) : isDraft ? (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                    私有草稿 · 拟真预览
                  </span>
                ) : verified ? (
                  <VerificationBadge level="VERIFIED" size="sm" />
                ) : verificationLevel ? (
                  <VerificationBadge level={verificationLevel} size="sm" />
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                    未公开核验
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-500 sm:text-sm">
                {isRestricted
                  ? (restrictedReason || "该企业尚未向公开目录发布档案，仅在当前协作项目中可见企业名称。")
                  : "企业资料与工程能力卡片 · 真实协作沉淀"}
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
                {!isRestricted && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>核心能力: {capabilities.length} 项</span>
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
          <span className="font-mono text-xs text-slate-400">
            {isRestricted ? "受隐私与授权策略保护" : "来自主动提供或宣传册 AI 提取审核"}
          </span>
        </div>

        {isRestricted ? (
          <p className="text-xs text-slate-400">
            核心产品与工程技术能力未对外部公开；未经授权不会因在同一聊天室而对外披露。
          </p>
        ) : capabilities.length === 0 ? (
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
        {isRestricted ? (
          <p className="text-xs text-slate-400">
            企业详细简介未对外部公开。当前展示仅限于协作项目内已授权的基本标识。
          </p>
        ) : description ? (
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
