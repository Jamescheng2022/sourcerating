"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown, CornerDownRight, Download, FileUp, FolderPlus, GitBranch, Hash, LockKeyhole, LogOut, Plus, Send, ShieldCheck, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { OrgMark } from "../project-room-lab/message";
import { formatSize, timeOf } from "../project-room-lab/demo/adapter";
import css from "../project-room-lab/lab.module.css";
import rc from "./real.module.css";
import type { Real, RealFile } from "./use-real";

const msg = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

export function AuthGate({ real, inviteToken }: { real: Real; inviteToken: string | null }) {
  const [mode, setMode] = useState<"in" | "up">(inviteToken ? "up" : "in");
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setNote(""); setBusy(true);
    try {
      if (mode === "in") await real.actions.signIn(email, pw);
      else if (!(await real.actions.signUp(email, pw))) setNote("确认邮件已发出。点邮件里的链接后回到这里登录。");
    } catch (x) { setErr(msg(x)); } finally { setBusy(false); }
  };
  return (
    <main className={rc.gate}>
      <form className={rc.box} onSubmit={go}>
        <span className={rc.tag}>STAGING · 测试环境</span>
        <h1>SourceRating</h1>
        {inviteToken && <p>你收到一个项目邀请。用被邀请的邮箱{mode === "up" ? "注册" : "登录"}后加入。</p>}
        <input type="email" required autoComplete="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="邮箱" />
        <input type="password" required minLength={10} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="密码（至少 10 位）" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="密码" />
        {err && <span className={rc.err} role="alert">{err}</span>}
        {note && <p role="status">{note}</p>}
        <button className={rc.go} disabled={busy}>{mode === "in" ? "登录" : "注册"}</button>
        <button type="button" className={rc.link} onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "没有账号？注册" : "已有账号？登录"}</button>
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
        <span className={rc.tag}>STAGING · 测试环境</span>
        {inviteToken ? (
          <>
            <h1>{info ? info.project_name : "项目邀请"}</h1>
            {info && <p>{info.invited_by} 邀请你加入「{info.room_name}」{colleague ? `，作为 ${info.organization_name} 的成员` : ""}</p>}
            {info && info.state !== "open" && <span className={rc.err}>邀请已{info.state === "used" ? "使用" : info.state === "revoked" ? "撤销" : "过期"}</span>}
          </>
        ) : <h1>创建你的组织</h1>}
        {open && !colleague && admin.length > 0 && inviteToken && (
          <div className={rc.stack}>
            {admin.map((m) => (
              <button key={m.orgId} type="button" className={rc.mini} data-primary={useOrg === m.orgId} onClick={() => setUseOrg(useOrg === m.orgId ? "" : m.orgId)}>
                {useOrg === m.orgId && <Check size={14} />}以 {org(m.orgId).name} 加入
              </button>
            ))}
          </div>
        )}
        {open && !colleague && !useOrg && <input required minLength={2} placeholder="组织名称" value={orgName} onChange={(e) => setOrgName(e.target.value)} aria-label="组织名称" />}
        {open && <input required={!useOrg} placeholder="你的姓名" value={me} onChange={(e) => setMe(e.target.value)} aria-label="你的姓名" />}
        {err && <span className={rc.err} role="alert">{err}</span>}
        {open && <button className={rc.go} disabled={busy || (!!inviteToken && !info)}>{inviteToken ? "加入" : "创建"}</button>}
        <button type="button" className={rc.link} onClick={() => (inviteToken && s.memberships.length ? onDone() : actions.signOut())}>{inviteToken && s.memberships.length ? "稍后" : `退出 ${s.me?.email ?? ""}`}</button>
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
    <Modal open={open} onClose={onClose} title="新建项目">
      <form className={rc.stack} onSubmit={async (e) => { e.preventDefault(); await real.actions.createProject(name.trim(), "participant").then(() => { setName(""); onClose(); }).catch(() => null); }}>
        <input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="项目名称" aria-label="项目名称" />
        <div className={css.dialogActs}><small /><button type="button" className={css.ghost} onClick={onClose}>取消</button><button className={css.primary} disabled={name.trim().length < 2}>创建</button></div>
      </form>
    </Modal>
  );
}

