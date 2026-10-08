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
      <div className="border-2 border-dashed border-[#18181B] rounded-[20px] p-8 text-center bg-white my-4 shadow-[2px_2px_0px_#18181B]">
        <Layers className="w-10 h-10 text-[#18181B] mx-auto mb-2 stroke-[2.5]" />
        <h4 className="text-sm font-black text-[#18181B]">No Blocks in This Lesson Plan</h4>
        <p className="text-xs text-[#52525B] max-w-sm mx-auto mt-1 mb-4 font-bold">
          Click &quot;Create 5 Blocks&quot; above or click below to start building dynamic lesson plan blocks.
        </p>
        <button
          onClick={() => createBlocks(3)}
          className="inline-flex items-center px-4 py-2 bg-[#18181B] hover:bg-neutral-800 text-white text-xs font-black rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
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
            className="border-2 border-[#18181B] rounded-[20px] bg-white shadow-[2px_2px_0px_#18181B] overflow-hidden transition-all"
          >
            {/* Block Header bar with warm pastel yellow header */}
            <div className="bg-[#FEF08A] px-4 py-3 border-b-2 border-[#18181B] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-white border-2 border-[#18181B] text-[#18181B] font-black text-xs flex items-center justify-center shadow-[1px_1px_0px_#18181B]">
                  {block.blockNumber}
                </span>
                <h4 className="text-sm font-black text-[#18181B]">
                  Block {block.blockNumber}
                </h4>
                {block.templateId && (
                  <span className="text-[10px] text-[#18181B] bg-white border-2 border-[#18181B] px-2 py-0.5 rounded-md font-mono font-bold">
                    {templates.find(t => t.id === block.templateId)?.name || 'Custom'}
                  </span>
                )}
              </div>

              {/* Block Actions Toolbar */}
              <div className="flex items-center space-x-1.5">
                {/* Apply Template dropdown */}
                <select
                  value={block.templateId || ''}
                  onChange={e => {
                    if (e.target.value) {
                      applyTemplateToBlock(block.id, e.target.value);
                    }
                  }}
                  className="text-xs bg-white border-2 border-[#18181B] rounded-lg px-2 py-1 text-[#18181B] font-black focus:outline-hidden cursor-pointer"
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
                  className="p-1.5 rounded-lg border-2 border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] disabled:opacity-30 disabled:hover:bg-white cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={isLast}
                  title="Move block down"
                  className="p-1.5 rounded-lg border-2 border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] disabled:opacity-30 disabled:hover:bg-white cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Copy Entire Block Content */}
                <button
                  type="button"
                  onClick={() => handleCopyBlock(block)}
                  title="Copy entire block text to clipboard"
                  className="p-1.5 rounded-lg border-2 border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Duplicate Block */}
                <button
                  type="button"
                  onClick={() => duplicateBlock(block.id)}
                  title="Duplicate this block"
                  className="inline-flex items-center px-2.5 py-1 text-xs text-[#18181B] font-black bg-white border-2 border-[#18181B] rounded-lg hover:bg-[#FAF7EE] shadow-[1px_1px_0px_#18181B] cursor-pointer"
                >
                  <Copy className="w-3 h-3 mr-1 stroke-[2.5]" />
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
                  className="p-1.5 rounded-lg border-2 border-[#18181B] text-[#18181B] hover:bg-rose-50 hover:text-rose-600 bg-white cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Block Fields Form */}
            <div className="p-4 sm:p-5 space-y-4">
              {block.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[#18181B]">
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
                      className="inline-flex items-center text-[10px] font-black text-[#18181B] hover:bg-[#FAF7EE] bg-white border-2 border-[#18181B] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] transition-all cursor-pointer"
                    >
                      <Copy className="w-2.5 h-2.5 mr-1 stroke-[2.5]" />
                      Copy Text
                    </button>
                  </div>

                  {field.fieldType === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={field.fieldValue}
                      onChange={e => handleFieldChange(block.id, field.id, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.fieldLabel}...`}
                      className="w-full text-xs font-medium text-[#18181B] border-2 border-[#18181B] rounded-xl p-2.5 focus:outline-hidden bg-white shadow-[1px_1px_0px_#18181B]/20 resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.fieldValue}
                      onChange={e => handleFieldChange(block.id, field.id, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.fieldLabel}...`}
                      className="w-full text-xs font-medium text-[#18181B] border-2 border-[#18181B] rounded-xl p-2.5 focus:outline-hidden bg-white shadow-[1px_1px_0px_#18181B]/20"
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
          className="inline-flex items-center px-4 py-2 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-xs font-black rounded-xl text-[#18181B] bg-white hover:bg-[#FAF7EE] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5 stroke-[3]" />
          Add Another Block (Block {blocks.length + 1})
        </button>
      </div>
    </div>
  );
};
