"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown, Hash, LockKeyhole, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fixture, timeOf } from "./demo/adapter";
import { OrgMark } from "./message";
import type { Lab } from "./use-lab";
import css from "./lab.module.css";

type Filter = "all" | "needs" | "unread";

export function Sidebar({ lab, onOpen }: { lab: Lab; onOpen: (roomId: string) => void }) {
  const { s, myRooms, room, meId, user, org, actions } = lab;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const me = user(meId);
  const myOrg = org(s.orgId);

  const needs = (roomId: string) => s.proposals.filter((p) => p.roomId === roomId && p.status === "pending" && p.forOrgId === s.orgId).length;
  const totalNeeds = myRooms.reduce((n, r) => n + needs(r.id), 0);
  const totalUnread = myRooms.reduce((n, r) => n + (r.unread[s.orgId] ?? 0), 0);

  const groups = useMemo(() => {
    const k = q.trim().toLowerCase();
    const list = myRooms.filter((r) => {
      if (filter === "needs" && !needs(r.id)) return false;
      if (filter === "unread" && !(r.unread[s.orgId] ?? 0)) return false;
      if (!k) return true;
      const names = r.memberIds.map((id) => `${user(id).name} ${org(user(id).orgId).name} ${org(user(id).orgId).short}`).join(" ");
      return `${r.name} ${r.project} ${names}`.toLowerCase().includes(k);
    });
    const map = new Map<string, typeof list>();
    for (const r of list) map.set(r.project, [...(map.get(r.project) ?? []), r]);
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRooms, q, filter, s.proposals, s.orgId]);

  return (
    <nav className={css.side} aria-label="组织与聊天房间">
      <div className={css.sideTop}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={css.orgSwitch} aria-label={`当前组织 ${myOrg.name}，切换组织`}>
              <OrgMark color={myOrg.color} short={myOrg.short} size={30} />
              <span><b>{myOrg.name}</b><small>{me.name} · {me.title}</small></span>
              <ChevronsUpDown size={16} aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={css.menu} align="start" sideOffset={6}>
              <DropdownMenu.Label className={css.menuLabel}>切换工作身份（演示账号）</DropdownMenu.Label>
              {fixture.identities.map((i) => {
                const o = org(i.orgId);
                return (
                  <DropdownMenu.Item key={i.orgId} className={css.menuItem} onSelect={() => actions.switchOrg(i.orgId)}>
                    <OrgMark color={o.color} short={o.short} size={22} />
                    <span className={css.menuTwo}><b>{o.name}</b><small>{user(i.userId).name} · {o.place}</small></span>
                    {i.orgId === s.orgId && <Check size={15} />}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <button type="button" className={css.iconBtn} onClick={() => setCreating(true)} aria-label="新建房间"><Plus size={20} /></button>
      </div>

      <label className={css.sideSearch}>
        <Search size={16} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索房间、项目、联系人" aria-label="搜索房间" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="清除搜索"><X size={14} /></button>}
      </label>

      <div className={css.filters} role="tablist" aria-label="筛选房间">
        {([["all", "全部", 0], ["needs", "待你处理", totalNeeds], ["unread", "未读", totalUnread]] as const).map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} data-on={filter === k} data-kind={k} onClick={() => setFilter(k)}>
            {label}{n > 0 && <i>{n}</i>}
          </button>
        ))}
      </div>

      <div className={css.rooms}>
        {groups.length === 0 && <p className={css.none}>没有匹配的房间</p>}
        {groups.map(([project, list]) => (
          <div key={project} className={css.group}>
            <h3>{project}</h3>
            {list.map((r) => {
              const last = (s.messages[r.id] ?? []).at(-1);
              const lastFile = last?.fileId ? s.files.find((f) => f.id === last.fileId) : undefined;
              const unread = r.unread[s.orgId] ?? 0;
              const n = needs(r.id);
              const partners = Array.from(new Set(r.memberIds.map((id) => user(id).orgId))).filter((o) => o !== s.orgId).map(org);
              return (
                <button key={r.id} type="button" className={css.room} data-active={r.id === room.id} data-internal={r.kind === "internal"} onClick={() => onOpen(r.id)}>
                  <span className={css.roomIcon}>{r.kind === "internal" ? <LockKeyhole size={16} /> : <Hash size={16} />}</span>
                  <span className={css.roomMain}>
                    <span className={css.roomLine}>
                      <b>{r.name}</b>
                      {last && <time>{timeOf(last.at)}</time>}
                    </span>
                    <span className={css.roomLine}>
                      <span className={css.preview}>
                        {last ? `${last.userId === meId ? "你" : user(last.userId).name}：${last.text ?? lastFile?.name ?? "语音消息"}` : "还没有消息"}
                      </span>
                      {n > 0 && <i className={css.needDot} title={`${n} 项待你处理`}>{n}</i>}
                      {unread > 0 && <i className={css.badge}>{unread}</i>}
                    </span>
                    <span className={css.roomOrgs}>
                      {r.kind === "internal" ? <em>内部</em> : partners.map((o) => <span key={o.id}><OrgMark color={o.color} short={o.short} size={12} />{o.short}</span>)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={css.sideFoot}>
        <span>DEMO 数据 · 未连接后端</span>
        <Link href="/project-room">现有 Project Room →</Link>
      </div>

      <NewRoom open={creating} onClose={() => setCreating(false)} lab={lab} />
    </nav>
  );
}

function NewRoom({ open, onClose, lab }: { open: boolean; onClose: () => void; lab: Lab }) {
  const { s, org, actions } = lab;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"external" | "internal">("external");
  const [invite, setInvite] = useState<string>("");
  const others = fixture.orgs.filter((o) => o.id !== s.orgId);
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.dialog} aria-describedby={undefined}>
          <Dialog.Title className={css.dialogTitle}>新建房间</Dialog.Title>
          <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; actions.createRoom(name.trim(), kind, invite || null); setName(""); setInvite(""); onClose(); }}>
            <input className={css.field} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="房间名称，例如：检测报告审查" aria-label="房间名称" />
            <div className={css.kindPick}>
              <button type="button" data-on={kind === "external"} onClick={() => setKind("external")}><Hash size={16} /><b>跨企业</b><small>邀请其他组织一起工作</small></button>
              <button type="button" data-on={kind === "internal"} data-internal onClick={() => setKind("internal")}><LockKeyhole size={16} /><b>内部</b><small>仅 {org(s.orgId).short} 成员可见</small></button>
            </div>
            {kind === "external" && (
              <div className={css.invitePick}>
                {others.map((o) => (
                  <button key={o.id} type="button" data-on={invite === o.id} onClick={() => setInvite(invite === o.id ? "" : o.id)}>
                    <OrgMark color={o.color} short={o.short} size={18} />{o.name}
                  </button>
                ))}
              </div>
            )}
            <div className={css.dialogActs}>
              <small>演示：只在本页创建，不发送真实邀请</small>
              <button type="button" className={css.ghost} onClick={onClose}>取消</button>
              <button type="submit" className={css.primary} disabled={!name.trim()}>创建</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
