/**
 * LessonFlow Geometric Brand Logo & Wordmark
 * 
 * Communicates:
 * - Education & lesson planning (open notebook/curriculum leaves)
 * - Structured blocks & progressive flow (dynamic geometric steps)
 * - Teacher workflow & organization
 * 
 * Minimal, recognizable, professional, scalable.
 */

import React from 'react';

interface LessonFlowLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LessonFlowIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="LessonFlow Logo Mark"
    >
      {/* Outer rounded geometric container with soft gradient depth */}
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="10"
        fill="#2563EB"
        stroke="#1D4ED8"
        strokeWidth="1.5"
      />
      
      {/* Left curriculum page */}
      <path
        d="M10 13C10 11.8954 10.8954 11 12 11H18C19.1046 11 20 11.8954 20 13V28C20 28.5523 19.5523 29 19 29H12C10.8954 29 10 28.1046 10 27V13Z"
        fill="#93C5FD"
        fillOpacity="0.45"
      />
      
      {/* Right curriculum page / flow block */}
      <path
        d="M20 13C20 11.8954 20.8954 11 22 11H28C29.1046 11 30 11.8954 30 13V27C30 28.1046 29.1046 29 28 29H21C20.4477 29 20 28.5523 20 28V13Z"
        fill="#FFFFFF"
      />
      
      {/* Structured workflow lines (representing lesson records & blocks) */}
      <path
        d="M13 16H17M13 20H17M13 24H16"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M23 16H27M23 20H27M23 24H26"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Flow forward chevron accent */}
      <circle cx="20" cy="20" r="2.5" fill="#FBBF24" />
    </svg>
  );
};

export const LessonFlowLogo: React.FC<LessonFlowLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
  onClick,
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subtitleSize = size === 'sm' ? 'text-3xs' : 'text-2xs';

  const content = (
    <div className={`flex items-center space-x-3 group ${className}`}>
      <LessonFlowIcon size={iconSize} className="transition-transform group-hover:scale-105" />
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-1.5">
          <span className={`${textSize} font-extrabold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors leading-none`}>
            Lesson<span className="text-blue-600">Flow</span>
          </span>
        </div>
        {showSubtitle && (
          <span className={`${subtitleSize} font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none`}>
            Teacher Workspace
          </span>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus:outline-hidden text-left"
        aria-label="LessonFlow Home"
      >
        {content}
      </button>
    );
  }

  return content;
};
