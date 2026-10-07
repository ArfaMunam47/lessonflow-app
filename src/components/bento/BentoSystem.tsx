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

export type BentoAccent = 'neutral' | 'blue' | 'emerald' | 'mint' | 'purple' | 'lavender' | 'amber' | 'yellow' | 'peach' | 'rose' | 'pink';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 ${className}`}>
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

  // Clearly visible borders (1.5px solid) with soft pastel tinted surfaces
  const accentClasses: Record<BentoAccent, string> = {
    neutral:
      'bg-white border-slate-300 text-slate-900 shadow-2xs hover:border-slate-400',
    blue:
      'bg-[#EEF4FF] border-[#BFDBFE] text-slate-900 shadow-2xs hover:border-[#93C5FD]',
    mint:
      'bg-[#ECFDF5] border-[#A7F3D0] text-slate-900 shadow-2xs hover:border-[#6EE7B7]',
    emerald:
      'bg-[#ECFDF5] border-[#A7F3D0] text-slate-900 shadow-2xs hover:border-[#6EE7B7]',
    lavender:
      'bg-[#F5F3FF] border-[#DDD6FE] text-slate-900 shadow-2xs hover:border-[#C4B5FD]',
    purple:
      'bg-[#F5F3FF] border-[#DDD6FE] text-slate-900 shadow-2xs hover:border-[#C4B5FD]',
    yellow:
      'bg-[#FEFCE8] border-[#FDE047] text-slate-900 shadow-2xs hover:border-[#FACC15]',
    amber:
      'bg-[#FEFCE8] border-[#FDE047] text-slate-900 shadow-2xs hover:border-[#FACC15]',
    peach:
      'bg-[#FFF7ED] border-[#FED7AA] text-slate-900 shadow-2xs hover:border-[#FDBA74]',
    rose:
      'bg-[#FFF7ED] border-[#FED7AA] text-slate-900 shadow-2xs hover:border-[#FDBA74]',
    pink:
      'bg-[#FDF2F8] border-[#FBCFE8] text-slate-900 shadow-2xs hover:border-[#F472B6]',
  };

  const radiusClass = radius === 'large' ? 'rounded-[24px]' : 'rounded-2xl';

  const interactiveClasses = isInteractive
    ? 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer'
    : 'transition-colors duration-150';

  return (
    <div
      className={`relative ${radiusClass} border-[1.5px] p-6 sm:p-8 flex flex-col justify-between ${colSpanClasses[colSpan] || 'col-span-12'} ${accentClasses[accent]} ${interactiveClasses} ${className}`}
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
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs shrink-0 text-slate-700">
            {icon}
          </div>
        )}
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
              {title}
            </h3>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
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
    <div className={`mt-5 pt-3.5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 ${className}`}>
      {children}
    </div>
  );
};

interface BentoStatProps {
  value: React.ReactNode;
  label: string;
  helper?: string;
  trend?: React.ReactNode;
}

export const BentoStat: React.FC<BentoStatProps> = ({ value, label, helper, trend }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
          {value}
        </span>
        {trend && <span>{trend}</span>}
      </div>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      {helper && <p className="text-2xs text-slate-400">{helper}</p>}
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
    <div className={`text-center py-8 px-6 space-y-4 bg-white/70 border border-slate-300 rounded-2xl ${className}`}>
      {icon && <div className="mx-auto text-slate-400 w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors border border-blue-200 shadow-2xs"
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
  const base = 'inline-flex items-center justify-center font-bold text-xs rounded-xl px-5 py-2.5 transition-all focus:outline-hidden cursor-pointer';
  const variants = {
    primary:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-700 shadow-xs hover:shadow-blue-500/20 text-sm',
    secondary:
      'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white border border-slate-900 shadow-xs',
    outline:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-none border border-transparent',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
