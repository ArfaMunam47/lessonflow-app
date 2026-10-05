/**
 * Dynamic Block Builder Component (Card View)
 * 
 * Allows teachers to:
 * - Build dynamic blocks (1, 2, 3, 4, 5, 6 or more blocks)
 * - View fields configured from templates (Objective, Teacher Activity, Student Activity, etc.)
 * - Reorder blocks (Move Up / Down)
 * - Duplicate blocks with independent fields
 * - Delete blocks
 * - Copy individual field text or entire block text to clipboard
 * - Apply a different template to any block without losing matched data
 */

import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Block, BlockField } from '../types/index.js';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Plus,
  Layers,
  Check,
} from 'lucide-react';

interface BlockBuilderProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
}

export const BlockBuilder: React.FC<BlockBuilderProps> = ({ blocks, onBlocksChange }) => {
  const {
    templates,
    duplicateBlock,
    deleteBlock,
    reorderBlocks,
    applyTemplateToBlock,
    copyToSystemClipboard,
    createBlocks,
  } = useApp();

  const handleFieldChange = (blockId: string, fieldId: string, newValue: string) => {
    const updatedBlocks = blocks.map(block => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        fields: block.fields.map(field => {
          if (field.id !== fieldId) return field;
          return { ...field, fieldValue: newValue };
        }),
      };
    });
    onBlocksChange(updatedBlocks);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...blocks];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    reorderBlocks(newOrder.map(b => b.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newOrder = [...blocks];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    reorderBlocks(newOrder.map(b => b.id));
  };

  const handleCopyBlock = (block: Block) => {
    const textLines = block.fields
      .filter(f => f.fieldValue.trim())
      .map(f => `${f.fieldLabel}: ${f.fieldValue}`)
      .join('\n');
    copyToSystemClipboard(textLines, `Block ${block.blockNumber} Content`);
  };

  if (blocks.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 my-4">
        <Layers className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-gray-800">No Blocks in This Lesson Plan</h4>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
          Click &quot;Create 5 Blocks&quot; above or click below to start building dynamic lesson plan blocks.
        </p>
        <button
          onClick={() => createBlocks(3)}
          className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create 3 Standard Blocks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 my-4">
      {blocks.map((block, index) => {
        const isFirst = index === 0;
        const isLast = index === blocks.length - 1;

        return (
          <div
            key={block.id}
            className="border border-gray-200 rounded-lg bg-white shadow-2xs overflow-hidden transition-all hover:border-gray-300"
          >
            {/* Block Header bar */}
            <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                  {block.blockNumber}
                </span>
                <h4 className="text-sm font-semibold text-gray-900">
                  Block {block.blockNumber}
                </h4>
                {block.templateId && (
                  <span className="text-2xs text-gray-500 bg-gray-200/70 px-1.5 py-0.5 rounded font-mono">
                    {templates.find(t => t.id === block.templateId)?.name || 'Custom'}
                  </span>
                )}
              </div>

              {/* Block Actions Toolbar */}
              <div className="flex items-center space-x-1">
                {/* Apply Template dropdown */}
                <select
                  value={block.templateId || ''}
                  onChange={e => {
                    if (e.target.value) {
                      applyTemplateToBlock(block.id, e.target.value);
                    }
                  }}
                  className="text-xs bg-white border border-gray-300 rounded px-1.5 py-1 text-gray-700 focus:outline-hidden"
                  title="Switch template for this block"
                >
                  <option value="">Change Template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {/* Move Up */}
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={isFirst}
                  title="Move block up"
                  className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={isLast}
                  title="Move block down"
                  className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                {/* Copy Entire Block Content */}
                <button
                  type="button"
                  onClick={() => handleCopyBlock(block)}
                  title="Copy entire block text to clipboard"
                  className="p-1 rounded text-gray-500 hover:text-indigo-600 hover:bg-gray-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Duplicate Block */}
                <button
                  type="button"
                  onClick={() => duplicateBlock(block.id)}
                  title="Duplicate this block"
                  className="inline-flex items-center px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
                >
                  <Copy className="w-3 h-3 mr-1 text-gray-500" />
                  Duplicate
                </button>

                {/* Delete Block */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete Block ${block.blockNumber}?`)) {
                      deleteBlock(block.id);
                    }
                  }}
                  title="Delete this block"
                  className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Block Fields Form */}
            <div className="p-4 space-y-3">
              {block.fields.map(field => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      {field.fieldLabel}
                      {field.isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>

                    {/* 1-Click Copy Field Clean Text */}
                    <button
                      type="button"
                      onClick={() =>
                        copyToSystemClipboard(
                          field.fieldValue,
                          `Block ${block.blockNumber} — ${field.fieldLabel}`
                        )
                      }
                      title={`Copy ${field.fieldLabel} to clipboard`}
                      className="inline-flex items-center text-3xs font-medium text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
                    >
                      <Copy className="w-2.5 h-2.5 mr-1" />
                      Copy Text
                    </button>
                  </div>

                  {field.fieldType === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={field.fieldValue}
                      onChange={e => handleFieldChange(block.id, field.id, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.fieldLabel}...`}
                      className="w-full text-xs text-gray-900 border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.fieldValue}
                      onChange={e => handleFieldChange(block.id, field.id, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.fieldLabel}...`}
                      className="w-full text-xs text-gray-900 border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Single Block Button at bottom */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => createBlocks(1)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-2xs text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
          Add Another Block (Block {blocks.length + 1})
        </button>
      </div>
    </div>
  );
};
