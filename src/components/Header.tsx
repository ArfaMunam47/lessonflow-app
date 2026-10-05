/**
 * LessonFlow Navigation Header
 * 
 * Provides week switcher, view tabs, autosave indicators, user switcher,
 * AI import trigger, and Chrome Extension settings.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Calendar,
  Layers,
  Clipboard,
  Sparkles,
  Copy,
  Plus,
  User as UserIcon,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Key,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewWeek: () => void;
  onOpenAiImport: () => void;
  onOpenShortcuts: () => void;
  onOpenUserModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewWeek,
  onOpenAiImport,
  onOpenShortcuts,
  onOpenUserModal,
}) => {
  const {
    weeks,
    selectedWeekId,
    selectWeek,
    duplicateWeek,
    activeView,
    setActiveView,
    saveStatus,
    currentUser,
    resetDemoData,
    showToast,
  } = useApp();

  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicateCurrentWeek = async () => {
    if (!selectedWeekId) return;
    const current = weeks.find(w => w.id === selectedWeekId);
    const num = current ? `${current.weekNumber} (Copy)` : 'Next Week';
    setDuplicating(true);
    try {
      await duplicateWeek(selectedWeekId, num);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveView('workspace')}>
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                LF
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">LessonFlow</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Teacher Automation
                </span>
              </div>
            </div>

            {/* Week Selector Dropdown & Quick Actions */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={selectedWeekId || ''}
                  onChange={e => selectWeek(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-48 sm:w-56 p-1.5 font-medium truncate"
                >
                  {weeks.length === 0 && <option value="">No weeks created</option>}
                  {weeks.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.weekNumber}: {w.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={onOpenNewWeek}
                title="Create New Week"
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-2xs text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-hidden"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-gray-500" />
                <span className="hidden md:inline">New Week</span>
              </button>

              <button
                onClick={handleDuplicateCurrentWeek}
                disabled={!selectedWeekId || duplicating}
                title="Duplicate entire week with all records and blocks"
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-2xs text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 focus:outline-hidden"
              >
                <Copy className="w-3.5 h-3.5 mr-1 text-gray-500" />
                <span className="hidden md:inline">{duplicating ? 'Duplicating...' : 'Duplicate Week'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveView('workspace')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeView === 'workspace'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Workspace</span>
            </button>

            <button
              onClick={() => setActiveView('templates')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeView === 'templates'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Block Templates</span>
            </button>

            <button
              onClick={() => setActiveView('clipboard')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeView === 'clipboard'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              <span>Clipboard Gallery</span>
            </button>

            <button
              onClick={() => setActiveView('extension-api')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeView === 'extension-api'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Key className="w-4 h-4 text-amber-600" />
              <span>Chrome Extension API</span>
            </button>
          </nav>

          {/* Right Action Tools: AI Parser, Autosave Status, Teacher Switcher */}
          <div className="flex items-center space-x-3">
            {/* AI Unstructured Parser Button */}
            <button
              onClick={onOpenAiImport}
              className="inline-flex items-center px-3 py-1.5 border border-indigo-200 text-xs font-semibold rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-2xs transition-colors"
              title="Parse messy text, syllabus, or Word document with AI"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>AI Import</span>
            </button>

            {/* Autosave Status Indicator */}
            <div className="hidden sm:flex items-center text-xs text-gray-500 space-x-1" title="Changes auto-save continuously">
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-gray-600 font-medium">Saved</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span className="text-amber-600 font-medium">Saving...</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-600 font-medium">Save Error</span>
                </>
              )}
            </div>

            {/* Teacher Switcher / Profile Button */}
            <button
              onClick={onOpenUserModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
              title="Switch user or configure teacher defaults"
            >
              <UserIcon className="w-3.5 h-3.5 text-gray-600" />
              <span className="font-semibold truncate max-w-[110px]">
                {currentUser?.name || 'Teacher'}
              </span>
            </button>

            {/* Quick Demo Reset */}
            <button
              onClick={() => {
                if (window.confirm('Reset sample Week 8 demo data?')) {
                  resetDemoData();
                }
              }}
              title="Reset sample Week 8 lesson plans"
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts"
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-gray-100 overflow-x-auto space-x-2 text-xs">
          <button
            onClick={() => setActiveView('workspace')}
            className={`px-3 py-1 rounded font-medium shrink-0 ${activeView === 'workspace' ? 'bg-indigo-600 text-white' : 'text-gray-700 bg-gray-100'}`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`px-3 py-1 rounded font-medium shrink-0 ${activeView === 'templates' ? 'bg-indigo-600 text-white' : 'text-gray-700 bg-gray-100'}`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveView('clipboard')}
            className={`px-3 py-1 rounded font-medium shrink-0 ${activeView === 'clipboard' ? 'bg-indigo-600 text-white' : 'text-gray-700 bg-gray-100'}`}
          >
            Clipboard Gallery
          </button>
          <button
            onClick={() => setActiveView('extension-api')}
            className={`px-3 py-1 rounded font-medium shrink-0 ${activeView === 'extension-api' ? 'bg-indigo-600 text-white' : 'text-gray-700 bg-gray-100'}`}
          >
            Chrome Ext API
          </button>
        </div>
      </div>
    </header>
  );
};
