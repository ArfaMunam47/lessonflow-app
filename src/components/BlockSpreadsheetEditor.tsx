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
      <div className="border-2 border-dashed border-[#18181B] rounded-[20px] p-8 text-center bg-white my-4 shadow-[2px_2px_0px_#18181B]">
        <p className="text-xs font-black text-[#52525B]">
          No blocks to display in grid. Click &quot;Add Blocks&quot; above to begin.
        </p>
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
    <div className="my-4 border-2 border-[#18181B] rounded-[20px] overflow-hidden bg-white shadow-[2px_2px_0px_#18181B]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y-2 divide-[#18181B] text-xs">
          <thead className="bg-[#FAF7EE] border-b-2 border-[#18181B]">
            <tr>
              <th scope="col" className="w-16 px-3 py-3 text-left font-black text-[#18181B] uppercase tracking-wider sticky left-0 bg-[#FAF7EE] z-10 border-r-2 border-[#18181B]">
                Block
              </th>
              {fieldColumns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-3.5 py-3 text-left font-black text-[#18181B] min-w-[220px]"
                >
                  {col.label}
                </th>
              ))}
              <th scope="col" className="w-24 px-3 py-3 text-center font-black text-[#18181B]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[#18181B]/15 bg-white">
            {blocks.map((block, index) => {
              const fieldMap = new Map(block.fields.map(f => [f.fieldKey, f]));

              return (
                <tr key={block.id} className="hover:bg-[#FAF7EE]/50 transition-colors">
                  {/* Sticky Block Number Cell */}
                  <td className="px-3 py-2 font-black text-[#18181B] text-center sticky left-0 bg-white border-r-2 border-[#18181B] z-10">
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded-lg bg-[#FEF08A] border-2 border-[#18181B] text-[#18181B] flex items-center justify-center font-black text-xs mb-1 shadow-[1px_1px_0px_#18181B]">
                        #{block.blockNumber}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-0.5 rounded border border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === blocks.length - 1}
                          className="p-0.5 rounded border border-[#18181B] bg-white text-[#18181B] hover:bg-[#FAF7EE] disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3 stroke-[2.5]" />
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
                          className="w-full text-xs font-bold text-[#18181B] border-2 border-[#18181B] rounded-xl p-2 bg-white focus:outline-hidden resize-y shadow-[1px_1px_0px_#18181B]"
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
                        className="p-1.5 text-[#18181B] hover:bg-[#FAF7EE] rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] bg-white cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBlock(block.id)}
                        title="Delete block"
                        className="p-1.5 text-[#18181B] hover:text-rose-600 hover:bg-rose-50 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] bg-white cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
      <div className="bg-[#FAF7EE] px-4 py-3 border-t-2 border-[#18181B] flex justify-between items-center text-xs">
        <span className="text-[#52525B] font-black">
          Total: {blocks.length} blocks
        </span>
        <button
          type="button"
          onClick={() => createBlocks(1)}
          className="inline-flex items-center text-xs font-black text-[#18181B] hover:bg-white bg-[#FAF7EE] border-2 border-[#18181B] px-3 py-1.5 rounded-xl shadow-[1px_1px_0px_#18181B] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
          Add Row (Block {blocks.length + 1})
        </button>
      </div>
    </div>
  );
};
