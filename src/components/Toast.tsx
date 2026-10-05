/**
 * Toast Notification Component
 */

import React from 'react';
import { useApp } from '../context/AppContext.js';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map(toast => {
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
        let borderClass = 'border-emerald-300 bg-emerald-50 text-emerald-950';

        if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
          borderClass = 'border-rose-300 bg-rose-50 text-rose-950';
        } else if (toast.type === 'info') {
          icon = <Info className="w-5 h-5 text-sky-600 shrink-0" />;
          borderClass = 'border-sky-300 bg-sky-50 text-sky-950';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between shadow-md border rounded-md px-4 py-3 min-w-[280px] max-w-md text-sm font-medium ${borderClass} transition-all`}
          >
            <div className="flex items-center space-x-2.5">
              {icon}
              <span className="leading-snug">{toast.text}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-3 p-1 rounded hover:bg-black/10 text-gray-500 hover:text-gray-900"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
