/**
 * LessonFlow Settings View
 * 
 * Bento Grid visual styling:
 * - Teacher name and default section/class preferences
 * - Future Chrome Extension API Token with 1-click copy
 * - Clean inline testing & reset tools (no blocking window.confirm)
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  User,
  Key,
  Copy,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    teacherProfile,
    updateTeacherProfile,
    copyToSystemClipboard,
    loadDemoData,
    clearAllData,
    showToast,
  } = useApp();

  const [teacherName, setTeacherName] = useState(
    teacherProfile?.teacherName || currentUser?.name || 'Teacher'
  );
  const [defaultSection, setDefaultSection] = useState(teacherProfile?.defaultSection || '');
  const [defaultClass, setDefaultClass] = useState(teacherProfile?.defaultClass || '');
  const [schoolName, setSchoolName] = useState(teacherProfile?.schoolName || '');

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeacherProfile({
      teacherName: teacherName.trim(),
      defaultSection: defaultSection.trim(),
      defaultClass: defaultClass.trim(),
      schoolName: schoolName.trim(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure teacher profile defaults, school information, and Chrome extension credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Teacher Profile Preferences Card */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2.5 border-b border-slate-200 pb-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Teacher Profile & Workspace Defaults</h2>
              <p className="text-2xs text-slate-500">Defaults used when creating blank lesson plans.</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Teacher Display Name
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="e.g. Teacher"
                className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Class
                </label>
                <input
                  type="text"
                  value={defaultClass}
                  onChange={e => setDefaultClass(e.target.value)}
                  placeholder="e.g. 7A or Math 7"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Section
                </label>
                <input
                  type="text"
                  value={defaultSection}
                  onChange={e => setDefaultSection(e.target.value)}
                  placeholder="e.g. Room 102 or Blue"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                School Name (Optional)
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="e.g. Lincoln High School"
                className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* 2. Chrome Extension Access Token Card */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-200 pb-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Chrome Extension API</h2>
              <p className="text-2xs text-slate-500">Authentication token for website automation.</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            When using the future LessonFlow Chrome extension to automate school website entry, paste this personal API token into the extension side panel.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <code className="text-xs font-mono text-slate-800 break-all select-all font-bold">
              {currentUser?.apiToken || 'lf_tok_active'}
            </code>
            <button
              type="button"
              onClick={() =>
                copyToSystemClipboard(currentUser?.apiToken || '', 'Extension API Token')
              }
              className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-lg shadow-2xs shrink-0 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Copy
            </button>
          </div>
        </div>

        {/* 3. Testing & Clean Slate Tools Card */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-200 pb-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Workspace Management</h2>
              <p className="text-2xs text-slate-500">Demo testing and data reset controls.</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Convenient controls to test with a realistic sample curriculum week, or wipe all records for a clean slate.
          </p>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => loadDemoData()}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2 text-slate-600" />
              Load Sample Week for Testing
            </button>

            {!confirmClearOpen ? (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600" />
                Reset & Clear All Lesson Plans
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Are you sure? This deletes all weeks and records.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllData();
                      setConfirmClearOpen(false);
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-2xs"
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="px-3 py-1 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-2xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
