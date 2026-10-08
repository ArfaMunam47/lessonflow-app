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
    <div className="max-w-7xl mx-auto space-y-7 pb-12">
      
      {/* ======================================================== */}
      {/* HERO HEADLINE: Plan once. Teach with less admin.          */}
      {/* ======================================================== */}
      <div className="space-y-2 pt-1 pb-1">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#18181B] tracking-tight leading-tight">
          Plan once. <span className="underline decoration-4 decoration-[#FEF08A] underline-offset-4">Teach with less admin.</span>
        </h1>
        <p className="text-sm sm:text-base text-[#52525B] max-w-3xl leading-relaxed font-bold">
          Bring your lesson plan from a Google Doc, PDF, or text and let LessonFlow organize it for you.
        </p>
      </div>

      {/* ======================================================== */}
      {/* 12-COLUMN ASYMMETRIC BENTO GRID (BREATHABLE SECTIONS)     */}
      {/* ======================================================== */}
      <BentoGrid>
        
        {/* ======================================================== */}
        {/* 1. PRIMARY BENTO SECTION: IMPORT LESSON PLAN (Span 8)    */}
        {/* Soft Pastel Blue Background, Solid 2px Dark Border       */}
        {/* ======================================================== */}
        <BentoCard
          colSpan={8}
          accent="blue"
          radius="large"
          className="min-h-[340px]"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 text-[#18181B] font-black text-xs uppercase tracking-wider bg-white border-2 border-[#18181B] px-3 py-1 rounded-lg shadow-[1px_1px_0px_#18181B]">
                  <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Primary Workflow</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#18181B] tracking-tight">
                  Import Your Lesson Plan
                </h2>
                <p className="text-xs sm:text-sm text-[#3F3F46] max-w-xl leading-relaxed font-bold">
                  Google Doc, PDF, or pasted text. LessonFlow automatically organizes your curriculum for review.
                </p>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <BentoAction
                  variant="primary"
                  onClick={() => setActiveView('import')}
                  icon={<ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                >
                  Import Lesson Plan →
                </BentoAction>
              </div>
            </div>

            {/* 3 Clear Input Methods with Tactile Dark Borders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveView('import')}
                className="p-4 bg-white rounded-2xl border-2 border-[#18181B] hover:bg-[#FAF7EE] text-left transition-all shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-[#18181B] font-black text-xs mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] border-2 border-[#18181B] flex items-center justify-center shrink-0">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <span>Google Docs</span>
                </div>
                <p className="text-[11px] text-[#52525B] leading-relaxed font-bold">
                  Paste shared link. Extracts tables & blocks.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('import')}
                className="p-4 bg-white rounded-2xl border-2 border-[#18181B] hover:bg-[#FAF7EE] text-left transition-all shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-[#18181B] font-black text-xs mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FEF08A] border-2 border-[#18181B] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>PDF Document</span>
                </div>
                <p className="text-[11px] text-[#52525B] leading-relaxed font-bold">
                  Upload weekly curriculum PDF schedule.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('import')}
                className="p-4 bg-white rounded-2xl border-2 border-[#18181B] hover:bg-[#FAF7EE] text-left transition-all shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-[#18181B] font-black text-xs mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#D1FAE5] border-2 border-[#18181B] flex items-center justify-center shrink-0">
                    <Clipboard className="w-3.5 h-3.5" />
                  </div>
                  <span>Pasted Text</span>
                </div>
                <p className="text-[11px] text-[#52525B] leading-relaxed font-bold">
                  Paste raw syllabus notes or unit plans.
                </p>
              </button>
            </div>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">
              Automated structured extraction & review
            </span>
            <button
              type="button"
              onClick={() => setActiveView('import')}
              className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
            >
              Start Import <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 2. SUPPORTING: LESSON PLANS (Span 4) — Soft Mint          */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="mint" radius="large" className="min-h-[340px]">
          <div>
            <BentoCardHeader
              icon={<BookOpen className="w-5 h-5" />}
              badge={
                weeks.length > 0 ? (
                  <span className="text-xs font-mono font-black bg-white text-[#18181B] px-2.5 py-0.5 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
                    {weeks.length} Week{weeks.length !== 1 ? 's' : ''}
                  </span>
                ) : undefined
              }
              title="Lesson Plans"
              subtitle="Structured weekly records & teaching blocks"
              action={
                <button
                  type="button"
                  onClick={onOpenNewWeekModal}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF7EE] text-[#18181B] border-2 border-[#18181B] font-black text-xs inline-flex items-center space-x-1 shadow-[1px_1px_0px_#18181B] cursor-pointer"
                  title="Create new blank week"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New</span>
                </button>
              }
            />

            <BentoCardContent>
              {weeks.length === 0 ? (
                <BentoEmptyState
                  icon={<BookOpen className="w-6 h-6" />}
                  title="No lesson plans yet."
                  description="Import your weekly lesson plan to get started."
                  actionText="Import Lesson Plan"
                  onAction={() => setActiveView('import')}
                />
              ) : (
                <div className="space-y-3">
                  {selectedWeek && (
                    <div
                      onClick={() => handleOpenWeek(selectedWeek.id)}
                      className="p-4 rounded-xl bg-white border-2 border-[#18181B] hover:bg-[#FAF7EE] cursor-pointer transition-all shadow-[2px_2px_0px_#18181B] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-[#18181B]">
                          {selectedWeek.weekNumber}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md capitalize border-2 border-[#18181B] ${
                            selectedWeek.status === 'completed'
                              ? 'bg-[#D1FAE5] text-[#18181B]'
                              : 'bg-[#FEF08A] text-[#18181B]'
                          }`}
                        >
                          {selectedWeek.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#18181B] font-bold truncate">
                        {selectedWeek.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-[#52525B] font-bold pt-1 border-t-2 border-[#18181B]/15">
                        <span>
                          {records.length} lesson record{records.length !== 1 ? 's' : ''} in week
                        </span>
                        <span className="text-[#18181B] font-black flex items-center group-hover:underline">
                          Open <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </div>
                  )}

                  {weeks.length > 1 && (
                    <p className="text-[11px] text-[#18181B] font-bold text-center">
                      + {weeks.length - 1} other week{weeks.length - 1 !== 1 ? 's' : ''} in your library
                    </p>
                  )}
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">
              {weeks.length > 0 ? `${weeks.length} total active week plans` : 'Ready for import'}
            </span>
            {weeks.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveView('lessons')}
                className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
              >
                View Plans <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 3. SUPPORTING: PLAIN-TEXT CLIPBOARD (Span 4) — Soft Yellow */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="yellow" className="min-h-[290px]">
          <div>
            <BentoCardHeader
              icon={<Clipboard className="w-5 h-5" />}
              badge={
                clipboardItems.length > 0 ? (
                  <span className="text-xs font-mono font-black bg-white text-[#18181B] px-2.5 py-0.5 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
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
                  icon={<Clipboard className="w-6 h-6" />}
                  title="Your clipboard is empty."
                  description="Save lesson content here for quick reuse in school websites."
                  actionText="Open Clipboard"
                  onAction={() => setActiveView('clipboard')}
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <BentoStat
                      value={clipboardItems.length}
                      label="Saved Snippets"
                      isBadge={true}
                    />
                    <div className="p-3 bg-white border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] text-center flex flex-col justify-center">
                      <span className="text-sm font-black text-[#18181B]">Plain Text</span>
                      <span className="text-[10px] font-bold text-[#52525B] uppercase">HTML Stripped</span>
                    </div>
                  </div>

                  {/* Preview first item cleanly */}
                  <div className="p-3 bg-white rounded-xl border-2 border-[#18181B] text-xs space-y-1 shadow-[1px_1px_0px_#18181B]">
                    <span className="text-[10px] uppercase font-black text-[#18181B] block">
                      {clipboardItems[0].label}
                    </span>
                    <p className="line-clamp-2 text-[#52525B] font-bold">
                      {clipboardItems[0].plainText}
                    </p>
                  </div>
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">1-click copy without formatting</span>
            <button
              type="button"
              onClick={() => setActiveView('clipboard')}
              className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
            >
              Open Gallery <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 4. SUPPORTING: TEMPLATES (Span 4) — Soft Lavender         */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="lavender" className="min-h-[290px]">
          <div>
            <BentoCardHeader
              icon={<Layers className="w-5 h-5" />}
              badge={
                templates.length > 0 ? (
                  <span className="text-xs font-mono font-black bg-white text-[#18181B] px-2.5 py-0.5 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
                    {templates.length}
                  </span>
                ) : undefined
              }
              title="Templates"
              subtitle="Reusable block field architectures"
            />

            <BentoCardContent>
              {templates.length === 0 ? (
                <BentoEmptyState
                  icon={<Layers className="w-6 h-6" />}
                  title="No templates yet."
                  description="Create reusable structures for your lesson blocks."
                  actionText="Create Template"
                  onAction={() => setActiveView('templates')}
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <BentoStat
                      value={templates.length}
                      label="Templates"
                      isBadge={true}
                    />
                    <div className="p-3 bg-white border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] text-center flex flex-col justify-center">
                      <span className="text-sm font-black text-[#18181B]">
                        {templates[0]?.fields.length || 0} Fields
                      </span>
                      <span className="text-[10px] font-bold text-[#52525B] uppercase">Active Layout</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border-2 border-[#18181B] text-xs shadow-[1px_1px_0px_#18181B]">
                    <span className="font-black text-[#18181B] block">
                      {templates[0]?.name || 'Standard Block'}
                    </span>
                    <span className="text-[10px] text-[#52525B] font-bold block mt-0.5 truncate">
                      {templates[0]?.fields.map(f => f.label).join(' · ')}
                    </span>
                  </div>
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">Configured block fields</span>
            <button
              type="button"
              onClick={() => setActiveView('templates')}
              className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
            >
              Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 5. SUPPORTING: RECENT IMPORT & HISTORY (Span 4) — Soft Peach */}
        {/* ======================================================== */}
        <BentoCard colSpan={4} accent="peach" className="min-h-[290px]">
          <div>
            <BentoCardHeader
              icon={<History className="w-5 h-5" />}
              badge={
                importHistory.length > 0 ? (
                  <span className="text-xs font-mono font-black bg-white text-[#18181B] px-2.5 py-0.5 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
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
                  icon={<History className="w-6 h-6" />}
                  title="No import history."
                  description="Your imported Google Docs and PDF schedules will appear here."
                  actionText="Import Document"
                  onAction={() => setActiveView('import')}
                />
              ) : (
                <div className="p-3.5 bg-white rounded-xl border-2 border-[#18181B] space-y-2 shadow-[1px_1px_0px_#18181B]">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-[#18181B] truncate max-w-[140px]">
                      {latestImport.fileName}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md capitalize bg-[#FED7AA] text-[#18181B] border-2 border-[#18181B]">
                      {latestImport.sourceType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#52525B] space-y-1 font-bold">
                    <p className="text-[#18181B]">
                      {latestImport.lessonCount} lesson records created
                    </p>
                    {latestImport.sourceUrl && (
                      <a
                        href={latestImport.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#18181B] hover:underline flex items-center font-black"
                      >
                        Open Source Doc <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">Traceable documents</span>
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
            >
              View History <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 6. SUPPORTING: WEEKLY PROGRESS (Span 6) — Soft Pink       */}
        {/* Inspired by the pink rating card from visual reference    */}
        {/* ======================================================== */}
        <BentoCard colSpan={6} accent="pink" className="min-h-[260px]">
          <div>
            <BentoCardHeader
              icon={<CheckCircle2 className="w-5 h-5 stroke-[2.5]" />}
              badge={
                progress && progress.totalRecords > 0 ? (
                  <span className="text-xs font-mono font-black bg-white text-[#18181B] px-2.5 py-0.5 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
                    {progress.completedRecords}/{progress.totalRecords} Done
                  </span>
                ) : undefined
              }
              title="Weekly Progress"
              subtitle={selectedWeek ? selectedWeek.weekNumber : 'Completion tracking'}
            />

            <BentoCardContent>
              {progress && progress.totalRecords > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl sm:text-4xl font-black text-[#18181B] tracking-tight font-mono">
                        {progress.percentage}%
                      </span>
                      <p className="text-xs font-bold text-[#18181B] mt-0.5">
                        {progress.completedRecords} of {progress.totalRecords} lessons complete
                      </p>
                    </div>

                    {/* Tactile wave / progress chart (reminiscent of reference card) */}
                    <div className="w-28 h-10">
                      <svg viewBox="0 0 100 36" fill="none" className="w-full h-full">
                        <path
                          d="M2 28 C 20 8, 35 32, 50 18 C 65 4, 80 24, 98 10"
                          stroke="#18181B"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Real progress bar with solid 2px dark border */}
                  <div className="w-full h-4 rounded-xl bg-white overflow-hidden border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] p-0.5">
                    <div
                      className="h-full bg-[#18181B] rounded-lg transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
                    />
                  </div>
                </div>
              ) : (
                <BentoEmptyState
                  icon={<Clock className="w-6 h-6" />}
                  title="Progress will appear here."
                  description="After you import your lesson plan or add lessons to your active week."
                />
              )}
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">Real-time status</span>
            {progress && progress.totalRecords > 0 && (
              <button
                type="button"
                onClick={() => setActiveView('lessons')}
                className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
              >
                Review Lessons <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </BentoCardFooter>
        </BentoCard>

        {/* ======================================================== */}
        {/* 7. SUPPORTING: WORKFLOW PIPELINE (Span 6) — Neutral Cream */}
        {/* Clean structured visual pipeline                          */}
        {/* ======================================================== */}
        <BentoCard colSpan={6} accent="cream" className="min-h-[260px]">
          <div>
            <BentoCardHeader
              icon={<Sparkles className="w-5 h-5 stroke-[2.5]" />}
              title="Curriculum Flow"
              subtitle="End-to-end teacher workflow at a glance"
            />

            <BentoCardContent>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-[#DBEAFE] border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider block text-[#18181B]">Step 1</span>
                  <span className="text-xs font-black text-[#18181B] block mt-1">Import</span>
                  <span className="text-[10px] text-[#52525B] font-bold block mt-0.5">Docs & PDFs</span>
                </div>

                <div className="p-3 bg-[#D1FAE5] border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider block text-[#18181B]">Step 2</span>
                  <span className="text-xs font-black text-[#18181B] block mt-1">Organize</span>
                  <span className="text-[10px] text-[#52525B] font-bold block mt-0.5">Edit Blocks</span>
                </div>

                <div className="p-3 bg-[#FEF08A] border-2 border-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider block text-[#18181B]">Step 3</span>
                  <span className="text-xs font-black text-[#18181B] block mt-1">1-Click Copy</span>
                  <span className="text-[10px] text-[#52525B] font-bold block mt-0.5">Clean Text</span>
                </div>
              </div>
            </BentoCardContent>
          </div>

          <BentoCardFooter className="border-[#18181B]/15">
            <span className="text-[11px] text-[#18181B] font-bold">Zero messy formatting</span>
            <button
              type="button"
              onClick={() => setActiveView('import')}
              className="text-xs font-black text-[#18181B] hover:underline flex items-center cursor-pointer"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </BentoCardFooter>
        </BentoCard>

      </BentoGrid>
    </div>
  );
};
