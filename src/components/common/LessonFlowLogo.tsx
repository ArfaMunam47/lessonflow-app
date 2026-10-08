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
      {/* Outer rounded geometric container with crisp dark border */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="#FEF08A"
        stroke="#18181B"
        strokeWidth="2.5"
      />
      
      {/* Left curriculum notebook page (pastel mint) */}
      <path
        d="M10 12C10 11 11 10 12 10H18C19.1 10 20 10.9 20 12V28C20 28.6 19.5 29 19 29H12C10.9 29 10 28.1 10 27V12Z"
        fill="#A7F3D0"
        stroke="#18181B"
        strokeWidth="1.75"
      />
      
      {/* Right curriculum notebook page (clean white) */}
      <path
        d="M20 12C20 10.9 20.9 10 22 10H28C29 10 30 11 30 12V27C30 28.1 29.1 29 28 29H21C20.5 29 20 28.6 20 28V12Z"
        fill="#FFFFFF"
        stroke="#18181B"
        strokeWidth="1.75"
      />
      
      {/* Structured workflow blocks / lines */}
      <line x1="13" y1="15" x2="17" y2="15" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="19" x2="17" y2="19" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="23" x2="16" y2="23" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />

      <line x1="23" y1="15" x2="27" y2="15" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="19" x2="27" y2="19" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="23" x2="26" y2="23" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      
      {/* Flow step node */}
      <circle cx="20" cy="20" r="2.5" fill="#3B82F6" stroke="#18181B" strokeWidth="1.5" />
    </svg>
  );
};

export const LessonFlowLogo: React.FC<LessonFlowLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
  onClick,
}) => {
  const iconSize = size === 'sm' ? 30 : size === 'lg' ? 44 : 38;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subtitleSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  const content = (
    <div className={`flex items-center space-x-3 group ${className}`}>
      <LessonFlowIcon size={iconSize} className="transition-transform group-hover:scale-105 drop-shadow-[1px_1px_0px_#18181B]" />
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-1.5">
          <span className={`${textSize} font-black tracking-tight text-[#18181B] leading-none`}>
            Lesson<span className="text-[#18181B] underline decoration-4 decoration-[#FEF08A] underline-offset-4">Flow</span>
          </span>
        </div>
        {showSubtitle && (
          <span className={`${subtitleSize} font-bold text-[#52525B] uppercase tracking-wider mt-1.5 leading-none`}>
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
