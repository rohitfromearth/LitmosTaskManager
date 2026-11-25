import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStore } from '../store/createAppStore';

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; store: AppStore }
  | { status: 'error'; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong while starting the app.';
}

/** Runs `initialize` on mount and again whenever `retry` is called. */
export function useAppBootstrap(initialize: () => Promise<AppStore>) {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Read through a ref so a new function identity can't restart startup.
  const initializeRef = useRef(initialize);
  initializeRef.current = initialize;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    initializeRef.current().then(
      store => {
        if (!cancelled) setState({ status: 'ready', store });
      },
      error => {
        if (!cancelled)
          setState({ status: 'error', message: errorMessage(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);
  return { state, retry };
}
