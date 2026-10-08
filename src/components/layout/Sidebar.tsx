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
    <div className="flex flex-col h-full bg-[#EBF3EE] border-r-2 border-[#18181B]">
      {/* Brand Header with Generous Breathing Room (Top: 32px, Left/Right: 24px) */}
      <div className="pt-8 pb-6 px-6 border-b-2 border-[#18181B]/15 flex items-center justify-between">
        <LessonFlowLogo
          size="md"
          showSubtitle={true}
          onClick={() => handleNavClick('dashboard')}
        />

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-xl text-[#18181B] hover:bg-black/10 border-2 border-[#18181B] bg-white shadow-[1px_1px_0px_#18181B]"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#18181B] text-white border-2 border-[#18181B] font-black shadow-[2px_2px_0px_#18181B]'
                  : 'text-[#18181B] hover:bg-black/5 hover:border-[#18181B]/30 border-2 border-transparent font-bold'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-[#18181B]'}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.count !== undefined && (
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                    isActive
                      ? 'bg-white text-[#18181B] border-white'
                      : 'bg-white text-[#18181B] border-[#18181B]'
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
      <div className="p-4 border-t-2 border-[#18181B]/15 bg-[#EBF3EE]">
        <button
          type="button"
          onClick={() => handleNavClick('settings')}
          className="w-full flex items-center space-x-3 p-2.5 rounded-xl bg-white hover:bg-[#FAF7EE] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all text-left group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FEF08A] border-2 border-[#18181B] text-[#18181B] flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0px_#18181B]">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-black text-[#18181B] block truncate group-hover:underline">
              {displayName}
            </span>
            <span className="text-[10px] text-[#52525B] font-bold block truncate">
              {teacherProfile?.schoolName ? teacherProfile.schoolName : 'LessonFlow Workspace'}
            </span>
          </div>
          <Settings className="w-4 h-4 text-[#18181B] shrink-0" />
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
