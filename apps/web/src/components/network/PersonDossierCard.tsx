"use client";

import React from "react";
import Link from "next/link";
import { User, Award, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Avatar } from "./Avatar";
import { VerificationBadge, VerificationLevel } from "./VerificationBadge";

export interface PersonDossierCardProps {
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  skills?: string[];
  onEditClick?: () => void;
  backRoomId?: string | null;
  isRestricted?: boolean;
  restrictedReason?: string | null;
  verificationLevel?: VerificationLevel | null;
  verified?: boolean;
  isDraft?: boolean;
}

export function PersonDossierCard({
  displayName,
  headline = null,
  bio = null,
  skills = [],
  onEditClick,
  backRoomId = null,
  isRestricted = false,
  restrictedReason = null,
  verificationLevel = null,
  verified = false,
  isDraft = false,
}: PersonDossierCardProps) {
  return (
    <article
      className="w-full space-y-5 font-sans text-slate-900"
      data-testid={isRestricted ? "person-restricted-view" : "person-dossier-preview"}
    >
      {/* 1. Header Card Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar type="person" name={displayName || "项目成员"} size="xl" verified={verified} />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  {displayName || "待完善姓名"}
                </h2>

                {/* Truthful verification badges & privacy status */}
                {isRestricted ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    <Lock className="h-3 w-3 text-slate-500" />
                    个人名片未公开 · 仅限项目协作
                  </span>
                ) : isDraft ? (
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                    个人私有 · 拟真名片
                  </span>
                ) : verified ? (
                  <VerificationBadge level="VERIFIED" isPerson={true} size="sm" />
                ) : verificationLevel ? (
                  <VerificationBadge level={verificationLevel} isPerson={true} size="sm" />
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                    项目成员
                  </span>
                )}
              </div>

              {headline ? (
                <p className="text-xs font-medium text-slate-700 sm:text-sm">{headline}</p>
              ) : isRestricted ? (
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  {restrictedReason || "该成员未向公开网络发布个人名片，仅在所属项目房间中协作。"}
                </p>
              ) : (
                <p className="text-xs font-medium text-slate-500 sm:text-sm">项目协作成员</p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-mono text-xs text-slate-500">
                <span>{isRestricted ? "受隐私与授权策略保护" : "专业履历私有维护"}</span>
                {!isRestricted && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>擅长领域: {skills.length} 项</span>
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
                编辑个人资料
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

      {/* 2. Skills & Specialties Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Award className="h-4 w-4 text-teal-700" />
            工程专业领域与技能标签
          </h3>
          <span className="font-mono text-xs text-slate-400">
            {isRestricted ? "未授权公开" : "仅自己维护与授权可见"}
          </span>
        </div>

        {isRestricted ? (
          <p className="text-xs text-slate-400">
            专业领域与技能标签未对外部公开；未经主动授权不会因共同参与聊天室而被披露。
          </p>
        ) : skills.length === 0 ? (
          <p className="text-xs text-slate-400">尚未添加擅长领域标签。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900"
              >
                <CheckCircle2 className="h-3 w-3 text-teal-600" />
                {skill}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 3. Bio / Personal Summary Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-2 text-base font-bold text-slate-900">个人简介与技术专长</h3>
        {isRestricted ? (
          <p className="text-xs text-slate-400">
            个人简介未对外部公开。当前展示仅限于协作项目内已确认的基本成员身份。
          </p>
        ) : bio ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {bio}
          </p>
        ) : (
          <p className="text-xs text-slate-400">尚未填写个人履历介绍。</p>
        )}
      </section>
    </article>
  );
}

export default PersonDossierCard;
