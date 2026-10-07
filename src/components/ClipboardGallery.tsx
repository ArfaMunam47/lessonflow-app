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
    <div className="space-y-6">
      
      {/* Title & Queue Mode Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Clipboard className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Plain-Text Clipboard Gallery
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
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
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                queueMode
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {queueMode ? 'Exit Queue Mode' : 'Start Ordered Copy Queue'}
            </button>
          </div>
        </div>

        {/* Ordered Copy Queue Runner Banner (Requirement 14) */}
        {queueMode && queueItems.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900">
                Ordered Copy Queue: Step {queueIndex + 1} of {queueItems.length}
              </span>
              <button
                onClick={() => setQueueIndex(0)}
                className="text-amber-700 hover:text-amber-900 text-2xs flex items-center"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset Queue
              </button>
            </div>

            {currentQueueItem && (
              <div className="bg-white border border-amber-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    {currentQueueItem.label}
                  </span>
                  <span className="text-3xs uppercase bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    {currentQueueItem.category}
                  </span>
                </div>
                <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {currentQueueItem.plainText}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-2xs text-gray-500">
                    Paste this field into the school website, then click Next Step.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCurrentQueueItem}
                    className="inline-flex items-center px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy & Next Step ({queueIndex + 1}/{queueItems.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Paste & Clean Input Box */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Quick Clean & Save to Gallery</span>
        </h3>
        <p className="text-xs text-slate-500">
          Paste any formatted text, Word table cells, or HTML. It is automatically converted into clean plain text.
        </p>

        <form onSubmit={handleAddSnippet} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                placeholder="Snippet Label (e.g., Monday Target, Station 1 Instructions)"
                className="w-full text-xs text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <select
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value as any)}
                className="w-full text-xs text-slate-900 border border-slate-300 rounded-xl p-2.5 focus:ring-1 focus:ring-indigo-500 font-medium"
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
              className="w-full text-xs text-slate-900 border border-slate-300 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* Clean Text Live Preview */}
          {cleanPreview && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sanitized Plain-Text Output:
              </span>
              <p className="text-slate-800 font-mono text-2xs whitespace-pre-wrap">
                {cleanPreview}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!pasteInput.trim()}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Save Clean Snippet
            </button>
          </div>
        </form>
      </div>

      {/* Clipboard Gallery Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clipboard snippets..."
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl pl-8.5 pr-3 py-2 w-60 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Categories ({clipboardItems.length})</option>
            <option value="target">Targets</option>
            <option value="activities">Activities</option>
            <option value="block_field">Block Fields</option>
            <option value="general">General</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} snippet{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Snippets Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-2">
          <Clipboard className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No clipboard snippets found</p>
          <p className="text-2xs text-slate-400">Copy content from a lesson or use the Quick Clean box above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xs space-y-3 hover:border-slate-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {item.label}
                  </h4>
                  {(item.day || item.className) && (
                    <span className="text-3xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-indigo-200">
                      {item.day} {item.className ? `• ${item.className}` : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-3xs uppercase font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {item.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteClipboardItem(item.id)}
                    title="Delete snippet"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Clean Plain-Text Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {item.plainText}
              </div>

              {/* 1-Click Copy Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => copyToSystemClipboard(item.plainText, item.label)}
                  className="inline-flex items-center px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-indigo-400 text-xs font-bold text-slate-800 rounded-xl shadow-2xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
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
