/**
 * LessonFlow Bold & Colorful Bento Dashboard
 * 
 * Design Language:
 * - Simple + Bold + Colorful + Spacious + Highly Visible + Modern
 * - Pastel color blocks:
 *   * Soft Blue (Primary Import & Hero)
 *   * Soft Mint (Lesson Plans & Records)
 *   * Soft Yellow (Plain-Text Clipboard)
 *   * Soft Lavender (Block Templates)
 *   * Soft Peach (Import History & Traceability)
 * - Clearly visible borders (1.5px solid with high contrast)
 * - Real data only: Honest empty states when empty, no fake metrics or fake lessons
 * - High-visibility typography and primary CTA
 */

import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  BentoGrid,
  BentoCard,
  BentoCardHeader,
  BentoCardContent,
  BentoCardFooter,
  BentoStat,
  BentoEmptyState,
  BentoAction,
} from './bento/BentoSystem.js';
import {
  Upload,
  BookOpen,
  ArrowRight,
  Clipboard,
  Layers,
  History,
  CheckCircle2,
  ExternalLink,
  Plus,
  Link as LinkIcon,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenNewWeekModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenNewWeekModal }) => {
  const {
    weeks,
    selectedWeek,
    records,
    progress,
    clipboardItems,
    templates,
    importHistory,
    selectWeek,
    setActiveView,
  } = useApp();

  const handleOpenWeek = async (weekId: string) => {
    await selectWeek(weekId);
    setActiveView('lessons');
  };

  const latestImport = importHistory.length > 0 ? importHistory[0] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* ======================================================== */}
      {/* HERO BANNER: PLAN ONCE. ORGANIZE EVERYTHING.            */}
      {/* ======================================================== */}
      <div className="space-y-3 pt-2 pb-1">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Plan once. <span className="text-blue-600">Organize everything.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed font-medium">
          Bring your lesson plan from a Google Doc, PDF, or text and let LessonFlow organize it for review and future school-website entry.
        </p>
      </div>

      {/* ======================================================== */}
      {/* 12-COLUMN ASYMMETRIC BENTO GRID (BREATHABLE SECTIONS)     */}
      {/* ======================================================== */}
      <BentoGrid>
        
        {/* ======================================================== */}
        {/* 1. PRIMARY BENTO SECTION: IMPORT LESSON PLAN (Span 12)   */}
        {/* Soft Blue Background, Strong Border, High Visibility     */}
        {/* ======================================================== */}
        <BentoCard
          colSpan={12}
          accent="blue"
          radius="large"
          className="p-8 sm:p-10 border-blue-300"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 text-blue-800 font-extrabold text-xs uppercase tracking-wider">
                  <Upload className="w-4 h-4 text-blue-700" />
                  <span>Primary Workflow</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Import Your Lesson Plan
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  Bring your existing weekly lesson plan into LessonFlow. We automatically extract and preserve your structured classes, learning targets, and teaching blocks for review.
                </p>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <BentoAction
                  variant="primary"
                  onClick={() => setActiveView('import')}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Import Lesson Plan →
                </BentoAction>
              </div>
            </div>

            {/* 3 Clear Input Methods */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveView('import')}
                className="p-5 bg-white rounded-2xl border-[1.5px] border-blue-200/90 hover:border-blue-500 text-left transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-blue-700 font-bold text-sm mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <span>Google Docs</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Paste a shared link. Extracts headings, curriculum tables, and blocks.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('import')}
                className="p-5 bg-white rounded-2xl border-[1.5px] border-blue-200/90 hover:border-blue-500 text-left transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-blue-700 font-bold text-sm mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>PDF Document</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Upload your school's weekly PDF lesson plan schedule.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('import')}
                className="p-5 bg-white rounded-2xl border-[1.5px] border-blue-200/90 hover:border-blue-500 text-left transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-blue-700 font-bold text-sm mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Clipboard className="w-4 h-4" />
                  </div>
                  <span>Pasted Text</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Paste raw syllabus notes, unit plans, or plain markdown.
                </p>
              </button>
            </div>
          </div>
        </BentoCard>

        {/* ======================================================== */}
        {/* 2. SUPPORTING: LESSON PLANS (Span 7) — Soft Mint          */}
        {/* ======================================================== */}
        <BentoCard colSpan={7} accent="mint" className="min-h-[290px]">
          <div>
            <BentoCardHeader
              icon={<BookOpen className="w-5 h-5 text-emerald-800" />}
              badge={
                weeks.length > 0 ? (
                  <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    {weeks.length} Week{weeks.length !== 1 ? 's' : ''}
                  </span>
                ) : undefined
              }
              title="Lesson Plans"
              subtitle="Structured weekly lesson records & learning blocks"
              action={
                <button
                  type="button"
                  onClick={onOpenNewWeekModal}
                  className="p-2 rounded-xl text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/80 border border-emerald-300 font-bold text-xs inline-flex items-center space-x-1"
                  title="Create new blank week"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>New Week</span>
                </button>
              }
            />

            <BentoCardContent>
              {weeks.length === 0 ? (
                <BentoEmptyState
                  icon={<BookOpen className="w-6 h-6 text-emerald-700" />}
                  title="No lesson plans yet."
                  description="Import your first weekly lesson plan or create a blank week to get started."
                  actionText="Import Lesson Plan"
                  onAction={() => setActiveView('import')}
                />
              ) : (
                <div className="space-y-3">
                  {selectedWeek && (
                    <div
                      onClick={() => handleOpenWeek(selectedWeek.id)}
                      className="p-4 rounded-xl bg-white border-[1.5px] border-emerald-300 hover:border-emerald-500 cursor-pointer transition-all hover:shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900">
                          {selectedWeek.weekNumber}
                        </span>
                        <span
                          className={`text-2xs font-bold px-2 py-0.5 rounded-md capitalize ${
                            selectedWeek.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {selectedWeek.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold truncate">
                        {selectedWeek.title}
                      </p>
                      <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-100">
                        <span>
                          {records.length} lesson record{records.length !== 1 ? 's' : ''} in week
                        </span>
                        <span className="text-emerald-800 font-bold hover:underline flex items-center">
                          Open Lesson Records <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </div>
                  )}

                  {weeks.length > 1 && (
                    <p className="text-2xs text-emerald-800 font-medium text-center">
                      + {weeks.length - 1} other week{weeks.length - 1 !== 1 ? 's' : ''} stored in your repository
                    </p>
                  )}
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-emerald-300/80">
            <span className="text-2xs text-emerald-800 font-medium">
              {weeks.length > 0 ? `${weeks.length} total week plans` : 'Clean workspace ready'}
            </span>
            {weeks.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveView('lessons')}
                className="text-xs font-bold text-emerald-900 hover:underline flex items-center"
              >
                View Lesson Plans <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 3. SUPPORTING: PLAIN-TEXT CLIPBOARD (Span 5) — Soft Yellow */}
        {/* ======================================================== */}
        <BentoCard colSpan={5} accent="yellow" className="min-h-[290px]">
          <div>
            <BentoCardHeader
              icon={<Clipboard className="w-5 h-5 text-amber-800" />}
              badge={
                clipboardItems.length > 0 ? (
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {clipboardItems.length}
                  </span>
                ) : undefined
              }
              title="Clipboard"
              subtitle="Plain-text queue for rapid data entry"
            />

            <BentoCardContent>
              {clipboardItems.length === 0 ? (
                <BentoEmptyState
                  icon={<Clipboard className="w-6 h-6 text-amber-700" />}
                  title="Clipboard is empty."
                  description="Save targets, activities, and blocks here for clean plain-text copying into school websites."
                  actionText="Open Clipboard"
                  onAction={() => setActiveView('clipboard')}
                />
              ) : (
                <div className="space-y-3">
                  <BentoStat
                    value={clipboardItems.length}
                    label="Saved plain-text snippets"
                    helper="HTML tags & rich formatting stripped"
                  />

                  {/* Preview first item cleanly */}
                  <div className="p-3 bg-white rounded-xl border border-amber-300 text-xs text-slate-800 space-y-1">
                    <span className="text-3xs uppercase font-extrabold text-amber-800 block">
                      {clipboardItems[0].label}
                    </span>
                    <p className="line-clamp-2 text-slate-600 font-medium">
                      {clipboardItems[0].plainText}
                    </p>
                  </div>
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-amber-300/80">
            <span className="text-2xs text-amber-800 font-medium">1-click copy without formatting</span>
            <button
              type="button"
              onClick={() => setActiveView('clipboard')}
              className="text-xs font-bold text-amber-900 hover:underline flex items-center"
            >
              Open Gallery <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 4. SUPPORTING: TEMPLATES (Span 4) — Soft Lavender         */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="lavender" className="min-h-[260px]">
          <div>
            <BentoCardHeader
              icon={<Layers className="w-5 h-5 text-purple-800" />}
              badge={
                templates.length > 0 ? (
                  <span className="text-xs font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-lg border border-purple-300">
                    {templates.length}
                  </span>
                ) : undefined
              }
              title="Templates"
              subtitle="Reusable field architectures"
            />

            <BentoCardContent>
              {templates.length === 0 ? (
                <BentoEmptyState
                  icon={<Layers className="w-5 h-5 text-purple-600" />}
                  title="No custom templates."
                  description="Define custom field layouts (Objective, Student Activity, Materials)."
                  actionText="Create Template"
                  onAction={() => setActiveView('templates')}
                />
              ) : (
                <div className="space-y-3">
                  <BentoStat
                    value={templates.length}
                    label="Configured block templates"
                    helper={`${templates[0]?.fields.length || 0} fields in active template`}
                  />

                  <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs">
                    <span className="font-bold text-purple-950 block">
                      {templates[0]?.name || 'Standard Block'}
                    </span>
                    <span className="text-3xs text-purple-700 block mt-0.5">
                      {templates[0]?.fields.map(f => f.label).join(' · ')}
                    </span>
                  </div>
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-purple-300/80">
            <span className="text-2xs text-purple-800 font-medium">Standardized blocks</span>
            <button
              type="button"
              onClick={() => setActiveView('templates')}
              className="text-xs font-bold text-purple-900 hover:underline flex items-center"
            >
              Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 5. SUPPORTING: RECENT IMPORT & HISTORY (Span 4) — Soft Peach */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="peach" className="min-h-[260px]">
          <div>
            <BentoCardHeader
              icon={<History className="w-5 h-5 text-orange-800" />}
              badge={
                importHistory.length > 0 ? (
                  <span className="text-xs font-mono font-bold bg-orange-100 text-orange-900 px-2 py-0.5 rounded-lg border border-orange-300">
                    {importHistory.length}
                  </span>
                ) : undefined
              }
              title="Import History"
              subtitle="Source documents & audit links"
            />

            <BentoCardContent>
              {!latestImport ? (
                <BentoEmptyState
                  icon={<History className="w-5 h-5 text-orange-600" />}
                  title="No import history."
                  description="Your imported Google Docs and PDF schedules will appear here."
                  actionText="Import Document"
                  onAction={() => setActiveView('import')}
                />
              ) : (
                <div className="p-3.5 bg-white rounded-xl border border-orange-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {latestImport.fileName}
                    </span>
                    <span className="text-3xs font-bold px-2 py-0.5 rounded-md capitalize bg-orange-50 text-orange-800 border border-orange-200">
                      {latestImport.sourceType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-2xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">
                      {latestImport.lessonCount} lesson records created
                    </p>
                    {latestImport.sourceUrl && (
                      <a
                        href={latestImport.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline flex items-center font-bold"
                      >
                        Open Source Doc <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-orange-300/80">
            <span className="text-2xs text-orange-800 font-medium">Traceable documents</span>
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className="text-xs font-bold text-orange-900 hover:underline flex items-center"
            >
              View History <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 6. SUPPORTING: WEEKLY PROGRESS (Span 4) — Soft Blue/Neutral */}
        {/* Real Data Only: Clean honest state when no lessons        */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="blue" className="min-h-[260px]">
          <div>
            <BentoCardHeader
              icon={<CheckCircle2 className="w-5 h-5 text-blue-800" />}
              title="Weekly Progress"
              subtitle={selectedWeek ? selectedWeek.weekNumber : 'Completion tracking'}
            />

            <BentoCardContent>
              {progress && progress.totalRecords > 0 ? (
                <div className="space-y-4">
                  <BentoStat
                    value={`${progress.percentage}%`}
                    label={`${progress.completedRecords} of ${progress.totalRecords} lessons complete`}
                    helper="Ready for school website form entry"
                  />

                  {/* Real progress bar */}
                  <div className="w-full h-3 rounded-full bg-blue-100 overflow-hidden border border-blue-300">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
                    />
                  </div>
                </div>
              ) : (
                <BentoEmptyState
                  icon={<Clock className="w-5 h-5 text-blue-600" />}
                  title="No progress data."
                  description="Track completion when lessons are added to your active week."
                />
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-blue-300/80">
            <span className="text-2xs text-blue-800 font-medium">Real-time status</span>
            {progress && progress.totalRecords > 0 && (
              <button
                type="button"
                onClick={() => setActiveView('lessons')}
                className="text-xs font-bold text-blue-900 hover:underline flex items-center"
              >
                Review Lessons <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </BentoCardFooter>
        </BentoCard>

      </BentoGrid>
    </div>
  );
};
