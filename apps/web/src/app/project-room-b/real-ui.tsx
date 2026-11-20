"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown, GitCompare, History, Sparkles, CornerDownRight, Download, FileUp, FolderPlus, GitBranch, Hash, LockKeyhole, LogOut, Plus, Send, Settings, ShieldCheck, Smartphone, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { OrgMark } from "../project-room-lab/message";
import { formatSize, timeOf } from "../project-room-lab/demo/adapter";
import { usePwa } from "@/components/pwa/PwaProvider";
import css from "../project-room-lab/lab.module.css";
import rc from "./real.module.css";
import type { Real, RealFile, SplitSuggestion } from "./use-real";

const msg = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

export function AuthGate({ real, inviteToken }: { real: Real; inviteToken: string | null }) {
  const [mode, setMode] = useState<"in" | "up">(inviteToken ? "up" : "in");
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setNote(""); setBusy(true);
    try {
      if (mode === "in") await real.actions.signIn(email, pw);
      else if (!(await real.actions.signUp(email, pw))) setNote("Confirmation email sent. Click the link in the email, then return here to log in.");
    } catch (x) { setErr(msg(x)); } finally { setBusy(false); }
  };
  return (
    <main className={rc.gate}>
      <form className={rc.box} onSubmit={go}>
        <span className={rc.tag}>STAGING · Test Environment</span>
        <h1>SourceRating</h1>
        {inviteToken && <p>You received a project invitation. Sign up or log in with your invited email to join.</p>}
        <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <input type="password" required minLength={10} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Password (min. 10 characters)" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Password" />
        {err && <span className={rc.err} role="alert">{err}</span>}
        {note && <p role="status">{note}</p>}
        <button className={rc.go} disabled={busy}>{mode === "in" ? "Log in" : "Sign up"}</button>
        <button type="button" className={rc.link} onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Don't have an account? Sign up" : "Already have an account? Log in"}</button>
      </form>
    </main>
  );
}

