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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">Create New Week</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Week Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={weekNumber}
              onChange={e => setWeekNumber(e.target.value)}
              placeholder="e.g. Week 8 or Term 2 Week 3"
              className="w-full border border-gray-300 rounded p-2 text-gray-900 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Curriculum Title / Theme
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fractions & Decimal Operations"
              className="w-full border border-gray-300 rounded p-2 text-gray-900 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-600 mb-1">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-600 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
              />
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
              Create Week
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
