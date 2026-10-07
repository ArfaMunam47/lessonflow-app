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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3 mr-1" />
            Google Docs
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <FileText className="w-3 h-3 mr-1" />
            PDF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3 h-3 mr-1" />
            Pasted Text
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xs uppercase font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              Audit & Traceability
            </span>
            <span className="text-xs text-slate-500">
              {importHistory.length} import record{importHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Import History
          </h2>
          <p className="text-xs text-slate-500">
            Past curriculum documents parsed into LessonFlow. You can reopen lessons or re-fetch shared documents anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveView('import')}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          New Import
        </button>
      </div>

      {/* History List or Empty State (Real data only) */}
      {importHistory.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No imports yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              When you import lesson plans from a Google Doc, PDF, or text, your import records and source links will appear here.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveView('import')}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import Lesson Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-300 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
          {importHistory.map(item => (
            <div
              key={item.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="mt-0.5 shrink-0">{getSourceBadge(item.sourceType)}</div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {item.fileName}
                    </span>
                    {item.weekNumber && (
                      <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.weekNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-400">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(item.createdAt).toLocaleDateString()} at{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>&bull;</span>
                    <span className="font-semibold text-slate-600">
                      {item.lessonCount} lesson record{item.lessonCount !== 1 ? 's' : ''}
                    </span>

                    {item.sourceUrl && (
                      <>
                        <span>&bull;</span>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center font-semibold"
                        >
                          Open Source Document <ExternalLink className="w-2.5 h-2.5 ml-1" />
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
                    className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
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
                    className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
                  >
                    View Lessons
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => deleteImportHistoryItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
