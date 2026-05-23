'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
        // Next.js dev overlay会把console.error当成页面错误气泡。
        // 我们很多业务错误已在UI里友好提示，这里避免重复噪音。
        ...(process.env.NODE_ENV === 'development'
          ? ({
              logger: {
                log: console.log,
                warn: console.warn,
                error: () => {},
              },
            } as Record<string, unknown>)
          : {}),
      }),
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const isBenignResizeObserverError = (message: string) =>
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('ResizeObserver loop completed with undelivered notifications');

    const onError = (event: ErrorEvent) => {
      const msg = String(event.message ?? '');
      if (isBenignResizeObserverError(msg)) {
        event.preventDefault();
      }
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonText =
        typeof event.reason === 'string'
          ? event.reason
          : String((event.reason as { message?: string } | null | undefined)?.message ?? '');
      if (isBenignResizeObserverError(reasonText)) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    const prevOnError = window.onerror;
    const prevOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      const text = `${String(message ?? '')} ${String(source ?? '')} ${String((error as Error | undefined)?.stack ?? '')}`;
      const isOverlayNoise =
        text.includes('handleClientError') ||
        text.includes('use-error-handler.js') ||
        text.includes('react-dev-overlay/internal/helpers/use-error-handler');
      if (isOverlayNoise) return true;
      if (typeof prevOnError === 'function') return prevOnError(message, source, lineno, colno, error);
      return false;
    };

    window.onunhandledrejection = (event) => {
      const reasonText =
        typeof event.reason === 'string'
          ? event.reason
          : String((event.reason as { message?: string; stack?: string } | null | undefined)?.message ?? '') +
            String((event.reason as { message?: string; stack?: string } | null | undefined)?.stack ?? '');
      const isOverlayNoise =
        reasonText.includes('handleClientError') ||
        reasonText.includes('use-error-handler.js') ||
        reasonText.includes('react-dev-overlay/internal/helpers/use-error-handler');
      if (isOverlayNoise) {
        event.preventDefault();
        return true;
      }
      if (typeof prevOnUnhandledRejection === 'function') return prevOnUnhandledRejection(event);
      return false;
    };

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const text = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg && typeof arg === 'object') {
            const anyArg = arg as { message?: unknown; stack?: unknown };
            return `${String(anyArg.message ?? '')} ${String(anyArg.stack ?? '')}`.trim();
          }
          return String(arg ?? '');
        })
        .join(' ');
      const isOverlayNoise =
        text.includes('handleClientError') ||
        text.includes('use-error-handler.js') ||
        text.includes('react-dev-overlay/internal/helpers/use-error-handler');
      if (isOverlayNoise) return;
      originalConsoleError(...args);
    };

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      console.error = originalConsoleError;
      window.onerror = prevOnError;
      window.onunhandledrejection = prevOnUnhandledRejection;
    };
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
