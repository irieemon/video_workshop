/**
 * Structured logging utility
 * Provides consistent, searchable logs with different severity levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLevel: LogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;

  /**
   * Format log entry as JSON for production, pretty print for development
   */
  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
      const errorStr = entry.error ? `\n  Error: ${entry.error.message}\n  Stack: ${entry.error.stack}` : '';
      return `[${entry.timestamp}] ${entry.level} - ${entry.message}${contextStr}${errorStr}`;
    }
    return JSON.stringify(entry);
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.DEBUG:
      case LogLevel.INFO:
      default:
        console.log(formatted);
        break;
    }
  }

  /**
   * Debug level logging - verbose information for development
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging - general information about application flow
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging - potentially harmful situations
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging - error events that might still allow the application to continue
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      originalLog(level, message, { ...defaultContext, ...context }, error);
    };
    return childLogger;
  }

  /**
   * Measure execution time of an async function
   */
  async timeAsync<T>(
    label: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, error as Error, { ...context, duration });
      throw error;
    }
  }

  /**
   * Measure execution time of a sync function
   */
  time<T>(label: string, fn: () => T, context?: LogContext): T {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, error as Error, { ...context, duration });
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for common use cases
export const createAPILogger = (endpoint: string, userId?: string, requestId?: string) => {
  return logger.child({ endpoint, userId, requestId });
};

export const createServiceLogger = (service: string) => {
  return logger.child({ service });
};

// Common log messages as constants for consistency
export const LOG_MESSAGES = {
  // Authentication
  AUTH_SUCCESS: 'User authenticated successfully',
  AUTH_FAILED: 'Authentication failed',
  AUTH_UNAUTHORIZED: 'Unauthorized access attempt',

  // Database
  DB_QUERY_START: 'Database query started',
  DB_QUERY_SUCCESS: 'Database query completed',
  DB_QUERY_ERROR: 'Database query failed',

  // API
  API_REQUEST_START: 'API request received',
  API_REQUEST_SUCCESS: 'API request completed successfully',
  API_REQUEST_ERROR: 'API request failed',
  API_VALIDATION_ERROR: 'Request validation failed',
  API_RATE_LIMIT: 'Rate limit exceeded',

  // AI Operations
  AI_REQUEST_START: 'AI request started',
  AI_REQUEST_SUCCESS: 'AI request completed',
  AI_REQUEST_ERROR: 'AI request failed',
  AI_ROUNDTABLE_START: 'Agent roundtable started',
  AI_ROUNDTABLE_SUCCESS: 'Agent roundtable completed',

  // File Operations
  FILE_UPLOAD_START: 'File upload started',
  FILE_UPLOAD_SUCCESS: 'File upload completed',
  FILE_UPLOAD_ERROR: 'File upload failed',

  // Quota
  QUOTA_CHECK: 'Checking usage quota',
  QUOTA_EXCEEDED: 'Usage quota exceeded',
  QUOTA_UPDATE: 'Usage quota updated',
} as const;
