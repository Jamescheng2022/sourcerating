"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPane } from "../project-room-lab/chat";
import type { Lab } from "../project-room-lab/use-lab";
import css from "../project-room-lab/lab.module.css";
import rc from "./real.module.css";
import { AuthGate, Onboard, RealPanel, RealSidebar } from "./real-ui";
import { useReal } from "./use-real";
import { AboutSettingsDialog } from "./about-settings-dialog";

type Mode = "wide" | "mid" | "narrow";
const modeOf = (w: number): Mode => (w >= 1100 ? "wide" : w >= 700 ? "mid" : "narrow");

/** Project Room B on the real backend. /project-room-lab stays the DEMO; /project-room stays version A. */
export default function ProjectRoomB() {
  const real = useReal();
  const { s, actions, room } = real;
  const [mode, setMode] = useState<Mode>("wide");
  const [vvh, setVvh] = useState("100dvh");
  const [vvTop, setVvTop] = useState("0px");
  const [invite, setInvite] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((t: string) => { setToastText(t); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToastText(null), 1800); }, []);
  const deep = useRef<{ room: string | null; msg: string | null }>({ room: null, msg: null });

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    // The token survives the e-mail confirmation round trip, which lands on the bare Site URL.
    const token = p.get("invite") ?? localStorage.getItem("sr_b_invite");
    if (token) localStorage.setItem("sr_b_invite", token);
    setInvite(token);
    deep.current = { room: p.get("room"), msg: p.get("msg") };
    const sync = () => {
      setMode(modeOf(window.innerWidth));
      if (window.visualViewport) {
        const vv = window.visualViewport;
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
        setVvh(`${Math.round(vv.height)}px`);
        setVvTop(`${Math.max(0, Math.round(vv.offsetTop))}px`);
      } else {
        setVvh(`${window.innerHeight}px`);
        setVvTop("0px");
      }
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync);
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    const onPop = () => { if (history.state?.lab !== "chat") actions.backToList(); };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("popstate", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link ?room=&msg= once rooms are known.
  useEffect(() => {
    const d = deep.current;
    if (s.phase !== "ready" || !d.room || !s.rooms.some((r) => r.id === d.room)) return;
    actions.openRoom(d.room);
    if (d.msg) { const id = d.msg; setTimeout(() => actions.jumpTo(id), 900); }
    deep.current = { room: null, msg: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.rooms]);
  useEffect(() => { if (s.jump && mode !== "wide") actions.closePanel();   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.jump]);

  const done = () => { setInvite(null); localStorage.removeItem("sr_b_invite"); history.replaceState(history.state, "", location.pathname); };
  const openRoom = (id: string) => { actions.openRoom(id); if (modeOf(window.innerWidth) === "narrow" && history.state?.lab !== "chat") history.pushState({ lab: "chat" }, ""); };
  const back = () => (history.state?.lab === "chat" ? history.back() : actions.backToList());

  if (s.phase === "boot") return <main className={rc.gate} aria-busy="true" />;
  if (s.phase === "signedOut") return <AuthGate real={real} inviteToken={invite} />;
  if (invite || s.memberships.length === 0) return <Onboard real={real} inviteToken={invite} onDone={done} />;

  return (
    <div className={css.app} data-view={room ? s.view : "list"} data-panel={!!room && s.panel.open && mode === "wide"} style={{ height: vvh, top: vvTop }}>
      <RealSidebar real={real} onOpen={openRoom} onOpenAbout={() => setAboutOpen(true)} />
      {room ? <ChatPane lab={real as unknown as Lab} toast={toast} onBack={back} onOpenAbout={() => setAboutOpen(true)} /> : <section className={rc.empty}><b>Create a new project to start</b></section>}
      {room && mode === "wide" && s.panel.open && <aside className={css.aside} aria-label="Project Panel"><RealPanel real={real} /></aside>}
      {room && mode !== "wide" && (
        <Dialog.Root open={s.panel.open} onOpenChange={(v) => !v && actions.closePanel()}>
          <Dialog.Portal>
            <Dialog.Overlay className={css.overlay} />
            <Dialog.Content className={mode === "narrow" ? css.sheet : css.drawer} aria-describedby={undefined} data-testid={mode === "narrow" ? "bottom-sheet" : "drawer"}>
              <Dialog.Title className={css.srOnly}>Project Panel</Dialog.Title>
              {mode === "narrow" && <button type="button" className={css.grab} onClick={actions.closePanel} aria-label="Collapse panel" />}
              <RealPanel real={real} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      {s.error && <div className={rc.banner} role="alert">{s.error}<button type="button" onClick={actions.clearError} aria-label="Close">×</button></div>}
      {toastText && <div className={css.toast} role="status">{toastText}</div>}
      <AboutSettingsDialog real={real} open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
