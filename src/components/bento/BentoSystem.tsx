/**
 * Reusable Bento Grid Design System
 * 
 * Provides:
 * - BentoGrid (responsive 12-column CSS Grid)
 * - BentoCard (tactile module with clearly visible borders, rounded-2xl, and semantic accents)
 * - BentoCardHeader, BentoCardContent, BentoCardFooter
 * - BentoStat, BentoEmptyState, BentoAction
 */

import React from 'react';

export type BentoAccent = 'neutral' | 'blue' | 'emerald' | 'mint' | 'purple' | 'lavender' | 'amber' | 'yellow' | 'peach' | 'rose' | 'pink' | 'sage' | 'cream';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 sm:gap-6 ${className}`}>
      {children}
    </div>
  );
};

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  colSpan?: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  accent?: BentoAccent;
  isInteractive?: boolean;
  radius?: 'default' | 'large';
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  colSpan = 12,
  accent = 'neutral',
  isInteractive = false,
  radius = 'default',
  className = '',
  ...props
}) => {
  // Column span classes
  const colSpanClasses: Record<number, string> = {
    3: 'col-span-1 md:col-span-3 lg:col-span-3',
    4: 'col-span-1 md:col-span-3 lg:col-span-4',
    5: 'col-span-1 md:col-span-3 lg:col-span-5',
    6: 'col-span-1 md:col-span-3 lg:col-span-6',
    7: 'col-span-1 md:col-span-6 lg:col-span-7',
    8: 'col-span-1 md:col-span-6 lg:col-span-8',
    9: 'col-span-1 md:col-span-6 lg:col-span-9',
    10: 'col-span-1 md:col-span-6 lg:col-span-10',
    11: 'col-span-1 md:col-span-6 lg:col-span-11',
    12: 'col-span-1 md:col-span-6 lg:col-span-12',
  };

  // Strong, intentional 2px dark charcoal borders matching visual reference
  const accentClasses: Record<BentoAccent, string> = {
    neutral:
      'bg-white border-[#18181B] text-[#18181B]',
    cream:
      'bg-white border-[#18181B] text-[#18181B]',
    blue:
      'bg-[#DBEAFE] border-[#18181B] text-[#18181B]',
    mint:
      'bg-[#D1FAE5] border-[#18181B] text-[#18181B]',
    emerald:
      'bg-[#D1FAE5] border-[#18181B] text-[#18181B]',
    lavender:
      'bg-[#EDE9FE] border-[#18181B] text-[#18181B]',
    purple:
      'bg-[#EDE9FE] border-[#18181B] text-[#18181B]',
    yellow:
      'bg-[#FEF08A] border-[#18181B] text-[#18181B]',
    amber:
      'bg-[#FEF08A] border-[#18181B] text-[#18181B]',
    peach:
      'bg-[#FED7AA] border-[#18181B] text-[#18181B]',
    rose:
      'bg-[#FED7AA] border-[#18181B] text-[#18181B]',
    pink:
      'bg-[#FCE7F3] border-[#18181B] text-[#18181B]',
    sage:
      'bg-[#E2ECE5] border-[#18181B] text-[#18181B]',
  };

  const radiusClass = radius === 'large' ? 'rounded-[24px]' : 'rounded-[20px]';

  const interactiveClasses = isInteractive
    ? 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#18181B] cursor-pointer'
    : 'transition-all duration-150';

  return (
    <div
      className={`relative ${radiusClass} border-2 p-6 sm:p-7 flex flex-col justify-between shadow-[2px_2px_0px_#18181B] ${colSpanClasses[colSpan] || 'col-span-12'} ${accentClasses[accent]} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface BentoCardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const BentoCardHeader: React.FC<BentoCardHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-3 mb-4 ${className}`}>
      <div className="flex items-start space-x-3">
        {icon && (
          <div className="p-2 rounded-xl bg-white border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] shrink-0 text-[#18181B]">
            {icon}
          </div>
        )}
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-black text-[#18181B] tracking-tight leading-snug">
              {title}
            </h3>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-[#52525B] leading-relaxed font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const BentoCardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`flex-1 ${className}`}>{children}</div>;
};

export const BentoCardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mt-5 pt-3.5 border-t-2 border-[#18181B]/20 flex items-center justify-between text-xs text-[#52525B] ${className}`}>
      {children}
    </div>
  );
};

interface BentoStatProps {
  value: React.ReactNode;
  label: string;
  helper?: string;
  trend?: React.ReactNode;
  isBadge?: boolean;
}

export const BentoStat: React.FC<BentoStatProps> = ({ value, label, helper, trend, isBadge = false }) => {
  if (isBadge) {
    return (
      <div className="p-3 bg-white border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] text-center">
        <span className="text-lg font-black text-[#18181B] block font-mono">
          {value}
        </span>
        <span className="text-[10px] font-bold text-[#52525B] uppercase tracking-wide block mt-0.5">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-black text-[#18181B] tracking-tight font-mono">
          {value}
        </span>
        {trend && <span>{trend}</span>}
      </div>
      <p className="text-xs font-bold text-[#18181B]">{label}</p>
      {helper && <p className="text-[11px] text-[#52525B] font-medium">{helper}</p>}
    </div>
  );
};

interface BentoEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const BentoEmptyState: React.FC<BentoEmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`text-center py-7 px-5 space-y-3.5 bg-white border-2 border-[#18181B] rounded-2xl shadow-[1px_1px_0px_#18181B] ${className}`}>
      {icon && (
        <div className="mx-auto text-[#18181B] w-10 h-10 flex items-center justify-center bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B]">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-black text-[#18181B]">{title}</p>
        <p className="text-xs text-[#52525B] max-w-sm mx-auto leading-relaxed font-medium">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center text-xs font-black text-[#18181B] hover:bg-[#FAF7EE] bg-white px-4 py-2 rounded-xl transition-all border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

interface BentoActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const BentoAction: React.FC<BentoActionProps> = ({
  variant = 'primary',
  children,
  icon,
  className = '',
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-black text-xs rounded-xl px-5 py-2.5 transition-all focus:outline-hidden cursor-pointer';
  const variants = {
    primary:
      'bg-[#18181B] hover:bg-[#27272A] active:bg-black text-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] text-sm',
    secondary:
      'bg-white hover:bg-[#FAF7EE] active:bg-[#F4EEDC] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px]',
    outline:
      'bg-white hover:bg-neutral-50 text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]',
    ghost:
      'bg-transparent hover:bg-black/5 text-[#18181B] shadow-none border border-transparent',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
