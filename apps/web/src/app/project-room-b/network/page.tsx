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
  buyer: "客户 / 买方",
  supplier: "供应商",
  partner: "合作伙伴",
  other: "其他",
};
const relationshipStages = {
  prospect: "待联系",
  contacted: "已联系",
  active: "合作中",
  paused: "暂停",
};
const labels: Record<Draft["field_key"], string> = {
  description: "公司简介", website_url: "网站", country: "国家 / 地区", capabilities: "主营能力",
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
  throw new Error("企业网站必须是完整的 HTTPS 链接");
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
      setError("资料库尚未启用或无法读取：" + errText(e));
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
    if (!userId || !orgId) throw new Error("请先登录并选择组织");
    if (current.display_name.trim().length < 2) throw new Error("公司名称至少两个字符");
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
    try { await saveCompany(); report("企业资料已保存为私有草稿，未公开到 Marketplace。"); }
    catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const savePerson = async () => {
    setBusy("person"); setError("");
    try {
      if (!personal.display_name.trim()) throw new Error("请填写姓名");
      const { error: e } = await supabase.from("sr_person_profiles").upsert({
        user_id: userId, display_name: personal.display_name.trim(),
        headline: personal.headline.trim() || null,
        bio: personal.bio.trim() || null, skills: csv(personal.skills),
        visibility: "private", published_at: null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (e) throw e;
      report("个人资料已保存，仅自己可见。");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const addContact = async () => {
    setBusy("contact"); setError("");
    try {
      if (contactName.trim().length < 2) throw new Error("请填写客户或供应商名称");
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
        report("关系已更新并保存到本企业私有客户/供应商库。");
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
        report("关系已保存到本企业私有客户/供应商库，不会通知对方。");
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
      report("联系状态已更新。");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const askAI = async () => {
    setBusy("ai"); setError(""); setGenerated([]);
    try {
      if (sourceText.trim().length < 40) throw new Error("请先粘贴至少 40 个字符的宣传册或网站原文");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("登录已过期，请重新登录");
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
      if (!res.ok || !answer.ok) throw new Error(answer.error || "AI 提取失败");
      setGenerated(Array.isArray(answer.suggestions) ? answer.suggestions : []);
      report("AI 只生成了候选资料，请逐条审核。未写入资料库。");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const saveSuggestion = async (item: Generated) => {
    setBusy(item.fieldKey); setError("");
    try {
      const { error: e } = await supabase.from("sr_profile_suggestions").insert({
        target_organization_id: orgId, target_user_id: null,
        field_key: item.fieldKey, proposed_value: item.value,
        source_kind: sourceKind,
        source_label: ((sourceLabel.trim() || (sourceKind === "website_text" ? "用户粘贴的网站介绍" : "用户粘贴的公司宣传册")) + (item.evidenceNote ? ` · ${item.evidenceNote}` : "")).slice(0, 280),
        confidence: item.confidence, status: "pending", created_by: userId,
      });
      if (e) throw e;
      setGenerated((items) => items.filter((g) => g.fieldKey !== item.fieldKey));
      await loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
      report("AI 建议已加入待确认队列，没有更新正式企业资料。");
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  const decideSuggestion = async (s: Draft, accept: boolean) => {
    setBusy(s.id); setError("");
    try {
      if (accept) {
        if (!window.confirm("将这条建议应用到本企业私有资料？不会公开，也不会替代第三方资质核验。")) return;
      }
      const { error: rpcError } = await supabase.rpc("sr_decide_profile_suggestion", {
        p_suggestion_id: s.id,
        p_target_organization_id: orgId,
        p_decision: accept ? "accept" : "dismiss",
      });
      if (rpcError) throw rpcError;
      setDrafts((items) => items.filter((d) => d.id !== s.id));
      await loadOrg(orgId, orgs.find((o) => o.id === orgId)?.name ?? "");
      report(accept ? "已采纳至私有企业资料。" : "已忽略该条建议。");
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
              返回 Project Room
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">关系与能力资料</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              从真实协作中逐渐完善个人、公司和客户/供应商关系。默认私有，不从聊天自动公开。
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
            内测 · 私有资料空间
          </span>
        </header>

        {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
        {notice && <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900" role="status">{notice}</div>}

        {phase === "loading" && <div className={section} role="status">正在读取你的组织权限…</div>}
        {phase === "signedout" && <div className={section}>请先<Link href="/project-room-b" className="ml-1 text-teal-700 underline">登录 Project Room</Link>。</div>}
        {phase === "unavailable" && <div className={section}>网络资料模块暂不可用；现有聊天室不受影响。</div>}

        {(phase === "ready" || phase === "noadmin") && (
          <>
            {/* Claude V4.5 Minimal-Diff Sub-navigation Tabs */}
            <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2" aria-label="网络资料标签导航">
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
                资料维护与 AI
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
                企业档案拟真预览
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
                个人名片拟真预览
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
                私有客户/供应商目录 ({contacts.length})
              </button>
            </nav>

            {/* TAB 1: Company Dossier Preview */}
            {activeTab === "company" && (
              <section className="space-y-4">
                {phase === "noadmin" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    提示：当前您以普通工程成员登录。企业资料草稿由企业管理员编辑维护，以下为本企业私有档案拟真预览。
                  </div>
                )}
                <CompanyDossierCard
                  displayName={form.display_name || orgName || "待完善企业"}
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
                  displayName={personal.display_name || "待完善姓名"}
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
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">企业私有客户与供应商库</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      从真实协作沉淀的私有联系人。仅本企业内部可见，绝不进入公共 Marketplace。
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="搜索关系或备注..."
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
                        添加关系
                      </button>
                    )}
                  </div>
                </div>

                {filteredContacts.length === 0 ? (
                  <div className={section}>
                    <p className="text-sm text-slate-500">
                      {directorySearch
                        ? "未找到匹配的关系记录。"
                        : "暂无关系记录。在项目聊天或“资料维护”中添加合作方后，将仅在此处对本企业私有展示。"}
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
                              <span>阶段:</span>
                              <select
                                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-800"
                                value={c.stage}
                                disabled={!!busy}
                                onChange={(e) => void changeStage(c.id, e.target.value as Relationship["stage"])}
                                aria-label={`更新 ${c.counterparty_name} 合作阶段`}
                              >
                                {Object.entries(relationshipStages).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <span className="font-mono text-slate-400">仅管理员可修改阶段</span>
                          )}

                          {fromRoomId && (
                            <Link
                              href={`/project-room-b?room=${encodeURIComponent(fromRoomId)}`}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              返回房间 →
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
                    <h2 className="text-lg font-bold">我的个人资料</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      企业资料和企业私有客户库需要管理员权限；你的个人资料可由自己维护。
                    </p>
                    <div className="mt-3 space-y-3">
                      <label className="block text-sm font-medium">显示姓名<input className={`mt-1 ${field}`} value={personal.display_name} onChange={(e) => setPersonal((p) => ({ ...p, display_name: e.target.value }))} /></label>
                      <label className="block text-sm font-medium">职位 / 专业<input className={`mt-1 ${field}`} value={personal.headline} onChange={(e) => setPersonal((p) => ({ ...p, headline: e.target.value }))} /></label>
                      <label className="block text-sm font-medium">擅长领域（逗号分隔）<input className={`mt-1 ${field}`} value={personal.skills} onChange={(e) => setPersonal((p) => ({ ...p, skills: e.target.value }))} /></label>
                      <button type="button" className={primary} disabled={!!busy} onClick={() => void savePerson()}>保存我的私有资料</button>
                    </div>
                  </div>
                )}

                {phase === "ready" && (
                  <>
                    <label className="flex max-w-md flex-col gap-1 text-sm font-semibold text-slate-700">
                      选择你管理的组织
                      <select className={field} value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}（{o.role}）</option>)}
                      </select>
                    </label>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className={section}>
                        <div className="mb-4">
                          <h2 className="text-lg font-bold">企业资料草稿</h2>
                          <p className="mt-1 text-xs text-slate-500">管理员编辑，仅公司成员能看到草稿。发布到公开目录是未来的单独授权动作。</p>
                        </div>
                        <div className="space-y-3">
                          {input("企业名称", form.display_name, (v) => updateForm("display_name", v), orgName)}
                          {input("企业网站（HTTPS）", form.website_url, (v) => updateForm("website_url", v), "https://example.com")}
                          {input("国家 / 地区", form.country, (v) => updateForm("country", v), "Thailand")}
                          {input("主营产品与能力（逗号分隔）", form.capabilities, (v) => updateForm("capabilities", v), "PHC piles, precast components")}
                          <label className="block text-sm font-medium text-slate-700">公司简介
                            <textarea className={`mt-1 min-h-28 ${field}`} maxLength={5000} value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
                          </label>
                          <button type="button" className={primary} disabled={!!busy} onClick={() => void saveManual()}>保存私有企业草稿</button>
                        </div>
                      </section>

                      <section className={section}>
                        <h2 className="text-lg font-bold">AI 整理公司资料</h2>
                        <p className="mt-1 text-xs text-slate-500">仅处理你主动粘贴且有权提供的内容；需调用已配置的 AI 服务。不会自动抓取网站、读取群聊或发布资料。</p>
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm font-medium text-slate-700">素材来源
                            <select className={`mt-1 ${field}`} value={sourceKind} onChange={(e) => setSourceKind(e.target.value as "brochure_text" | "website_text")}>
                              <option value="brochure_text">公司宣传册文字</option>
                              <option value="website_text">公司网站介绍文字</option>
                            </select>
                          </label>
                          {input("来源标记（可选）", sourceLabel, setSourceLabel, "官网 About 页面 / 2026 版宣传册")}
                          <label className="block text-sm font-medium text-slate-700">粘贴素材文字
                            <textarea className={`mt-1 min-h-36 ${field}`} maxLength={12000} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="粘贴公司简介、产品目录说明等；不要粘贴客户保密资料。" />
                          </label>
                          <button type="button" className={primary} disabled={!!busy || sourceText.trim().length < 40} onClick={() => void askAI()}>
                            {busy === "ai" ? "AI 正在整理…" : "提取资料建议"}
                          </button>
                          {!!generated.length && <div className="space-y-2 border-t border-slate-200 pt-3">
                            <h3 className="text-sm font-bold">待保存的 AI 候选</h3>
                            {generated.map((g) => <div key={g.fieldKey} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                              <div className="font-semibold">{labels[g.fieldKey]} · 置信度 {Math.round(g.confidence * 100)}%</div>
                              <p className="mt-1 break-words text-slate-700">{Array.isArray(g.value) ? g.value.join("、") : g.value}</p>
                              {g.evidenceNote && <p className="mt-1 text-xs text-slate-500">依据：{g.evidenceNote}</p>}
                              <button type="button" disabled={!!busy} onClick={() => void saveSuggestion(g)} className={`mt-2 ${secondary}`}>加入待确认队列</button>
                            </div>)}
                          </div>}
                        </div>
                      </section>

                      <section className={section}>
                        <h2 className="text-lg font-bold">需要你确认</h2>
                        <p className="mt-1 text-xs text-slate-500">AI 建议并非经验证的企业事实。采纳后只保存到私有档案，不自动进入公开目录。</p>
                        <div className="mt-3 space-y-3">
                          {!drafts.length && <p className="text-sm text-slate-500">当前没有待确认的企业资料。</p>}
                          {drafts.map((d) => <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-sm">{labels[d.field_key]}</strong>
                              <span className="text-xs text-slate-500">{d.source_kind}</span>
                            </div>
                            <p className="mt-2 break-words text-sm">{Array.isArray(d.proposed_value) ? d.proposed_value.join("、") : String(d.proposed_value)}</p>
                            {d.source_label && <p className="mt-1 text-xs text-slate-500">{d.source_label}</p>}
                            <div className="mt-3 flex gap-2">
                              <button className={primary} type="button" disabled={!!busy} onClick={() => void decideSuggestion(d, true)}>确认并应用</button>
                              <button className={secondary} type="button" disabled={!!busy} onClick={() => void decideSuggestion(d, false)}>忽略</button>
                            </div>
                          </div>)}
                        </div>
                      </section>

                      <section className={section}>
                        <h2 className="text-lg font-bold">客户与供应商关系库</h2>
                        <p className="mt-1 text-xs text-slate-500">本组织独有的联系人线索，不会自动与对方企业共享或发布到 Marketplace。</p>
                        <div className="mt-4 space-y-3">
                          {counterpartyOrgId && <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900">已根据你有权限访问的项目房间识别合作企业。保存后仅在本企业客户库中可见。</p>}
                          {input("企业名称", contactName, setContactName, "待联系的客户或供应商")}
                          <label className="block text-sm font-medium text-slate-700">关系
                            <select className={`mt-1 ${field}`} value={contactKind} onChange={(e) => setContactKind(e.target.value as Relationship["relationship_kind"])}>
                              {Object.entries(relationshipKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </label>
                          <label className="block text-sm font-medium text-slate-700">私有备注（可选）
                            <textarea className={`mt-1 min-h-20 ${field}`} maxLength={4000} value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} />
                          </label>
                          <button type="button" className={primary} disabled={!!busy} onClick={() => void addContact()}>保存为私有关系</button>
                          <div className="space-y-2 border-t border-slate-200 pt-4">
                            {contacts.length === 0 && <p className="text-sm text-slate-500">暂无关系记录。将来可从你参与的项目中建议添加，但不会自动写入。</p>}
                            {contacts.map((c) => <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                              <div className="min-w-0 flex-1">
                                <div className="break-words font-semibold">{c.counterparty_name}</div>
                                <p className="mt-1 text-xs text-slate-500">{relationshipKinds[c.relationship_kind]}</p>
                                {c.private_notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{c.private_notes}</p>}
                              </div>
                              <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" disabled={!!busy} value={c.stage} onChange={(e) => void changeStage(c.id, e.target.value as Relationship["stage"])} aria-label={`更新 ${c.counterparty_name} 的联系阶段`}>
                                {Object.entries(relationshipStages).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </div>)}
                          </div>
                        </div>
                      </section>
                    </div>

                    <section className={section}>
                      <div className="mb-3">
                        <h2 className="text-lg font-bold">我的个人资料</h2>
                        <p className="mt-1 text-xs text-slate-500">只保存自己的专业资料；不从跨企业聊天中推断或公开个人信息。</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {input("显示姓名", personal.display_name, (v) => setPersonal((p) => ({ ...p, display_name: v })), "姓名")}
                        {input("职位 / 专业", personal.headline, (v) => setPersonal((p) => ({ ...p, headline: v })), "采购经理 / 工程师")}
                        {input("擅长领域（逗号分隔）", personal.skills, (v) => setPersonal((p) => ({ ...p, skills: v })), "Precast, Procurement")}
                        <label className="block text-sm font-medium text-slate-700">个人简介
                          <textarea className={`mt-1 min-h-20 ${field}`} maxLength={3000} value={personal.bio} onChange={(e) => setPersonal((p) => ({ ...p, bio: e.target.value }))} />
                        </label>
                      </div>
                      <button type="button" className={`mt-3 ${primary}`} disabled={!!busy} onClick={() => void savePerson()}>保存我的私有资料</button>
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
