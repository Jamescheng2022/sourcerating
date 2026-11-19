"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/network/Avatar";
import { VerificationBadge } from "@/components/network/VerificationBadge";
import { StatusPill } from "@/components/network/StatusPill";
import { CompanyDossierCard } from "@/components/network/CompanyDossierCard";
import { PersonDossierCard } from "@/components/network/PersonDossierCard";
import { Building2, User, Users, FileEdit, ArrowLeft, Search, Plus } from "lucide-react";

type OrgChoice = { id: string; name: string; role: string };
type OrgProfile = {
  organization_id: string;
  display_name: string;
  description: string | null;
  website_url: string | null;
  country: string | null;
  capabilities: string[];
  visibility: "private" | "public";
};
type PersonalProfile = {
  display_name: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
};
type Relationship = {
  id: string;
  counterparty_name: string;
  counterparty_organization_id?: string | null;
  relationship_kind: "buyer" | "supplier" | "partner" | "other";
  stage: "prospect" | "contacted" | "active" | "paused";
  private_notes: string | null;
};
type Draft = {
  id: string;
  field_key: "description" | "website_url" | "country" | "capabilities";
  proposed_value: string | string[];
  confidence: number | null;
  source_kind: string;
  source_label: string | null;
};
type Generated = {
  fieldKey: Draft["field_key"];
  value: string | string[];
  confidence: number;
  evidenceNote: string;
};
type CompanyForm = {
  display_name: string;
  description: string;
  website_url: string;
  country: string;
  capabilities: string;
};

const initialForm: CompanyForm = { display_name: "", description: "", website_url: "", country: "", capabilities: "" };
const relationshipKinds = {
  buyer: "Buyer / Client",
  supplier: "Supplier",
  partner: "Partner",
  other: "Other",
};
const relationshipStages = {
  prospect: "Prospect",
  contacted: "Contacted",
  active: "Active",
  paused: "Paused",
};
const labels: Record<Draft["field_key"], string> = {
  description: "Company Overview", website_url: "Website", country: "Country / Region", capabilities: "Core Capabilities",
};
const section = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-offset-2 focus:border-teal-600";
const primary = "rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50";

function toForm(row: OrgProfile | null, name: string): CompanyForm {
  return row ? {
    display_name: row.display_name,
    description: row.description ?? "",
    website_url: row.website_url ?? "",
    country: row.country ?? "",
    capabilities: (row.capabilities ?? []).join(", "),
  } : { ...initialForm, display_name: name };
}
function csv(text: string): string[] {
  return Array.from(new Set(text.split(/[,，\n]/).map((x) => x.trim()).filter(Boolean))).slice(0, 30);
}
function errText(error: unknown) {
  return error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
}
function safeWebsite(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try { if (new URL(v).protocol === "https:") return v; } catch { /* invalid */ }
  throw new Error("Company website must be a valid HTTPS URL");
}

