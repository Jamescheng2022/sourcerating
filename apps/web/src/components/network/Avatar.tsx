"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export interface AvatarProps {
  type?: "org" | "person";
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  verified?: boolean;
  className?: string;
  initials?: string;
}

export function Avatar({
  type = "person",
  name = "",
  size = "md",
  verified = false,
  className = "",
  initials = "",
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base font-bold",
    xl: "w-20 h-20 text-xl font-bold",
  };

  const getInitials = (n: string): string => {
    if (!n) return type === "org" ? "ORG" : "ENG";
    const clean = n.replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, "").trim();
    const words = clean
      .split(/\s+/)
      .map((w) => w.replace(/[^\w\u4e00-\u9fa5]/g, ""))
      .filter(Boolean);

    if (words.length >= 2) {
      const first = words[0][0];
      const nonNumeric = words.filter((w) => !/^\d+$/.test(w));
      const last = nonNumeric.length > 1
        ? nonNumeric[nonNumeric.length - 1][0]
        : words[words.length - 1][0];
      return `${first}${last}`.toUpperCase();
    }
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const displayInitials = initials || getInitials(name);

  const bgClasses = type === "org"
    ? "bg-slate-800 text-slate-200 border border-slate-700"
    : "bg-teal-900 text-teal-200 border border-teal-700";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden font-mono shadow-xs select-none ${sizeClasses[size] || sizeClasses.md} ${bgClasses} ${className}`}
    >
      <span className="flex items-center justify-center font-bold">
        {displayInitials}
      </span>

      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-teal-600 text-white rounded-full p-0.5 shadow-sm border border-white">
          <ShieldCheck className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  );
}

export default Avatar;
