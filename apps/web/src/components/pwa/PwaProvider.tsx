"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Download, Share, PlusSquare, Smartphone, X, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<void>;
  openInstallGuide: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  promptInstall: async () => {},
  openInstallGuide: () => {},
});

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA] ServiceWorker registration failed:", err);
          });
      });
    }

    // 2. Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Detect iOS / iPadOS
    const ua = window.navigator.userAgent;
    const isAppleMobile = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isAppleMobile);

    // 4. Capture beforeinstallprompt for Android & Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      setDeferredPrompt(p);
      window.deferredPwaPrompt = p;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      console.log("[PWA] App successfully installed to home screen");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
    } else if (isIOS) {
      setShowGuide(true);
    } else {
      setShowGuide(true);
    }
  };

  const openInstallGuide = () => {
    setShowGuide(true);
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: !!deferredPrompt || isIOS,
        isInstalled,
        isIOS,
        promptInstall,
        openInstallGuide,
      }}
    >
      {children}

      {/* iOS / Browser Install Instruction Sheet */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white font-bold text-lg shadow-md">
                  SR
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Install SourceRating</h3>
                  <p className="text-xs text-slate-400">Add to Home Screen for native experience</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-5 space-y-4 text-sm">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-teal-400 font-semibold text-xs border border-teal-700/50">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        Tap the <span className="inline-flex items-center gap-1 font-semibold text-sky-400"><Share className="h-4 w-4" /> Share</span> button
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Located in the bottom Safari toolbar</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-teal-400 font-semibold text-xs border border-teal-700/50">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        Scroll down and tap <span className="inline-flex items-center gap-1 font-semibold text-white"><PlusSquare className="h-4 w-4 text-teal-400" /> Add to Home Screen</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">添加到主屏幕</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-teal-400 font-semibold text-xs border border-teal-700/50">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        Tap <span className="font-semibold text-teal-400">Add</span> in the top-right corner
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Launches in full screen without browser toolbars</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-teal-400 font-semibold text-xs border border-teal-700/50">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        Tap the <span className="font-semibold text-white">Menu (⋮)</span> in Chrome or Edge
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Located at the top or bottom right of your browser</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-teal-400 font-semibold text-xs border border-teal-700/50">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        Select <span className="font-semibold text-teal-400">Install app</span> or <span className="font-semibold text-teal-400">Add to Home screen</span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}
