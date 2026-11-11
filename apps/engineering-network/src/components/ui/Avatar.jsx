import React from 'react';
import { Building2, User, ShieldCheck } from 'lucide-react';

export function Avatar({
  type = 'person',
  name = '',
  size = 'md',
  verified = false,
  className = '',
  initials = ''
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold'
  };

  const getInitials = (n) => {
    if (!n) return type === 'org' ? 'ORG' : 'ENG';
    // Remove text in parentheses or brackets (handles both English () and Chinese （）)
    const clean = n.replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, '').trim();
    // Split into words and remove punctuation
    const words = clean
      .split(/\s+/)
      .map(w => w.replace(/[^\w\u4e00-\u9fa5]/g, ''))
      .filter(Boolean);

    if (words.length >= 2) {
      const first = words[0][0];
      // If last word is purely numeric (e.g. '01' in Demo Engineer 01), check if earlier non-numeric word exists
      const nonNumeric = words.filter(w => !/^\d+$/.test(w));
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

  const bgClasses = type === 'org'
    ? 'bg-slate-800 text-slate-200 border border-slate-700'
    : 'bg-emerald-950 text-emerald-300 border border-emerald-700';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden font-mono shadow-xs select-none ${sizeClasses[size] || sizeClasses.md} ${bgClasses} ${className}`}>
      {type === 'org' ? (
        <span className="flex items-center justify-center font-bold">
          {displayInitials}
        </span>
      ) : (
        <span className="flex items-center justify-center font-bold">
          {displayInitials}
        </span>
      )}

      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm border border-white">
          <ShieldCheck className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  );
}
