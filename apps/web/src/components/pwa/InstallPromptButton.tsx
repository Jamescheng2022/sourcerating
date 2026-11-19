"use client";

import React from "react";
import { Download, Smartphone } from "lucide-react";
import { usePwa } from "./PwaProvider";

export function InstallPromptButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { isInstalled, promptInstall } = usePwa();

  if (isInstalled) {
    return null;
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={promptInstall}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition border border-teal-200 ${className}`}
        title="Install SourceRating as a mobile or desktop app"
      >
        <Smartphone className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition ${className}`}
    >
      <Download className="h-4 w-4 text-teal-700" />
      <span>Install to Home Screen</span>
    </button>
  );
}
