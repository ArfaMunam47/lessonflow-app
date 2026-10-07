/**
 * LessonFlow Shared Document & Curriculum Import Workflow
 * 
 * Supports:
 * 1. Shared Document Links (Google Docs, published Google Docs, web documents)
 * 2. PDF Documents (drag-and-drop or select)
 * 3. Pasted Text / Curriculum notes
 * 
 * Core Workflow:
 * Share Link -> Fetch -> Extract -> Understand -> Review -> Import
 * 
 * Features:
 * - Live URL format detection & link inspection
 * - Clear guidance when a Google Doc is restricted/private
 * - One-click "Try Sample Google Doc" for instant testing
 * - Human-readable Review Screen with full editing, block management, and uncertainty flags
 * - Commits structured lessons into LessonFlow
 * - Import History with direct link to view lessons, open external doc, or re-import latest doc state
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { ParsedWeeklyImport, ParsedLessonDraft, ImportSourceType } from '../types/index.js';
import {
  Link as LinkIcon,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Plus,
  Lock,
  Sparkles,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  BookOpen,
} from 'lucide-react';

type ImportStage = 'idle' | 'fetching' | 'extracting' | 'analyzing' | 'organizing' | 'review' | 'error';
type TabType = 'link' | 'pdf' | 'text';

const SAMPLE_GOOGLE_DOC_URL = 'https://docs.google.com/document/d/sample-math-week-8/edit';

export const ImportView: React.FC = () => {
  const {
    commitImportDraft,
    importHistory,
    refreshImportHistory,
    deleteImportHistoryItem,
    selectWeek,
    setActiveView,
    showToast,
    pendingImportUrl,
    clearPendingImportUrl,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('link');
  const [stage, setStage] = useState<ImportStage>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  // Link input state
  const [sharedUrl, setSharedUrl] = useState('');
  const [urlInspection, setUrlInspection] = useState<{
    valid: boolean;
    sourceType: ImportSourceType | 'unknown';
    hint?: string;
    error?: string;
  } | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pasted text state
  const [pastedText, setPastedText] = useState('');

  // Extracted draft state for review
  const [reviewDraft, setReviewDraft] = useState<ParsedWeeklyImport | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<{
    title: string;
    sourceType: ImportSourceType;
    sourceUrl?: string;
    stats?: any;
  } | null>(null);

  // Handle pending import URL triggered externally (e.g. from history or lesson record)
  useEffect(() => {
    if (pendingImportUrl) {
      const url = pendingImportUrl;
      clearPendingImportUrl();
      setActiveTab('link');
      setSharedUrl(url);
      handleFetchFromUrl(url);
    }
  }, [pendingImportUrl, clearPendingImportUrl]);

  // Debounced live URL inspection
  useEffect(() => {
    if (!sharedUrl.trim()) {
      setUrlInspection(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await api.inspectUrl(sharedUrl.trim());
        setUrlInspection(result);
      } catch {
        // Fallback local check
        if (sharedUrl.includes('docs.google.com/document')) {
          setUrlInspection({ valid: true, sourceType: 'google_doc', hint: 'Google Docs detected.' });
        } else {
          setUrlInspection(null);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [sharedUrl]);

  const resetImport = () => {
    setStage('idle');
    setErrorMessage(null);
    setErrorType(null);
    setErrorHint(null);
    setReviewDraft(null);
    setExtractedMeta(null);
  };

  // --- Handlers for Import Actions ---

  const handleFetchFromUrl = async (urlToFetch?: string) => {
    const targetUrl = (urlToFetch || sharedUrl).trim();
    if (!targetUrl) {
      showToast('Please enter a document URL', 'error');
      return;
    }

    setStage('fetching');
    setErrorMessage(null);
    setErrorType(null);
    setErrorHint(null);

    try {
      setStage('extracting');
      await new Promise(r => setTimeout(r, 400));

      setStage('analyzing');
      const response = await api.parseImport({
        url: targetUrl,
      });

      setStage('organizing');
      await new Promise(r => setTimeout(r, 400));

      if (response.success && response.parsed) {
        setReviewDraft(response.parsed);
        setExtractedMeta(response.extractedDoc || null);
        setStage('review');
        showToast(`Document fetched! Found ${response.parsed.lessons.length} lessons.`, 'success');
      } else {
        throw new Error(response.error || 'Failed to extract lessons from document.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      const isRestricted = err.errorType === 'RESTRICTED_GOOGLE_DOC' || (err.message && err.message.includes('RESTRICTED_GOOGLE_DOC'));
      setErrorType(isRestricted ? 'RESTRICTED_GOOGLE_DOC' : 'ERROR');
      setErrorMessage(
        isRestricted
          ? 'This Google Doc is not publicly accessible.'
          : err.message || 'Unable to fetch lesson plan from this link.'
      );
      setErrorHint(
        err.hint ||
          (isRestricted
            ? 'Open the Google Doc, click Share (top-right), change General Access to "Anyone with the link can view", or copy the text directly.'
            : undefined)
      );
      setStage('error');
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a PDF document (.pdf)', 'error');
      return;
    }
    setSelectedFile(file);
    processPdfFile(file);
  };

  const processPdfFile = async (file: File) => {
    setStage('fetching');
    setErrorMessage(null);
    setErrorType(null);

    try {
      // Step 1: Read PDF into base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      });
      reader.readAsDataURL(file);

      const pdfBase64 = await base64Promise;

      setStage('extracting');
      await new Promise(r => setTimeout(r, 500));

      setStage('analyzing');
      const response = await api.parseImport({
        pdfBase64,
        fileName: file.name,
      });

      setStage('organizing');
      await new Promise(r => setTimeout(r, 400));

      if (response.success && response.parsed) {
        setReviewDraft(response.parsed);
        setExtractedMeta(response.extractedDoc || null);
        setStage('review');
      } else {
        throw new Error('Unable to extract structured lesson plans from this PDF.');
      }
    } catch (err: any) {
      console.error('PDF Import error:', err);
      setErrorMessage(err.message || "We couldn't process this PDF.");
      setStage('error');
    }
  };

  const handleProcessPastedText = async () => {
    if (!pastedText.trim()) return;
    setStage('analyzing');
    setErrorMessage(null);
    setErrorType(null);

    try {
      const response = await api.parseImport({
        rawText: pastedText,
        fileName: 'Pasted_Curriculum_Plan.txt',
      });

      if (response.success && response.parsed) {
        setReviewDraft(response.parsed);
        setExtractedMeta(response.extractedDoc || null);
        setStage('review');
      } else {
        throw new Error('Unable to parse lesson plans from the provided text.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to interpret lesson plan text.');
      setStage('error');
    }
  };

  const handleReimportFromHistory = async (importId: string) => {
    setStage('fetching');
    setErrorMessage(null);
    setErrorType(null);

    try {
      const res = await api.reimport(importId);
      if (res.success && res.parsed) {
        setReviewDraft(res.parsed);
        setExtractedMeta(res.extractedDoc || null);
        setStage('review');
        showToast('Fetched latest version of document for review.', 'success');
      } else {
        throw new Error(res.error || 'Failed to re-import document.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to re-fetch document.');
      setStage('error');
    }
  };

  // --- Review Screen Field Editing ---

  const handleUpdateDraftWeek = (field: 'weekNumber' | 'weekTitle', value: string) => {
    if (!reviewDraft) return;
    setReviewDraft({ ...reviewDraft, [field]: value });
  };

  const handleUpdateLesson = (lessonIndex: number, field: keyof ParsedLessonDraft, value: any) => {
    if (!reviewDraft) return;
    const updated = [...reviewDraft.lessons];
    updated[lessonIndex] = { ...updated[lessonIndex], [field]: value };
    setReviewDraft({ ...reviewDraft, lessons: updated });
  };

  const handleUpdateBlockField = (lessonIndex: number, blockIndex: number, fieldKey: string, value: string) => {
    if (!reviewDraft) return;
    const updated = [...reviewDraft.lessons];
    const lesson = { ...updated[lessonIndex] };
    const blocks = [...lesson.blocks];
    const block = { ...blocks[blockIndex] };
    block.fields = { ...block.fields, [fieldKey]: value };
    blocks[blockIndex] = block;
    lesson.blocks = blocks;
    updated[lessonIndex] = lesson;
    setReviewDraft({ ...reviewDraft, lessons: updated });
  };

  const handleAddBlock = (lessonIndex: number) => {
    if (!reviewDraft) return;
    const updated = [...reviewDraft.lessons];
    const lesson = { ...updated[lessonIndex] };
    const newBlockNumber = lesson.blocks.length + 1;
    lesson.blocks = [
      ...lesson.blocks,
      {
        blockNumber: newBlockNumber,
        fields: {
          objective: '',
          teacher_activity: '',
          student_activity: '',
        },
      },
    ];
    updated[lessonIndex] = lesson;
    setReviewDraft({ ...reviewDraft, lessons: updated });
  };

  const handleDeleteBlock = (lessonIndex: number, blockIndex: number) => {
    if (!reviewDraft) return;
    const updated = [...reviewDraft.lessons];
    const lesson = { ...updated[lessonIndex] };
    lesson.blocks = lesson.blocks
      .filter((_, i) => i !== blockIndex)
      .map((b, idx) => ({ ...b, blockNumber: idx + 1 }));
    updated[lessonIndex] = lesson;
    setReviewDraft({ ...reviewDraft, lessons: updated });
  };

  const handleDeleteLesson = (lessonIndex: number) => {
    if (!reviewDraft) return;
    const updated = reviewDraft.lessons.filter((_, i) => i !== lessonIndex);
    setReviewDraft({ ...reviewDraft, lessons: updated });
  };

  const handleCommit = async () => {
    if (!reviewDraft || reviewDraft.lessons.length === 0) return;
    try {
      await commitImportDraft(reviewDraft);
      resetImport();
    } catch (_) {
      // Error toast handled by context
    }
  };

  const getSourceBadge = (type: ImportSourceType) => {
    switch (type) {
      case 'google_doc':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3 mr-1" />
            Google Docs
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <FileText className="w-3 h-3 mr-1" />
            PDF File
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <FileText className="w-3 h-3 mr-1" />
            Pasted Text
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* View Header */}
      <div className="border-b border-gray-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Import Lesson Plan
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Import from Google Docs, PDF, or text. LessonFlow extracts the weekly structure and presents it for your review.
          </p>
        </div>

        {stage === 'review' && (
          <button
            type="button"
            onClick={resetImport}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 self-start sm:self-auto"
          >
            &larr; Choose Different Source
          </button>
        )}
      </div>

      {/* STAGE: IDLE - Source Selection Tabs & Inputs */}
      {stage === 'idle' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xs">
            {/* Format Selection Tabs */}
            <div className="flex border-b border-slate-200 mb-6 text-xs font-semibold space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`pb-2.5 px-4 flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'link'
                    ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Shared Document Link (Google Docs)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`pb-2.5 px-4 flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'pdf'
                    ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`pb-2.5 px-4 flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'text'
                    ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
            </div>

            {/* TAB 1: SHARED DOCUMENT LINK (Google Docs) */}
            {activeTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Paste Google Docs or supported document link
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={sharedUrl}
                      onChange={e => setSharedUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchFromUrl();
                        }
                      }}
                      placeholder="https://docs.google.com/document/d/..."
                      className="w-full text-xs border border-gray-300 rounded-lg pl-3 pr-36 py-2.5 text-gray-900 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchFromUrl()}
                      disabled={!sharedUrl.trim()}
                      className="absolute right-1.5 top-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs rounded-md shadow-xs transition-colors"
                    >
                      Fetch Document
                    </button>
                  </div>
                </div>

                {/* Live URL inspection feedback */}
                {urlInspection && (
                  <div
                    className={`text-2xs p-2.5 rounded-lg border flex items-center space-x-2 ${
                      urlInspection.valid
                        ? 'bg-blue-50/60 border-blue-200 text-blue-800'
                        : 'bg-amber-50/60 border-amber-200 text-amber-800'
                    }`}
                  >
                    {urlInspection.valid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {urlInspection.hint || urlInspection.error || 'Valid document link.'}
                    </span>
                  </div>
                )}

                {/* Helpful sharing instructions & sample button */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2 text-2xs text-gray-600">
                  <div className="flex items-center space-x-2 font-bold text-gray-700">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>How to share your Google Doc:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-gray-600">
                    <li>In Google Docs, click the blue <strong>Share</strong> button in the upper right.</li>
                    <li>Under <em>General access</em>, set to <strong>Anyone with the link</strong> (Viewer).</li>
                    <li>Click <strong>Copy link</strong> and paste it above.</li>
                  </ol>
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-gray-500">Want to test right now?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSharedUrl(SAMPLE_GOOGLE_DOC_URL);
                        handleFetchFromUrl(SAMPLE_GOOGLE_DOC_URL);
                      }}
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Try with sample curriculum Google Doc
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PDF UPLOAD */}
            {activeTab === 'pdf' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-10 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-indigo-50/20"
                >
                  <Upload className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-800">
                    Click to select or drag and drop your weekly lesson plan PDF
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepts standard PDF curriculum files containing single or multi-day lesson plans
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PASTED TEXT */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700">
                  Paste Lesson Plan Text or Markdown
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste weekly lesson plan content, targets, activities, and blocks here..."
                  className="w-full text-xs font-mono border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-md shadow-xs transition-colors"
                >
                  Analyze & Review Lesson Plan
                </button>
              </div>
            )}
          </div>

          {/* IMPORT HISTORY SECTION */}
          {importHistory.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Import History
                </h2>
                <span className="text-2xs text-gray-400">
                  {importHistory.length} import{importHistory.length !== 1 ? 's' : ''} recorded
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden shadow-xs">
                {importHistory.map(item => (
                  <div key={item.id} className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{getSourceBadge(item.sourceType)}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-800">
                            {item.fileName}
                          </span>
                          {item.weekNumber && (
                            <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                              {item.weekNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-gray-400 flex items-center space-x-2">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          <span>&bull;</span>
                          <span>{item.lessonCount} lesson records</span>
                          {item.sourceUrl && (
                            <>
                              <span>&bull;</span>
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline flex items-center"
                              >
                                Source Doc <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                      {item.weekId && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (item.weekId) {
                              await selectWeek(item.weekId);
                              setActiveView('lessons');
                            }
                          }}
                          className="px-2.5 py-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200"
                        >
                          View Lessons
                        </button>
                      )}

                      {item.sourceUrl && (
                        <button
                          type="button"
                          onClick={() => handleReimportFromHistory(item.id)}
                          className="px-2.5 py-1 text-2xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
                          title="Re-fetch latest content from this URL"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Re-import
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteImportHistoryItem(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE: PROCESSING STATES */}
      {(stage === 'fetching' || stage === 'extracting' || stage === 'analyzing' || stage === 'organizing') && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center space-y-4 shadow-xs">
          <RefreshCw className="w-8 h-8 text-indigo-600 mx-auto animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">
              {stage === 'fetching' && 'Connecting to document source...'}
              {stage === 'extracting' && 'Extracting text, headings, and tables...'}
              {stage === 'analyzing' && 'Interpreting lesson blocks with Gemini...'}
              {stage === 'organizing' && 'Structuring lessons across days & classes...'}
            </h3>
            {sharedUrl && activeTab === 'link' && (
              <p className="text-xs text-gray-500 font-mono truncate max-w-md mx-auto">
                {sharedUrl}
              </p>
            )}
            {selectedFile && activeTab === 'pdf' && (
              <p className="text-xs text-gray-500 font-mono">
                {selectedFile.name}
              </p>
            )}
          </div>
          <p className="text-2xs text-gray-400 max-w-sm mx-auto">
            LessonFlow preserves exact teacher text and organizes targets, activities, and blocks for school website entry.
          </p>
        </div>
      )}

      {/* STAGE: ERROR WITH HELPFUL ADVICE */}
      {stage === 'error' && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-4 shadow-xs">
          <div className="text-center space-y-2">
            {errorType === 'RESTRICTED_GOOGLE_DOC' ? (
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
            ) : (
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            )}
            <h3 className="text-base font-bold text-gray-900">
              {errorType === 'RESTRICTED_GOOGLE_DOC'
                ? 'Google Doc Permission Needed'
                : 'Unable to Process Document'}
            </h3>
            <p className="text-xs text-gray-700 max-w-lg mx-auto">
              {errorMessage}
            </p>
          </div>

          {errorHint && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-lg mx-auto text-xs text-amber-900 space-y-2">
              <span className="font-bold block">How to resolve:</span>
              <p>{errorHint}</p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('text');
                    resetImport();
                  }}
                  className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold rounded text-2xs"
                >
                  Switch to Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSharedUrl(SAMPLE_GOOGLE_DOC_URL);
                    handleFetchFromUrl(SAMPLE_GOOGLE_DOC_URL);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded text-2xs"
                >
                  Test with Sample Google Doc
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => {
                if (activeTab === 'link' && sharedUrl) {
                  handleFetchFromUrl();
                } else if (activeTab === 'pdf' && selectedFile) {
                  processPdfFile(selectedFile);
                } else {
                  resetImport();
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-xs"
            >
              Try Again
            </button>
            <button
              onClick={resetImport}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-md"
            >
              Back to Import Options
            </button>
          </div>
        </div>
      )}

      {/* STAGE: REVIEW SCREEN */}
      {stage === 'review' && reviewDraft && (
        <div className="space-y-6">
          {/* Top Review Banner & Commit Bar */}
          <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-2xs uppercase font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Review Extracted Lessons
                </span>
                {getSourceBadge(reviewDraft.sourceType)}
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Found {reviewDraft.lessons.length} lesson record{reviewDraft.lessons.length !== 1 ? 's' : ''} in {reviewDraft.fileName}
              </h2>
              <div className="text-2xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Verify and edit any fields below before saving.</span>
                {reviewDraft.sourceUrl && (
                  <a
                    href={reviewDraft.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline flex items-center font-semibold"
                  >
                    Open original document <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                )}
                {reviewDraft.extractedSummary && (
                  <span className="text-slate-400">
                    Preserved: {reviewDraft.extractedSummary.tablesCount || 0} tables, {reviewDraft.extractedSummary.headingsCount || 0} headings
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={resetImport}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommit}
                className="inline-flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Import & Save ({reviewDraft.lessons.length} Lessons)
              </button>
            </div>
          </div>

          {/* Week Metadata Inputs */}
          <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Week Label <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={reviewDraft.weekNumber}
                onChange={e => handleUpdateDraftWeek('weekNumber', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Curriculum Topic / Title
              </label>
              <input
                type="text"
                value={reviewDraft.weekTitle}
                onChange={e => handleUpdateDraftWeek('weekTitle', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-slate-900 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Individual Lesson Cards for Review */}
          <div className="space-y-4">
            {reviewDraft.lessons.map((lesson, lIdx) => (
              <div
                key={lesson.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 ${
                  lesson.needsReview ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-slate-300'
                }`}
              >
                {/* Lesson Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-900">
                      Lesson #{lIdx + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">
                      ({lesson.day} - {lesson.className} {lesson.section ? `[${lesson.section}]` : ''})
                    </span>
                    {lesson.needsReview && (
                      <span className="text-2xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Needs review
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAddBlock(lIdx)}
                      className="inline-flex items-center px-2 py-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Block
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lIdx)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded"
                      title="Remove this lesson from import"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day, Class, Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-600 mb-1">Day</label>
                    <input
                      type="text"
                      value={lesson.day}
                      onChange={e => handleUpdateLesson(lIdx, 'day', e.target.value)}
                      className="w-full border border-gray-300 rounded p-1.5 font-semibold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-600 mb-1">Class</label>
                    <input
                      type="text"
                      value={lesson.className}
                      onChange={e => handleUpdateLesson(lIdx, 'className', e.target.value)}
                      className="w-full border border-gray-300 rounded p-1.5 font-semibold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-600 mb-1">Section</label>
                    <input
                      type="text"
                      value={lesson.section || ''}
                      onChange={e => handleUpdateLesson(lIdx, 'section', e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-gray-300 rounded p-1.5 text-gray-900"
                    />
                  </div>
                </div>

                {/* Target & Activities */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Learning Target</label>
                    <textarea
                      rows={2}
                      value={lesson.target}
                      onChange={e => handleUpdateLesson(lIdx, 'target', e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-gray-900 resize-y font-sans"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Activities & Procedures</label>
                    <textarea
                      rows={2}
                      value={lesson.activities}
                      onChange={e => handleUpdateLesson(lIdx, 'activities', e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-gray-900 resize-y font-sans"
                    />
                  </div>
                </div>

                {/* Dynamic Blocks in this lesson */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs uppercase font-bold text-gray-500">
                      Dynamic Blocks ({lesson.blocks.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddBlock(lIdx)}
                      className="text-2xs font-semibold text-indigo-600 hover:underline flex items-center"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" />
                      Add Block
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lesson.blocks.map((block, bIdx) => (
                      <div
                        key={bIdx}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-xs relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 text-xs">
                            Block {block.blockNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(lIdx, bIdx)}
                            className="text-gray-400 hover:text-rose-600 p-0.5 rounded"
                            title="Delete this block"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {Object.entries(block.fields).map(([k, val]) => (
                            <div key={k}>
                              <label className="block text-3xs font-bold text-gray-500 uppercase">
                                {k.replace(/_/g, ' ')}
                              </label>
                              <textarea
                                rows={2}
                                value={val}
                                onChange={e => handleUpdateBlockField(lIdx, bIdx, k, e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded p-1.5 text-2xs text-gray-900 resize-y font-sans"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Commit Action Bar */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={resetImport}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Import & Save All ({reviewDraft.lessons.length} Lessons)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
