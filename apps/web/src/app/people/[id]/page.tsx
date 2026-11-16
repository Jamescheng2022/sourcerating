"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PersonDossierCard } from "@/components/network/PersonDossierCard";
import { ArrowLeft, User } from "lucide-react";

interface PersonProfileRow {
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
  visibility: "private" | "public";
  published_at: string | null;
}

function PersonPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = use(params);
  const searchParams = useSearchParams();
  const fromRoom = searchParams.get("fromRoom");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<PersonProfileRow | null>(null);
  const [roomMemberName, setRoomMemberName] = useState<string | null>(null);
  const [roomMemberRole, setRoomMemberRole] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (active && user?.id === targetUserId) {
          setIsSelf(true);
        }

        // 1. Query person profile (strictly gated by sr_person_profile_self_read & public_read RLS)
        // 2. Query room member identity if fromRoom is present (for legitimate room context)
        const profilePromise = supabase
          .from("sr_person_profiles")
          .select("user_id, display_name, headline, bio, skills, visibility, published_at")
          .eq("user_id", targetUserId)
          .maybeSingle();

        const memberPromise = (fromRoom && /^[a-f0-9-]{36}$/i.test(fromRoom))
          ? supabase
              .from("room_members")
              .select("user_id, member_display_name, room_role")
              .eq("room_id", fromRoom)
              .eq("user_id", targetUserId)
              .is("removed_at", null)
              .maybeSingle()
          : supabase
              .from("room_members")
              .select("user_id, member_display_name, room_role")
              .eq("user_id", targetUserId)
              .is("removed_at", null)
              .limit(1)
              .maybeSingle();

        const [profileRes, memberRes] = await Promise.all([profilePromise, memberPromise]);

        if (!active) return;

        if (profileRes.data) {
          setProfile(profileRes.data as PersonProfileRow);
        } else {
          setProfile(null);
        }

        if (memberRes?.data) {
          setRoomMemberName(memberRes.data.member_display_name);
          setRoomMemberRole(memberRes.data.room_role);
        }

        if (!profileRes.data && !memberRes?.data && user?.id !== targetUserId) {
          setIsNotFound(true);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [targetUserId, fromRoom]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <Link
            href={fromRoom ? `/project-room-b?room=${encodeURIComponent(fromRoom)}` : "/project-room-b"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {fromRoom ? "返回项目协作房间" : "返回 Project Room"}
          </Link>
          <span className="font-mono text-xs text-slate-500">
            路由语义: /people/{targetUserId.slice(0, 8)}...
          </span>
        </header>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">
            正在校验身份与隐私权限…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
            读取个人名片出错：{error}
          </div>
        )}

        {!loading && !error && isNotFound && (
          <div
            data-testid="person-restricted-view"
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center"
          >
            <User className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-lg font-bold text-slate-950">该成员个人名片不可见或用户不存在</h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
              严格执行隐私保护规则。该用户未发布公开名片，且您未在当前已授权的项目房间中与该用户共同协作。
            </p>
            {fromRoom && (
              <div className="mt-5">
                <Link
                  href={`/project-room-b?room=${encodeURIComponent(fromRoom)}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  返回项目房间
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !isNotFound && (
          <>
            {profile ? (
              <PersonDossierCard
                displayName={profile.display_name}
                headline={profile.headline}
                bio={profile.bio}
                skills={profile.skills || []}
                isRestricted={false}
                isDraft={profile.visibility === "private"}
                verified={Boolean(profile.published_at)}
                verificationLevel={profile.published_at ? "VERIFIED" : "SELF_CLAIMED"}
                onEditClick={isSelf ? () => { window.location.href = "/project-room-b/network"; } : undefined}
                backRoomId={fromRoom}
              />
            ) : (
              <PersonDossierCard
                displayName={roomMemberName || "项目协作成员"}
                headline={roomMemberRole ? `项目角色：${roomMemberRole}` : null}
                bio={null}
                skills={[]}
                isRestricted={true}
                restrictedReason="该成员未向公开网络发布个人名片，仅在所属项目房间中协作。私有履历未经授权不会因同房而披露。"
                verified={false}
                verificationLevel={null}
                onEditClick={isSelf ? () => { window.location.href = "/project-room-b/network"; } : undefined}
                backRoomId={fromRoom}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">正在加载页面…</div>}>
      <PersonPageContent params={params} />
    </Suspense>
  );
}
