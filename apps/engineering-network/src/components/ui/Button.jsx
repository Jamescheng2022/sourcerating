import React from 'react';

/**
 * Standard Accessible Button Component
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  disabledReason = '',
  icon: Icon,
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 select-none';

  const sizeClasses = {
    xs: 'text-[11px] px-2 py-1 rounded gap-1',
    sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 rounded-lg gap-2',
    lg: 'text-sm sm:text-base px-4 py-2.5 rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-accent hover:bg-accent-hover text-white shadow-xs focus:ring-accent',
    secondary: 'bg-surface-subtle hover:bg-surface-hover text-ink border border-hairline shadow-xs focus:ring-accent',
    outline: 'border border-hairline hover:bg-surface-hover text-ink focus:ring-accent',
    ghost: 'text-ink-muted hover:text-ink hover:bg-surface-subtle focus:ring-accent',
    subtle: 'bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 focus:ring-accent',
    danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    dark: 'bg-surface hover:bg-surface-subtle text-ink border border-hairline focus:ring-accent'
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.99]';

  return (
    <button
      type={type}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : props.title}
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${disabledClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}
