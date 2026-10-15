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
  ExternalLink,
  RefreshCw,
  FileText,
  BookOpen,
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
    initiateImportFromUrl,
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
    <div className="bg-white border-2 border-[#18181B] rounded-[22px] shadow-[2px_2px_0px_#18181B] overflow-hidden">
      
      {/* Top Navigation & Status Bar */}
      <div className="bg-[#FAF7EE] border-b-2 border-[#18181B] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Record index and Fast Navigation */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={prevRecord}
            disabled={isFirst}
            title="Previous record (Alt + Left)"
            className="p-1.5 rounded-xl border-2 border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] disabled:opacity-30 disabled:hover:bg-white shadow-[1px_1px_0px_#18181B] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={nextRecord}
            disabled={isLast}
            title="Next record (Alt + Right)"
            className="p-1.5 rounded-xl border-2 border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] disabled:opacity-30 disabled:hover:bg-white shadow-[1px_1px_0px_#18181B] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Jump To Record dropdown */}
          <select
            value={record.id}
            onChange={e => selectRecord(e.target.value)}
            className="text-xs font-black bg-white border-2 border-[#18181B] rounded-xl py-1.5 px-3 text-[#18181B] focus:outline-hidden shadow-[1px_1px_0px_#18181B] cursor-pointer"
          >
            {records.map((r, idx) => (
              <option key={r.id} value={r.id}>
                #{idx + 1}: {r.day} — {r.className} {r.section ? `(${r.section})` : ''} [{r.status}]
              </option>
            ))}
          </select>

          <span className="text-[11px] font-bold text-[#52525B] hidden sm:inline">
            Record {currentIndex + 1} of {records.length}
          </span>
        </div>

        {/* Record Status and Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Mark Complete Checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-black text-[#18181B] bg-white border-2 border-[#18181B] px-3 py-1.5 rounded-xl hover:bg-[#FAF7EE] shadow-[1px_1px_0px_#18181B] transition-all">
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
              className="w-3.5 h-3.5 text-[#18181B] rounded cursor-pointer accent-[#18181B]"
            />
            <span className={record.completed ? 'text-emerald-700 font-black' : ''}>
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
            className={`text-xs font-black rounded-xl py-1.5 px-2.5 border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] focus:outline-hidden cursor-pointer ${
              record.status === 'completed'
                ? 'bg-[#D1FAE5] text-[#18181B]'
                : record.status === 'ready'
                ? 'bg-[#DBEAFE] text-[#18181B]'
                : record.status === 'in_progress'
                ? 'bg-[#FEF08A] text-[#18181B]'
                : 'bg-white text-[#18181B]'
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
            className="inline-flex items-center px-2.5 py-1.5 border-2 border-[#18181B] text-xs font-black rounded-xl text-[#18181B] bg-white hover:bg-[#FAF7EE] shadow-[1px_1px_0px_#18181B] cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
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
            className="p-1.5 border-2 border-[#18181B] text-[#18181B] hover:text-rose-600 hover:bg-rose-50 rounded-xl bg-white shadow-[1px_1px_0px_#18181B] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metadata Section: Identifiers, Topic & School Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-[#FAF7EE] p-4 rounded-2xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Source Identifier
            </label>
            <input
              type="text"
              value={record.sourceLessonId || ''}
              onChange={e => handleFieldChange('sourceLessonId', e.target.value)}
              placeholder="e.g. 11 C Day 3"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Class <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={record.className}
              onChange={e => handleFieldChange('className', e.target.value)}
              placeholder="e.g. Class 11, 6A"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Section
            </label>
            <input
              type="text"
              value={record.section}
              onChange={e => handleFieldChange('section', e.target.value)}
              placeholder="e.g. C, Blue"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Day / Day Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="days-list"
              value={record.dayNumber || record.day}
              onChange={e => {
                handleFieldChange('day', e.target.value);
                handleFieldChange('dayNumber', e.target.value);
              }}
              placeholder="e.g. Day 3, Monday"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
            <datalist id="days-list">
              {DAYS_OF_WEEK.map(d => (
                <option key={d} value={d} />
              ))}
              <option value="Day 1" />
              <option value="Day 2" />
              <option value="Day 3" />
              <option value="Day 4" />
              <option value="Day 5" />
            </datalist>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-black text-[#18181B] uppercase tracking-wider">
                Lesson Topic (Day-Specific)
              </label>
              {!record.topic?.trim() && (
                <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  Missing Topic
                </span>
              )}
            </div>
            <input
              type="text"
              value={record.topic || ''}
              onChange={e => handleFieldChange('topic', e.target.value)}
              placeholder="e.g. Quadratic Equations (distinct from Target)"
              className={`w-full text-xs font-bold text-[#18181B] bg-white border-2 rounded-xl px-3 py-1.5 focus:outline-hidden ${
                !record.topic?.trim() ? 'border-amber-400 bg-amber-50/40' : 'border-[#18181B]'
              }`}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Subject
            </label>
            <input
              type="text"
              value={record.subject || ''}
              onChange={e => handleFieldChange('subject', e.target.value)}
              placeholder="e.g. Mathematics, Physics"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Teacher Name
            </label>
            <input
              type="text"
              value={record.teacherName || ''}
              onChange={e => handleFieldChange('teacherName', e.target.value)}
              placeholder="e.g. Mr. Smith"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1">
              Duration
            </label>
            <input
              type="text"
              value={record.duration || ''}
              onChange={e => handleFieldChange('duration', e.target.value)}
              placeholder="e.g. 45 mins, 60 mins"
              className="w-full text-xs font-bold text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl px-3 py-1.5 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Source Document Traceability (Google Doc / PDF origin) */}
        {(record.sourceUrl || record.sourceFileName) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#DBEAFE] border-2 border-[#18181B] rounded-xl text-xs text-[#18181B] font-bold shadow-[1px_1px_0px_#18181B]">
            <div className="flex items-center space-x-2 min-w-0">
              {record.sourceType === 'google_doc' ? (
                <BookOpen className="w-4 h-4 stroke-[2.5] shrink-0" />
              ) : (
                <FileText className="w-4 h-4 stroke-[2.5] shrink-0" />
              )}
              <span>Imported from:</span>
              <span className="font-black truncate max-w-xs">
                {record.sourceFileName || (record.sourceType === 'google_doc' ? 'Google Document' : 'Document')}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {record.sourceUrl && (
                <>
                  <a
                    href={record.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center font-black hover:underline"
                  >
                    Open Source Doc
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => initiateImportFromUrl(record.sourceUrl!)}
                    className="inline-flex items-center font-black hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Re-import
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Core Lesson Fields: Target, Learning Outcomes, and Activities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Attainment Target */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-[#18181B]">
                Attainment Target
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    copyToSystemClipboard(record.target, `${record.day} ${record.className} Target`)
                  }
                  title="Copy clean target text"
                  className="inline-flex items-center text-[10px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] cursor-pointer"
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
                  className="inline-flex items-center text-[10px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] cursor-pointer"
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
              placeholder="e.g. CCSS standard or attainment target..."
              className="w-full text-xs font-medium text-[#18181B] border-2 border-[#18181B] rounded-xl p-2.5 bg-white shadow-[1px_1px_0px_#18181B]/30 focus:outline-hidden resize-y"
            />
          </div>

          {/* Learning Outcomes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-[#18181B]">
                Learning Outcomes
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    copyToSystemClipboard(record.learningOutcomes || '', `${record.day} ${record.className} Outcomes`)
                  }
                  title="Copy learning outcomes text"
                  className="inline-flex items-center text-[10px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] cursor-pointer"
                >
                  <Copy className="w-2.5 h-2.5 mr-1" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addClipboardItem(
                      record.learningOutcomes || '',
                      `${record.day} ${record.className} Outcomes`,
                      'target'
                    )
                  }
                  title="Save outcomes to clipboard gallery"
                  className="inline-flex items-center text-[10px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] cursor-pointer"
                >
                  <ClipboardPlus className="w-2.5 h-2.5 mr-1" />
                  + Gallery
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={record.learningOutcomes || ''}
              onChange={e => handleFieldChange('learningOutcomes', e.target.value)}
              placeholder="e.g. SWBAT isolate the unknown variable in a two-step equation..."
              className="w-full text-xs font-medium text-[#18181B] border-2 border-[#18181B] rounded-xl p-2.5 bg-white shadow-[1px_1px_0px_#18181B]/30 focus:outline-hidden resize-y"
            />
          </div>

          {/* Activities */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-[#18181B]">
                Activities & Procedures
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    copyToSystemClipboard(record.activities, `${record.day} ${record.className} Activities`)
                  }
                  title="Copy clean activities text"
                  className="inline-flex items-center text-[10px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] cursor-pointer"
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
                  className="inline-flex items-center text-[10px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] cursor-pointer"
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
              className="w-full text-xs font-medium text-[#18181B] border-2 border-[#18181B] rounded-xl p-2.5 bg-white shadow-[1px_1px_0px_#18181B]/30 focus:outline-hidden resize-y"
            />
          </div>
        </div>

        {/* Block Builder Controls Header */}
        <div className="pt-4 border-t-2 border-[#18181B]/15">
          <div className="bg-[#EDE9FE] border-2 border-[#18181B] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-[1px_1px_0px_#18181B]">
            
            {/* Quick Create N Blocks Feature */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-[#18181B]">
                Number of blocks:
              </span>
              <input
                type="number"
                min="1"
                max="15"
                value={blocksToCreateCount}
                onChange={e => setBlocksToCreateCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center font-black text-xs bg-white border-2 border-[#18181B] rounded-lg py-1 px-1 text-[#18181B]"
              />
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="text-xs font-bold bg-white border-2 border-[#18181B] rounded-lg py-1 px-2 text-[#18181B] cursor-pointer"
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
                className="inline-flex items-center px-3.5 py-1.5 bg-[#18181B] hover:bg-neutral-800 text-white text-xs font-black rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                Create {blocksToCreateCount} Block{blocksToCreateCount > 1 ? 's' : ''}
              </button>
            </div>

            {/* View Mode Toggle (Card vs Spreadsheet Grid) & Extract */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => extractRecordToClipboard(record.id)}
                title="Extract all blocks and fields into the persistent clipboard gallery"
                className="inline-flex items-center px-3 py-1.5 text-xs font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] rounded-xl shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                <ClipboardPlus className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
                Extract All to Gallery
              </button>

              <div className="inline-flex rounded-xl shadow-[1px_1px_0px_#18181B] border-2 border-[#18181B] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  title="Card view"
                  className={`px-2 py-1 rounded-lg text-xs font-black flex items-center space-x-1 cursor-pointer transition-colors ${
                    viewMode === 'card'
                      ? 'bg-[#FEF08A] text-[#18181B]'
                      : 'text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[11px] hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Spreadsheet table view"
                  className={`px-2 py-1 rounded-lg text-xs font-black flex items-center space-x-1 cursor-pointer transition-colors ${
                    viewMode === 'table'
                      ? 'bg-[#FEF08A] text-[#18181B]'
                      : 'text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[11px] hidden sm:inline">Spreadsheet</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 space-y-4 shadow-[4px_4px_0px_#18181B] border-2 border-[#18181B]">
            <h3 className="text-base font-black text-[#18181B]">Duplicate Lesson Record</h3>
            <p className="text-xs text-[#52525B] font-bold leading-normal">
              Copy this lesson plan ({record.day} — {record.className}) with all its blocks and fields into a new editable record.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-[#18181B] mb-1">
                  Target Day
                </label>
                <select
                  value={duplicateTargetDay}
                  onChange={e => setDuplicateTargetDay(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-[#18181B] rounded-xl p-2 text-[#18181B] bg-[#FAF7EE] cursor-pointer"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#18181B] mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={duplicateTargetClass}
                  onChange={e => setDuplicateTargetClass(e.target.value)}
                  className="w-full text-xs font-bold border-2 border-[#18181B] rounded-xl p-2 text-[#18181B] bg-[#FAF7EE]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t-2 border-[#18181B]/15">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-3.5 py-2 text-xs font-black text-[#18181B] hover:bg-[#FAF7EE] bg-white border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicateConfirm}
                className="px-4 py-2 text-xs font-black text-white bg-[#18181B] hover:bg-neutral-800 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
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
