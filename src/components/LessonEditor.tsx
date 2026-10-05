/**
 * Lesson Record Editor Component
 * 
 * Provides:
 * - High-speed record navigation (Prev, Next, Jump to record)
 * - Header metadata (Class, Section, Day, Date)
 * - Target and Activities fields with 1-click clean copy & clipboard gallery extraction
 * - Dynamic block builder controls (batch create N blocks, template selector)
 * - Toggle between Card View and Spreadsheet Grid View
 * - Status updating and manual / autosave handling
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { LessonRecord, Block, RecordStatus } from '../types/index.js';
import { BlockBuilder } from './BlockBuilder.js';
import { BlockSpreadsheetEditor } from './BlockSpreadsheetEditor.js';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
  Table,
  LayoutGrid,
  CheckCircle2,
  ClipboardPlus,
  Save,
  Check,
} from 'lucide-react';

interface LessonEditorProps {
  record: LessonRecord;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const LessonEditor: React.FC<LessonEditorProps> = ({ record }) => {
  const {
    records,
    selectRecord,
    nextRecord,
    prevRecord,
    updateRecord,
    deleteRecord,
    duplicateRecord,
    createBlocks,
    templates,
    copyToSystemClipboard,
    addClipboardItem,
    extractRecordToClipboard,
    saveStatus,
  } = useApp();

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [blocksToCreateCount, setBlocksToCreateCount] = useState<number>(5);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : ''
  );
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTargetDay, setDuplicateTargetDay] = useState(record.day);
  const [duplicateTargetClass, setDuplicateTargetClass] = useState(record.className);

  const currentIndex = records.findIndex(r => r.id === record.id);
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex === records.length - 1;

  const handleBlocksChange = (newBlocks: Block[]) => {
    updateRecord({ blocks: newBlocks });
  };

  const handleFieldChange = (field: keyof LessonRecord, val: any) => {
    updateRecord({ [field]: val });
  };

  const handleBatchCreateBlocks = () => {
    if (blocksToCreateCount > 0) {
      createBlocks(blocksToCreateCount, selectedTemplateId || undefined);
    }
  };

  const handleDuplicateConfirm = async () => {
    await duplicateRecord(record.id, {
      day: duplicateTargetDay,
      className: duplicateTargetClass,
      section: record.section,
    });
    setShowDuplicateModal(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
      
      {/* Top Navigation & Status Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Record index and Fast Navigation */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={prevRecord}
            disabled={isFirst}
            title="Previous record (Alt + Left)"
            className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={nextRecord}
            disabled={isLast}
            title="Next record (Alt + Right)"
            className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump To Record dropdown */}
          <select
            value={record.id}
            onChange={e => selectRecord(e.target.value)}
            className="text-xs font-semibold bg-white border border-gray-300 rounded-md py-1.5 px-2.5 text-gray-900 focus:outline-hidden"
          >
            {records.map((r, idx) => (
              <option key={r.id} value={r.id}>
                #{idx + 1}: {r.day} — {r.className} {r.section ? `(${r.section})` : ''} [{r.status}]
              </option>
            ))}
          </select>

          <span className="text-2xs text-gray-500 hidden sm:inline">
            Record {currentIndex + 1} of {records.length}
          </span>
        </div>

        {/* Record Status and Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Mark Complete Checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-gray-700 bg-white border border-gray-300 px-2.5 py-1.5 rounded-md hover:bg-gray-50">
            <input
              type="checkbox"
              checked={record.completed}
              onChange={e => {
                const comp = e.target.checked;
                updateRecord({
                  completed: comp,
                  status: comp ? 'completed' : 'draft',
                }, true);
              }}
              className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-0 cursor-pointer"
            />
            <span className={record.completed ? 'text-emerald-700 font-bold' : ''}>
              {record.completed ? 'Completed' : 'Mark Done'}
            </span>
          </label>

          {/* Status Dropdown */}
          <select
            value={record.status}
            onChange={e => {
              const newStatus = e.target.value as RecordStatus;
              updateRecord({
                status: newStatus,
                completed: newStatus === 'completed',
              }, true);
            }}
            className={`text-xs font-bold rounded-md py-1 px-2 border focus:outline-hidden ${
              record.status === 'completed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : record.status === 'ready'
                ? 'bg-sky-50 text-sky-800 border-sky-300'
                : record.status === 'in_progress'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-gray-100 text-gray-800 border-gray-300'
            }`}
          >
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>

          {/* Duplicate Record */}
          <button
            type="button"
            onClick={() => {
              setDuplicateTargetDay(record.day);
              setDuplicateTargetClass(record.className);
              setShowDuplicateModal(true);
            }}
            title="Duplicate this lesson record"
            className="inline-flex items-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100"
          >
            <Copy className="w-3.5 h-3.5 mr-1 text-gray-500" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Delete Record */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete lesson record for ${record.day} (${record.className})?`)) {
                deleteRecord(record.id);
              }
            }}
            title="Delete this lesson record"
            className="p-1.5 border border-gray-300 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Metadata Section: Class, Section, Day, Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/60 p-3.5 rounded-lg border border-gray-200">
          <div>
            <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Class <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={record.className}
              onChange={e => handleFieldChange('className', e.target.value)}
              placeholder="e.g. 6A"
              className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Section
            </label>
            <input
              type="text"
              value={record.section}
              onChange={e => handleFieldChange('section', e.target.value)}
              placeholder="e.g. Blue"
              className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Day <span className="text-rose-500">*</span>
            </label>
            <select
              value={record.day}
              onChange={e => handleFieldChange('day', e.target.value)}
              className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {DAYS_OF_WEEK.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Date (Optional)
            </label>
            <input
              type="date"
              value={record.date || ''}
              onChange={e => handleFieldChange('date', e.target.value)}
              className="w-full text-xs text-gray-900 bg-white border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Core Lesson Fields: Target and Activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800">
                Weekly / Lesson Target
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    copyToSystemClipboard(record.target, `${record.day} ${record.className} Target`)
                  }
                  title="Copy clean target text"
                  className="inline-flex items-center text-3xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-1.5 py-0.5 rounded"
                >
                  <Copy className="w-2.5 h-2.5 mr-1" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addClipboardItem(
                      record.target,
                      `${record.day} ${record.className} Target`,
                      'target'
                    )
                  }
                  title="Save target to clipboard gallery"
                  className="inline-flex items-center text-3xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-1.5 py-0.5 rounded"
                >
                  <ClipboardPlus className="w-2.5 h-2.5 mr-1" />
                  + Gallery
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={record.target}
              onChange={e => handleFieldChange('target', e.target.value)}
              placeholder="e.g. Students will understand how to convert proper fractions to decimals..."
              className="w-full text-xs text-gray-900 border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            />
          </div>

          {/* Activities */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800">
                Activities & Procedures
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    copyToSystemClipboard(record.activities, `${record.day} ${record.className} Activities`)
                  }
                  title="Copy clean activities text"
                  className="inline-flex items-center text-3xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-1.5 py-0.5 rounded"
                >
                  <Copy className="w-2.5 h-2.5 mr-1" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addClipboardItem(
                      record.activities,
                      `${record.day} ${record.className} Activities`,
                      'activities'
                    )
                  }
                  title="Save activities to clipboard gallery"
                  className="inline-flex items-center text-3xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-1.5 py-0.5 rounded"
                >
                  <ClipboardPlus className="w-2.5 h-2.5 mr-1" />
                  + Gallery
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={record.activities}
              onChange={e => handleFieldChange('activities', e.target.value)}
              placeholder="e.g. 1. Fractions warm-up 2. Whiteboard exercises 3. Exit ticket evaluation..."
              className="w-full text-xs text-gray-900 border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            />
          </div>
        </div>

        {/* Block Builder Controls Header */}
        <div className="pt-4 border-t border-gray-200">
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            
            {/* Quick Create N Blocks Feature (Requirement 7) */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-800">
                Number of blocks:
              </span>
              <input
                type="number"
                min="1"
                max="15"
                value={blocksToCreateCount}
                onChange={e => setBlocksToCreateCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center font-bold text-xs bg-white border border-gray-300 rounded py-1 px-1 text-gray-900"
              />
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="text-xs bg-white border border-gray-300 rounded py-1 px-2 text-gray-700"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    Template: {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBatchCreateBlocks}
                className="inline-flex items-center px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create {blocksToCreateCount} Block{blocksToCreateCount > 1 ? 's' : ''}
              </button>
            </div>

            {/* View Mode Toggle (Card vs Spreadsheet Grid) & Extract */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => extractRecordToClipboard(record.id)}
                title="Extract all blocks and fields into the persistent clipboard gallery"
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
              >
                <ClipboardPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Extract All to Gallery
              </button>

              <div className="inline-flex rounded-md shadow-2xs border border-gray-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  title="Card view"
                  className={`p-1 rounded text-xs flex items-center space-x-1 ${
                    viewMode === 'card'
                      ? 'bg-indigo-100 text-indigo-800 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="text-2xs hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Spreadsheet table view"
                  className={`p-1 rounded text-xs flex items-center space-x-1 ${
                    viewMode === 'table'
                      ? 'bg-indigo-100 text-indigo-800 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="text-2xs hidden sm:inline">Spreadsheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Render Active View Mode */}
          {viewMode === 'card' ? (
            <BlockBuilder blocks={record.blocks} onBlocksChange={handleBlocksChange} />
          ) : (
            <BlockSpreadsheetEditor blocks={record.blocks} onBlocksChange={handleBlocksChange} />
          )}
        </div>
      </div>

      {/* Duplicate Record Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900">Duplicate Lesson Record</h3>
            <p className="text-xs text-gray-600 leading-normal">
              Copy this lesson plan ({record.day} — {record.className}) with all its blocks and fields into a new editable record.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Day
                </label>
                <select
                  value={duplicateTargetDay}
                  onChange={e => setDuplicateTargetDay(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 text-gray-900"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={duplicateTargetClass}
                  onChange={e => setDuplicateTargetClass(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicateConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
              >
                Duplicate Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