/** First run (no organisation yet) and invitation acceptance. */
export function Onboard({ real, inviteToken, onDone }: { real: Real; inviteToken: string | null; onDone: () => void }) {
  const { s, actions, org } = real;
  const [info, setInfo] = useState<Record<string, string> | null>(null);
  const [orgName, setOrgName] = useState(""), [me, setMe] = useState(""), [useOrg, setUseOrg] = useState<string>(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const admin = s.memberships.filter((m) => m.role !== "member");
  useEffect(() => {
    if (!inviteToken) return;
    actions.previewInvite(inviteToken).then((d) => { setInfo(d); setOrgName((v) => v || d.organization_name || ""); }).catch((x) => setErr(msg(x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);
  const colleague = info?.kind === "org_member";
  const run = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (inviteToken) await actions.acceptInvite(inviteToken, colleague ? null : useOrg || null, orgName, me);
      else await actions.createOrganization(orgName, me);
      onDone();
    } catch (x) { setErr(msg(x)); } finally { setBusy(false); }
  };
  const open = !inviteToken || info?.state === "open";
  return (
    <main className={rc.gate}>
      <form className={rc.box} onSubmit={run}>
        <span className={rc.tag}>STAGING · Test Environment</span>
        {inviteToken ? (
          <>
            <h1>{info ? info.project_name : "Project Invitation"}</h1>
            {info && <p>{info.invited_by} invited you to join &ldquo;{info.room_name}&rdquo;{colleague ? `, as a member of ${info.organization_name}` : ""}</p>}
            {info && info.state !== "open" && <span className={rc.err}>Invitation {info.state === "used" ? "already used" : info.state === "revoked" ? "revoked" : "expired"}</span>}
          </>
        ) : <h1>Create your organization</h1>}
        {open && !colleague && admin.length > 0 && inviteToken && (
          <div className={rc.stack}>
            {admin.map((m) => (
              <button key={m.orgId} type="button" className={rc.mini} data-primary={useOrg === m.orgId} onClick={() => setUseOrg(useOrg === m.orgId ? "" : m.orgId)}>
                {useOrg === m.orgId && <Check size={14} />}Join as {org(m.orgId).name}
              </button>
            ))}
          </div>
        )}
        {open && !colleague && !useOrg && <input required minLength={2} placeholder="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} aria-label="Organization Name" />}
        {open && <input required={!useOrg} placeholder="Your Name" value={me} onChange={(e) => setMe(e.target.value)} aria-label="Your Name" />}
        {err && <span className={rc.err} role="alert">{err}</span>}
        {open && <button className={rc.go} disabled={busy || (!!inviteToken && !info)}>{inviteToken ? "Join" : "Create"}</button>}
        <button type="button" className={rc.link} onClick={() => (inviteToken && s.memberships.length ? onDone() : actions.signOut())}>{inviteToken && s.memberships.length ? "Later" : `Sign out ${s.me?.email ?? ""}`}</button>
      </form>
    </main>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.dialog} aria-describedby={undefined}>
          <Dialog.Title className={css.dialogTitle}>{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function NewProject({ real, open, onClose }: { real: Real; open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form className={rc.stack} onSubmit={async (e) => { e.preventDefault(); await real.actions.createProject(name.trim(), "participant").then(() => { setName(""); onClose(); }).catch(() => null); }}>
        <input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Project Name" aria-label="Project Name" />
        <div className={css.dialogActs}><small /><button type="button" className={css.ghost} onClick={onClose}>Cancel</button><button className={css.primary} disabled={name.trim().length < 2}>Create</button></div>
      </form>
    </Modal>
  );
}

export function NewSubRoom({ real, open, onClose, preset }: { real: Real; open: boolean; onClose: () => void; preset?: SplitSuggestion }) {
  const { s, room, user, org, actions } = real;
  const [name, setName] = useState(preset?.name ?? ""), [purpose, setPurpose] = useState(preset?.purpose ?? ""), [kind, setKind] = useState<"external" | "internal">(preset?.kind ?? "external");
  const [picked, setPicked] = useState<string[]>(() => (preset ? Object.values(s.users).filter((u) => preset.memberNames.includes(u.name)).map((u) => u.id) : []));
  const parent = s.rooms.find((r) => r.id === (room?.parentId ?? room?.id));
  const candidates = useMemo(() => {
    const ids = new Set<string>(parent?.memberIds ?? []);
    s.colleagues.filter((c) => c.orgId === s.orgId).forEach((c) => ids.add(c.userId));
    ids.delete(s.me?.id ?? "");
    return Array.from(ids).map(user).filter((u) => kind === "external" || u.orgId === s.orgId);
  }, [parent, s.colleagues, s.orgId, s.me, user, kind]);
  if (!parent) return null;
  return (
    <Modal open={open} onClose={onClose} title={`New Sub-Room under "${parent.name}"`}>
      <form className={rc.stack} onSubmit={async (e) => { e.preventDefault(); await actions.createSubRoom(name.trim(), purpose.trim(), kind, picked.filter((id) => candidates.some((c) => c.id === id))).then(() => { setName(""); setPurpose(""); setPicked([]); onClose(); }).catch(() => null); }}>
        <input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Shipping & Customs" aria-label="Sub-room Name" />
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose (optional)" aria-label="Purpose" />
        <div className={css.kindPick}>
          <button type="button" data-on={kind === "external"} onClick={() => setKind("external")}><Hash size={16} /><b>Cross-Company</b><small>Only visible to selected members</small></button>
          <button type="button" data-on={kind === "internal"} data-internal onClick={() => setKind("internal")}><LockKeyhole size={16} /><b>Internal</b><small>{org(s.orgId).short} only</small></button>
        </div>
        <div className={css.invitePick}>
          {candidates.map((u) => (
            <button key={u.id} type="button" data-on={picked.includes(u.id)} onClick={() => setPicked((p) => (p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id]))}>
              <OrgMark color={org(u.orgId).color} short={org(u.orgId).short} size={18} />{u.name}
            </button>
          ))}
        </div>
        <div className={css.dialogActs}><small>{preset ? "AI suggestion · created only after your confirmation" : "Messages and files from main room will not be copied"}</small><button type="button" className={css.ghost} onClick={onClose}>Cancel</button><button className={css.primary} disabled={name.trim().length < 2}>Create</button></div>
      </form>
    </Modal>
  );
}

export function Invite({ real, open, onClose }: { real: Real; open: boolean; onClose: () => void }) {
  const { s, room, org, actions } = real;
  const [email, setEmail] = useState(""), [orgName, setOrgName] = useState(""), [kind, setKind] = useState<"organization" | "org_member">("organization"), [link, setLink] = useState("");
  const internal = room?.kind === "internal";
  const k = internal ? "org_member" : kind;
  return (
    <Modal open={open} onClose={() => { setLink(""); onClose(); }} title="Invite">
      {link ? (
        <div className={rc.stack}>
          <p className={css.hint}>Send this link to {email}. Valid for 7 days, usable only by this email.</p>
          <div className={rc.copy} data-testid="invite-link">{link}</div>
          <div className={css.dialogActs}><small /><button type="button" className={css.primary} onClick={() => { void navigator.clipboard?.writeText(link); }}>Copy Link</button></div>
        </div>
      ) : (
        <form className={rc.stack} onSubmit={async (e) => { e.preventDefault(); await actions.invite(email.trim(), k, orgName.trim()).then(setLink).catch(() => null); }}>
          {!internal && (
            <div className={css.kindPick}>
              <button type="button" data-on={k === "organization"} onClick={() => setKind("organization")}><Hash size={16} /><b>Partner Organization</b><small>Joins with their own organization</small></button>
              <button type="button" data-on={k === "org_member"} onClick={() => setKind("org_member")}><UserPlus size={16} /><b>Colleague</b><small>Joins {org(s.orgId).short}</small></button>
            </div>
          )}
          <input autoFocus type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Recipient Email" aria-label="Recipient Email" />
          {k === "organization" && <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Partner Organization Name (optional)" aria-label="Partner Organization Name" />}
          <div className={css.dialogActs}><small /><button type="button" className={css.ghost} onClick={onClose}>Cancel</button><button className={css.primary}>Generate Invitation Link</button></div>
        </form>
      )}
    </Modal>
  );
}

export function RealSidebar({ real, onOpen, onOpenAbout }: { real: Real; onOpen: (id: string) => void; onOpenAbout?: () => void }) {
  const { s, myRooms, room, user, org, meId, actions } = real;
  const [dlg, setDlg] = useState<"project" | "sub" | null>(null);
  const pwa = usePwa();
  const myOrg = org(s.orgId);
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rooms: typeof myRooms }>();
    for (const r of myRooms) { const g = map.get(r.projectId) ?? { name: r.project, rooms: [] }; g.rooms.push(r); map.set(r.projectId, g); }
    return Array.from(map.values()).map((g) => ({ ...g, rooms: [...g.rooms.filter((r) => !r.parentId), ...g.rooms.filter((r) => r.parentId)] }));
  }, [myRooms]);
  return (
    <nav className={css.side} aria-label="Organizations and chat rooms">
      <div className={css.sideTop}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={css.orgSwitch} aria-label={`Current organization ${myOrg.name}`}>
              <OrgMark color={myOrg.color} short={myOrg.short} size={30} />
              <span><b>{myOrg.name}</b><small>{user(meId).name}</small></span>
              <ChevronsUpDown size={16} aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={css.menu} align="start" sideOffset={6}>
              <DropdownMenu.Label className={css.menuLabel}>{s.me?.email}</DropdownMenu.Label>
              {s.memberships.map((m) => (
                <DropdownMenu.Item key={m.orgId} className={css.menuItem} onSelect={() => actions.switchOrg(m.orgId)}>
                  <OrgMark color={org(m.orgId).color} short={org(m.orgId).short} size={22} />
                  <span className={css.menuTwo}><b>{org(m.orgId).name}</b><small>{m.role}</small></span>
                  {m.orgId === s.orgId && <Check size={15} />}
                </DropdownMenu.Item>
              ))}
              {onOpenAbout && (
                <DropdownMenu.Item className={css.menuItem} onSelect={onOpenAbout}>
                  <Settings size={15} />设置与关于 (v1.1.0)
                </DropdownMenu.Item>
              )}
              {!pwa.isInstalled && (
                <DropdownMenu.Item className={css.menuItem} onSelect={() => void pwa.promptInstall()}>
                  <Smartphone size={15} />Install App
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item className={css.menuItem} onSelect={() => void actions.signOut()}><LogOut size={15} />Log out</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild><button type="button" className={css.iconBtn} aria-label="New"><Plus size={20} /></button></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={css.menu} align="end" sideOffset={6}>
              <DropdownMenu.Item className={css.menuItem} onSelect={() => setDlg("project")}><FolderPlus size={15} />New Project</DropdownMenu.Item>
              {room && <DropdownMenu.Item className={css.menuItem} onSelect={() => setDlg("sub")}><GitBranch size={15} />New Sub-Room</DropdownMenu.Item>}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <div className={css.rooms}>
        {groups.length === 0 && <p className={css.none}>No projects yet. Click + in top-right to create one.</p>}
        {groups.map((g) => (
          <div key={g.name + g.rooms[0].id} className={css.group}>
            <h3>{g.name}</h3>
            {g.rooms.map((r) => {
              const last = (s.messages[r.id] ?? []).at(-1);
              const unread = r.unread[s.orgId] ?? 0;
              const partners = Array.from(new Set(r.roomMembers.map((m) => m.orgId))).filter((o) => o && o !== s.orgId).map(org);
              return (
                <button key={r.id} type="button" className={`${css.room} ${r.parentId ? rc.sub : ""}`} data-active={r.id === room?.id} data-internal={r.kind === "internal"} onClick={() => onOpen(r.id)} data-testid="room">
                  <span className={css.roomIcon}>{r.kind === "internal" ? <LockKeyhole size={16} /> : r.parentId ? <CornerDownRight size={16} /> : <Hash size={16} />}</span>
                  <span className={css.roomMain}>
                    <span className={css.roomLine}><b>{r.name}</b>{last && <time>{timeOf(last.at)}</time>}</span>
                    <span className={css.roomLine}>
                      <span className={css.preview}>{last ? `${last.userId === meId ? "You" : user(last.userId).name}: ${last.text ?? "File"}` : r.purpose ?? (r.parentId ? "Sub-room" : "Main room")}</span>
                      {unread > 0 && <i className={css.badge}>{unread}</i>}
                    </span>
                    <span className={css.roomOrgs}>{r.kind === "internal" ? <em>Internal</em> : partners.map((o) => <span key={o.id}><OrgMark color={o.color} short={o.short} size={12} />{o.short}</span>)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {!pwa.isInstalled && (
        <div className="px-3 py-2 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Smartphone size={14} className="text-teal-700" />
            <span>Mobile / Desktop App</span>
          </div>
          <button
            type="button"
            onClick={() => void pwa.promptInstall()}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition shadow-xs"
          >
            Install
          </button>
        </div>
      )}
      {onOpenAbout && (
        <div className={rc.versionBar}>
          <button
            type="button"
            className={rc.versionPillBtn}
            onClick={onOpenAbout}
            title="查看版本号、本次更新记录与试用功能引导"
          >
            <Sparkles size={13} />
            <span className={rc.verNum}>v1.1.0 预览版</span>
            <span className={rc.verDivider}>·</span>
            <span className={rc.verText}>更新记录与设置</span>
          </button>
        </div>
      )}
      <div className={css.sideFoot}>
        <span>STAGING · Real Backend (Test DB)</span>
        {process.env.NEXT_PUBLIC_SR_NETWORK_PILOT === "1" && (
          <>
            <a href="/project-room-b/network" style={{ color: "#0f766e", textDecoration: "underline", marginLeft: 8 }}>Private Network & CRM (Beta)</a>
            {room && room.roomMembers.some((m) => m.orgId && m.orgId !== s.orgId) && (
              <a href={`/project-room-b/network?fromRoom=${encodeURIComponent(room.id)}&counterpartyOrg=${encodeURIComponent(room.roomMembers.find((m) => m.orgId && m.orgId !== s.orgId)?.orgId ?? "")}`}
                style={{ color: "#0f766e", textDecoration: "underline", marginLeft: 8 }}>Save Partner to Private CRM</a>
            )}
          </>
        )}
      </div>
      <NewProject real={real} open={dlg === "project"} onClose={() => setDlg(null)} />
      <NewSubRoom real={real} open={dlg === "sub"} onClose={() => setDlg(null)} />
    </nav>
  );
}

export function FileCard({ real, f, latest }: { real: Real; f: RealFile; latest: boolean }) {
  const { s, user, org, room, actions } = real;
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [cmp, setCmp] = useState(false);
  const prev = s.files.find((x) => x.id === f.supersedes) ?? s.files.find((x) => x.roomId === f.roomId && x.lineage === f.lineage && x.version === f.version - 1);
  const orgIds = Array.from(new Set((room?.roomMembers ?? []).map((m) => m.orgId).filter(Boolean)));
  const state = (orgId: string) => s.confirmations.filter((c) => c.fileVersionId === f.id && c.orgId === orgId).at(-1);
  const mine = state(s.orgId);
  const inFlight = useRef(false);
  const reviewIntent = useRef<{ note: string; id: string } | null>(null);
  const act = (fn: () => Promise<unknown>) => async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setErr("");
    try { await fn(); setNote(""); } catch (x) { setErr(msg(x)); } finally { inFlight.current = false; setBusy(false); }
  };
  const requestReview = act(async () => {
    if (!reviewIntent.current || reviewIntent.current.note !== note) {
      reviewIntent.current = { note, id: crypto.randomUUID() };
    }
    await actions.requestReview(f.id, note, reviewIntent.current.id);
    reviewIntent.current = null;
  });
  return (
    <article className={rc.file} data-old={!latest} data-testid="file-version">
      <header><span className={rc.ver}>v{f.version}</span><b className={rc.grow}>{f.name}</b>{!latest && <span className={css.hint}>Old version</span>}</header>
      <span className={css.hint}>{user(f.uploaderUserId).name} · {org(f.uploaderOrgId).short} · {new Date(f.createdAt).toLocaleString()} · {formatSize(f.size)}</span>
      <span className={rc.sha} title={f.sha256}>SHA-256 {f.sha256.slice(0, 16)}… · {f.verification}</span>
      <div className={rc.chips}>
        {orgIds.map((id) => { const c = state(id); return <span key={id} className={rc.chip} data-d={c?.decision} title={c ? `${user(c.userId).name} · ${new Date(c.at).toLocaleString()}${c.comment ? ` · ${c.comment}` : ""}` : "Unconfirmed"}>{c?.decision === "confirmed" && <Check size={12} />}{org(id).short}{c ? (c.decision === "confirmed" ? " Confirmed" : " Changes Requested") : " Unconfirmed"}</span>; })}
      </div>
      {mine?.decision !== "confirmed" && (
        <div className={rc.row}>
          <input className={`${css.field} ${rc.grow}`} style={{ height: 32, fontSize: 13 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Confirmation optional; state reason when requesting changes" aria-label="Review Note" />
          <button type="button" className={rc.mini} data-primary disabled={busy} onClick={act(() => actions.confirmFile(f, "confirmed", note))}><ShieldCheck size={14} />Confirm this version</button>
          <button type="button" className={rc.mini} disabled={busy || !note.trim()} onClick={act(() => actions.confirmFile(f, "changes_requested", note))}>Request Changes</button>
        </div>
      )}
      <div className={rc.row}>
        <button type="button" className={rc.mini} disabled={busy} onClick={(event) => { if (event.detail <= 1) void requestReview(); }}><Send size={13} />Request Team Review</button>
        <button type="button" className={rc.mini} disabled={busy} onClick={act(async () => { window.open(await actions.fileUrl(f.id), "_blank", "noopener"); })}><Download size={13} />Download</button>
        {f.sourceEventId && <button type="button" className={rc.mini} onClick={() => actions.jumpTo(f.sourceEventId!)}>Source Message</button>}
        {prev && <button type="button" className={rc.mini} onClick={() => setCmp(true)}><GitCompare size={13} />Compare v{prev.version}</button>}
        {!latest && <button type="button" className={rc.mini} disabled={busy} onClick={act(() => actions.restoreVersion(f))}><History size={13} />Restore as New Version</button>}
      </div>
      {cmp && prev && <Compare real={real} a={prev} b={f} onClose={() => setCmp(false)} />}
      {err && <span className={rc.err}>{err}</span>}
    </article>
  );
}

function Compare({ real, a, b, onClose }: { real: Real; a: RealFile; b: RealFile; onClose: () => void }) {
  const { s, user, org, actions } = real;
  const [urls, setUrls] = useState<[string, string] | null>(null), [err, setErr] = useState("");
  useEffect(() => {
    Promise.all([actions.fileUrl(a.id), actions.fileUrl(b.id)]).then((u) => setUrls(u as [string, string])).catch((x) => setErr(msg(x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.id, b.id]);
  const note = (f: RealFile) => (s.messages[f.roomId] ?? []).find((m) => m.id === f.sourceEventId)?.text ?? "—";
  const rows: [string, (f: RealFile) => string][] = [
    ["Uploader", (f) => `${user(f.uploaderUserId).name} · ${org(f.uploaderOrgId).short}`], ["Time", (f) => new Date(f.createdAt).toLocaleString()],
    ["Size", (f) => formatSize(f.size)], ["SHA-256", (f) => f.sha256.slice(0, 20) + "…"], ["Note", note],
    ["Confirmed By", (f) => Array.from(new Set(s.confirmations.filter((c) => c.fileVersionId === f.id && c.decision === "confirmed").map((c) => org(c.orgId).short))).join(", ") || "None"],
  ];
  const view = (f: RealFile, url: string) => f.kind === "image"
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={`${f.name} v${f.version}`} className={rc.pane} />
    : f.kind === "pdf" ? <iframe src={url} title={`${f.name} v${f.version}`} className={rc.pane} /> : <div className={rc.pane}>Inline preview is not supported for this file format</div>;
  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={`${css.dialog} ${rc.wide}`} aria-describedby={undefined} data-testid="compare">
          <Dialog.Title className={css.dialogTitle}>{b.name} · v{a.version} → v{b.version}</Dialog.Title>
          <table className={rc.cmp}>
            <thead><tr><th /><th>v{a.version}</th><th>v{b.version}</th></tr></thead>
            <tbody>{rows.map(([k, fn]) => <tr key={k} data-diff={fn(a) !== fn(b)}><th>{k}</th><td>{fn(a)}</td><td>{fn(b)}</td></tr>)}</tbody>
          </table>
          {err && <span className={rc.err}>{err}</span>}
          {urls && <div className={rc.panes}>{view(a, urls[0])}{view(b, urls[1])}</div>}
          <div className={css.dialogActs}><small>Side-by-side view of original files; character-level diff not performed</small><button type="button" className={css.ghost} onClick={onClose}>Close</button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RealPanel({ real }: { real: Real }) {
  const { s, room, user, org, meId, actions } = real;
  const [invite, setInvite] = useState(false), [share, setShare] = useState(""), [preset, setPreset] = useState<SplitSuggestion | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  if (!room) return null;
  const tab = s.panel.tab === "files" || s.panel.tab === "ai" || s.panel.tab === "review" ? s.panel.tab : "people";
  const files = s.files.filter((f) => f.roomId === room.id);
  const lineages = Array.from(new Set(files.map((f) => f.lineage)));
  const turns = s.aiTurns.filter((t) => t.roomId === room.id);
  const proposals = s.proposals.filter((p) => p.roomId === room.id);
  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const admin = room.myRole === "admin";
  const orgAdmin = s.memberships.some((m) => m.orgId === s.orgId && m.role !== "member");
  return (
    <div className={css.panel}>
      <div className={css.panelHead}>
        <div className={css.tabs} role="tablist">
          {([["people", "Members"], ["files", "Files & Confirmations"], ["review", "Review"], ["ai", "AI"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" data-state={tab === k ? "active" : ""} onClick={() => actions.openPanel(k)}>
              <span className={k === "files" ? css.hideNarrow : ""}>{label}</span>
              {k === "files" && <span className={css.onlyNarrow}>Files</span>}
              {k === "files" && files.length > 0 && <i style={{ background: "#575d64" }}>{lineages.length}</i>}
              {k === "review" && pendingProposals.length > 0 && <i style={{ background: "#0d9488" }}>{pendingProposals.length}</i>}
            </button>
          ))}
        </div>
        <button type="button" className={css.iconBtn} onClick={actions.closePanel} aria-label="Close panel"><X size={18} /></button>
      </div>
      <div className={rc.body}>
        {tab === "people" && (
          <>
            {room.purpose && <p className={css.hint}>{room.purpose}</p>}
            <section>
              {Array.from(new Set(room.roomMembers.map((m) => m.orgId))).map((oid) => (
                <div key={oid}>
                  <div className={rc.orgHeadingRow}>
                    <h3>{org(oid).name}</h3>
                    <div className={rc.orgHeadingActs}>
                      <a
                        href={`/companies/${encodeURIComponent(oid)}?fromRoom=${encodeURIComponent(room.id)}`}
                        className={rc.mini}
                        style={{ color: "#0f766e", textDecoration: "none" }}
                        title={`View ${org(oid).name} company profile`}
                        data-testid={`company-profile-link-${oid}`}
                      >
                        Company Profile
                      </a>
                      {oid !== s.orgId && orgAdmin && (
                        <a
                          href={`/project-room-b/network?fromRoom=${encodeURIComponent(room.id)}&counterpartyOrg=${encodeURIComponent(oid)}`}
                          className={rc.mini}
                          style={{ color: "#0f766e", textDecoration: "none" }}
                          title="Save partner to private customer/supplier directory"
                        >
                          <span className={css.hideNarrow}>+ Save to Private CRM</span>
                          <span className={css.onlyNarrow}>+ Private CRM</span>
                        </a>
                      )}
                    </div>
                  </div>
                  {room.roomMembers.filter((m) => m.orgId === oid).map((member) => {
                    const id = member.userId, name = member.displayName ?? user(id).name;
                    return <div key={id} className={css.person}>
                      <OrgMark color={org(oid).color} short={name.slice(0, 1)} size={28} />
                      <span className={rc.grow}><b>{name}{id === meId && <em>You</em>}</b><small>{member.role}</small></span>
                      <a
                        href={`/people/${encodeURIComponent(id)}?fromRoom=${encodeURIComponent(room.id)}`}
                        className={rc.mini}
                        style={{ color: "#0f766e", textDecoration: "none" }}
                        title={`View ${name}'s personal card`}
                        data-testid={`person-card-link-${id}`}
                      >
                        Personal Card
                      </a>
                      {admin && id !== meId && <button type="button" className={rc.mini} data-danger onClick={() => { if (window.confirm(`Are you sure you want to remove member ${name} from this room?`)) void actions.removeMember(id).catch(() => null); }}>Remove</button>}
                      {orgAdmin && oid === s.orgId && id !== meId && <button type="button" className={rc.mini} data-danger onClick={() => { if (window.confirm(`Are you sure you want to remove member ${name} from the organization?`)) void actions.removeFromOrganization(id).catch(() => null); }}>Remove from Org</button>}
                    </div>;
                  })}
                </div>
              ))}
            </section>
            {admin && <button type="button" className={css.primary} onClick={() => setInvite(true)}><UserPlus size={15} />Invite</button>}
            {s.colleagues.filter((c) => c.orgId === s.orgId && !room.memberIds.includes(c.userId)).map((c) => (
              <div key={c.userId} className={css.person}><span className={rc.grow}><b>{c.name}</b><small>{org(c.orgId).short} · Not in this room</small></span>{admin && <button type="button" className={rc.mini} onClick={() => void actions.addMember(c.userId, c.orgId).catch(() => null)}>Join</button>}</div>
            ))}
            {room.parentId && (
              <section className={rc.stack}>
                <h3>Send back to Main Room</h3>
                <textarea value={share} onChange={(e) => setShare(e.target.value)} placeholder="Progress updates or conclusions for the main room" aria-label="Content to send back to main room" />
                <button
                  type="button"
                  className={css.ghost}
                  disabled={!share.trim()}
                  onClick={async () => {
                    const parentRoom = s.rooms.find((r) => r.id === room.parentId);
                    let destOrgs = parentRoom
                      ? Array.from(new Set(parentRoom.roomMembers.map((m) => m.orgId))).map((oid) => org(oid).name).join(", ")
                      : "Main Room counterparties";
                    let digest: string | undefined;
                    try {
                      const aud = (await actions.getRoomAudience(room.id)) as { orgs?: { name: string }[]; digest?: string };
                      if (aud?.orgs?.length) {
                        destOrgs = aud.orgs.map((o) => o.name).join(", ");
                      }
                      if (aud?.digest) digest = aud.digest;
                    } catch {
                      // fallback
                    }
                    if (window.confirm(`Send summary to Main Room?\n\nThis summary will be visible to external organizations:\n${destOrgs}\n\nOnce posted, it becomes an immutable part of the main room audit chain.`)) {
                      void actions.shareToParent(share.trim(), digest).then(() => setShare("")).catch(() => null);
                    }
                  }}
                >
                  Send to Main Room
                </button>
              </section>
            )}
            <button type="button" className={css.ghost} onClick={() => void actions.exportEvidence().catch(() => null)}><Download size={15} />Export Evidence (JSON)</button>
            <Invite real={real} open={invite} onClose={() => setInvite(false)} />
          </>
        )}
        {tab === "files" && (
          <>
            <input ref={pick} type="file" hidden data-testid="version-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void actions.send("", f, target.current ?? undefined); e.target.value = ""; }} />
            {lineages.length === 0 && <p className={css.hint}>Send a file in chat, and it will appear here.</p>}
            {lineages.map((name) => {
              const vs = files.filter((f) => f.lineage === name).sort((a, b) => b.version - a.version);
              return (
                <section key={name} className={rc.stack}>
                  <div className={rc.row}><h3 className={rc.grow} style={{ margin: 0 }}>{name}</h3><button type="button" className={rc.mini} onClick={() => { target.current = name; pick.current?.click(); }}><FileUp size={13} />Upload New Version</button></div>
                  {vs.map((f, i) => <FileCard key={f.id} real={real} f={f} latest={i === 0} />)}
                </section>
              );
            })}
          </>
        )}
        {tab === "review" && (
          <>
            <div className={rc.row}>
              <span className={`${css.hint} ${rc.grow}`}>AI Structured Items · Human Review Required</span>
            </div>
            {proposals.length === 0 && (
              <p className={css.hint}>No items pending review or requiring decision in this room.</p>
            )}
            {proposals.map((p) => (
              <div key={p.id} className={css.card} data-testid="proposal-card" style={{ marginBottom: 12 }}>
                <h4>{p.title}</h4>
                {p.detail && <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{p.detail}</p>}
                <div className={rc.chips}>
                  {p.sources.filter(Boolean).map((id, i) => (
                    <button key={id} type="button" className={rc.chip} onClick={() => actions.jumpTo(id)}>
                      Source message {i + 1}
                    </button>
                  ))}
                </div>
                {p.status === "pending" ? (
                  p.forOrgId && p.forOrgId !== s.orgId ? (
                    <div className={rc.row} style={{ marginTop: 10 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Pending partner organization ({org(p.forOrgId).name}) review & confirmation
                      </span>
                    </div>
                  ) : (
                    <div className={rc.row} style={{ marginTop: 10, gap: 8 }}>
                      <button
                        type="button"
                        className={rc.mini}
                        data-primary="true"
                        onClick={(event) => {
                          if (event.detail <= 1) void actions.review(p.id, "confirmed");
                        }}
                      >
                        <Check size={13} /> Confirm Item
                      </button>
                      <button
                        type="button"
                        className={rc.mini}
                        onClick={(event) => {
                          if (event.detail <= 1) void actions.review(p.id, "rejected");
                        }}
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )
                ) : (
                  <div className={rc.row} style={{ marginTop: 10, color: p.status === "confirmed" ? "#0f766e" : "#b91c1c", fontSize: 13, fontWeight: 600 }}>
                    {p.status === "confirmed" ? "✓ Confirmed & filed as canonical evidence" : "✕ Rejected"}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        {tab === "ai" && (
          <>
            <div className={rc.row}>
              <span className={`${css.hint} ${rc.grow}`}><LockKeyhole size={12} />Visible only to you · Read-only for this room</span>
              <button type="button" className={rc.mini} onClick={() => void actions.ask({ type: "room", id: room.id }, "Summarize this room", "summary")}><Sparkles size={13} />Summarize</button>
              {!room.parentId && <button type="button" className={rc.mini} onClick={() => void actions.ask({ type: "room", id: room.id }, "Should this room be split into sub-rooms?", "split")}><GitBranch size={13} />Suggest Split</button>}
            </div>
            {s.splits.filter((x) => x.roomId === room.id).map((x) => (
              <div key={x.id} className={css.card} data-testid="split-suggestion">
                <h4>{x.kind === "internal" ? <LockKeyhole size={13} /> : <Hash size={13} />} {x.name}</h4>
                <p>{x.purpose}</p>
                {x.memberNames.length > 0 && <p>Members: {x.memberNames.join(", ")}</p>}
                {x.fileNames.length > 0 && <p>Files: {x.fileNames.join(", ")}</p>}
                <p>{x.kind === "internal" ? "Visible to this organization only" : "Visible to selected members only"}</p>
                <div className={rc.chips}>{x.sources.map((id, i) => <button key={id} type="button" className={rc.chip} onClick={() => actions.jumpTo(id)}>Source {i + 1}</button>)}</div>
                <div className={rc.row} style={{ marginTop: 8 }}>
                  <button type="button" className={rc.mini} data-primary onClick={() => setPreset(x)}>Create…</button>
                  <button type="button" className={rc.mini} onClick={() => actions.dismissSplit(x.id)}>Dismiss</button>
                </div>
              </div>
            ))}
            {turns.length === 0 && <p className={css.hint}>Click &ldquo;Ask AI&rdquo; or &ldquo;Translate&rdquo; on any message.</p>}
            {turns.map((t) => (
              <div key={t.id} className={css.card} data-testid="ai-turn">
                <h4>{t.question}</h4>
                <p style={{ whiteSpace: "pre-wrap" }}>{t.answer ? t.answer.answer : "…"}</p>
                {(s.aiSections[t.id] ?? []).map((sec) => (
                  <div key={sec.title} style={{ marginTop: 8 }}>
                    <h3>{sec.title}</h3>
                    {sec.items.map((it, i) => (
                      <p key={i}>· {it.text} {it.sources.map((id, j) => <button key={id + j} type="button" className={rc.chip} onClick={() => actions.jumpTo(id)}>Source</button>)}</p>
                    ))}
                  </div>
                ))}
                {t.answer && t.answer.sources.length > 0 && <div className={rc.chips}>{t.answer.sources.map((id, i) => <button key={id} type="button" className={rc.chip} onClick={() => actions.jumpTo(id)}>Source {i + 1}</button>)}</div>}
                {t.answer && <button type="button" className={rc.mini} style={{ marginTop: 8 }} onClick={() => actions.insertDraft(t.answer!.answer)}>Put into composer</button>}
              </div>
            ))}
            {preset && <NewSubRoom key={preset.id} real={real} open onClose={() => { setPreset(null); }} preset={preset} />}
          </>
        )}
      </div>
    </div>
  );
}