export default function NetworkMemoryPage() {
  const [userId, setUserId] = useState("");
  const [phase, setPhase] = useState<"loading" | "signedout" | "noadmin" | "ready" | "unavailable">("loading");
  const [activeTab, setActiveTab] = useState<"edit" | "company" | "person" | "directory">("edit");
  const [fromRoomId, setFromRoomId] = useState<string | null>(null);
  const [directorySearch, setDirectorySearch] = useState("");
  const [orgs, setOrgs] = useState<OrgChoice[]>([]);
  const [orgId, setOrgId] = useState("");
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [personal, setPersonal] = useState({ display_name: "", headline: "", bio: "", skills: "" });
  const [contacts, setContacts] = useState<Relationship[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [sourceKind, setSourceKind] = useState<"brochure_text" | "website_text">("brochure_text");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactKind, setContactKind] = useState<Relationship["relationship_kind"]>("supplier");
  const [contactNotes, setContactNotes] = useState("");
  const [counterpartyOrgId, setCounterpartyOrgId] = useState<string | null>(null);
  const [sourceProjectId, setSourceProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Tab & room query param sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "company" || tabParam === "person" || tabParam === "directory" || tabParam === "edit") {
      setActiveTab(tabParam);
    }
    const fromRoom = params.get("fromRoom");
    if (fromRoom && /^[a-f0-9-]{36}$/i.test(fromRoom)) {
      setFromRoomId(fromRoom);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (authError || !user) { setPhase("signedout"); return; }
        setUserId(user.id);
        const [members, selfProfile] = await Promise.all([
          supabase.from("organization_memberships").select("organization_id,role")
            .eq("user_id", user.id).is("removed_at", null),
          supabase.from("sr_person_profiles").select("display_name,headline,bio,skills")
            .eq("user_id", user.id).maybeSingle(),
        ]);
        if (!active) return;
        if (selfProfile.data) setPersonal({
          display_name: selfProfile.data.display_name,
          headline: selfProfile.data.headline ?? "",
          bio: selfProfile.data.bio ?? "",
          skills: (selfProfile.data.skills ?? []).join(", "),
        });
        const eligible = (members.data ?? []).filter((m) => ["owner", "admin"].includes(m.role));
        if (!eligible.length) { setPhase("noadmin"); return; }
        const { data: organizations, error: orgError } = await supabase.from("organizations")
          .select("id,name").in("id", eligible.map((m) => m.organization_id));
        if (orgError) throw orgError;
        const choices: OrgChoice[] = eligible.flatMap((m) => {
          const o = organizations?.find((x) => x.id === m.organization_id);
          return o ? [{ id: o.id, name: o.name, role: m.role }] : [];
        });
        setOrgs(choices);
        setOrgId(choices[0]?.id ?? "");
        setPhase(choices.length ? "ready" : "noadmin");
      } catch (e) {
        if (active) { setPhase("unavailable"); setError(errText(e)); }
      }
    })();
    return () => { active = false; };
  }, []);

  const loadOrg = useCallback(async (selected: string, fallbackName: string) => {
    try {
      const [profile, relations, suggestions] = await Promise.all([
        supabase.from("sr_organization_profiles")
          .select("organization_id,display_name,description,website_url,country,capabilities,visibility")
          .eq("organization_id", selected).maybeSingle(),
        supabase.from("sr_organization_relationships")
          .select("id,counterparty_name,relationship_kind,stage,private_notes,counterparty_organization_id")
          .eq("owner_organization_id", selected).order("updated_at", { ascending: false }).limit(150),
        supabase.from("sr_profile_suggestions")
          .select("id,field_key,proposed_value,confidence,source_kind,source_label")
          .eq("target_organization_id", selected).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(50),
      ]);
      if (profile.error || relations.error || suggestions.error) {
        throw profile.error ?? relations.error ?? suggestions.error;
      }
      setForm(toForm((profile.data as OrgProfile | null) ?? null, fallbackName));
      setContacts((relations.data ?? []) as Relationship[]);
      setDrafts((suggestions.data ?? []) as Draft[]);
    } catch (e) {
      setError("Dossier repository not enabled or failed to load: " + errText(e));
    }
  }, []);

  useEffect(() => {
    if (phase === "ready" && orgId) {
      void loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
    }
  }, [phase, orgId, orgs, loadOrg]);

  // The chat deep-link is checked against current per-user Room RLS
  useEffect(() => {
    if (phase !== "ready" || !orgId || !userId) return;
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("fromRoom");
    const counterpartId = params.get("counterpartyOrg");
    if (!roomId || !counterpartId || !/^[a-f0-9-]{36}$/i.test(roomId)
      || !/^[a-f0-9-]{36}$/i.test(counterpartId) || counterpartId === orgId) return;
    let active = true;
    (async () => {
      const [room, members] = await Promise.all([
        supabase.from("rooms").select("id,project_id").eq("id", roomId).maybeSingle(),
        supabase.from("room_members").select("user_id,acting_organization_id")
          .eq("room_id", roomId).is("removed_at", null),
      ]);
      const mine = members.data?.some((m) => m.user_id === userId && m.acting_organization_id === orgId);
      const other = members.data?.some((m) => m.acting_organization_id === counterpartId);
      if (!room.data || room.error || members.error || !mine || !other) return;
      const { data: counterparty } = await supabase.from("organizations")
        .select("name").eq("id", counterpartId).maybeSingle();
      if (!active) return;
      setCounterpartyOrgId(counterpartId);
      setSourceProjectId(room.data.project_id);
      if (counterparty?.name) setContactName(counterparty.name);
    })();
    return () => { active = false; };
  }, [phase, orgId, userId]);

  const report = (message: string) => { setNotice(message); setError(""); };
  const saveCompany = async (current: CompanyForm = form) => {
    if (!userId || !orgId) throw new Error("Please log in and select an organization");
    if (current.display_name.trim().length < 2) throw new Error("Company name must be at least 2 characters");
    const { error: saveError } = await supabase.from("sr_organization_profiles").upsert({
      organization_id: orgId,
      display_name: current.display_name.trim(),
      description: current.description.trim() || null,
      website_url: safeWebsite(current.website_url),
      country: current.country.trim() || null,
      capabilities: csv(current.capabilities),
      visibility: "private", published_by: null, published_at: null,
      updated_by: userId, updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    if (saveError) throw saveError;
    setForm(current);
  };

  const saveManual = async () => {
    setBusy("company"); setError("");
    try { await saveCompany(); report("Company profile saved as private draft, not published to Marketplace."); }
    catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const savePerson = async () => {
    setBusy("person"); setError("");
    try {
      if (!personal.display_name.trim()) throw new Error("Please enter your name");
      const { error: e } = await supabase.from("sr_person_profiles").upsert({
        user_id: userId, display_name: personal.display_name.trim(),
        headline: personal.headline.trim() || null,
        bio: personal.bio.trim() || null, skills: csv(personal.skills),
        visibility: "private", published_at: null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (e) throw e;
      report("Personal profile saved, visible only to you.");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const addContact = async () => {
    setBusy("contact"); setError("");
    try {
      if (contactName.trim().length < 2) throw new Error("Please enter customer or supplier name");
      const existing = counterpartyOrgId
        ? contacts.find((c) => c.counterparty_organization_id === counterpartyOrgId && c.relationship_kind === contactKind)
        : null;

      if (existing) {
        const { error: e } = await supabase.from("sr_organization_relationships")
          .update({
            counterparty_name: contactName.trim(),
            private_notes: contactNotes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (e) throw e;
        setContactNotes("");
        await loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
        report("Relationship updated and saved to private customer/supplier directory.");
      } else {
        const { error: e } = await supabase.from("sr_organization_relationships").insert({
          owner_organization_id: orgId, counterparty_name: contactName.trim(),
          counterparty_organization_id: counterpartyOrgId, source_project_id: sourceProjectId,
          relationship_kind: contactKind, stage: "prospect",
          private_notes: contactNotes.trim() || null, created_by: userId,
        });
        if (e) throw e;
        setContactName(""); setContactNotes(""); setCounterpartyOrgId(null); setSourceProjectId(null);
        await loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
        report("Relationship saved to private customer/supplier directory; counterparty will not be notified.");
      }
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const changeStage = async (id: string, stage: Relationship["stage"]) => {
    setBusy(id); setError("");
    try {
      const { error: e } = await supabase.from("sr_organization_relationships")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", id).eq("owner_organization_id", orgId);
      if (e) throw e;
      setContacts((items) => items.map((c) => c.id === id ? { ...c, stage } : c));
      report("Contact stage updated.");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const askAI = async () => {
    setBusy("ai"); setError(""); setGenerated([]);
    try {
      if (sourceText.trim().length < 40) throw new Error("Please paste at least 40 characters from brochure or website text");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please log in again");
      const res = await fetch("/api/project-room-b/profile-suggest", {
        method: "POST", headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: orgId, sourceText, sourceKind,
          sourceLabel: sourceLabel.trim() || undefined, language: navigator.language,
        }),
      });
      const answer = await res.json().catch(() => ({}));
      if (!res.ok || !answer.ok) throw new Error(answer.error || "AI extraction failed");
      setGenerated(Array.isArray(answer.suggestions) ? answer.suggestions : []);
      report("AI generated candidate data only. Please review each item. Not saved to database.");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const saveSuggestion = async (item: Generated) => {
    setBusy(item.fieldKey); setError("");
    try {
      const { error: e } = await supabase.from("sr_profile_suggestions").insert({
        target_organization_id: orgId, target_user_id: null,
        field_key: item.fieldKey, proposed_value: item.value,
        source_kind: sourceKind,
        source_label: ((sourceLabel.trim() || (sourceKind === "website_text" ? "User pasted website introduction" : "User pasted company brochure")) + (item.evidenceNote ? ` · ${item.evidenceNote}` : "")).slice(0, 280),
        confidence: item.confidence, status: "pending", created_by: userId,
      });
      if (e) throw e;
      setGenerated((items) => items.filter((g) => g.fieldKey !== item.fieldKey));
      await loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
      report("AI suggestions added to pending review queue; official company profile untouched.");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const decideSuggestion = async (s: Draft, accept: boolean) => {
    setBusy(s.id); setError("");
    try {
      if (accept) {
        if (!window.confirm("Apply this suggestion to private company profile? Will not be published or replace third-party verification.")) return;
      }
      const { error: rpcError } = await supabase.rpc("sr_decide_profile_suggestion", {
        p_suggestion_id: s.id,
        p_target_organization_id: orgId,
        p_decision: accept ? "accept" : "dismiss",
      });
      if (rpcError) throw rpcError;
      setDrafts((items) => items.filter((d) => d.id !== s.id));
      await loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
      report(accept ? "Applied to private company profile." : "Suggestion dismissed.");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const updateForm = (key: keyof CompanyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "";
  const input = (label: string, value: string, onChange: (v: string) => void, placeholder = "") =>
    <label className="block text-sm font-medium text-slate-700">{label}
      <input className={`mt-1 ${field}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>;

  const filteredContacts = contacts.filter((c) => {
    if (!directorySearch.trim()) return true;
    const q = directorySearch.toLowerCase();
    return c.counterparty_name.toLowerCase().includes(q) ||
      (c.private_notes && c.private_notes.toLowerCase().includes(q));
  });

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <Link
              href={fromRoomId ? `/project-room-b?room=${encodeURIComponent(fromRoomId)}` : "/project-room-b"}
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Project Room
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Relationship & Capabilities Dossier</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Gradually build personal, company, and customer/supplier relationships from real collaboration. Private by default; never automatically exposed from chat.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
            Beta · Private Dossier Space
          </span>
        </header>

        {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
        {notice && <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900" role="status">{notice}</div>}

        {phase === "loading" && <div className={section} role="status">Loading your organization permissions…</div>}
        {phase === "signedout" && <div className={section}>Please <Link href="/project-room-b" className="ml-1 text-teal-700 underline">log in to Project Room</Link> first.</div>}
        {phase === "unavailable" && <div className={section}>Network dossier module temporarily unavailable; existing chat rooms are unaffected.</div>}

        {(phase === "ready" || phase === "noadmin") && (
          <>
            {/* Claude V4.5 Minimal-Diff Sub-navigation Tabs */}
            <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2" aria-label="Network dossier tab navigation">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "edit"
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileEdit className="h-3.5 w-3.5" />
                Maintenance & AI
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("company")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "company"
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Company Dossier Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("person")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "person"
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Person Dossier Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("directory")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "directory"
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Private Customer/Supplier Directory ({contacts.length})
              </button>
            </nav>

            {/* TAB 1: Company Dossier Preview */}
            {activeTab === "company" && (
              <section className="space-y-4">
                {phase === "noadmin" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Notice: You are logged in as a standard member. Company profile drafts are maintained by organization admins. Below is your company&apos;s private dossier preview.
                  </div>
                )}
                <CompanyDossierCard
                  displayName={form.display_name || orgName || "Pending Company"}
                  websiteUrl={form.website_url || null}
                  country={form.country || null}
                  capabilities={csv(form.capabilities)}
                  description={form.description || null}
                  isDraft={true}
                  verified={false}
                  verificationLevel={null}
                  onEditClick={phase === "ready" ? () => setActiveTab("edit") : undefined}
                  backRoomId={fromRoomId}
                />
              </section>
            )}

            {/* TAB 2: Person Dossier Preview */}
            {activeTab === "person" && (
              <section className="space-y-4">
                <PersonDossierCard
                  displayName={personal.display_name || "Pending Name"}
                  headline={personal.headline || null}
                  bio={personal.bio || null}
                  skills={csv(personal.skills)}
                  isDraft={true}
                  verified={false}
                  verificationLevel={null}
                  onEditClick={() => setActiveTab("edit")}
                  backRoomId={fromRoomId}
                />
              </section>
            )}

            {/* TAB 3: Network Directory View */}
            {activeTab === "directory" && (
              <section data-testid="network-directory-view" className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">Private Customer & Supplier Directory</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Private contacts accumulated from authentic collaboration. Visible only inside your organization, never listed on public Marketplace.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search contacts or notes..."
                        value={directorySearch}
                        onChange={(e) => setDirectorySearch(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-offset-2 focus:border-teal-600"
                      />
                    </div>
                    {phase === "ready" && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("edit")}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Contact
                      </button>
                    )}
                  </div>
                </div>

                {filteredContacts.length === 0 ? (
                  <div className={section}>
                    <p className="text-sm text-slate-500">
                      {directorySearch
                        ? "No matching relationship records found."
                        : "No relationship records yet. Counterparties added in project chat or Maintenance will appear here privately for your organization."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredContacts.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <Avatar type="org" name={c.counterparty_name} size="md" verified={false} />
                              <div>
                                <h3 className="text-sm font-semibold leading-snug text-slate-950">
                                   {c.counterparty_name}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <StatusPill role={c.relationship_kind} />
                                  <StatusPill role={c.stage} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {c.private_notes && (
                            <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
                              {c.private_notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                          {phase === "ready" ? (
                            <label className="flex items-center gap-1.5">
                              <span>Stage:</span>
                              <select
                                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-800"
                                value={c.stage}
                                disabled={!!busy}
                                onChange={(e) => void changeStage(c.id, e.target.value as Relationship["stage"])}
                                aria-label={`Update contact stage for ${c.counterparty_name}`}
                              >
                                {Object.entries(relationshipStages).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <span className="font-mono text-slate-400">Only admins can update stage</span>
                          )}

                          {fromRoomId && (
                            <Link
                              href={`/project-room-b?room=${encodeURIComponent(fromRoomId)}`}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              Return to Room →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB 4: Edit & AI Operations (Default Working Workspace) */}
            {activeTab === "edit" && (
              <>
                {phase === "noadmin" && (
                  <div className={section}>
                    <h2 className="text-lg font-bold">My Personal Profile</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Company profile and private customer directory require admin permissions; your personal profile can be maintained by yourself.
                    </p>
                    <div className="mt-3 space-y-3">
                      <label className="block text-sm font-medium">Display Name<input className={`mt-1 ${field}`} value={personal.display_name} onChange={(e) => setPersonal((p) => ({ ...p, display_name: e.target.value }))} /></label>
                      <label className="block text-sm font-medium">Title / Specialty<input className={`mt-1 ${field}`} value={personal.headline} onChange={(e) => setPersonal((p) => ({ ...p, headline: e.target.value }))} /></label>
                      <label className="block text-sm font-medium">Expertise & Skills (comma-separated)<input className={`mt-1 ${field}`} value={personal.skills} onChange={(e) => setPersonal((p) => ({ ...p, skills: e.target.value }))} /></label>
                      <button type="button" className={primary} disabled={!!busy} onClick={() => void savePerson()}>Save My Private Profile</button>
                    </div>
                  </div>
                )}

                {phase === "ready" && (
                  <>
                    <label className="flex max-w-md flex-col gap-1 text-sm font-semibold text-slate-700">
                      Select Managed Organization
                      <select className={field} value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}
                      </select>
                    </label>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className={section}>
                        <div className="mb-4">
                          <h2 className="text-lg font-bold">Company Profile Draft</h2>
                          <p className="mt-1 text-xs text-slate-500">Maintained by admins; only company members can view drafts. Publishing to public directory requires separate explicit authorization.</p>
                        </div>
                        <div className="space-y-3">
                          {input("Company Name", form.display_name, (v) => updateForm("display_name", v), orgName)}
                          {input("Company Website (HTTPS)", form.website_url, (v) => updateForm("website_url", v), "https://example.com")}
                          {input("Country / Region", form.country, (v) => updateForm("country", v), "Thailand")}
                          {input("Core Products & Capabilities (comma-separated)", form.capabilities, (v) => updateForm("capabilities", v), "PHC piles, precast components")}
                          <label className="block text-sm font-medium text-slate-700">Company Overview
                            <textarea className={`mt-1 min-h-28 ${field}`} maxLength={5000} value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
                          </label>
                          <button type="button" className={primary} disabled={!!busy} onClick={() => void saveManual()}>Save Private Company Draft</button>
                        </div>
                      </section>

                      <section className={section}>
                        <h2 className="text-lg font-bold">AI Company Profile Extraction</h2>
                        <p className="mt-1 text-xs text-slate-500">Only processes material you actively paste and have rights to provide; calls configured AI services. Does not scrape websites, read chats, or auto-publish.</p>
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm font-medium text-slate-700">Source Type
                            <select className={`mt-1 ${field}`} value={sourceKind} onChange={(e) => setSourceKind(e.target.value as "brochure_text" | "website_text")}>
                              <option value="brochure_text">Company Brochure Text</option>
                              <option value="website_text">Company Website Intro Text</option>
                            </select>
                          </label>
                          {input("Source Tag (Optional)", sourceLabel, setSourceLabel, "Official About Page / 2026 Brochure")}
                          <label className="block text-sm font-medium text-slate-700">Paste Source Material Text
                            <textarea className={`mt-1 min-h-36 ${field}`} maxLength={12000} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste company overview, product catalog specs, etc. Do not paste confidential client data." />
                          </label>
                          <button type="button" className={primary} disabled={!!busy || sourceText.trim().length < 40} onClick={() => void askAI()}>
                            {busy === "ai" ? "AI is organizing…" : "Extract Profile Suggestions"}
                          </button>
                          {!!generated.length && <div className="space-y-2 border-t border-slate-200 pt-3">
                            <h3 className="text-sm font-bold">Pending AI Suggestions</h3>
                            {generated.map((g) => <div key={g.fieldKey} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                              <div className="font-semibold">{labels[g.fieldKey]} · Confidence {Math.round(g.confidence * 100)}%</div>
                              <p className="mt-1 break-words text-slate-700">{Array.isArray(g.value) ? g.value.join(", ") : g.value}</p>
                              {g.evidenceNote && <p className="mt-1 text-xs text-slate-500">Basis: {g.evidenceNote}</p>}
                              <button type="button" disabled={!!busy} onClick={() => void saveSuggestion(g)} className={`mt-2 ${secondary}`}>Add to Pending Queue</button>
                            </div>)}
                          </div>}
                        </div>
                      </section>

                      <section className={section}>
                        <h2 className="text-lg font-bold">Action Required: Review AI Suggestions</h2>
                        <p className="mt-1 text-xs text-slate-500">AI suggestions are not verified facts. Accepting applies them to private drafts only, never automatically to public directories.</p>
                        <div className="mt-3 space-y-3">
                          {!drafts.length && <p className="text-sm text-slate-500">No pending company profile suggestions at this time.</p>}
                          {drafts.map((d) => <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-sm">{labels[d.field_key]}</strong>
                              <span className="text-xs text-slate-500">{d.source_kind}</span>
                            </div>
                            <p className="mt-2 break-words text-sm">{Array.isArray(d.proposed_value) ? d.proposed_value.join(", ") : String(d.proposed_value)}</p>
                            {d.source_label && <p className="mt-1 text-xs text-slate-500">{d.source_label}</p>}
                            <div className="mt-3 flex gap-2">
                              <button className={primary} type="button" disabled={!!busy} onClick={() => void decideSuggestion(d, true)}>Confirm & Apply</button>
                              <button className={secondary} type="button" disabled={!!busy} onClick={() => void decideSuggestion(d, false)}>Dismiss</button>
                            </div>
                          </div>)}
                        </div>
                      </section>

                      <section className={section}>
                        <h2 className="text-lg font-bold">Customer & Supplier Relationships</h2>
                        <p className="mt-1 text-xs text-slate-500">Exclusive contact leads for your organization; will not be shared with the counterparty or published to Marketplace.</p>
                        <div className="mt-4 space-y-3">
                          {counterpartyOrgId && <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900">Identified counterparty from project room you have access to. Saved records remain private to your company.</p>}
                          {input("Company Name", contactName, setContactName, "Target customer or supplier name")}
                          <label className="block text-sm font-medium text-slate-700">Relationship
                            <select className={`mt-1 ${field}`} value={contactKind} onChange={(e) => setContactKind(e.target.value as Relationship["relationship_kind"])}>
                              {Object.entries(relationshipKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </label>
                          <label className="block text-sm font-medium text-slate-700">Private Notes (Optional)
                            <textarea className={`mt-1 min-h-20 ${field}`} maxLength={4000} value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} />
                          </label>
                          <button type="button" className={primary} disabled={!!busy} onClick={() => void addContact()}>Save as Private Relationship</button>
                          <div className="space-y-2 border-t border-slate-200 pt-4">
                            {contacts.length === 0 && <p className="text-sm text-slate-500">No relationship records yet. Future recommendations from your projects will not be added automatically.</p>}
                            {contacts.map((c) => <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                              <div className="min-w-0 flex-1">
                                <div className="break-words font-semibold">{c.counterparty_name}</div>
                                <p className="mt-1 text-xs text-slate-500">{relationshipKinds[c.relationship_kind]}</p>
                                {c.private_notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{c.private_notes}</p>}
                              </div>
                              <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" disabled={!!busy} value={c.stage} onChange={(e) => void changeStage(c.id, e.target.value as Relationship["stage"])} aria-label={`Update contact stage for ${c.counterparty_name}`}>
                                {Object.entries(relationshipStages).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </div>)}
                          </div>
                        </div>
                      </section>
                    </div>

                    <section className={section}>
                      <div className="mb-3">
                        <h2 className="text-lg font-bold">My Personal Profile</h2>
                        <p className="mt-1 text-xs text-slate-500">Maintain your professional profile only; personal data is never inferred or published from cross-company chats.</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {input("Display Name", personal.display_name, (v) => setPersonal((p) => ({ ...p, display_name: v })), "Full Name")}
                        {input("Title / Specialty", personal.headline, (v) => setPersonal((p) => ({ ...p, headline: v })), "Procurement Manager / Engineer")}
                        {input("Expertise & Skills (comma-separated)", personal.skills, (v) => setPersonal((p) => ({ ...p, skills: v })), "Precast, Procurement")}
                        <label className="block text-sm font-medium text-slate-700">Personal Bio
                          <textarea className={`mt-1 min-h-20 ${field}`} maxLength={3000} value={personal.bio} onChange={(e) => setPersonal((p) => ({ ...p, bio: e.target.value }))} />
                        </label>
                      </div>
                      <button type="button" className={`mt-3 ${primary}`} disabled={!!busy} onClick={() => void savePerson()}>Save My Private Profile</button>
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
