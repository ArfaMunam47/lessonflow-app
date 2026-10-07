/**
 * Simplified LessonFlow Navigation Header
 * 
 * Clean, focused wordmark with simple primary navigation:
 * Dashboard | Lesson Plans | Import | Clipboard | Templates | Settings
 * Neutral teacher account status.
 */

import React, { useState } from 'react';
import { useApp, ActiveNavView } from '../context/AppContext.js';
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  Clipboard,
  Layers,
  Settings,
  Menu,
  X,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    saveStatus,
    currentUser,
    teacherProfile,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveNavView; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'lessons', label: 'Lesson Plans', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'import', label: 'Import', icon: <Upload className="w-4 h-4" /> },
    { id: 'clipboard', label: 'Clipboard', icon: <Clipboard className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Layers className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: ActiveNavView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const displayName = teacherProfile?.teacherName || currentUser?.name || 'Teacher';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Simple Wordmark Logo */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center space-x-2 text-left focus:outline-hidden"
            >
              <span className="text-base font-bold text-gray-900 tracking-tight">
                LessonFlow
              </span>
            </button>

            {/* Desktop Primary Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Status & Account */}
          <div className="flex items-center space-x-4">
            {/* Subtle Autosave Indicator */}
            <div className="hidden sm:flex items-center text-xs text-gray-400 space-x-1.5">
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-gray-500 text-2xs font-medium">Saved</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span className="text-amber-600 text-2xs font-medium">Saving...</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-600 text-2xs font-medium">Save error</span>
                </>
              )}
            </div>

            {/* Teacher Profile / Settings Link */}
            <button
              onClick={() => handleNavClick('settings')}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1 rounded"
              title="Account Settings"
            >
              {displayName}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-2 space-y-1">
            {navItems.map(item => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-semibold text-left ${
                    isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
