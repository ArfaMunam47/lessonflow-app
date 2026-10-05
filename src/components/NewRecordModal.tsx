/**
 * New Lesson Record Modal
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { X, Plus, BookOpen } from 'lucide-react';

interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const NewRecordModal: React.FC<NewRecordModalProps> = ({ isOpen, onClose }) => {
  const { createRecord, templates, teacherProfile, filterDay } = useApp();

  const [className, setClassName] = useState(teacherProfile?.defaultClass || '6A');
  const [section, setSection] = useState(teacherProfile?.defaultSection || 'Blue');
  const [day, setDay] = useState(filterDay !== 'All' ? filterDay : 'Monday');
  const [target, setTarget] = useState('');
  const [activities, setActivities] = useState('');
  const [blockCount, setBlockCount] = useState<number>(3);
  const [templateId, setTemplateId] = useState<string>(
    teacherProfile?.defaultTemplateId || (templates.length > 0 ? templates[0].id : '')
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !day.trim()) return;

    setSubmitting(true);
    try {
      await createRecord({
        className,
        section,
        day,
        target,
        activities,
        blockCount,
        templateId: templateId || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">New Lesson Record</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="e.g. 6A"
                className="w-full border border-gray-300 rounded p-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="e.g. Blue"
                className="w-full border border-gray-300 rounded p-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Day <span className="text-rose-500">*</span>
              </label>
              <select
                value={day}
                onChange={e => setDay(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 text-gray-900 font-semibold"
              >
                {DAYS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Initial Learning Target
            </label>
            <textarea
              rows={2}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. Students will understand..."
              className="w-full border border-gray-300 rounded p-2 text-gray-900 resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Overview Activities
            </label>
            <textarea
              rows={2}
              value={activities}
              onChange={e => setActivities(e.target.value)}
              placeholder="e.g. 1. Warmup 2. Direct instruction 3. Whiteboard practice..."
              className="w-full border border-gray-300 rounded p-2 text-gray-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2.5 rounded border border-gray-200">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Initial Block Count
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={blockCount}
                onChange={e => setBlockCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Block Template
              </label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
            >
              Create Lesson Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
