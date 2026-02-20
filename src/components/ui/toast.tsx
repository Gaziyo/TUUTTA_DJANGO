import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  open: boolean;
  onClose: () => void;
  variant?: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  open,
  onClose,
  variant = 'info',
  title,
  description,
  durationMs = 3000
}) => {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => onClose(), durationMs);
    return () => window.clearTimeout(id);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const tone = variant === 'success'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
    : variant === 'error'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-600'
      : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600';

  return (
    <div className="fixed right-6 top-6 z-50">
      <div className={`min-w-[260px] max-w-[340px] rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${tone}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {description && <p className="text-xs mt-1 text-current/80">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-current/70 hover:text-current"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
