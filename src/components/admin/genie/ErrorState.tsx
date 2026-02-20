import React from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, XCircle, WifiOff, ServerOff } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'network' | 'server';
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  isDarkMode?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const errorConfigs = {
  error: {
    icon: XCircle,
    defaultTitle: 'Something went wrong',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-500',
    iconBg: 'bg-red-500/20',
    darkText: 'text-red-300'
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'Warning',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-500',
    iconBg: 'bg-amber-500/20',
    darkText: 'text-amber-300'
  },
  network: {
    icon: WifiOff,
    defaultTitle: 'Connection lost',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-500',
    iconBg: 'bg-orange-500/20',
    darkText: 'text-orange-300'
  },
  server: {
    icon: ServerOff,
    defaultTitle: 'Server error',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    textColor: 'text-rose-500',
    iconBg: 'bg-rose-500/20',
    darkText: 'text-rose-300'
  }
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  type = 'error',
  actionLabel = 'Try Again',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  isDarkMode = false,
  dismissible = false,
  onDismiss
}) => {
  const config = errorConfigs[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border p-4 ${config.bgColor} ${config.borderColor} ${isDarkMode ? 'bg-opacity-20' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${config.iconBg}`}>
          <Icon className={`w-5 h-5 ${config.textColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className={`text-sm font-semibold ${isDarkMode ? config.darkText : config.textColor}`}>
                {title || config.defaultTitle}
              </h4>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {message}
              </p>
            </div>
            {dismissible && onDismiss && (
              <button
                onClick={onDismiss}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  isDarkMode
                    ? 'hover:bg-gray-800 text-gray-500'
                    : 'hover:bg-gray-200 text-gray-400'
                }`}
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          {(onAction || onSecondaryAction) && (
            <div className="flex items-center gap-2 mt-3">
              {onAction && (
                <button
                  onClick={onAction}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 genie-btn-press ${
                    isDarkMode
                      ? 'bg-gray-800 text-white hover:bg-gray-700'
                      : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {actionLabel}
                </button>
              )}
              {onSecondaryAction && (
                <button
                  onClick={onSecondaryAction}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {secondaryActionLabel || 'Get Help'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline error for form fields
export const InlineError: React.FC<{
  message: string;
  isDarkMode?: boolean;
}> = ({ message, isDarkMode = false }) => (
  <div className={`flex items-center gap-1.5 text-xs mt-1.5 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
    <span>{message}</span>
  </div>
);

// Toast error notification
export const ErrorToast: React.FC<{
  message: string;
  isDarkMode?: boolean;
  onClose?: () => void;
}> = ({ message, isDarkMode = false, onClose }) => (
  <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-2 ${
    isDarkMode
      ? 'bg-gray-900 border-red-500/30 text-red-300'
      : 'bg-white border-red-200 text-red-600'
  }`}>
    <AlertTriangle className="w-5 h-5" />
    <span className="text-sm">{message}</span>
    {onClose && (
      <button
        onClick={onClose}
        className={`p-1 rounded transition-colors ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
        }`}
      >
        <XCircle className="w-4 h-4" />
      </button>
    )}
  </div>
);

export default ErrorState;
