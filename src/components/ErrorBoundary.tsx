"use client";

import React, { Component, ErrorInfo } from "react";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";
import type { ErrorBoundaryProps, ErrorBoundaryState } from "@/lib/types";

/**
 * React Error Boundary Component
 *
 * Catches render errors in child components and displays a fallback UI.
 * Prevents component crashes from causing app-wide whitescreen failures.
 *
 * Strategy: "Fail small, recover fast"
 * - Isolates failures at component level
 * - Provides explicit recovery options
 * - Logs errors via structured logger
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary name="ChatHistory">
 *   <ChatHistory messages={messages} />
 * </ErrorBoundary>
 * ```
 *
 * Features:
 * - Default fallback UI with error message and recovery buttons
 * - Custom fallback via `fallback` prop
 * - Structured logging via `logger.error()` (NOT console.error)
 * - Optional `onError` callback for custom error handling
 *
 * Limitations:
 * - Does NOT catch event handler errors (use try-catch in handlers)
 * - Does NOT catch async errors (use try-catch in async code)
 * - Does NOT catch errors in the boundary itself (parent boundary catches)
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 * @see docs/reference/guidelines/REACT_TSX.md
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Lifecycle: Capture error before render
   * Updates state to trigger fallback UI
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle: Log error after render
   * Integrates with structured logger and custom callbacks
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { name = "UnknownComponent", onError } = this.props;

    // Structured logging (NOT console.error)
    logger.error(name, "Component error caught by boundary", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Custom callback (optional)
    if (onError) {
      onError(error, errorInfo);
    }
  }

  /**
   * Recovery: Reset error state
   * Allows component to retry rendering
   */
  handleReset = (): void => {
    this.setState((prevState) => ({
      ...prevState,
      hasError: false,
      error: null,
    }));
  };

  /**
   * Recovery: Nuclear option
   * Reloads the entire page
   */
  handleReload = (): void => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return <DefaultFallbackUI error={this.state.error} onReset={this.handleReset} onReload={this.handleReload} />;
    }

    // No error - render children normally
    return this.props.children;
  }
}

/**
 * Default Fallback UI Component
 * Displayed when error boundary catches an error
 */
interface DefaultFallbackUIProps {
  error: Error | null;
  onReset: () => void;
  onReload: () => void;
}

function DefaultFallbackUI({ error, onReset, onReload }: DefaultFallbackUIProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        {/* Icon + Header */}
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Etwas ist schief gelaufen</h2>
        </div>

        {/* Error Message */}
        <p className="text-sm text-red-800 dark:text-red-200 mb-6 leading-relaxed">
          {error?.message || "Ein unerwarteter Fehler ist aufgetreten"}
        </p>

        {/* Recovery Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Reset Button (Primary) */}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex-1"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Erneut versuchen</span>
          </button>

          {/* Reload Button (Secondary) */}
          <button
            onClick={onReload}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700 rounded-md transition-colors flex-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Seite neu laden</span>
          </button>
        </div>
      </div>
    </div>
  );
}
