/**
 * LessonFlow Top App Header
 * 
 * Provides:
 * - Current page title & contextual subtitle
 * - Subtle autosave status indicator (Saved / Saving)
 * - Active week badge and quick week selector
 * - Mobile hamburger toggle
 * - Teacher profile status
 */

import React from 'react';
import { useApp, ActiveNavView } from '../../context/AppContext.js';
import { LessonFlowLogo } from '../common/LessonFlowLogo.js';
import {
  Menu,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Plus,
  Settings,
  User as UserIcon,
} from 'lucide-react';

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
  onOpenNewWeekModal: () => void;
}

const VIEW_TITLES: Record<ActiveNavView, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Plan once. Organize everything.',
  },
  lessons: {
    title: 'Lesson Plans',
    subtitle: 'Structured lesson records, targets, and block fields.',
  },
  import: {
    title: 'Import Lesson Plan',
    subtitle: 'Extract lesson plans from Google Docs, PDF documents, or pasted text.',
  },
  clipboard: {
    title: 'Clipboard Gallery',
    subtitle: 'Clean plain-text copy queue for quick data entry into school systems.',
  },
  templates: {
    title: 'Block Templates',
    subtitle: 'Configure reusable field architectures for your lesson blocks.',
  },
  history: {
    title: 'Import History',
    subtitle: 'Audit past document imports, view extracted lessons, or re-import.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Teacher profile preferences and school configuration.',
  },
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenMobileMenu,
  onOpenNewWeekModal,
}) => {
  const {
    activeView,
    setActiveView,
    saveStatus,
    selectedWeek,
    weeks,
    selectWeek,
    teacherProfile,
    currentUser,
  } = useApp();

  const currentMeta = VIEW_TITLES[activeView] || {
    title: 'LessonFlow',
    subtitle: 'Teacher lesson-planning workspace.',
  };

  const displayName = teacherProfile?.teacherName?.trim() || currentUser?.name?.trim() || 'Teacher';

  return (
    <header className="h-20 px-6 sm:px-8 border-b border-slate-200 bg-white/95 backdrop-blur-xs sticky top-0 z-10 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden">
          <LessonFlowLogo size="sm" onClick={() => setActiveView('dashboard')} />
        </div>

        <div className="hidden md:block min-w-0">
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight truncate">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-slate-500 truncate leading-normal font-medium">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Real status, Week selector, and Teacher profile button */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
        {/* Autosave Status Badge */}
        <div className="flex items-center text-xs space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Saved</span>
            </>
          )}
          {saveStatus === 'saving' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
              <span className="text-blue-700">Saving...</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="text-rose-700">Unsaved</span>
            </>
          )}
        </div>

        {/* Current Week Switcher (if weeks exist) */}
        {weeks.length > 0 && (
          <div className="hidden sm:flex items-center space-x-1.5">
            <select
              value={selectedWeek?.id || ''}
              onChange={e => e.target.value && selectWeek(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.weekNumber}: {w.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Teacher profile & settings button */}
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          className="flex items-center space-x-2 py-1.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
          title="Account & Settings"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 hidden sm:inline">
            {displayName}
          </span>
          <Settings className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 ml-1 shrink-0" />
        </button>
      </div>
    </header>
  );
};
