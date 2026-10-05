/**
 * AI Unstructured Lesson Plan Parser Modal
 * 
 * Allows teachers to paste messy, copied lesson plans, syllabi, or Word docs.
 * Server calls Gemini 3.8 Flash to extract structured Class, Day, Target, Activities, and Blocks.
 * 
 * DEFENSIVE & TRANSPARENT:
 * - Displays extracted data in an editable review panel side-by-side.
 * - Does NOT silently overwrite any data.
 * - Teacher can review, edit fields, and choose to import into a new record or apply to current record.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { AiParsedLesson } from '../types/index.js';
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  FileText,
  ArrowRight,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface AiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_MESSY_TEXT = `Class: 6A
Section: Blue
Day: Thursday
Target: Students will master multiplying multi-digit decimals and estimating products.
Activities:
1. Warm-up mental multiplication drill
2. Teacher modeling decimal point placement
3. Pair problem set on whiteboard
4. Exit card verification

Block 1:
Objective: Estimate products of decimals using whole-number rounding.
Teacher Activity: Model rounding 4.8 x 3.1 to 5 x 3 = 15 before precise calculation.
Student Activity: Estimate 5 given products with a partner and write on mini-boards.
Resources: Mini-whiteboards, dry-erase markers.
Assessment: Quick thumbs check on estimation accuracy.

Block 2:
Objective: Multiply decimals as whole numbers and place the decimal point by counting total decimal places.
Teacher Activity: Demonstrate standard algorithm step-by-step for 2.34 x 1.5.
Student Activity: Work independently through textbook practice problems 1 to 6.
Resources: Math Workbook p. 48.
Assessment: Check problem #4 for decimal place placement.`;

export const AiImportModal: React.FC<AiImportModalProps> = ({ isOpen, onClose }) => {
  const { createRecord, selectedRecord, updateRecord, showToast } = useApp();

  const [rawText, setRawText] = useState(SAMPLE_MESSY_TEXT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<AiParsedLesson | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Please paste lesson-plan text to parse.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.parseLessonWithAi(rawText);
      if (res.success && res.parsed) {
        setParsedResult(res.parsed);
      } else {
        setError('Unable to parse the lesson structure.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse text with AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportAsNew = async () => {
    if (!parsedResult) return;
    try {
      const newRec = await createRecord({
        className: parsedResult.className || 'Class',
        section: parsedResult.section || '',
        day: parsedResult.day || 'Monday',
        target: parsedResult.target || '',
        activities: parsedResult.activities || '',
        blockCount: parsedResult.blocks.length || 1,
      });

      // Populate block fields with the parsed data
      if (parsedResult.blocks.length > 0 && newRec.blocks.length > 0) {
        const updatedBlocks = newRec.blocks.map((b, idx) => {
          const parsedB = parsedResult.blocks[idx];
          if (!parsedB) return b;
          return {
            ...b,
            fields: b.fields.map(f => {
              const matchedVal = parsedB.fields[f.fieldKey] || parsedB.fields[f.fieldLabel.toLowerCase()] || '';
              return matchedVal ? { ...f, fieldValue: matchedVal } : f;
            }),
          };
        });
        updateRecord({ blocks: updatedBlocks }, true);
      }

      showToast('AI lesson plan successfully imported into new record!', 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import parsed record.');
    }
  };

  const handleApplyToCurrent = () => {
    if (!parsedResult || !selectedRecord) return;
    
    const updates: any = {};
    if (parsedResult.className) updates.className = parsedResult.className;
    if (parsedResult.section) updates.section = parsedResult.section;
    if (parsedResult.day) updates.day = parsedResult.day;
    if (parsedResult.target) updates.target = parsedResult.target;
    if (parsedResult.activities) updates.activities = parsedResult.activities;

    if (parsedResult.blocks.length > 0 && selectedRecord.blocks.length > 0) {
      updates.blocks = selectedRecord.blocks.map((b, idx) => {
        const parsedB = parsedResult.blocks[idx];
        if (!parsedB) return b;
        return {
          ...b,
          fields: b.fields.map(f => {
            const matchedVal = parsedB.fields[f.fieldKey] || parsedB.fields[f.fieldLabel.toLowerCase()] || '';
            return matchedVal ? { ...f, fieldValue: matchedVal } : f;
          }),
        };
      });
    }

    updateRecord(updates, true);
    showToast('Applied AI parsed data to current lesson record', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">
              AI Unstructured Lesson Plan Parser
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-normal">
            Paste messy lesson plans from Word documents, PDF text, syllabi, or tables.
            Gemini extracts structured data into clean LessonFlow fields.
            <span className="font-semibold text-gray-900 ml-1">
              You will review and approve everything before saving.
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Input Column */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Raw Source Text
                </label>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_MESSY_TEXT)}
                  className="text-3xs text-indigo-600 hover:underline font-medium"
                >
                  Load Sample Text
                </button>
              </div>

              <textarea
                rows={14}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste lesson plan text here..."
                className="w-full text-xs font-mono text-gray-900 border border-gray-300 rounded-md p-3 focus:ring-1 focus:ring-indigo-500 resize-none h-[340px]"
              />

              <button
                type="button"
                onClick={handleParse}
                disabled={loading || !rawText.trim()}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-xs transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Parsing Structured Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Parse Text with AI
                  </>
                )}
              </button>
            </div>

            {/* Review & Preview Column */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Extracted Structure (Review Before Import)
              </label>

              <div className="border border-gray-200 rounded-md p-3 bg-gray-50/70 h-[340px] overflow-y-auto space-y-3 text-xs">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {parsedResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded border border-gray-200 font-semibold">
                      <div>
                        <span className="text-3xs text-gray-400 block uppercase">Class</span>
                        <input
                          type="text"
                          value={parsedResult.className || ''}
                          onChange={e => setParsedResult({ ...parsedResult, className: e.target.value })}
                          className="w-full text-xs font-bold text-gray-900 border-b border-gray-300 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-3xs text-gray-400 block uppercase">Section</span>
                        <input
                          type="text"
                          value={parsedResult.section || ''}
                          onChange={e => setParsedResult({ ...parsedResult, section: e.target.value })}
                          className="w-full text-xs text-gray-900 border-b border-gray-300 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-3xs text-gray-400 block uppercase">Day</span>
                        <input
                          type="text"
                          value={parsedResult.day || ''}
                          onChange={e => setParsedResult({ ...parsedResult, day: e.target.value })}
                          className="w-full text-xs text-gray-900 border-b border-gray-300 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded border border-gray-200 space-y-1">
                      <span className="text-3xs text-gray-500 font-bold uppercase block">Target</span>
                      <textarea
                        rows={2}
                        value={parsedResult.target || ''}
                        onChange={e => setParsedResult({ ...parsedResult, target: e.target.value })}
                        className="w-full text-xs text-gray-800 border-b border-gray-200 focus:outline-hidden resize-none"
                      />
                    </div>

                    <div className="bg-white p-2.5 rounded border border-gray-200 space-y-1">
                      <span className="text-3xs text-gray-500 font-bold uppercase block">Activities</span>
                      <textarea
                        rows={2}
                        value={parsedResult.activities || ''}
                        onChange={e => setParsedResult({ ...parsedResult, activities: e.target.value })}
                        className="w-full text-xs text-gray-800 border-b border-gray-200 focus:outline-hidden resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-3xs font-bold text-gray-500 uppercase tracking-wider block">
                        Blocks Extracted ({parsedResult.blocks.length})
                      </span>
                      {parsedResult.blocks.map((b, bIdx) => (
                        <div key={bIdx} className="bg-white p-2.5 rounded border border-gray-200 space-y-1">
                          <span className="font-bold text-xs text-indigo-700 block">
                            Block {b.blockNumber || bIdx + 1}
                          </span>
                          <div className="space-y-1 text-2xs">
                            {Object.entries(b.fields).map(([k, v]) => (
                              <div key={k} className="flex flex-col">
                                <span className="font-bold text-gray-500 uppercase">{k}:</span>
                                <span className="text-gray-800 font-mono bg-gray-50 p-1 rounded">
                                  {v}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Click &quot;Parse Text with AI&quot; to preview structured data here.
                  </div>
                )}
              </div>

              {/* Action Buttons for importing */}
              {parsedResult && (
                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleImportAsNew}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Import as New Record
                  </button>
                  {selectedRecord && (
                    <button
                      type="button"
                      onClick={handleApplyToCurrent}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Apply to Current Record
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-xs rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
