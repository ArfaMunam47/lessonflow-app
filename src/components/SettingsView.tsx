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
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Top Banner */}
      <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B]">
        <h1 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">Settings & Preferences</h1>
        <p className="text-xs sm:text-sm text-[#52525B] font-bold mt-1">
          Configure teacher profile defaults, school information, and Chrome extension credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Teacher Profile Preferences Card */}
        <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] space-y-4 md:col-span-2">
          <div className="flex items-center space-x-3 border-b-2 border-[#18181B]/15 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] flex items-center justify-center shadow-[1px_1px_0px_#18181B]">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#18181B]">Teacher Profile & Workspace Defaults</h2>
              <p className="text-xs text-[#52525B] font-bold">Defaults used when creating blank lesson plans.</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                Teacher Display Name
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="e.g. Teacher"
                className="w-full border-2 border-[#18181B] rounded-xl p-3 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                  Default Class
                </label>
                <input
                  type="text"
                  value={defaultClass}
                  onChange={e => setDefaultClass(e.target.value)}
                  placeholder="e.g. 7A or Math 7"
                  className="w-full border-2 border-[#18181B] rounded-xl p-3 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                  Default Section
                </label>
                <input
                  type="text"
                  value={defaultSection}
                  onChange={e => setDefaultSection(e.target.value)}
                  placeholder="e.g. Room 102 or Blue"
                  className="w-full border-2 border-[#18181B] rounded-xl p-3 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                School Name (Optional)
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="e.g. Lincoln High School"
                className="w-full border-2 border-[#18181B] rounded-xl p-3 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* 2. Chrome Extension Access Token Card */}
        <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] space-y-4">
          <div className="flex items-center space-x-3 border-b-2 border-[#18181B]/15 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] flex items-center justify-center shadow-[1px_1px_0px_#18181B]">
              <Key className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#18181B]">Chrome Extension API</h2>
              <p className="text-xs text-[#52525B] font-bold">Authentication token for website automation.</p>
            </div>
          </div>

          <p className="text-xs text-[#52525B] font-bold leading-relaxed">
            When using the future LessonFlow Chrome extension to automate school website entry, paste this personal API token into the extension side panel.
          </p>

          <div className="bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-[1px_1px_0px_#18181B]">
            <code className="text-xs font-mono text-[#18181B] break-all select-all font-black">
              {currentUser?.apiToken || 'lf_tok_active'}
            </code>
            <button
              type="button"
              onClick={() =>
                copyToSystemClipboard(currentUser?.apiToken || '', 'Extension API Token')
              }
              className="inline-flex items-center px-3.5 py-1.5 bg-white border-2 border-[#18181B] hover:bg-[#FEF08A] text-xs font-black text-[#18181B] rounded-lg shadow-[1px_1px_0px_#18181B] shrink-0 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1 text-[#18181B]" />
              Copy
            </button>
          </div>
        </div>

        {/* 3. Testing & Clean Slate Tools Card */}
        <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] space-y-4">
          <div className="flex items-center space-x-3 border-b-2 border-[#18181B]/15 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] text-[#18181B] border-2 border-[#18181B] flex items-center justify-center shadow-[1px_1px_0px_#18181B]">
              <Sliders className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#18181B]">Workspace Management</h2>
              <p className="text-xs text-[#52525B] font-bold">Demo testing and data reset controls.</p>
            </div>
          </div>

          <p className="text-xs text-[#52525B] font-bold leading-relaxed">
            Convenient controls to test with a realistic sample curriculum week, or wipe all records for a clean slate.
          </p>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => loadDemoData()}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-white hover:bg-[#FAF7EE] text-[#18181B] font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2 text-[#18181B]" />
              Load Sample Week for Testing
            </button>

            {!confirmClearOpen ? (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#FCE7F3] hover:bg-[#FBCFE8] text-[#18181B] font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 text-[#18181B]" />
                Reset & Clear All Lesson Plans
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#FCE7F3] border-2 border-[#18181B] text-xs space-y-2.5 shadow-[1px_1px_0px_#18181B]">
                <div className="flex items-center space-x-2 text-[#18181B] font-black">
                  <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  <span>Are you sure? This deletes all weeks and records.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllData();
                      setConfirmClearOpen(false);
                    }}
                    className="px-3 py-1.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black rounded-lg text-xs border-2 border-[#18181B] cursor-pointer"
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="px-3 py-1.5 bg-white hover:bg-[#FAF7EE] border-2 border-[#18181B] text-[#18181B] font-black rounded-lg text-xs cursor-pointer"
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
