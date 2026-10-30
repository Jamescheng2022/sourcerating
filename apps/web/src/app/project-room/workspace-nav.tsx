"use client";

import {
  Building2,
  ChevronLeft,
  Hash,
  LockKeyhole,
  LogOut,
  PanelLeftOpen,
  Search,
  Settings2,
} from "lucide-react";
import type { Room } from "@/lib/demo-session";
import styles from "./workspace.module.css";

export function WorkspaceNav({
  rooms,
  activeId,
  activity,
  projectName,
  role,
  collapsed,
  query,
  onQuery,
  onSelect,
  onCollapse,
  onSettings,
  onSignOut,
  signingOut,
}: {
  rooms: Room[];
  activeId: string;
  activity: Record<string, number>;
  projectName: string;
  role: string;
  collapsed: boolean;
  query: string;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onCollapse: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const filtered = rooms.filter((room) =>
    room.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <nav
      aria-label="工作空间和聊天室"
      className={`${styles.navigation} ${collapsed ? styles.navCollapsed : ""}`}
    >
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          S<span>·</span>
        </span>
        {!collapsed && (
          <strong>
            SourceRating<span>PROJECT WORKSPACE</span>
          </strong>
        )}
        <button
          aria-label={collapsed ? "展开菜单" : "折叠菜单"}
          title={collapsed ? "展开菜单" : "折叠菜单"}
          onClick={onCollapse}
          className={styles.iconButton}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className={styles.workspaceCard}>
            <Building2 size={19} />
            <div>
              <b>{projectName}</b>
              <span>
                {role === "buyer" ? "买方工作空间" : "供应商工作空间"}
              </span>
            </div>
          </div>
          <label className={styles.search}>
            <Search size={15} />
            <input
              aria-label="搜索聊天室"
              placeholder="搜索聊天室…"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
            />
            <kbd>⌕</kbd>
          </label>
          <div className={styles.sectionLabel}>
            聊天室 <span>{rooms.length}</span>
          </div>
        </>
      )}
      <div className={styles.roomList}>
        {(collapsed ? rooms : filtered).map((room, index) => (
          <button
            key={room.id}
            title={`${room.name} · ${room.kind === "buyer_internal" ? "内部私密" : "双方共享"}`}
            aria-label={room.name}
            aria-current={room.id === activeId ? "page" : undefined}
            onClick={() => onSelect(room.id)}
            className={`${styles.room} ${room.id === activeId ? styles.activeRoom : ""}`}
          >
            <span
              className={`${styles.roomTile} ${styles[`tile${index % 5}`]}`}
            >
              {room.kind === "buyer_internal" ? (
                <LockKeyhole size={17} />
              ) : (
                <Hash size={19} />
              )}
              {room.id === activeId || activity[room.id] ? (
                <i
                  title={
                    activity[room.id]
                      ? `${activity[room.id]} 条新消息`
                      : "当前聊天室"
                  }
                />
              ) : null}
            </span>
            {!collapsed && (
              <span className={styles.roomText}>
                <b>{room.name.replace(/\[S2-TEST\]\s*/g, "")}</b>
                <small>
                  {room.kind === "buyer_internal"
                    ? "仅买方内部可见"
                    : "买方与供应商共享"}
                  {activity[room.id] ? ` · ${activity[room.id]} 条新消息` : ""}
                </small>
              </span>
            )}
          </button>
        ))}
        {!collapsed && !filtered.length && (
          <p className={styles.muted}>没有匹配的聊天室</p>
        )}
      </div>
      <div className={styles.navFooter}>
        <button onClick={onSettings} title="设置" className={styles.navAction}>
          <Settings2 size={18} />
          {!collapsed && <span>设置与 AI 连接</span>}
        </button>
        <button
          disabled={signingOut}
          onClick={onSignOut}
          title="退出登录"
          className={styles.navAction}
        >
          <LogOut size={18} />
          {!collapsed && <span>退出登录</span>}
        </button>
        {!collapsed && (
          <div className={styles.account}>
            <span>{role === "buyer" ? "B" : "S"}</span>
            <div>
              <b>{role === "buyer" ? "Buyer team" : "Supplier team"}</b>
              <small>已登录 · 独立试用环境</small>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}