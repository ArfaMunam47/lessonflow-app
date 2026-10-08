/**
 * LessonFlow Dedicated Import History View
 * 
 * Provides:
 * - Full audit log of all document imports (Google Docs, PDFs, Pasted text)
 * - Quick actions: "View Lessons", "Re-import Latest Document", "Open Source Link", "Delete"
 * - Real data only: displays actual import records, or an honest empty state
 */

import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  History,
  FileText,
  ExternalLink,
  RefreshCw,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { ImportSourceType } from '../types/index.js';

export const ImportHistoryView: React.FC = () => {
  const {
    importHistory,
    deleteImportHistoryItem,
    selectWeek,
    setActiveView,
    initiateImportFromUrl,
    showToast,
  } = useApp();

  const getSourceBadge = (type: ImportSourceType) => {
    switch (type) {
      case 'google_doc':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#DBEAFE] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            Google Docs
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#FCE7F3] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <FileText className="w-3.5 h-3.5 mr-1" />
            PDF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <FileText className="w-3.5 h-3.5 mr-1" />
            Pasted Text
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Top Banner */}
      <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-black text-[#18181B] bg-[#FED7AA] px-2.5 py-0.5 rounded-md border-2 border-[#18181B]">
              Audit & Traceability
            </span>
            <span className="text-xs font-mono font-black text-[#18181B]">
              {importHistory.length} import record{importHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-xl font-black text-[#18181B] tracking-tight">
            Import History
          </h2>
          <p className="text-xs text-[#52525B] font-bold">
            Past curriculum documents parsed into LessonFlow. You can reopen lessons or re-fetch shared documents anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveView('import')}
          className="inline-flex items-center px-4 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer shrink-0"
        >
          <Upload className="w-4 h-4 mr-1.5 stroke-[2.5]" />
          New Import
        </button>
      </div>

      {/* History List or Empty State (Real data only) */}
      {importHistory.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#18181B] rounded-[22px] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FED7AA] border-2 border-[#18181B] flex items-center justify-center text-[#18181B] mx-auto shadow-[1px_1px_0px_#18181B]">
            <History className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#18181B]">No imports yet</h3>
            <p className="text-xs text-[#52525B] font-bold max-w-sm mx-auto leading-relaxed">
              When you import lesson plans from a Google Doc, PDF, or text, your import records and source links will appear here.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveView('import')}
              className="inline-flex items-center px-4 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Import Lesson Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#18181B] rounded-[22px] divide-y-2 divide-[#18181B]/15 overflow-hidden shadow-[2px_2px_0px_#18181B]">
          {importHistory.map(item => (
            <div
              key={item.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF7EE] transition-colors"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="mt-0.5 shrink-0">{getSourceBadge(item.sourceType)}</div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-base text-[#18181B] truncate">
                      {item.fileName}
                    </span>
                    {item.weekNumber && (
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B]">
                        {item.weekNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#52525B] font-bold">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-[#18181B]" />
                      {new Date(item.createdAt).toLocaleDateString()} at{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span className="font-black text-[#18181B]">
                      {item.lessonCount} lesson record{item.lessonCount !== 1 ? 's' : ''}
                    </span>

                    {item.sourceUrl && (
                      <>
                        <span>•</span>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#18181B] hover:underline flex items-center font-black"
                        >
                          Open Source Document <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                {item.sourceUrl && (
                  <button
                    type="button"
                    onClick={() => initiateImportFromUrl(item.sourceUrl!)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-black text-[#18181B] bg-white hover:bg-[#FAF7EE] rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
                    title="Re-fetch and re-extract document"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Re-import
                  </button>
                )}

                {item.weekId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (item.weekId) {
                        await selectWeek(item.weekId);
                        setActiveView('lessons');
                      }
                    }}
                    className="inline-flex items-center px-3.5 py-1.5 text-xs font-black text-[#18181B] bg-[#D1FAE5] hover:bg-[#A7F3D0] rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
                  >
                    View Lessons
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => deleteImportHistoryItem(item.id)}
                  className="p-1.5 text-[#52525B] hover:text-rose-600 hover:bg-rose-50 rounded-lg border-2 border-transparent hover:border-[#18181B] cursor-pointer"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
