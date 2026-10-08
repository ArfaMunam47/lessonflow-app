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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#DBEAFE] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            Google Docs
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#FCE7F3] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <FileText className="w-3.5 h-3.5 mr-1" />
            PDF File
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
    <div className="max-w-4xl mx-auto space-y-7 py-2">
      {/* View Header */}
      <div className="border-b-2 border-[#18181B]/15 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#18181B] tracking-tight">
            Import Lesson Plan
          </h1>
          <p className="text-xs sm:text-sm text-[#52525B] font-bold mt-1 max-w-xl">
            Import from Google Docs, PDF, or text. LessonFlow extracts the weekly curriculum and presents it for your review.
          </p>
        </div>

        {stage === 'review' && (
          <button
            type="button"
            onClick={resetImport}
            className="text-xs font-black text-[#18181B] hover:underline self-start sm:self-auto cursor-pointer"
          >
            ← Choose Different Source
          </button>
        )}
      </div>

      {/* STAGE: IDLE - Source Selection Tabs & Inputs */}
      {stage === 'idle' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#18181B] rounded-[24px] p-6 sm:p-8 shadow-[3px_3px_0px_#18181B]">
            {/* Format Selection Tabs */}
            <div className="flex flex-wrap gap-2 border-b-2 border-[#18181B]/15 pb-5 mb-6 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`py-2 px-4 rounded-xl border-2 transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'link'
                    ? 'bg-[#DBEAFE] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-white text-[#52525B] border-transparent hover:border-[#18181B]/30'
                }`}
              >
                <LinkIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Google Docs Link</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`py-2 px-4 rounded-xl border-2 transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-[#FCE7F3] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-white text-[#52525B] border-transparent hover:border-[#18181B]/30'
                }`}
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Upload PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`py-2 px-4 rounded-xl border-2 transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-[#FEF08A] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-white text-[#52525B] border-transparent hover:border-[#18181B]/30'
                }`}
              >
                <FileText className="w-4 h-4 stroke-[2.5]" />
                <span>Paste Text</span>
              </button>
            </div>

            {/* TAB 1: SHARED DOCUMENT LINK (Google Docs) */}
            {activeTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-2">
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
                      className="w-full text-xs border-2 border-[#18181B] rounded-xl pl-3.5 pr-40 py-3 text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden font-mono shadow-[1px_1px_0px_#18181B]"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchFromUrl()}
                      disabled={!sharedUrl.trim()}
                      className="absolute right-2 top-2 px-4 py-2 bg-[#18181B] hover:bg-neutral-800 disabled:opacity-40 text-white font-black text-xs rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] transition-all cursor-pointer"
                    >
                      Fetch Document
                    </button>
                  </div>
                </div>

                {/* Live URL inspection feedback */}
                {urlInspection && (
                  <div
                    className={`text-xs p-3 rounded-xl border-2 flex items-center space-x-2.5 font-bold ${
                      urlInspection.valid
                        ? 'bg-[#DBEAFE] border-[#18181B] text-[#18181B]'
                        : 'bg-[#FEF08A] border-[#18181B] text-[#18181B]'
                    }`}
                  >
                    {urlInspection.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-[#18181B] stroke-[2.5] shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#18181B] stroke-[2.5] shrink-0" />
                    )}
                    <span>
                      {urlInspection.hint || urlInspection.error || 'Valid document link.'}
                    </span>
                  </div>
                )}

                {/* Helpful sharing instructions & sample button */}
                <div className="bg-[#FAF7EE] border-2 border-[#18181B] rounded-2xl p-4 space-y-2.5 text-xs text-[#52525B] font-bold shadow-[2px_2px_0px_#18181B]">
                  <div className="flex items-center space-x-2 text-[#18181B] font-black">
                    <Info className="w-4 h-4 stroke-[2.5]" />
                    <span>How to share your Google Doc:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-[#3F3F46]">
                    <li>In Google Docs, click the blue <strong>Share</strong> button in the upper right.</li>
                    <li>Under <em>General access</em>, set to <strong>Anyone with the link</strong> (Viewer).</li>
                    <li>Click <strong>Copy link</strong> and paste it above.</li>
                  </ol>
                  <div className="pt-2 border-t-2 border-[#18181B]/15 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#52525B]">Want to test right now?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSharedUrl(SAMPLE_GOOGLE_DOC_URL);
                        handleFetchFromUrl(SAMPLE_GOOGLE_DOC_URL);
                      }}
                      className="inline-flex items-center text-[#18181B] bg-white border-2 border-[#18181B] px-3 py-1 rounded-lg shadow-[1px_1px_0px_#18181B] font-black hover:bg-[#FEF08A] transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
                      Try sample curriculum Google Doc
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
                  className="border-2 border-dashed border-[#18181B] hover:bg-[#FAF7EE] rounded-2xl p-10 text-center cursor-pointer transition-all bg-[#FAF7EE]/50 shadow-[2px_2px_0px_#18181B]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#FCE7F3] border-2 border-[#18181B] flex items-center justify-center mx-auto mb-3 shadow-[1px_1px_0px_#18181B]">
                    <Upload className="w-7 h-7 text-[#18181B] stroke-[2.5]" />
                  </div>
                  <p className="text-sm font-black text-[#18181B]">
                    Click to select or drag and drop your weekly lesson plan PDF
                  </p>
                  <p className="text-xs text-[#52525B] font-bold mt-1">
                    Accepts standard PDF curriculum files containing single or multi-day lesson plans
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PASTED TEXT */}
            {activeTab === 'text' && (
              <div className="space-y-3.5">
                <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider">
                  Paste Lesson Plan Text or Markdown
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste weekly lesson plan content, targets, activities, and blocks here..."
                  className="w-full text-xs font-mono border-2 border-[#18181B] rounded-2xl p-4 text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden shadow-[1px_1px_0px_#18181B]"
                />
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim()}
                  className="px-6 py-2.5 bg-[#18181B] hover:bg-neutral-800 disabled:opacity-50 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
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
                <h2 className="text-xs font-black text-[#18181B] uppercase tracking-wider">
                  Import History
                </h2>
                <span className="text-xs font-mono font-black text-[#18181B] bg-white border-2 border-[#18181B] px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_#18181B]">
                  {importHistory.length} import{importHistory.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="bg-white border-2 border-[#18181B] rounded-[22px] divide-y-2 divide-[#18181B]/15 overflow-hidden shadow-[2px_2px_0px_#18181B]">
                {importHistory.map(item => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{getSourceBadge(item.sourceType)}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-[#18181B]">
                            {item.fileName}
                          </span>
                          {item.weekNumber && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B]">
                              {item.weekNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#52525B] font-bold flex items-center space-x-2">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{item.lessonCount} lesson records</span>
                          {item.sourceUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#18181B] font-black hover:underline flex items-center"
                              >
                                Source Doc <ExternalLink className="w-3 h-3 ml-1" />
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
                          className="px-3 py-1.5 text-xs font-black text-[#18181B] bg-[#D1FAE5] hover:bg-[#A7F3D0] rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
                        >
                          View Lessons
                        </button>
                      )}

                      {item.sourceUrl && (
                        <button
                          type="button"
                          onClick={() => handleReimportFromHistory(item.id)}
                          className="px-3 py-1.5 text-xs font-black text-[#18181B] bg-white hover:bg-[#FAF7EE] rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] flex items-center cursor-pointer"
                          title="Re-fetch latest content from this URL"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Re-import
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteImportHistoryItem(item.id)}
                        className="p-1.5 text-[#52525B] hover:text-rose-600 rounded-lg hover:bg-rose-50 border-2 border-transparent hover:border-[#18181B] transition-all cursor-pointer"
                        title="Delete from history"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <div className="bg-white border-2 border-[#18181B] rounded-[24px] p-12 text-center space-y-4 shadow-[3px_3px_0px_#18181B]">
          <div className="w-12 h-12 rounded-2xl bg-[#DBEAFE] border-2 border-[#18181B] flex items-center justify-center mx-auto shadow-[1px_1px_0px_#18181B]">
            <RefreshCw className="w-6 h-6 text-[#18181B] animate-spin stroke-[2.5]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-[#18181B]">
              {stage === 'fetching' && 'Connecting to document source...'}
              {stage === 'extracting' && 'Extracting text, headings, and tables...'}
              {stage === 'analyzing' && 'Interpreting lesson blocks with curriculum AI...'}
              {stage === 'organizing' && 'Structuring lessons across days & classes...'}
            </h3>
            {sharedUrl && activeTab === 'link' && (
              <p className="text-xs text-[#52525B] font-mono truncate max-w-md mx-auto font-bold">
                {sharedUrl}
              </p>
            )}
            {selectedFile && activeTab === 'pdf' && (
              <p className="text-xs text-[#52525B] font-mono font-bold">
                {selectedFile.name}
              </p>
            )}
          </div>
          <p className="text-xs text-[#52525B] font-bold max-w-sm mx-auto">
            LessonFlow preserves exact teacher text and organizes targets, activities, and blocks for school website entry.
          </p>
        </div>
      )}

      {/* STAGE: ERROR WITH HELPFUL ADVICE */}
      {stage === 'error' && (
        <div className="bg-white border-2 border-[#18181B] rounded-[24px] p-8 space-y-4 shadow-[3px_3px_0px_#18181B]">
          <div className="text-center space-y-2">
            {errorType === 'RESTRICTED_GOOGLE_DOC' ? (
              <div className="w-12 h-12 rounded-2xl bg-[#FEF08A] border-2 border-[#18181B] flex items-center justify-center mx-auto shadow-[1px_1px_0px_#18181B]">
                <Lock className="w-6 h-6 text-[#18181B] stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#FCE7F3] border-2 border-[#18181B] flex items-center justify-center mx-auto shadow-[1px_1px_0px_#18181B]">
                <AlertCircle className="w-6 h-6 text-[#18181B] stroke-[2.5]" />
              </div>
            )}
            <h3 className="text-lg font-black text-[#18181B]">
              {errorType === 'RESTRICTED_GOOGLE_DOC'
                ? 'Google Doc Permission Needed'
                : 'Unable to Process Document'}
            </h3>
            <p className="text-xs text-[#52525B] font-bold max-w-lg mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          {errorHint && (
            <div className="bg-[#FAF7EE] border-2 border-[#18181B] rounded-2xl p-4 max-w-lg mx-auto text-xs text-[#18181B] space-y-2.5 shadow-[2px_2px_0px_#18181B]">
              <span className="font-black block uppercase tracking-wider text-[11px]">How to resolve:</span>
              <p className="font-bold text-[#3F3F46] leading-relaxed">{errorHint}</p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('text');
                    resetImport();
                  }}
                  className="px-3.5 py-1.5 bg-[#FEF08A] hover:bg-[#FDE047] text-[#18181B] border-2 border-[#18181B] font-black rounded-xl text-xs shadow-[1px_1px_0px_#18181B] cursor-pointer"
                >
                  Switch to Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSharedUrl(SAMPLE_GOOGLE_DOC_URL);
                    handleFetchFromUrl(SAMPLE_GOOGLE_DOC_URL);
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-[#FAF7EE] text-[#18181B] border-2 border-[#18181B] font-black rounded-xl text-xs shadow-[1px_1px_0px_#18181B] cursor-pointer"
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
              className="px-5 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={resetImport}
              className="px-5 py-2.5 bg-white hover:bg-[#FAF7EE] text-[#18181B] font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
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
          <div className="bg-white border-2 border-[#18181B] rounded-[24px] p-6 shadow-[3px_3px_0px_#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-black text-[#18181B] bg-[#DBEAFE] px-2.5 py-1 rounded-md border-2 border-[#18181B]">
                  Review Extracted Lessons
                </span>
                {getSourceBadge(reviewDraft.sourceType)}
              </div>
              <h2 className="text-lg font-black text-[#18181B]">
                Found {reviewDraft.lessons.length} lesson record{reviewDraft.lessons.length !== 1 ? 's' : ''} in {reviewDraft.fileName}
              </h2>
              <div className="text-xs text-[#52525B] font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Verify and edit any fields below before saving.</span>
                {reviewDraft.sourceUrl && (
                  <a
                    href={reviewDraft.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#18181B] hover:underline flex items-center font-black"
                  >
                    Open original document <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
                {reviewDraft.extractedSummary && (
                  <span className="text-[#71717A]">
                    Preserved: {reviewDraft.extractedSummary.tablesCount || 0} tables, {reviewDraft.extractedSummary.headingsCount || 0} headings
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={resetImport}
                className="px-4 py-2.5 text-xs font-black text-[#18181B] hover:bg-[#FAF7EE] bg-white border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommit}
                className="inline-flex items-center px-5 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                Import & Save ({reviewDraft.lessons.length} Lessons)
              </button>
            </div>
          </div>

          {/* Week Metadata Inputs */}
          <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-5 shadow-[2px_2px_0px_#18181B] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider mb-1">
                Week Label <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={reviewDraft.weekNumber}
                onChange={e => handleUpdateDraftWeek('weekNumber', e.target.value)}
                className="w-full border-2 border-[#18181B] rounded-xl p-2.5 font-black text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-black text-[#18181B] uppercase tracking-wider mb-1">
                Curriculum Topic / Title
              </label>
              <input
                type="text"
                value={reviewDraft.weekTitle}
                onChange={e => handleUpdateDraftWeek('weekTitle', e.target.value)}
                className="w-full border-2 border-[#18181B] rounded-xl p-2.5 font-bold text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Individual Lesson Cards for Review */}
          <div className="space-y-4">
            {reviewDraft.lessons.map((lesson, lIdx) => (
              <div
                key={lesson.id}
                className={`bg-white border-2 border-[#18181B] rounded-[22px] p-5 shadow-[2px_2px_0px_#18181B] space-y-4 ${
                  lesson.needsReview ? 'bg-[#FFFBEB]' : ''
                }`}
              >
                {/* Lesson Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#18181B]/15">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-[#18181B]">
                      Lesson #{lIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#52525B]">
                      ({lesson.day} - {lesson.className} {lesson.section ? `[${lesson.section}]` : ''})
                    </span>
                    {lesson.needsReview && (
                      <span className="text-[10px] font-black text-[#18181B] bg-[#FEF08A] px-2.5 py-0.5 rounded-md border-2 border-[#18181B] flex items-center shadow-[1px_1px_0px_#18181B]">
                        <AlertCircle className="w-3 h-3 mr-1 stroke-[2.5]" />
                        Needs review
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAddBlock(lIdx)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-black text-[#18181B] bg-[#FAF7EE] hover:bg-[#FEF08A] rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1 stroke-[3]" />
                      Add Block
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lIdx)}
                      className="p-1.5 text-[#52525B] hover:text-rose-600 rounded-lg hover:bg-rose-50 border-2 border-transparent hover:border-[#18181B] cursor-pointer"
                      title="Remove this lesson from import"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day, Class, Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-black text-[#52525B] uppercase text-[10px] tracking-wider mb-1">Day</label>
                    <input
                      type="text"
                      value={lesson.day}
                      onChange={e => handleUpdateLesson(lIdx, 'day', e.target.value)}
                      className="w-full border-2 border-[#18181B] rounded-xl p-2 font-black text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[#52525B] uppercase text-[10px] tracking-wider mb-1">Class</label>
                    <input
                      type="text"
                      value={lesson.className}
                      onChange={e => handleUpdateLesson(lIdx, 'className', e.target.value)}
                      className="w-full border-2 border-[#18181B] rounded-xl p-2 font-black text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[#52525B] uppercase text-[10px] tracking-wider mb-1">Section</label>
                    <input
                      type="text"
                      value={lesson.section || ''}
                      onChange={e => handleUpdateLesson(lIdx, 'section', e.target.value)}
                      placeholder="Optional"
                      className="w-full border-2 border-[#18181B] rounded-xl p-2 font-bold text-[#18181B] bg-[#FAF7EE] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Target & Activities */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-black text-[#18181B] uppercase text-[10px] tracking-wider mb-1">Learning Target</label>
                    <textarea
                      rows={2}
                      value={lesson.target}
                      onChange={e => handleUpdateLesson(lIdx, 'target', e.target.value)}
                      className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden resize-y font-sans"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-[#18181B] uppercase text-[10px] tracking-wider mb-1">Activities & Procedures</label>
                    <textarea
                      rows={2}
                      value={lesson.activities}
                      onChange={e => handleUpdateLesson(lIdx, 'activities', e.target.value)}
                      className="w-full border-2 border-[#18181B] rounded-xl p-2.5 text-[#18181B] font-bold bg-[#FAF7EE] focus:bg-white focus:outline-hidden resize-y font-sans"
                    />
                  </div>
                </div>

                {/* Dynamic Blocks in this lesson */}
                <div className="space-y-2 pt-2 border-t-2 border-[#18181B]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-[#52525B] tracking-wider">
                      Dynamic Blocks ({lesson.blocks.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddBlock(lIdx)}
                      className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1 stroke-[3]" />
                      Add Block
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lesson.blocks.map((block, bIdx) => (
                      <div
                        key={bIdx}
                        className="bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl p-3.5 space-y-2.5 text-xs relative group shadow-[1px_1px_0px_#18181B]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-[#18181B] text-xs">
                            Block {block.blockNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(lIdx, bIdx)}
                            className="text-[#52525B] hover:text-rose-600 p-0.5 rounded cursor-pointer"
                            title="Delete this block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {Object.entries(block.fields).map(([k, val]) => (
                            <div key={k}>
                              <label className="block text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-0.5">
                                {k.replace(/_/g, ' ')}
                              </label>
                              <textarea
                                rows={2}
                                value={val}
                                onChange={e => handleUpdateBlockField(lIdx, bIdx, k, e.target.value)}
                                className="w-full bg-white border-2 border-[#18181B] rounded-lg p-2 text-xs font-bold text-[#18181B] focus:outline-hidden resize-y font-sans"
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
              className="px-5 py-2.5 text-xs font-black text-[#18181B] hover:bg-[#FAF7EE] bg-white border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="inline-flex items-center px-6 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Import & Save All ({reviewDraft.lessons.length} Lessons)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
