/**
 * Weekly Workspace Component
 * 
 * Provides:
 * - Day filter bar (All, Monday - Friday)
 * - Search & Filter
 * - Progress tracking bar (Completed X / Y records with percentage)
 * - Master-detail view: record list on left, full dynamic editor on right
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { LessonEditor } from './LessonEditor.js';
import {
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Copy,
  Trash2,
  Filter,
} from 'lucide-react';

interface WeeklyWorkspaceProps {
  onOpenNewRecord: () => void;
}

const DAYS = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WeeklyWorkspace: React.FC<WeeklyWorkspaceProps> = ({ onOpenNewRecord }) => {
  const {
    selectedWeek,
    records,
    selectedRecordId,
    selectRecord,
    filterDay,
    setFilterDay,
    searchQuery,
    setSearchQuery,
    progress,
    toggleRecordCompleted,
    duplicateRecord,
    deleteRecord,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('All');

  if (!selectedWeek) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200 p-8 my-6">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900">No Week Selected</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
          Select an existing week from the header or create a new week to begin planning.
        </p>
      </div>
    );
  }

  // Filter records
  const filtered = records.filter(r => {
    if (filterDay !== 'All' && r.day.toLowerCase() !== filterDay.toLowerCase()) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMeta =
        r.className.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        r.activities.toLowerCase().includes(q);
      const matchBlocks = r.blocks.some(b =>
        b.fields.some(f => f.fieldValue.toLowerCase().includes(q))
      );
      if (!matchMeta && !matchBlocks) return false;
    }
    return true;
  });

  const selectedRecord = records.find(r => r.id === selectedRecordId) || (filtered.length > 0 ? filtered[0] : null);

  return (
    <div className="space-y-4">
      {/* Week Header & Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                {selectedWeek.weekNumber}
              </span>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {selectedWeek.title || 'Untitled Week'}
              </h2>
            </div>
            {(selectedWeek.startDate || selectedWeek.endDate) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedWeek.startDate} &mdash; {selectedWeek.endDate}
              </p>
            )}
          </div>

          {/* Progress Tracker (Requirement 18 & 41) */}
          {progress && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 min-w-[260px]">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="text-gray-700">Weekly Progress</span>
                <span className="text-indigo-700 font-bold">
                  {progress.completedRecords} / {progress.totalRecords} records ({progress.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, progress.percentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-3xs text-gray-500 mt-1">
                <span>Completed: {progress.byStatus.completed}</span>
                <span>Ready: {progress.byStatus.ready}</span>
                <span>In Progress: {progress.byStatus.in_progress}</span>
                <span>Draft: {progress.byStatus.draft}</span>
              </div>
            </div>
          )}
        </div>

        {/* Day Pills & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
          {/* Day Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {DAYS.map(day => {
              const count = day === 'All'
                ? records.length
                : records.filter(r => r.day.toLowerCase() === day.toLowerCase()).length;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setFilterDay(day)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 ${
                    filterDay === day
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{day}</span>
                  <span
                    className={`text-2xs px-1 py-0.2 rounded-full ${
                      filterDay === day ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input, Status Filter, and New Record Button */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search records, blocks..."
                className="text-xs bg-gray-50 border border-gray-300 rounded pl-8 pr-3 py-1.5 w-44 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1.5 text-gray-700"
            >
              <option value="All">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>

            <button
              onClick={onOpenNewRecord}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Lesson
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Records List (Left) & Active Lesson Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Lesson Record Cards List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Records ({filtered.length})
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center text-xs text-gray-500">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No lesson records match your criteria.
              <div className="mt-3">
                <button
                  onClick={onOpenNewRecord}
                  className="inline-flex items-center px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Record
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filtered.map(record => {
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <div
                    key={record.id}
                    onClick={() => selectRecord(record.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all relative ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500 shadow-2xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-gray-900">
                            {record.className}
                          </span>
                          {record.section && (
                            <span className="text-2xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                              {record.section}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-indigo-700">
                            {record.day}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-1">
                          {record.target || <span className="text-gray-400 italic">No target entered</span>}
                        </p>
                      </div>

                      {/* Quick Completion Checkbox & Status */}
                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            toggleRecordCompleted(record.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            record.completed
                              ? 'text-emerald-600 bg-emerald-50'
                              : 'text-gray-300 hover:text-gray-600'
                          }`}
                          title={record.completed ? 'Completed' : 'Mark completed'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <span
                          className={`text-3xs uppercase font-bold px-1.5 py-0.5 rounded ${
                            record.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'ready'
                              ? 'bg-sky-100 text-sky-800'
                              : record.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Block count & quick actions */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-500">
                      <span className="font-medium text-gray-600">
                        {record.blocks.length} Block{record.blocks.length !== 1 ? 's' : ''}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            duplicateRecord(record.id);
                          }}
                          title="Duplicate record"
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm(`Delete record for ${record.day} (${record.className})?`)) {
                              deleteRecord(record.id);
                            }
                          }}
                          title="Delete record"
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Full Dynamic Lesson Editor */}
        <div className="lg:col-span-8">
          {selectedRecord ? (
            <LessonEditor record={selectedRecord} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No Record Selected</p>
              <p className="text-xs text-gray-500 mt-1">Select a record from the list or add a new lesson.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
