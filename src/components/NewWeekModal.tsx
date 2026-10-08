/**
 * New Week Creation Modal
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { X, Calendar, Plus } from 'lucide-react';

interface NewWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewWeekModal: React.FC<NewWeekModalProps> = ({ isOpen, onClose }) => {
  const { createWeek, weeks } = useApp();

  const nextWeekNum = `Week ${weeks.length + 1}`;
  const [weekNumber, setWeekNumber] = useState(nextWeekNum);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekNumber.trim()) return;

    setSubmitting(true);
    try {
      await createWeek(weekNumber, title || 'Weekly Lesson Plans', startDate, endDate);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[24px] shadow-[4px_4px_0px_#18181B] border-2 border-[#18181B] w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between border-b-2 border-[#18181B]/15 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] border-2 border-[#18181B] flex items-center justify-center text-[#18181B]">
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black text-[#18181B]">Create New Week</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#18181B] hover:bg-[#FAF7EE] rounded-lg border-2 border-transparent hover:border-[#18181B] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
              Week Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={weekNumber}
              onChange={e => setWeekNumber(e.target.value)}
              placeholder="e.g. Week 8 or Term 2 Week 3"
              className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-black text-[#18181B] uppercase tracking-wider text-[10px] mb-1">
              Curriculum Title / Theme
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fractions & Decimal Operations"
              className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-[#52525B] uppercase tracking-wider text-[10px] mb-1">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border-2 border-[#18181B] rounded-xl p-2 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-black text-[#52525B] uppercase tracking-wider text-[10px] mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border-2 border-[#18181B] rounded-xl p-2 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
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
              Create Week
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
