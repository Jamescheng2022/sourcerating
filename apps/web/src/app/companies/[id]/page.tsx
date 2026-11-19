"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CompanyDossierCard } from "@/components/network/CompanyDossierCard";
import { ArrowLeft, Building2 } from "lucide-react";

interface OrgProfileRow {
  organization_id: string;
  display_name: string;
  description: string | null;
  website_url: string | null;
  country: string | null;
  capabilities: string[];
  visibility: "private" | "public";
  published_at: string | null;
}

function CompanyPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetOrgId } = use(params);
  const searchParams = useSearchParams();
  const fromRoom = searchParams.get("fromRoom");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgName, setOrgName] = useState("");
  const [profile, setProfile] = useState<OrgProfileRow | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Query target organization (enforces organizations_select RLS policy)
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("id", targetOrgId)
          .maybeSingle();

        if (orgError) throw orgError;
        if (!orgData) {
          if (active) {
            setIsNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setOrgName(orgData.name);
        }

        // 2. Query organization profile (enforces sr_org_profile_member_read & public_read RLS)
        // 3. Query current viewer's membership in target organization
        const [profileRes, memberRes] = await Promise.all([
          supabase
            .from("sr_organization_profiles")
            .select("organization_id, display_name, description, website_url, country, capabilities, visibility, published_at")
            .eq("organization_id", targetOrgId)
            .maybeSingle(),
          user
            ? supabase
                .from("organization_memberships")
                .select("role")
                .eq("organization_id", targetOrgId)
                .eq("user_id", user.id)
                .is("removed_at", null)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (!active) return;
        if (profileRes.data) {
          setProfile(profileRes.data as OrgProfileRow);
        } else {
          setProfile(null);
        }

        if (memberRes?.data && ["owner", "admin"].includes(memberRes.data.role)) {
          setIsOrgAdmin(true);
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
  }, [targetOrgId]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <Link
            href={fromRoom ? `/project-room-b?room=${encodeURIComponent(fromRoom)}` : "/project-room-b"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {fromRoom ? "Back to Project Room" : "Back to Project Room"}
          </Link>
        </header>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">
            Verifying permissions and retrieving company profile…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
            Error loading company profile: {error}
          </div>
        )}

        {!loading && !error && isNotFound && (
          <div
            data-testid="company-restricted-view"
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center"
          >
            <Building2 className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-3 text-lg font-bold text-slate-950">Company Profile Restricted or Organization Not Found</h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
              Multi-tenant privacy policy enforced. You do not have public access or shared project collaboration access with this company.
            </p>
            {fromRoom && (
              <div className="mt-5">
                <Link
                  href={`/project-room-b?room=${encodeURIComponent(fromRoom)}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Project Room
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !isNotFound && (
          <>
            {profile ? (
              <CompanyDossierCard
                displayName={profile.display_name || orgName}
                websiteUrl={profile.website_url}
                country={profile.country}
                capabilities={profile.capabilities || []}
                description={profile.description}
                isRestricted={false}
                isDraft={profile.visibility === "private"}
                verified={false}
                verificationLevel={profile.published_at ? "SELF_CLAIMED" : null}
                onEditClick={isOrgAdmin ? () => { window.location.href = "/project-room-b/network"; } : undefined}
                backRoomId={fromRoom}
              />
            ) : (
              <CompanyDossierCard
                displayName={orgName}
                websiteUrl={null}
                country={null}
                capabilities={[]}
                description={null}
                isRestricted={true}
                restrictedReason="This company profile is not publicly published. In accordance with privacy rules, its private capabilities and details are visible only to internal members."
                verified={false}
                verificationLevel={null}
                onEditClick={isOrgAdmin ? () => { window.location.href = "/project-room-b/network"; } : undefined}
                backRoomId={fromRoom}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading page…</div>}>
      <CompanyPageContent params={params} />
    </Suspense>
  );
}
