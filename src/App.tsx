/**
 * LessonFlow Main Application Entry
 * 
 * Functional, clean teacher workflow assistant for weekly lesson planning,
 * dynamic block building, plain-text clipboard, and Chrome Extension automation.
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/Header.js';
import { WeeklyWorkspace } from './components/WeeklyWorkspace.js';
import { TemplatesManager } from './components/TemplatesManager.js';
import { ClipboardGallery } from './components/ClipboardGallery.js';
import { ExtensionApiView } from './components/ExtensionApiView.js';
import { NewWeekModal } from './components/NewWeekModal.js';
import { NewRecordModal } from './components/NewRecordModal.js';
import { AiImportModal } from './components/AiImportModal.js';
import { UserSwitcherModal } from './components/UserSwitcherModal.js';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal.js';
import { ToastContainer } from './components/Toast.js';

function MainApp() {
  const {
    activeView,
    nextRecord,
    prevRecord,
    updateRecord,
    showToast,
    loading,
  } = useApp();

  // Modals state
  const [isNewWeekOpen, setIsNewWeekOpen] = useState(false);
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts (Requirement 31)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save shortcut: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        updateRecord({}, true);
        showToast('Lesson record saved explicitly', 'success');
      }

      // Record navigation: Alt + ArrowRight
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        nextRecord();
      }

      // Record navigation: Alt + ArrowLeft
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        prevRecord();
      }

      // Close modals on Escape
      if (e.key === 'Escape') {
        setIsNewWeekOpen(false);
        setIsNewRecordOpen(false);
        setIsAiImportOpen(false);
        setIsUserModalOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextRecord, prevRecord, updateRecord, showToast]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Header */}
      <Header
        onOpenNewWeek={() => setIsNewWeekOpen(true)}
        onOpenAiImport={() => setIsAiImportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-gray-600">Loading lesson workspace...</span>
          </div>
        ) : (
          <>
            {activeView === 'workspace' && (
              <WeeklyWorkspace onOpenNewRecord={() => setIsNewRecordOpen(true)} />
            )}

            {activeView === 'templates' && <TemplatesManager />}

            {activeView === 'clipboard' && <ClipboardGallery />}

            {activeView === 'extension-api' && <ExtensionApiView />}
          </>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-gray-200 py-3 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            LessonFlow &mdash; Data Entry Automation Assistant for Teachers
          </span>
          <span className="text-2xs text-gray-400">
            Prepares structured blocks for Chrome Extension automated entry
          </span>
        </div>
      </footer>

      {/* Modals */}
      <NewWeekModal isOpen={isNewWeekOpen} onClose={() => setIsNewWeekOpen(false)} />
      <NewRecordModal isOpen={isNewRecordOpen} onClose={() => setIsNewRecordOpen(false)} />
      <AiImportModal isOpen={isAiImportOpen} onClose={() => setIsAiImportOpen(false)} />
      <UserSwitcherModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
