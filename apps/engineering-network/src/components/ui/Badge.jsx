import React from 'react';

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  icon: Icon,
  ...props
}) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded',
    sm: 'text-xs px-2 py-0.5 rounded-md',
    md: 'text-xs sm:text-sm px-2.5 py-1 rounded-lg',
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200',
    verified: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold',
    selfClaimed: 'bg-blue-50 text-blue-800 border border-blue-300 font-medium',
    aiCandidate: 'bg-amber-50 text-amber-800 border border-amber-300 font-medium',
    planned: 'bg-slate-100 text-slate-600 border border-slate-300 italic',
    channel: 'bg-slate-800 text-slate-200 border border-slate-700',
    role: 'bg-purple-50 text-purple-800 border border-purple-200 font-semibold',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono leading-tight whitespace-nowrap ${sizeClasses[size] || sizeClasses.sm} ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}
