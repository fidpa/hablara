/**
 * Hablará Logging Utility
 *
 * Provides structured, environment-aware logging with consistent formatting.
 *
 * Features:
 * - Module-based prefixes for easy filtering
 * - Environment-based log level control
 * - Consistent timestamp formatting
 * - Structured error logging
 * - Production-safe (respects LOG_LEVEL env var)
 *
 * ⚠️ SECURITY: Never log sensitive data!
 * - API keys, tokens, passwords → NEVER log
 * - PII (emails, names) → avoid or mask
 * - Request bodies → sanitize before logging
 *
 * Environment Variables:
 * - Server: LOG_LEVEL (debug|info|warn|error|silent) - Default: 'info'
 * - Client: NEXT_PUBLIC_LOG_LEVEL (same values) - Default: 'warn' (production), 'debug' (development)
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('AudioRecorder', 'Recording started');
 * logger.error('WhisperClient', 'Transcription failed', error);
 * logger.debug('OllamaClient', 'Response received', { tokens: 150 });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Get current log level from environment
 * Defaults to 'warn' in production, 'debug' in development
 */
function getLogLevel(): LogLevel {
  if (typeof window === 'undefined') {
    // Server-side
    return (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  // Client-side
  const envLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel;
  const isDevelopment = process.env.NODE_ENV === 'development';

  return envLogLevel || (isDevelopment ? 'debug' : 'warn');
}

const currentLogLevel = getLogLevel();

/**
 * Format timestamp for log entries (Regex variant)
 *
 * Single-pass extraction, no chained splits.
 * Format: HH:MM:SS
 */
function timestamp(): string {
  const now = new Date();
  const isoString = now.toISOString(); // UTC timezone (Z suffix)

  // Extract HH:MM:SS with regex (more robust than split)
  const match = isoString.match(/T(\d{2}:\d{2}:\d{2})/);

  if (match && match[1]) {
    return match[1]; // "14:30:45"
  }

  // Fallback: should never happen with valid Date
  console.warn('[logger] Failed to parse timestamp from ISO string');
  return '00:00:00';
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

/**
 * Format log message with module prefix
 */
function formatMessage(module: string, message: string): string {
  return `[${timestamp()}] [${module}] ${message}`;
}

/**
 * Structured logger with environment-aware output
 */
export const logger = {
  /**
   * Debug-level logging (verbose, development only)
   * Use for: Internal state, detailed flow, debugging info
   */
  debug(module: string, message: string, data?: unknown): void {
    if (!shouldLog('debug')) return;

    if (data !== undefined) {
      console.debug(formatMessage(module, message), data);
    } else {
      console.debug(formatMessage(module, message));
    }
  },

  /**
   * Info-level logging (key events)
   * Use for: Recording started/stopped, transcription complete, major state changes
   */
  info(module: string, message: string, data?: unknown): void {
    if (!shouldLog('info')) return;

    if (data !== undefined) {
      console.info(formatMessage(module, message), data);
    } else {
      console.info(formatMessage(module, message));
    }
  },

  /**
   * Warning-level logging (recoverable issues)
   * Use for: Fallback providers, degraded performance, non-critical failures
   */
  warn(module: string, message: string, data?: unknown): void {
    if (!shouldLog('warn')) return;

    if (data !== undefined) {
      console.warn(formatMessage(module, message), data);
    } else {
      console.warn(formatMessage(module, message));
    }
  },

  /**
   * Error-level logging (failures)
   * Use for: Exceptions, critical failures, user-impacting errors
   */
  error(module: string, message: string, error?: unknown): void {
    if (!shouldLog('error')) return;

    if (error !== undefined) {
      console.error(formatMessage(module, message), error);
    } else {
      console.error(formatMessage(module, message));
    }
  },
};

/**
 * Internal exports for unit testing ONLY
 *
 * ⚠️ DO NOT import in production code:
 * - Implementation details may change without notice
 * - Not part of public API contract
 * - Breaking changes possible in minor versions
 */
export const __internal = {
  getLogLevel,
  shouldLog,
  formatMessage,
  LOG_LEVELS,
};
