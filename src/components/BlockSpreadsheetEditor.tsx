/**
 * High-Speed Spreadsheet / Table Editor for Lesson Blocks
 * 
 * Allows teachers to enter multiple blocks quickly in a tabular grid without
 * opening individual card forms. Supports Tab/Enter navigation across fields.
 */

import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Block, BlockField } from '../types/index.js';
import { Plus, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface BlockSpreadsheetEditorProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
}

export const BlockSpreadsheetEditor: React.FC<BlockSpreadsheetEditorProps> = ({
  blocks,
  onBlocksChange,
}) => {
  const {
    duplicateBlock,
    deleteBlock,
    reorderBlocks,
    createBlocks,
    copyToSystemClipboard,
  } = useApp();

  if (blocks.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded p-6 text-center text-sm text-gray-500 my-4">
        No blocks to display in grid. Click &quot;Add Blocks&quot; above to begin.
      </div>
    );
  }

  // Derive column headers from the fields of the first block or union of fields
  const fieldColumns: Array<{ key: string; label: string }> = [];
  const seenKeys = new Set<string>();

  blocks.forEach(b => {
    b.fields.forEach(f => {
      if (!seenKeys.has(f.fieldKey)) {
        seenKeys.add(f.fieldKey);
        fieldColumns.push({ key: f.fieldKey, label: f.fieldLabel });
      }
    });
  });

  const handleCellChange = (blockId: string, fieldKey: string, value: string) => {
    const updated = blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        fields: b.fields.map(f => {
          if (f.fieldKey !== fieldKey) return f;
          return { ...f, fieldValue: value };
        }),
      };
    });
    onBlocksChange(updated);
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

  return (
    <div className="my-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-16 px-3 py-2.5 text-left font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                Block
              </th>
              {fieldColumns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[220px]"
                >
                  {col.label}
                </th>
              ))}
              <th scope="col" className="w-24 px-3 py-2.5 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {blocks.map((block, index) => {
              const fieldMap = new Map(block.fields.map(f => [f.fieldKey, f]));

              return (
                <tr key={block.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Sticky Block Number Cell */}
                  <td className="px-3 py-2 font-bold text-gray-800 text-center sticky left-0 bg-white border-r border-gray-200 z-10">
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-1">
                        #{block.blockNumber}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === blocks.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Grid cells for each configured field */}
                  {fieldColumns.map(col => {
                    const field = fieldMap.get(col.key);
                    const val = field ? field.fieldValue : '';

                    return (
                      <td key={col.key} className="px-2 py-2 align-top">
                        <textarea
                          rows={2}
                          value={val}
                          onChange={e => handleCellChange(block.id, col.key, e.target.value)}
                          placeholder={`Enter ${col.label.toLowerCase()}...`}
                          className="w-full text-xs text-gray-900 border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                        />
                      </td>
                    );
                  })}

                  {/* Row Actions */}
                  <td className="px-2 py-2 text-center align-middle whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => duplicateBlock(block.id)}
                        title="Duplicate block"
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBlock(block.id)}
                        title="Delete block"
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Add Row footer */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-between items-center text-xs">
        <span className="text-gray-500 font-medium">
          Total: {blocks.length} blocks
        </span>
        <button
          type="button"
          onClick={() => createBlocks(1)}
          className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-white border border-gray-300 hover:bg-gray-50 px-2.5 py-1 rounded"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Row (Block {blocks.length + 1})
        </button>
      </div>
    </div>
  );
};
