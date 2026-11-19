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
    <nav className={css.side} aria-label="Organizations and chat rooms">
      <div className={css.sideTop}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={css.orgSwitch} aria-label={`Current organization ${myOrg.name}, switch organization`}>
              <OrgMark color={myOrg.color} short={myOrg.short} size={30} />
              <span><b>{myOrg.name}</b><small>{me.name} · {me.title}</small></span>
              <ChevronsUpDown size={16} aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={css.menu} align="start" sideOffset={6}>
              <DropdownMenu.Label className={css.menuLabel}>Switch working identity (Demo accounts)</DropdownMenu.Label>
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
        <button type="button" className={css.iconBtn} onClick={() => setCreating(true)} aria-label="New room"><Plus size={20} /></button>
      </div>

      <label className={css.sideSearch}>
        <Search size={16} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms, projects, contacts" aria-label="Search rooms" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><X size={14} /></button>}
      </label>

      <div className={css.filters} role="tablist" aria-label="Filter rooms">
        {([["all", "All", 0], ["needs", "Action Needed", totalNeeds], ["unread", "Unread", totalUnread]] as const).map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} data-on={filter === k} data-kind={k} onClick={() => setFilter(k)}>
            {label}{n > 0 && <i>{n}</i>}
          </button>
        ))}
      </div>

      <div className={css.rooms}>
        {groups.length === 0 && <p className={css.none}>No matching rooms</p>}
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
                        {last ? `${last.userId === meId ? "You" : user(last.userId).name}: ${last.text ?? lastFile?.name ?? "Voice message"}` : "No messages yet"}
                      </span>
                      {n > 0 && <i className={css.needDot} title={`${n} items need your action`}>{n}</i>}
                      {unread > 0 && <i className={css.badge}>{unread}</i>}
                    </span>
                    <span className={css.roomOrgs}>
                      {r.kind === "internal" ? <em>Internal</em> : partners.map((o) => <span key={o.id}><OrgMark color={o.color} short={o.short} size={12} />{o.short}</span>)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={css.sideFoot}>
        <span>DEMO Data · Disconnected</span>
        <Link href="/project-room">Existing Project Room →</Link>
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
          <Dialog.Title className={css.dialogTitle}>New Room</Dialog.Title>
          <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; actions.createRoom(name.trim(), kind, invite || null); setName(""); setInvite(""); onClose(); }}>
            <input className={css.field} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name, e.g. Inspection Report Review" aria-label="Room Name" />
            <div className={css.kindPick}>
              <button type="button" data-on={kind === "external"} onClick={() => setKind("external")}><Hash size={16} /><b>Cross-Company</b><small>Invite other organizations to collaborate</small></button>
              <button type="button" data-on={kind === "internal"} data-internal onClick={() => setKind("internal")}><LockKeyhole size={16} /><b>Internal</b><small>Visible to {org(s.orgId).short} members only</small></button>
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
              <small>Demo: created locally on page; no real invitations sent</small>
              <button type="button" className={css.ghost} onClick={onClose}>Cancel</button>
              <button type="submit" className={css.primary} disabled={!name.trim()}>Create</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
