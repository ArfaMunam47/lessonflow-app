/**
 * Plain-Text Clipboard Gallery & Ordered Copy Queue Component
 * 
 * Ensures all copied items are clean plain text stripped of HTML tags,
 * formatting, inline styles, and Word artifacts.
 * Includes:
 * - 1-Click Copy button for each item
 * - Sequential Step-by-Step "Copy Queue" runner for manual school website entry
 * - Quick Clean & Store paste box
 * - Category, Day, and Class filters
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { ClipboardItem } from '../types/index.js';
import { cleanPlainText } from '../utils/textCleaner.js';
import {
  Clipboard,
  Copy,
  Trash2,
  Plus,
  Play,
  CheckCircle,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
} from 'lucide-react';

export const ClipboardGallery: React.FC = () => {
  const {
    clipboardItems,
    copyToSystemClipboard,
    addClipboardItem,
    deleteClipboardItem,
    showToast,
  } = useApp();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Quick Add Clean Plain-Text Box
  const [pasteInput, setPasteInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<ClipboardItem['category']>('general');
  const [cleanPreview, setCleanPreview] = useState('');

  // Ordered Copy Queue Mode (Requirement 14)
  const [queueMode, setQueueMode] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  const handlePasteChange = (val: string) => {
    setPasteInput(val);
    const cleaned = cleanPlainText(val);
    setCleanPreview(cleaned);
  };

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteInput.trim()) return;

    const label = labelInput.trim() || 'Custom Snippet';
    await addClipboardItem(pasteInput, label, categoryInput);
    setPasteInput('');
    setCleanPreview('');
    setLabelInput('');
  };

  // Filtered clipboard items
  const filtered = clipboardItems.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchText = item.plainText.toLowerCase().includes(q);
      const matchClass = item.className?.toLowerCase().includes(q);
      const matchDay = item.day?.toLowerCase().includes(q);
      if (!matchLabel && !matchText && !matchClass && !matchDay) return false;
    }
    return true;
  });

  // Ordered queue items
  const queueItems = filtered;
  const currentQueueItem = queueItems[queueIndex] || null;

  const handleCopyCurrentQueueItem = async () => {
    if (!currentQueueItem) return;
    await copyToSystemClipboard(currentQueueItem.plainText, currentQueueItem.label);
    if (queueIndex < queueItems.length - 1) {
      setQueueIndex(queueIndex + 1);
    } else {
      showToast('Completed copying all items in queue!', 'success');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      
      {/* Title & Queue Mode Toggle */}
      <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Clipboard className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
              <h2 className="text-xl font-black text-[#18181B] tracking-tight">
                Plain-Text Clipboard Gallery
              </h2>
            </div>
            <p className="text-xs text-[#52525B] font-bold mt-1 max-w-xl leading-relaxed">
              Store and copy clean plain text without HTML, styles, or rich formatting.
              Use 1-click copy or the Sequential Copy Queue to paste into the school website.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setQueueMode(!queueMode);
                setQueueIndex(0);
              }}
              className={`inline-flex items-center px-4 py-2 text-xs font-black rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer ${
                queueMode
                  ? 'bg-[#FEF08A] text-[#18181B]'
                  : 'bg-white hover:bg-[#FAF7EE] text-[#18181B]'
              }`}
            >
              <Play className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
              {queueMode ? 'Exit Queue Mode' : 'Start Ordered Copy Queue'}
            </button>
          </div>
        </div>

        {/* Ordered Copy Queue Runner Banner */}
        {queueMode && queueItems.length > 0 && (
          <div className="mt-4 bg-[#FEF08A] border-2 border-[#18181B] rounded-2xl p-5 space-y-3 shadow-[2px_2px_0px_#18181B]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-[#18181B]">
                Ordered Copy Queue: Step {queueIndex + 1} of {queueItems.length}
              </span>
              <button
                onClick={() => setQueueIndex(0)}
                className="text-[#18181B] hover:underline text-xs font-black flex items-center cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 mr-1 stroke-[2.5]" />
                Reset Queue
              </button>
            </div>

            {currentQueueItem && (
              <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 space-y-3 shadow-[1px_1px_0px_#18181B]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#18181B]">
                    {currentQueueItem.label}
                  </span>
                  <span className="text-[10px] uppercase bg-[#FEF08A] text-[#18181B] font-black px-2 py-0.5 rounded-md border-2 border-[#18181B]">
                    {currentQueueItem.category}
                  </span>
                </div>
                <p className="text-xs text-[#18181B] bg-[#FAF7EE] p-3 rounded-xl border-2 border-[#18181B] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto font-bold">
                  {currentQueueItem.plainText}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#52525B] font-bold">
                    Paste this field into the school website, then click Next Step.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCurrentQueueItem}
                    className="inline-flex items-center px-4 py-2 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
                    Copy & Next Step ({queueIndex + 1}/{queueItems.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Paste & Clean Input Box (Pastel Yellow Accent for Clipboard) */}
      <div className="bg-[#FEF08A] border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] space-y-3.5">
        <h3 className="text-sm font-black text-[#18181B] uppercase tracking-wider flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#18181B] stroke-[2.5]" />
          <span>Quick Clean & Save to Gallery</span>
        </h3>
        <p className="text-xs text-[#3F3F46] font-bold leading-relaxed">
          Paste any formatted text, Word table cells, or HTML. It is automatically converted into clean plain text.
        </p>

        <form onSubmit={handleAddSnippet} className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                placeholder="Snippet Label (e.g., Monday Target, Station 1 Instructions)"
                className="w-full text-xs text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl p-2.5 font-bold focus:outline-hidden"
              />
            </div>
            <div>
              <select
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value as any)}
                className="w-full text-xs text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl p-2.5 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="general">Category: General</option>
                <option value="target">Category: Target</option>
                <option value="activities">Category: Activities</option>
                <option value="block_field">Category: Block Field</option>
                <option value="custom">Category: Custom</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              value={pasteInput}
              onChange={e => handlePasteChange(e.target.value)}
              placeholder="Paste rich text, HTML, or raw lesson content here..."
              className="w-full text-xs text-[#18181B] bg-white border-2 border-[#18181B] rounded-xl p-3 focus:outline-hidden resize-y font-medium"
            />
          </div>

          {/* Clean Text Live Preview */}
          {cleanPreview && (
            <div className="bg-white border-2 border-[#18181B] rounded-xl p-3 text-xs shadow-[1px_1px_0px_#18181B]">
              <span className="text-[10px] font-black text-[#52525B] uppercase tracking-wider block mb-1">
                Sanitized Plain-Text Output:
              </span>
              <p className="text-[#18181B] font-mono text-xs whitespace-pre-wrap font-bold">
                {cleanPreview}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!pasteInput.trim()}
              className="inline-flex items-center px-4 py-2 bg-[#18181B] hover:bg-neutral-800 disabled:opacity-50 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
              Save Clean Snippet
            </button>
          </div>
        </form>
      </div>

      {/* Clipboard Gallery Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-[#18181B] rounded-[20px] p-4 shadow-[1px_1px_0px_#18181B]">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#18181B]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clipboard snippets..."
              className="text-xs bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl pl-9 pr-3 py-2 w-60 text-[#18181B] font-bold focus:outline-hidden"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl px-3 py-2 text-[#18181B] font-black cursor-pointer"
          >
            <option value="all">All Categories ({clipboardItems.length})</option>
            <option value="target">Targets</option>
            <option value="activities">Activities</option>
            <option value="block_field">Block Fields</option>
            <option value="general">General</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <span className="text-xs text-[#18181B] font-black font-mono">
          Showing {filtered.length} snippet{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Snippets Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#18181B] rounded-[22px] p-12 text-center text-xs text-[#52525B] space-y-2 font-bold">
          <Clipboard className="w-8 h-8 text-[#18181B] mx-auto stroke-[2.5]" />
          <p className="font-black text-sm text-[#18181B]">No clipboard snippets found</p>
          <p className="text-[11px] text-[#52525B]">Copy content from a lesson or use the Quick Clean box above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white border-2 border-[#18181B] rounded-[20px] p-5 shadow-[2px_2px_0px_#18181B] hover:shadow-[3px_3px_0px_#18181B] space-y-3 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b-2 border-[#18181B]/15 pb-2.5">
                  <div>
                    <h4 className="text-sm font-black text-[#18181B] leading-tight">
                      {item.label}
                    </h4>
                    {(item.day || item.className) && (
                      <span className="text-[10px] font-black text-[#18181B] bg-[#FEF08A] px-2 py-0.5 rounded-md mt-1 inline-block border-2 border-[#18181B]">
                        {item.day} {item.className ? `• ${item.className}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase font-black text-[#18181B] bg-[#FAF7EE] px-2 py-0.5 rounded-md border-2 border-[#18181B]">
                      {item.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteClipboardItem(item.id)}
                      title="Delete snippet"
                      className="p-1 text-[#18181B] hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Clean Plain-Text Display */}
                <div className="mt-3 bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl p-3 text-xs font-mono text-[#18181B] whitespace-pre-wrap max-h-32 overflow-y-auto font-bold">
                  {item.plainText}
                </div>
              </div>

              {/* 1-Click Copy Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => copyToSystemClipboard(item.plainText, item.label)}
                  className="inline-flex items-center px-4 py-2 bg-white hover:bg-[#FAF7EE] border-2 border-[#18181B] text-xs font-black text-[#18181B] rounded-xl shadow-[1px_1px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
                  Copy Plain Text
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