export function NewSubRoom({ real, open, onClose }: { real: Real; open: boolean; onClose: () => void }) {
  const { s, room, user, org, actions } = real;
  const [name, setName] = useState(""), [purpose, setPurpose] = useState(""), [kind, setKind] = useState<"external" | "internal">("external"), [picked, setPicked] = useState<string[]>([]);
  const parent = s.rooms.find((r) => r.id === (room?.parentId ?? room?.id));
  const candidates = useMemo(() => {
    const ids = new Set<string>(parent?.memberIds ?? []);
    s.colleagues.filter((c) => c.orgId === s.orgId).forEach((c) => ids.add(c.userId));
    ids.delete(s.me?.id ?? "");
    return Array.from(ids).map(user).filter((u) => kind === "external" || u.orgId === s.orgId);
  }, [parent, s.colleagues, s.orgId, s.me, user, kind]);
  if (!parent) return null;
  return (
    <Modal open={open} onClose={onClose} title={`「${parent.name}」下新建子房间`}>
      <form className={rc.stack} onSubmit={async (e) => { e.preventDefault(); await actions.createSubRoom(name.trim(), purpose.trim(), kind, picked.filter((id) => candidates.some((c) => c.id === id))).then(() => { setName(""); setPurpose(""); setPicked([]); onClose(); }).catch(() => null); }}>
        <input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="名称，例如：运输与清关" aria-label="子房间名称" />
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="目的（可选）" aria-label="目的" />
        <div className={css.kindPick}>
          <button type="button" data-on={kind === "external"} onClick={() => setKind("external")}><Hash size={16} /><b>跨企业</b><small>只有选中的人可见</small></button>
          <button type="button" data-on={kind === "internal"} data-internal onClick={() => setKind("internal")}><LockKeyhole size={16} /><b>内部</b><small>仅 {org(s.orgId).short}</small></button>
        </div>
        <div className={css.invitePick}>
          {candidates.map((u) => (
            <button key={u.id} type="button" data-on={picked.includes(u.id)} onClick={() => setPicked((p) => (p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id]))}>
              <OrgMark color={org(u.orgId).color} short={org(u.orgId).short} size={18} />{u.name}
            </button>
          ))}
        </div>
        <div className={css.dialogActs}><small>不会复制主房间的消息和文件</small><button type="button" className={css.ghost} onClick={onClose}>取消</button><button className={css.primary} disabled={name.trim().length < 2}>创建</button></div>
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
    <Modal open={open} onClose={() => { setLink(""); onClose(); }} title="邀请">
      {link ? (
        <div className={rc.stack}>
          <p className={css.hint}>把链接发给 {email}。只有这个邮箱能使用，7 天内有效。</p>
          <div className={rc.copy} data-testid="invite-link">{link}</div>
          <div className={css.dialogActs}><small /><button type="button" className={css.primary} onClick={() => { void navigator.clipboard?.writeText(link); }}>复制链接</button></div>
        </div>
      ) : (
        <form className={rc.stack} onSubmit={async (e) => { e.preventDefault(); await actions.invite(email.trim(), k, orgName.trim()).then(setLink).catch(() => null); }}>
          {!internal && (
            <div className={css.kindPick}>
              <button type="button" data-on={k === "organization"} onClick={() => setKind("organization")}><Hash size={16} /><b>另一家企业</b><small>对方用自己的组织加入</small></button>
              <button type="button" data-on={k === "org_member"} onClick={() => setKind("org_member")}><UserPlus size={16} /><b>我方同事</b><small>加入 {org(s.orgId).short}</small></button>
            </div>
          )}
          <input autoFocus type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="对方邮箱" aria-label="对方邮箱" />
          {k === "organization" && <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="对方企业名称（可选）" aria-label="对方企业名称" />}
          <div className={css.dialogActs}><small /><button type="button" className={css.ghost} onClick={onClose}>取消</button><button className={css.primary}>生成邀请链接</button></div>
        </form>
      )}
    </Modal>
  );
}

