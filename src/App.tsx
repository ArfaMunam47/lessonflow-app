/**
 * LessonFlow - Teacher Workflow & Data-Entry Assistant
 * 
 * Bento Grid UI/UX Redesign
 * Desktop-first responsive layout with compact sidebar and Bento system.
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { AppHeader } from './components/layout/AppHeader.js';
import { DashboardView } from './components/DashboardView.js';
import { LessonPlansView } from './components/LessonPlansView.js';
import { ImportView } from './components/ImportView.js';
import { ClipboardGallery } from './components/ClipboardGallery.js';
import { TemplatesManager } from './components/TemplatesManager.js';
import { ImportHistoryView } from './components/ImportHistoryView.js';
import { SettingsView } from './components/SettingsView.js';
import { NewWeekModal } from './components/NewWeekModal.js';
import { NewRecordModal } from './components/NewRecordModal.js';
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNewWeekOpen, setIsNewWeekOpen] = useState(false);
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        updateRecord({}, true);
        showToast('Saved', 'success');
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        nextRecord();
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        prevRecord();
      }

      if (e.key === 'Escape') {
        setIsNewWeekOpen(false);
        setIsNewRecordOpen(false);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextRecord, prevRecord, updateRecord, showToast]);

  return (
    <div className="min-h-screen bg-[#FAF7EE] flex font-sans text-[#18181B] antialiased selection:bg-[#FEF08A] selection:text-[#18181B]">
      {/* Left Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAF7EE]">
        <AppHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewWeekModal={() => setIsNewWeekOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-[#52525B] space-y-3">
              <div className="w-8 h-8 border-3 border-[#18181B] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#18181B] font-black tracking-wide">
                Loading LessonFlow...
              </span>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView onOpenNewWeekModal={() => setIsNewWeekOpen(true)} />
              )}

              {activeView === 'lessons' && (
                <LessonPlansView
                  onOpenNewRecordModal={() => setIsNewRecordOpen(true)}
                  onOpenNewWeekModal={() => setIsNewWeekOpen(true)}
                />
              )}

              {activeView === 'import' && <ImportView />}

              {activeView === 'clipboard' && <ClipboardGallery />}

              {activeView === 'templates' && <TemplatesManager />}

              {activeView === 'history' && <ImportHistoryView />}

              {activeView === 'settings' && <SettingsView />}
            </>
          )}
        </main>

        <footer className="border-t border-slate-200/80 bg-white py-3.5 px-6 text-xs text-slate-400">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-2xs">
            <span className="font-semibold text-slate-500">
              LessonFlow &bull; Teacher Workflow & Automation
            </span>
            <span>Real teacher data &bull; Future Chrome Extension Layer</span>
          </div>
        </footer>
      </div>

      {/* Creation Modals */}
      <NewWeekModal isOpen={isNewWeekOpen} onClose={() => setIsNewWeekOpen(false)} />
      <NewRecordModal isOpen={isNewRecordOpen} onClose={() => setIsNewRecordOpen(false)} />

      {/* Toast Notifications */}
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
