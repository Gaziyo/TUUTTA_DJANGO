import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';
type ToastInputVariant = 'default' | 'destructive' | ToastVariant;

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastInputVariant;
  duration?: number;
}

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  notify: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ToastCard: React.FC<{
  toast: ToastItem;
  onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
  const tone = toast.variant === 'success'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
    : toast.variant === 'error'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-600'
      : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600';

  React.useEffect(() => {
    const id = window.setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.durationMs, onClose]);

  return (
    <div className={`w-[320px] rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && <p className="text-xs mt-1 text-current/80">{toast.description}</p>}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-current/70 hover:text-current"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((toast: Omit<ToastItem, 'id'>) => {
    setToasts((prev) => [
      ...prev,
      { ...toast, id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }
    ]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={closeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }

  const toast = React.useCallback(({ title, description, variant = 'default', duration = 3000 }: ToastInput) => {
    const mappedVariant: ToastVariant =
      variant === 'destructive'
        ? 'error'
        : variant === 'default'
          ? 'info'
          : variant;

    ctx.notify({
      title,
      description,
      variant: mappedVariant,
      durationMs: duration
    });
  }, [ctx]);

  const success = React.useCallback((title: string, description?: string, durationMs = 3000) => {
    ctx.notify({ title, description, variant: 'success', durationMs });
  }, [ctx]);

  const error = React.useCallback((title: string, description?: string, durationMs = 4000) => {
    ctx.notify({ title, description, variant: 'error', durationMs });
  }, [ctx]);

  const info = React.useCallback((title: string, description?: string, durationMs = 3000) => {
    ctx.notify({ title, description, variant: 'info', durationMs });
  }, [ctx]);

  return React.useMemo(() => ({
    toast,
    success,
    error,
    info
  }), [toast, success, error, info]);
};