export function RealSidebar({ real, onOpen }: { real: Real; onOpen: (id: string) => void }) {
  const { s, myRooms, room, user, org, meId, actions } = real;
  const [dlg, setDlg] = useState<"project" | "sub" | null>(null);
  const myOrg = org(s.orgId);
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rooms: typeof myRooms }>();
    for (const r of myRooms) { const g = map.get(r.projectId) ?? { name: r.project, rooms: [] }; g.rooms.push(r); map.set(r.projectId, g); }
    return Array.from(map.values()).map((g) => ({ ...g, rooms: [...g.rooms.filter((r) => !r.parentId), ...g.rooms.filter((r) => r.parentId)] }));
  }, [myRooms]);
  return (
    <nav className={css.side} aria-label="组织与聊天房间">
      <div className={css.sideTop}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={css.orgSwitch} aria-label={`当前组织 ${myOrg.name}`}>
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
              <DropdownMenu.Item className={css.menuItem} onSelect={() => void actions.signOut()}><LogOut size={15} />退出登录</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild><button type="button" className={css.iconBtn} aria-label="新建"><Plus size={20} /></button></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={css.menu} align="end" sideOffset={6}>
              <DropdownMenu.Item className={css.menuItem} onSelect={() => setDlg("project")}><FolderPlus size={15} />新建项目</DropdownMenu.Item>
              {room && <DropdownMenu.Item className={css.menuItem} onSelect={() => setDlg("sub")}><GitBranch size={15} />新建子房间</DropdownMenu.Item>}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <div className={css.rooms}>
        {groups.length === 0 && <p className={css.none}>还没有项目。点右上角 + 新建。</p>}
        {groups.map((g) => (
          <div key={g.name + g.rooms[0].id} className={css.group}>
            <h3>{g.name}</h3>
            {g.rooms.map((r) => {
              const last = (s.messages[r.id] ?? []).at(-1);
              const unread = r.unread[s.orgId] ?? 0;
              const partners = Array.from(new Set(r.memberIds.map((id) => user(id).orgId))).filter((o) => o && o !== s.orgId).map(org);
              return (
                <button key={r.id} type="button" className={`${css.room} ${r.parentId ? rc.sub : ""}`} data-active={r.id === room?.id} data-internal={r.kind === "internal"} onClick={() => onOpen(r.id)} data-testid="room">
                  <span className={css.roomIcon}>{r.kind === "internal" ? <LockKeyhole size={16} /> : r.parentId ? <CornerDownRight size={16} /> : <Hash size={16} />}</span>
                  <span className={css.roomMain}>
                    <span className={css.roomLine}><b>{r.name}</b>{last && <time>{timeOf(last.at)}</time>}</span>
                    <span className={css.roomLine}>
                      <span className={css.preview}>{last ? `${last.userId === meId ? "你" : user(last.userId).name}：${last.text ?? "文件"}` : r.purpose ?? (r.parentId ? "子房间" : "主房间")}</span>
                      {unread > 0 && <i className={css.badge}>{unread}</i>}
                    </span>
                    <span className={css.roomOrgs}>{r.kind === "internal" ? <em>内部</em> : partners.map((o) => <span key={o.id}><OrgMark color={o.color} short={o.short} size={12} />{o.short}</span>)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={css.sideFoot}><span>STAGING · 真实后端（测试库）</span></div>
      <NewProject real={real} open={dlg === "project"} onClose={() => setDlg(null)} />
      <NewSubRoom real={real} open={dlg === "sub"} onClose={() => setDlg(null)} />
    </nav>
  );
}

function FileCard({ real, f, latest }: { real: Real; f: RealFile; latest: boolean }) {
  const { s, user, org, room, actions } = real;
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const orgIds = Array.from(new Set((room?.memberIds ?? []).map((id) => user(id).orgId).filter(Boolean)));
  const state = (orgId: string) => s.confirmations.filter((c) => c.fileVersionId === f.id && c.orgId === orgId).at(-1);
  const mine = state(s.orgId);
  const act = (fn: () => Promise<unknown>) => async () => { setBusy(true); setErr(""); try { await fn(); setNote(""); } catch (x) { setErr(msg(x)); } finally { setBusy(false); } };
  return (
    <article className={rc.file} data-old={!latest} data-testid="file-version">
      <header><span className={rc.ver}>v{f.version}</span><b className={rc.grow}>{f.name}</b>{!latest && <span className={css.hint}>旧版</span>}</header>
      <span className={css.hint}>{user(f.uploaderUserId).name} · {org(f.uploaderOrgId).short} · {new Date(f.createdAt).toLocaleString()} · {formatSize(f.size)}</span>
      <span className={rc.sha} title={f.sha256}>SHA-256 {f.sha256.slice(0, 16)}… · {f.verification}</span>
      <div className={rc.chips}>
        {orgIds.map((id) => { const c = state(id); return <span key={id} className={rc.chip} data-d={c?.decision} title={c ? `${user(c.userId).name} · ${new Date(c.at).toLocaleString()}${c.comment ? ` · ${c.comment}` : ""}` : "尚未确认"}>{c?.decision === "confirmed" && <Check size={12} />}{org(id).short}{c ? (c.decision === "confirmed" ? " 已确认" : " 要求修改") : " 未确认"}</span>; })}
      </div>
      {mine?.decision !== "confirmed" && (
        <div className={rc.row}>
          <input className={`${css.field} ${rc.grow}`} style={{ height: 32, fontSize: 13 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="意见（可选）" aria-label="确认意见" />
          <button type="button" className={rc.mini} data-primary disabled={busy} onClick={act(() => actions.confirmFile(f, "confirmed", note))}><ShieldCheck size={14} />确认此版本</button>
          <button type="button" className={rc.mini} disabled={busy} onClick={act(() => actions.confirmFile(f, "changes_requested", note))}>要求修改</button>
        </div>
      )}
      <div className={rc.row}>
        <button type="button" className={rc.mini} disabled={busy} onClick={act(() => actions.requestReview(f.id, note))}><Send size={13} />请各方审核</button>
        <button type="button" className={rc.mini} disabled={busy} onClick={act(async () => { window.open(await actions.fileUrl(f.id), "_blank", "noopener"); })}><Download size={13} />下载</button>
        {f.sourceEventId && <button type="button" className={rc.mini} onClick={() => actions.jumpTo(f.sourceEventId!)}>来源消息</button>}
      </div>
      {err && <span className={rc.err}>{err}</span>}
    </article>
  );
}

export function RealPanel({ real }: { real: Real }) {
  const { s, room, user, org, meId, actions } = real;
  const [invite, setInvite] = useState(false), [share, setShare] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  if (!room) return null;
  const tab = s.panel.tab === "files" || s.panel.tab === "ai" ? s.panel.tab : "people";
  const files = s.files.filter((f) => f.roomId === room.id);
  const lineages = Array.from(new Set(files.map((f) => f.lineage)));
  const turns = s.aiTurns.filter((t) => t.roomId === room.id);
  const admin = room.myRole === "admin";
  return (
    <div className={css.panel}>
      <div className={css.panelHead}>
        <div className={css.tabs} role="tablist">
          {([["people", "成员"], ["files", "文件与确认"], ["ai", "AI"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" data-state={tab === k ? "active" : ""} onClick={() => actions.openPanel(k)}>{label}{k === "files" && files.length > 0 && <i style={{ background: "#575d64" }}>{lineages.length}</i>}</button>
          ))}
        </div>
        <button type="button" className={css.iconBtn} onClick={actions.closePanel} aria-label="关闭面板"><X size={18} /></button>
      </div>
      <div className={rc.body}>
        {tab === "people" && (
          <>
            {room.purpose && <p className={css.hint}>{room.purpose}</p>}
            <section>
              {Array.from(new Set(room.memberIds.map((id) => user(id).orgId))).map((oid) => (
                <div key={oid}>
                  <h3>{org(oid).name}</h3>
                  {room.memberIds.filter((id) => user(id).orgId === oid).map((id) => (
                    <div key={id} className={css.person}>
                      <OrgMark color={org(oid).color} short={user(id).name.slice(0, 1)} size={28} />
                      <span className={rc.grow}><b>{user(id).name}{id === meId && <em>你</em>}</b><small>{user(id).title}</small></span>
                      {admin && id !== meId && <button type="button" className={rc.mini} data-danger onClick={() => void actions.removeMember(id).catch(() => null)}>移出</button>}
                    </div>
                  ))}
                </div>
              ))}
            </section>
            {admin && <button type="button" className={css.primary} onClick={() => setInvite(true)}><UserPlus size={15} />邀请</button>}
            {s.colleagues.filter((c) => c.orgId === s.orgId && !room.memberIds.includes(c.userId)).map((c) => (
              <div key={c.userId} className={css.person}><span className={rc.grow}><b>{c.name}</b><small>{org(c.orgId).short} · 不在此房间</small></span>{admin && <button type="button" className={rc.mini} onClick={() => void actions.addMember(c.userId, c.orgId).catch(() => null)}>加入</button>}</div>
            ))}
            {room.parentId && (
              <section className={rc.stack}>
                <h3>发回主房间</h3>
                <textarea value={share} onChange={(e) => setShare(e.target.value)} placeholder="写给主房间的进度或结论" aria-label="发回主房间的内容" />
                <button type="button" className={css.ghost} disabled={!share.trim()} onClick={() => void actions.shareToParent(share.trim()).then(() => setShare("")).catch(() => null)}>发送到主房间</button>
              </section>
            )}
            <button type="button" className={css.ghost} onClick={() => void actions.exportEvidence().catch(() => null)}><Download size={15} />导出证据（JSON）</button>
            <Invite real={real} open={invite} onClose={() => setInvite(false)} />
          </>
        )}
        {tab === "files" && (
          <>
            <input ref={pick} type="file" hidden data-testid="version-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void actions.send("", f, target.current ?? undefined); e.target.value = ""; }} />
            {lineages.length === 0 && <p className={css.hint}>在聊天里发一个文件，它会出现在这里。</p>}
            {lineages.map((name) => {
              const vs = files.filter((f) => f.lineage === name).sort((a, b) => b.version - a.version);
              return (
                <section key={name} className={rc.stack}>
                  <div className={rc.row}><h3 className={rc.grow} style={{ margin: 0 }}>{name}</h3><button type="button" className={rc.mini} onClick={() => { target.current = name; pick.current?.click(); }}><FileUp size={13} />上传新版本</button></div>
                  {vs.map((f, i) => <FileCard key={f.id} real={real} f={f} latest={i === 0} />)}
                </section>
              );
            })}
          </>
        )}
        {tab === "ai" && (
          <>
            <p className={css.hint}><LockKeyhole size={12} />仅你可见</p>
            {turns.length === 0 && <p className={css.hint}>在消息上点「问 AI」。</p>}
            {turns.map((t) => (<div key={t.id} className={css.card}><h4>{t.question}</h4><p>{t.answer ? t.answer.answer : "…"}</p></div>))}
          </>
        )}
      </div>
    </div>
  );
}
