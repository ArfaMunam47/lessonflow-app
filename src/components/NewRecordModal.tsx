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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[24px] shadow-[4px_4px_0px_#18181B] border-2 border-[#18181B] w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#18181B]/15 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] border-2 border-[#18181B] flex items-center justify-center text-[#18181B]">
              <BookOpen className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black text-[#18181B]">New Lesson Record</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#18181B] hover:bg-[#FAF7EE] rounded-lg border-2 border-transparent hover:border-[#18181B] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="e.g. 6A"
                className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="e.g. Blue"
                className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
                Day <span className="text-rose-500">*</span>
              </label>
              <select
                value={day}
                onChange={e => setDay(e.target.value)}
                className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden cursor-pointer"
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
            <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
              Initial Learning Target
            </label>
            <textarea
              rows={2}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. Students will understand..."
              className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden resize-none"
            />
          </div>

          <div>
            <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
              Overview Activities
            </label>
            <textarea
              rows={2}
              value={activities}
              onChange={e => setActivities(e.target.value)}
              placeholder="e.g. 1. Warmup 2. Direct instruction 3. Whiteboard practice..."
              className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-[#FAF7EE] p-3 rounded-2xl border-2 border-[#18181B]">
            <div>
              <label className="block font-black text-[#52525B] uppercase tracking-wider text-[10px] mb-1">
                Initial Block Count
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={blockCount}
                onChange={e => setBlockCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border-2 border-[#18181B] rounded-xl p-2 text-[#18181B] font-black bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-black text-[#52525B] uppercase tracking-wider text-[10px] mb-1">
                Block Template
              </label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                className="w-full border-2 border-[#18181B] rounded-xl p-2 text-[#18181B] font-bold bg-white focus:outline-hidden cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-3 border-t-2 border-[#18181B]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#FAF7EE] text-[#18181B] rounded-xl border-2 border-[#18181B] font-black cursor-pointer shadow-[1px_1px_0px_#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#18181B] hover:bg-neutral-800 text-white font-black rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
            >
              Create Lesson Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
