/**
 * Teacher Profile & User Switcher Modal
 * 
 * Supports:
 * - Switching active user (to test multi-user isolation)
 * - Adding a new teacher account
 * - Editing teacher profile defaults (defaultSection, defaultClass, schoolName, etc.)
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { X, User as UserIcon, Plus, Check, Settings } from 'lucide-react';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    teacherProfile,
    allUsers,
    switchUser,
    createUser,
    updateTeacherProfile,
    templates,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'switch' | 'defaults'>('switch');

  // New Teacher form
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Defaults form
  const [teacherName, setTeacherName] = useState(teacherProfile?.teacherName || currentUser?.name || '');
  const [defaultSection, setDefaultSection] = useState(teacherProfile?.defaultSection || '');
  const [defaultClass, setDefaultClass] = useState(teacherProfile?.defaultClass || '');
  const [schoolName, setSchoolName] = useState(teacherProfile?.schoolName || '');
  const [defaultTemplateId, setDefaultTemplateId] = useState(teacherProfile?.defaultTemplateId || '');

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherEmail.trim()) return;
    await createUser(newTeacherName.trim(), newTeacherEmail.trim());
    setNewTeacherName('');
    setNewTeacherEmail('');
    setShowAddForm(false);
    onClose();
  };

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeacherProfile({
      teacherName,
      defaultSection,
      defaultClass,
      schoolName,
      defaultTemplateId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">Teacher Profile & Accounts</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 text-xs">
          <button
            onClick={() => setActiveTab('switch')}
            className={`pb-2 px-3 font-semibold ${activeTab === 'switch' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Switch Teacher
          </button>
          <button
            onClick={() => setActiveTab('defaults')}
            className={`pb-2 px-3 font-semibold ${activeTab === 'defaults' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Reusable Defaults
          </button>
        </div>

        {activeTab === 'switch' ? (
          <div className="space-y-3 text-xs">
            <p className="text-gray-500">
              Select a teacher account to test multi-user data isolation. Each teacher has isolated weeks, records, and API tokens.
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {allUsers.map(u => {
                const isActive = currentUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded border cursor-pointer ${
                      isActive ? 'border-indigo-500 bg-indigo-50/50 font-bold text-indigo-900' : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div>
                      <span className="block">{u.name}</span>
                      <span className="text-2xs text-gray-500 font-normal">{u.email}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                );
              })}
            </div>

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full text-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-1.5 border border-dashed border-indigo-300 rounded hover:bg-indigo-50"
              >
                + Add Another Teacher Account
              </button>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-2 bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-bold text-gray-700 block">New Teacher Profile</span>
                <input
                  type="text"
                  required
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  placeholder="Teacher Full Name"
                  className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-900"
                />
                <input
                  type="email"
                  required
                  value={newTeacherEmail}
                  onChange={e => setNewTeacherEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-900"
                />
                <div className="flex justify-end space-x-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveDefaults} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-0.5">Teacher Name</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-gray-700 mb-0.5">Default Section</label>
                <input
                  type="text"
                  value={defaultSection}
                  onChange={e => setDefaultSection(e.target.value)}
                  placeholder="e.g. Blue"
                  className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-0.5">Default Class</label>
                <input
                  type="text"
                  value={defaultClass}
                  onChange={e => setDefaultClass(e.target.value)}
                  placeholder="e.g. 6A"
                  className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-0.5">School Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="e.g. Lincoln Middle School"
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-0.5">Common Block Template</label>
              <select
                value={defaultTemplateId}
                onChange={e => setDefaultTemplateId(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
              >
                <option value="">Select Default Template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
              >
                Save Defaults
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
