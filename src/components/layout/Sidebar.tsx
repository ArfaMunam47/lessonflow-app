/**
 * LessonFlow Navigation Sidebar
 * 
 * Clean, compact, desktop-first responsive sidebar:
 * - Wordmark with teacher workflow icon
 * - Strict real navigation items:
 *   Dashboard | Lesson Plans | Import | Clipboard | Templates | Import History | Settings
 * - Clear active state with visible border and subtle indicator
 * - Teacher profile card with real name or "Teacher"
 */

import React from 'react';
import { useApp, ActiveNavView } from '../../context/AppContext.js';
import { LessonFlowLogo } from '../common/LessonFlowLogo.js';
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  Clipboard,
  Layers,
  History,
  Settings,
  User as UserIcon,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeView, setActiveView, teacherProfile, currentUser, weeks, importHistory } = useApp();

  const navItems: Array<{
    id: ActiveNavView;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'lessons',
      label: 'Lesson Plans',
      icon: <BookOpen className="w-4 h-4" />,
      count: weeks.length > 0 ? weeks.length : undefined,
    },
    {
      id: 'import',
      label: 'Import',
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: 'clipboard',
      label: 'Clipboard',
      icon: <Clipboard className="w-4 h-4" />,
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Import History',
      icon: <History className="w-4 h-4" />,
      count: importHistory.length > 0 ? importHistory.length : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleNavClick = (view: ActiveNavView) => {
    setActiveView(view);
    onCloseMobile();
  };

  const displayName = teacherProfile?.teacherName?.trim() || currentUser?.name?.trim() || 'Teacher';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header with Generous Breathing Room (Top: 28px, Left/Right: 28px) */}
      <div className="pt-7 pb-6 px-7 border-b border-slate-200 flex items-center justify-between">
        <LessonFlowLogo
          size="md"
          showSubtitle={true}
          onClick={() => handleNavClick('dashboard')}
        />

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-blue-50/90 text-blue-900 border border-blue-300 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent font-semibold'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.count !== undefined && (
                <span
                  className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Teacher Profile Footer (Real data only, fallback to 'Teacher') */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60">
        <button
          type="button"
          onClick={() => handleNavClick('settings')}
          className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-white hover:border-slate-300 border border-transparent transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-200 transition-colors">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-blue-700 transition-colors">
              {displayName}
            </span>
            <span className="text-3xs text-slate-500 block truncate">
              {teacherProfile?.schoolName ? teacherProfile.schoolName : 'LessonFlow Workspace'}
            </span>
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-60 shrink-0 sticky top-0 h-screen z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-xs h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
