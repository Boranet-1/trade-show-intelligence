/**
 * Logging Utilities
 *
 * Structured logging for application events, errors, and debugging.
 * Supports different log levels and formatted output.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: unknown
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: Error
}

/**
 * Logger class for structured logging
 */
class Logger {
  private minLevel: LogLevel

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, { ...context, error })
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    this.output(entry)
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const currentLevelIndex = levels.indexOf(this.minLevel)
    const logLevelIndex = levels.indexOf(level)
    return logLevelIndex >= currentLevelIndex
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'production') {
      // In production, output as JSON for log aggregation tools
      console.log(JSON.stringify(entry))
    } else {
      // In development, output formatted for readability
      const levelColors: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m', // Green
        [LogLevel.WARN]: '\x1b[33m', // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
      }

      const reset = '\x1b[0m'
      const color = levelColors[entry.level]
      const levelStr = entry.level.toUpperCase().padEnd(5)

      let output = `${color}[${levelStr}]${reset} ${entry.timestamp} - ${entry.message}`

      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
      }

      console.log(output)
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
)

/**
 * Export logger functions
 */
export const logger = {
  debug: (message: string, context?: LogContext) => defaultLogger.debug(message, context),
  info: (message: string, context?: LogContext) => defaultLogger.info(message, context),
  warn: (message: string, context?: LogContext) => defaultLogger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    defaultLogger.error(message, error, context),
  setLevel: (level: LogLevel) => defaultLogger.setLevel(level),
}

/**
 * Create a child logger with default context
 */
export function createLogger(defaultContext: LogContext): typeof logger {
  return {
    debug: (message: string, context?: LogContext) =>
      defaultLogger.debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      defaultLogger.info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      defaultLogger.warn(message, { ...defaultContext, ...context }),
    error: (message: string, error?: Error, context?: LogContext) =>
      defaultLogger.error(message, error, { ...defaultContext, ...context }),
    setLevel: (level: LogLevel) => defaultLogger.setLevel(level),
  }
}

/**
 * Performance logging utility
 */
export class PerformanceLogger {
  private startTime: number
  private checkpoints: Map<string, number>

  constructor(private operationName: string) {
    this.startTime = Date.now()
    this.checkpoints = new Map()
    logger.debug(`Starting: ${operationName}`)
  }

  /**
   * Record a checkpoint
   */
  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now())
    const duration = Date.now() - this.startTime
    logger.debug(`Checkpoint: ${this.operationName} - ${name}`, { duration })
  }

  /**
   * End performance logging
   */
  end(context?: LogContext): void {
    const duration = Date.now() - this.startTime
    logger.info(`Completed: ${this.operationName}`, { duration, ...context })
  }

  /**
   * Get duration in milliseconds
   */
  getDuration(): number {
    return Date.now() - this.startTime
  }
}

/**
 * Log API request
 */
export function logRequest(
  method: string,
  path: string,
  context?: LogContext
): void {
  logger.info(`API Request: ${method} ${path}`, context)
}

/**
 * Log API response
 */
export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void {
  const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
  const message = `API Response: ${method} ${path} - ${statusCode}`

  if (level === LogLevel.ERROR) {
    logger.error(message, undefined, { statusCode, duration, ...context })
  } else if (level === LogLevel.WARN) {
    logger.warn(message, { statusCode, duration, ...context })
  } else {
    logger.info(message, { statusCode, duration, ...context })
  }
}
