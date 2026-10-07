/**
 * Lesson Plans View
 * 
 * Simple, calm presentation of weekly lessons:
 * - Week selector with subtle progress indicator
 * - Grouped by day with Class, Section, block count, and status
 * - Clicking a lesson opens the focused Lesson Editor
 * - Duplicate week action
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { LessonRecord, RecordStatus } from '../types/index.js';
import { LessonEditor } from './LessonEditor.js';
import {
  Calendar,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Upload,
} from 'lucide-react';

interface LessonPlansViewProps {
  onOpenNewRecordModal: () => void;
  onOpenNewWeekModal: () => void;
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const LessonPlansView: React.FC<LessonPlansViewProps> = ({
  onOpenNewRecordModal,
  onOpenNewWeekModal,
}) => {
  const {
    weeks,
    selectedWeek,
    selectedWeekId,
    selectWeek,
    records,
    selectedRecordId,
    selectRecord,
    progress,
    duplicateWeek,
    deleteWeek,
    setActiveView,
  } = useApp();

  const [duplicating, setDuplicating] = useState(false);
  const [activeEditorRecordId, setActiveEditorRecordId] = useState<string | null>(selectedRecordId);

  const activeRecord = records.find(r => r.id === (activeEditorRecordId || selectedRecordId)) || null;

  const handleDuplicateWeek = async () => {
    if (!selectedWeekId || !selectedWeek) return;
    setDuplicating(true);
    try {
      await duplicateWeek(selectedWeekId, `${selectedWeek.weekNumber} (Copy)`);
    } finally {
      setDuplicating(false);
    }
  };

  if (weeks.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-3">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">No Lesson Plans Created Yet</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Upload your weekly curriculum PDF to automatically generate all lesson records, or create a blank week manually.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => setActiveView('import')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 inline mr-1.5" />
              Upload Lesson Plan PDF
            </button>
            <button
              onClick={onOpenNewWeekModal}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-md"
            >
              + Create Blank Week
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If a record is being edited, show the clean editor with back navigation
  if (activeRecord) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 py-2">
        <button
          onClick={() => {
            setActiveEditorRecordId(null);
            selectRecord(null);
          }}
          className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to all lessons ({selectedWeek?.weekNumber})
        </button>

        <LessonEditor record={activeRecord} />
      </div>
    );
  }

  // Group records by day
  const groupedRecords: Record<string, LessonRecord[]> = {};
  DAYS_ORDER.forEach(d => (groupedRecords[d] = []));

  records.forEach(r => {
    const dayKey = DAYS_ORDER.find(d => d.toLowerCase() === r.day.toLowerCase()) || 'Other';
    if (!groupedRecords[dayKey]) groupedRecords[dayKey] = [];
    groupedRecords[dayKey].push(r);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      
      {/* Week Header & Selector Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Week Dropdown & Title */}
          <div className="flex items-center space-x-3">
            <select
              value={selectedWeekId || ''}
              onChange={e => selectWeek(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.weekNumber}: {w.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleDuplicateWeek}
              disabled={duplicating}
              title="Duplicate entire week into a new week"
              className="inline-flex items-center px-3 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl shadow-2xs transition-colors"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Duplicate Week
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNewRecordModal}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Lesson
            </button>
          </div>
        </div>

        {/* Subtle Progress Bar */}
        {progress && progress.totalRecords > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">
                {selectedWeek?.weekNumber} Progress:
              </span>
              <span>
                {progress.completedRecords} / {progress.totalRecords} completed ({progress.percentage}%)
              </span>
            </div>

            <div className="w-48 bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouped Days List */}
      <div className="space-y-6">
        {DAYS_ORDER.map(dayName => {
          const dayLessons = groupedRecords[dayName] || [];
          if (dayLessons.length === 0) return null;

          return (
            <div key={dayName} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                  {dayName}
                </h3>
                <span className="text-2xs font-bold text-slate-500 font-mono">
                  {dayLessons.length} lesson{dayLessons.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayLessons.map(lesson => (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      selectRecord(lesson.id);
                      setActiveEditorRecordId(lesson.id);
                    }}
                    className="bg-white border-[1.5px] border-slate-300 hover:border-blue-500 rounded-2xl p-5 shadow-2xs hover:shadow-xs cursor-pointer transition-all space-y-3.5 group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Day / Class and Status */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-3xs uppercase font-extrabold text-slate-400 tracking-wider block">
                            {lesson.day}
                          </span>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                              Class {lesson.className}
                            </span>
                            {lesson.section && (
                              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                {lesson.section}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-2xs font-bold px-2.5 py-1 rounded-lg capitalize border ${
                            lesson.completed || lesson.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : lesson.status === 'ready'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : lesson.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lesson.completed ? '✓ Completed' : lesson.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Target Preview */}
                      <div className="pt-2 space-y-1">
                        <span className="text-3xs font-extrabold uppercase text-slate-400 tracking-wider block">
                          Learning Target
                        </span>
                        <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                          {lesson.target || 'No target specified.'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata & Open CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-2xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                        {lesson.blocks.length} Block{lesson.blocks.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-bold text-blue-600 group-hover:text-blue-800 flex items-center">
                        Open Lesson <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {records.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            <p className="text-xs">No lesson records in this week yet.</p>
            <button
              onClick={onOpenNewRecordModal}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
            >
              + Add first lesson record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
