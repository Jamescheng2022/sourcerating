"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPane } from "./chat";
import { ContextPanel } from "./context-panel";
import { FilePreview } from "./file-preview";
import { Sidebar } from "./sidebar";
import { useLab } from "./use-lab";
import css from "./lab.module.css";

type Mode = "wide" | "mid" | "narrow";
const modeOf = (w: number): Mode => (w >= 1100 ? "wide" : w >= 700 ? "mid" : "narrow");

/**
 * Project Room Lab — independent front-end experiment (B side of the A/B).
 * Runs entirely on DEMO fixture data; it never touches Supabase.
 */
export default function ProjectRoomLab() {
  const lab = useLab();
  const { s, actions } = lab;
  const [mode, setMode] = useState<Mode>("wide");
  const [vvh, setVvh] = useState<string>("100dvh");
  const [toastText, setToastText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((t: string) => {
    setToastText(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastText(null), 1800);
  }, []);

  useEffect(() => {
    const sync = () => {
      setMode(modeOf(window.innerWidth));
      // Track the visual viewport so the composer stays above the soft keyboard.
      if (window.visualViewport) setVvh(`${Math.round(window.visualViewport.height)}px`);
    };
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => { window.removeEventListener("resize", sync); window.visualViewport?.removeEventListener("resize", sync); };
  }, []);

  // Deep links: ?room=r1&msg=m4 opens the room and scrolls to the message.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const room = p.get("room"), msg = p.get("msg");
    if (room) actions.openRoom(room);
    if (msg) actions.jumpTo(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = () => { if (history.state?.lab !== "chat") actions.backToList(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On small screens a jump to a source message must reveal the chat.
  useEffect(() => {
    if (s.jump && mode !== "wide") actions.closePanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.jump]);

  const openRoom = (id: string) => {
    actions.openRoom(id);
    if (modeOf(window.innerWidth) === "narrow" && history.state?.lab !== "chat") history.pushState({ lab: "chat" }, "");
  };
  const back = () => (history.state?.lab === "chat" ? history.back() : actions.backToList());

  return (
    <div className={css.app} data-view={s.view} data-panel={s.panel.open && mode === "wide"} style={{ height: vvh }}>
      <Sidebar lab={lab} onOpen={openRoom} />
      <ChatPane lab={lab} toast={toast} onBack={back} />
      {mode === "wide" && s.panel.open && <aside className={css.aside} aria-label="项目面板"><ContextPanel lab={lab} /></aside>}
      {mode !== "wide" && (
        <Dialog.Root open={s.panel.open} onOpenChange={(v) => !v && actions.closePanel()}>
          <Dialog.Portal>
            <Dialog.Overlay className={css.overlay} />
            <Dialog.Content className={mode === "narrow" ? css.sheet : css.drawer} aria-describedby={undefined} data-testid={mode === "narrow" ? "bottom-sheet" : "drawer"}>
              <Dialog.Title className={css.srOnly}>项目面板</Dialog.Title>
              {mode === "narrow" && <button type="button" className={css.grab} onClick={actions.closePanel} aria-label="收起面板" />}
              <ContextPanel lab={lab} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      <FilePreview lab={lab} />
      {toastText && <div className={css.toast} role="status">{toastText}</div>}
    </div>
  );
}
