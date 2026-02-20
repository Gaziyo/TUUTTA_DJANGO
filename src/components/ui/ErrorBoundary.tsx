/**
 * ErrorBoundary Component — Canonical Error Recovery
 *
 * React Error Boundary for catching render errors and providing recovery UI.
 * Per Phase 5: Critical path components must be wrapped in ErrorBoundary.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI when error occurs */
  fallback?: ReactNode;
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom recovery action */
  onRetry?: () => void;
  /** Show error details (default: false in production) */
  showDetails?: boolean;
  /** Title for error message */
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showStack: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log error for observability
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    });
    this.props.onRetry?.();
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  toggleStack = () => {
    this.setState(prev => ({ showStack: !prev.showStack }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showStack } = this.state;
      const showDetails = this.props.showDetails ?? process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-lg w-full text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Error Title */}
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              {this.props.title || 'Something went wrong'}
            </h2>

            {/* Error Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {/* Error Details (Development) */}
            {showDetails && error && (
              <div className="text-left">
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showStack ? '' : '-rotate-90'}`}
                  />
                  Technical Details
                </button>

                {showStack && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto max-h-64 text-left">
                    <p className="text-sm font-mono text-red-600 dark:text-red-400 mb-2">
                      {error.name}: {error.message}
                    </p>
                    {errorInfo?.componentStack && (
                      <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
