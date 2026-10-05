/**
 * Keyboard Shortcuts Reference Modal
 */

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl / Cmd + S', desc: 'Save active lesson record immediately' },
    { key: 'Alt + Right', desc: 'Jump to Next lesson record' },
    { key: 'Alt + Left', desc: 'Jump to Previous lesson record' },
    { key: 'Tab', desc: 'Navigate forward between block input cells' },
    { key: 'Shift + Tab', desc: 'Navigate backward between block input cells' },
    { key: 'Esc', desc: 'Close dialogs or modals' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          LessonFlow is designed for high-speed, repetitive weekly data entry. Use these shortcuts to move swiftly without switching between mouse and keyboard.
        </p>

        <div className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden text-xs">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between p-2.5 bg-white hover:bg-gray-50">
              <span className="text-gray-700 font-medium">{s.desc}</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-2xs font-bold text-gray-800 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
