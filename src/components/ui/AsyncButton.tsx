/**
 * AsyncButton Component — Canonical Error Recovery Pattern
 *
 * Button with built-in loading state and error recovery.
 * Per Phase 5: All critical action buttons should use this component.
 *
 * Usage:
 *   <AsyncButton
 *     onClick={handleEnroll}
 *     loadingText="Enrolling..."
 *   >
 *     Enroll User
 *   </AsyncButton>
 */

import React, { useState, useCallback, ReactNode } from 'react';
import { Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AsyncButtonProps {
  children: ReactNode;
  onClick: () => Promise<void> | void;

  /** Text to show while loading */
  loadingText?: string;

  /** Show success state after completion */
  showSuccess?: boolean;

  /** Duration to show success state (ms) */
  successDuration?: number;

  /** Button variant */
  variant?: ButtonVariant;

  /** Button size */
  size?: ButtonSize;

  /** Disabled state */
  disabled?: boolean;

  /** Additional class names */
  className?: string;

  /** Icon to show before text */
  icon?: ReactNode;

  /** Full width button */
  fullWidth?: boolean;

  /** Show error inline with retry button */
  showErrorRetry?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400',
  secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400',
  ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function AsyncButton({
  children,
  onClick,
  loadingText,
  showSuccess = true,
  successDuration = 2000,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
  fullWidth = false,
  showErrorRetry = true,
}: AsyncButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (status === 'loading') return;

    setStatus('loading');
    setError(null);

    try {
      await onClick();

      if (showSuccess) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), successDuration);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      setError(errorMessage);
      setStatus('error');
      console.error('[AsyncButton] Action failed:', err);
    }
  }, [onClick, showSuccess, successDuration, status]);

  const handleRetry = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const isDisabled = disabled || status === 'loading';

  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];
  const widthStyles = fullWidth ? 'w-full' : '';

  // Render error state with retry
  if (status === 'error' && showErrorRetry) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error || 'Failed'}</span>
        </div>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  // Determine content based on status
  let content: ReactNode;
  let statusIcon: ReactNode = null;

  switch (status) {
    case 'loading':
      statusIcon = <Loader2 className="w-4 h-4 animate-spin" />;
      content = loadingText || children;
      break;
    case 'success':
      statusIcon = <CheckCircle className="w-4 h-4" />;
      content = 'Done';
      break;
    default:
      statusIcon = icon;
      content = children;
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`}
    >
      {statusIcon}
      {content}
    </button>
  );
}

/**
 * Inline error message with retry button.
 */
export function ErrorMessage({
  error,
  onRetry,
  className = '',
}: {
  error: Error | string | null;
  onRetry?: () => void;
  className?: string;
}) {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error;

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      <span className="text-sm text-red-700 dark:text-red-300 flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Loading overlay for async operations.
 */
export function LoadingOverlay({
  isLoading,
  text = 'Loading...',
}: {
  isLoading: boolean;
  text?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>
      </div>
    </div>
  );
}

export default AsyncButton;
