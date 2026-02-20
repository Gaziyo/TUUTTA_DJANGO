/**
 * useAsyncAction Hook — Canonical Error Recovery Pattern
 *
 * Provides consistent loading/success/error state management for async actions.
 * Per Phase 5: All critical path actions must use this pattern.
 *
 * Usage:
 *   const { execute, status, error, reset } = useAsyncAction(enrollUser);
 *   <button onClick={() => execute(userId, courseId)} disabled={status === 'loading'}>
 *     {status === 'loading' ? 'Enrolling...' : 'Enroll'}
 *   </button>
 *   {status === 'error' && <ErrorMessage error={error} onRetry={reset} />}
 */

import { useState, useCallback, useRef } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncActionState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
}

export interface AsyncActionReturn<T, Args extends unknown[]> {
  /** Execute the async action */
  execute: (...args: Args) => Promise<T | null>;

  /** Current status */
  status: AsyncStatus;

  /** Result data (when status === 'success') */
  data: T | null;

  /** Error object (when status === 'error') */
  error: Error | null;

  /** Whether action is currently loading */
  isLoading: boolean;

  /** Whether action succeeded */
  isSuccess: boolean;

  /** Whether action failed */
  isError: boolean;

  /** Reset state to idle */
  reset: () => void;
}

/**
 * Hook for managing async action state with loading/success/error handling.
 *
 * @param action - The async function to wrap
 * @param options - Optional configuration
 * @returns State and execute function
 */
export function useAsyncAction<T, Args extends unknown[]>(
  action: (...args: Args) => Promise<T>,
  options?: {
    /** Callback on success */
    onSuccess?: (data: T) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    /** Auto-reset to idle after success (ms) */
    successResetDelay?: number;
  }
): AsyncActionReturn<T, Args> {
  const [state, setState] = useState<AsyncActionState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const mountedRef = useRef(true);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setState({ status: 'idle', data: null, error: null });
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Clear any pending reset timeout
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }

      setState({ status: 'loading', data: null, error: null });

      try {
        const result = await action(...args);

        if (mountedRef.current) {
          setState({ status: 'success', data: result, error: null });
          options?.onSuccess?.(result);

          // Auto-reset after success if configured
          if (options?.successResetDelay) {
            resetTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setState(prev =>
                  prev.status === 'success'
                    ? { status: 'idle', data: null, error: null }
                    : prev
                );
              }
            }, options.successResetDelay);
          }
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (mountedRef.current) {
          setState({ status: 'error', data: null, error });
          options?.onError?.(error);
          console.error('[useAsyncAction] Action failed:', error);
        }

        return null;
      }
    },
    [action, options]
  );

  return {
    execute,
    status: state.status,
    data: state.data,
    error: state.error,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    reset,
  };
}

/**
 * Hook for managing multiple async actions with shared loading state.
 */
export function useAsyncActions<Actions extends Record<string, (...args: any[]) => Promise<any>>>(
  actions: Actions
): {
  [K in keyof Actions]: AsyncActionReturn<
    Awaited<ReturnType<Actions[K]>>,
    Parameters<Actions[K]>
  >;
} & { isAnyLoading: boolean } {
  const hooks: Record<string, AsyncActionReturn<any, any>> = {};

  for (const key of Object.keys(actions)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hooks[key] = useAsyncAction(actions[key]);
  }

  const isAnyLoading = Object.values(hooks).some(h => h.isLoading);

  return { ...hooks, isAnyLoading } as any;
}

export default useAsyncAction;
