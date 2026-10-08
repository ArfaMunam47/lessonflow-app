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
        <div className="bg-white border-2 border-[#18181B] rounded-[24px] p-8 space-y-3.5 shadow-[2px_2px_0px_#18181B]">
          <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] border-2 border-[#18181B] flex items-center justify-center mx-auto text-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <Calendar className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-lg font-black text-[#18181B]">No Lesson Plans Created Yet</h2>
          <p className="text-xs text-[#52525B] max-w-sm mx-auto font-bold leading-relaxed">
            Upload your weekly curriculum PDF to automatically generate all lesson records, or create a blank week manually.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => setActiveView('import')}
              className="px-4 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 inline mr-1.5 stroke-[2.5]" />
              Import Lesson Plan
            </button>
            <button
              onClick={onOpenNewWeekModal}
              className="px-4 py-2.5 bg-white hover:bg-[#FAF7EE] text-[#18181B] font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
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
          className="inline-flex items-center text-xs font-black text-[#18181B] hover:bg-[#FAF7EE] bg-white border-2 border-[#18181B] px-3.5 py-2 rounded-xl shadow-[1px_1px_0px_#18181B] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
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
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      
      {/* Week Header & Selector Bar */}
      <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Week Dropdown & Title */}
          <div className="flex items-center space-x-3">
            <select
              value={selectedWeekId || ''}
              onChange={e => selectWeek(e.target.value)}
              className="text-sm font-black text-[#18181B] bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl py-2 px-3 focus:outline-hidden shadow-[1px_1px_0px_#18181B] cursor-pointer"
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
              className="inline-flex items-center px-3.5 py-2 border-2 border-[#18181B] hover:bg-[#FAF7EE] text-xs font-black text-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-[#18181B]" />
              Duplicate Week
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNewRecordModal}
              className="inline-flex items-center px-4 py-2 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 stroke-[3]" />
              Add Lesson
            </button>
          </div>
        </div>

        {/* Subtle Progress Bar */}
        {progress && progress.totalRecords > 0 && (
          <div className="pt-3 border-t-2 border-[#18181B]/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#52525B] font-bold gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-black text-[#18181B]">
                {selectedWeek?.weekNumber} Progress:
              </span>
              <span>
                {progress.completedRecords} / {progress.totalRecords} completed ({progress.percentage}%)
              </span>
            </div>

            <div className="w-48 bg-white rounded-xl h-3 overflow-hidden border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] p-0.5">
              <div
                className="bg-[#18181B] h-full rounded-md transition-all"
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
                <h3 className="text-base font-black text-[#18181B] tracking-tight">
                  {dayName}
                </h3>
                <span className="text-xs font-black text-[#18181B] font-mono bg-white border-2 border-[#18181B] px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#18181B]">
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
                    className="bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] rounded-[20px] p-5 shadow-[2px_2px_0px_#18181B] hover:shadow-[3px_3px_0px_#18181B] cursor-pointer transition-all space-y-3.5 group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Day / Class and Status */}
                      <div className="flex items-start justify-between gap-2 border-b-2 border-[#18181B]/15 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-black text-[#52525B] tracking-wider block">
                            {lesson.day}
                          </span>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-base font-black text-[#18181B] group-hover:underline">
                              Class {lesson.className}
                            </span>
                            {lesson.section && (
                              <span className="text-xs font-black text-[#18181B] bg-[#DBEAFE] px-2 py-0.5 rounded-md border-2 border-[#18181B]">
                                {lesson.section}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg capitalize border-2 border-[#18181B] ${
                            lesson.completed || lesson.status === 'completed'
                              ? 'bg-[#D1FAE5] text-[#18181B]'
                              : lesson.status === 'ready'
                              ? 'bg-[#DBEAFE] text-[#18181B]'
                              : lesson.status === 'in_progress'
                              ? 'bg-[#FEF08A] text-[#18181B]'
                              : 'bg-white text-[#18181B]'
                          }`}
                        >
                          {lesson.completed ? '✓ Completed' : lesson.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Target Preview */}
                      <div className="pt-2 space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#52525B] tracking-wider block">
                          Learning Target
                        </span>
                        <p className="text-xs text-[#18181B] font-bold line-clamp-2 leading-relaxed">
                          {lesson.target || 'No target specified.'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata & Open CTA */}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-[#18181B]/15 text-xs">
                      <span className="text-[10px] font-black text-[#18181B] bg-[#FAF7EE] px-2 py-1 rounded-md border-2 border-[#18181B]">
                        {lesson.blocks.length} Block{lesson.blocks.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-black text-[#18181B] group-hover:underline flex items-center">
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
          <div className="bg-white border-2 border-dashed border-[#18181B] rounded-[20px] p-8 text-center text-[#52525B] font-bold">
            <p className="text-xs">No lesson records in this week yet.</p>
            <button
              onClick={onOpenNewRecordModal}
              className="mt-2 text-xs font-black text-[#18181B] hover:underline"
            >
              + Add first lesson record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
