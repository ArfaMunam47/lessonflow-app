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
    <header className="h-20 px-6 sm:px-8 border-b-2 border-[#18181B] bg-[#FAF7EE] sticky top-0 z-10 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2.5 rounded-xl text-[#18181B] hover:bg-black/5 border-2 border-[#18181B] bg-white shadow-[1px_1px_0px_#18181B]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden">
          <LessonFlowLogo size="sm" onClick={() => setActiveView('dashboard')} />
        </div>

        <div className="hidden md:block min-w-0">
          <h1 className="text-xl font-black text-[#18181B] tracking-tight leading-tight truncate">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-[#52525B] truncate leading-normal font-semibold">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions, Search/Filter, Week selector, and Teacher profile */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0">
        {/* Quick New Action [+] Button (like reference image top left [+]) */}
        <button
          type="button"
          onClick={onOpenNewWeekModal}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-[#FAF7EE] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] text-[#18181B] font-black text-xs inline-flex items-center space-x-1.5 transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          title="Create New Week Plan"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">New Week</span>
        </button>

        {/* Autosave Status Badge */}
        <div className="hidden sm:flex items-center text-xs space-x-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#18181B] text-[#18181B] font-bold shadow-[1px_1px_0px_#18181B]">
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === 'saving' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Unsaved</span>
            </>
          )}
        </div>

        {/* Current Week Switcher (if weeks exist) */}
        {weeks.length > 0 && (
          <div className="hidden lg:flex items-center">
            <select
              value={selectedWeek?.id || ''}
              onChange={e => e.target.value && selectWeek(e.target.value)}
              className="text-xs font-black bg-white border-2 border-[#18181B] rounded-xl pl-3 pr-8 py-2 text-[#18181B] focus:outline-hidden cursor-pointer shadow-[1px_1px_0px_#18181B]"
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
          className="flex items-center space-x-2 py-1.5 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-[#FAF7EE] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] transition-all text-left cursor-pointer"
          title="Account & Settings"
        >
          <div className="w-7 h-7 rounded-lg bg-[#FEF08A] border-2 border-[#18181B] text-[#18181B] flex items-center justify-center font-black text-xs shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-[#18181B] hidden sm:inline">
            {displayName}
          </span>
          <Settings className="w-3.5 h-3.5 text-[#18181B] ml-0.5 shrink-0" />
        </button>
      </div>
    </header>
  );
};
