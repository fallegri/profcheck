/**
 * Logger utility for the application.
 *
 * - In production: outputs structured JSON (one line per entry) for log aggregators.
 * - In development: outputs human-readable coloured text for easy reading.
 *
 * Supports four levels: info, warn, error, debug.
 * Debug messages are suppressed in production.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/** ANSI colour codes used in development mode only */
const LEVEL_COLORS: Record<LogLevel, string> = {
  info:  "\x1b[36m",  // cyan
  warn:  "\x1b[33m",  // yellow
  error: "\x1b[31m",  // red
  debug: "\x1b[35m",  // magenta
};
const RESET = "\x1b[0m";

class Logger {
  private readonly isProduction = process.env.NODE_ENV === "production";
  private readonly isDevelopment = process.env.NODE_ENV === "development";

  private formatLog(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  /**
   * Serialise a log entry.
   * Production → compact JSON string (structured logging for aggregators).
   * Development → coloured human-readable text.
   */
  private serialise(entry: LogEntry): string {
    if (this.isProduction) {
      // Structured JSON: omit undefined `data` to keep output clean
      const obj: Record<string, unknown> = {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
      };
      if (entry.data !== undefined) {
        obj["data"] = entry.data;
      }
      return JSON.stringify(obj);
    }

    // Human-readable text for development
    const color = LEVEL_COLORS[entry.level];
    const prefix = `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}]${RESET}`;
    return `${prefix} ${entry.message}`;
  }

  private output(entry: LogEntry): void {
    // Suppress debug in production
    if (entry.level === "debug" && !this.isDevelopment) {
      return;
    }

    const text = this.serialise(entry);

    switch (entry.level) {
      case "error":
        if (this.isProduction || entry.data === undefined) {
          console.error(text);
        } else {
          console.error(text, entry.data);
        }
        break;
      case "warn":
        if (this.isProduction || entry.data === undefined) {
          console.warn(text);
        } else {
          console.warn(text, entry.data);
        }
        break;
      case "debug":
        if (entry.data === undefined) {
          console.debug(text);
        } else {
          console.debug(text, entry.data);
        }
        break;
      case "info":
      default:
        if (this.isProduction || entry.data === undefined) {
          console.log(text);
        } else {
          console.log(text, entry.data);
        }
        break;
    }
  }

  info(message: string, data?: unknown): void {
    this.output(this.formatLog("info", message, data));
  }

  warn(message: string, data?: unknown): void {
    this.output(this.formatLog("warn", message, data));
  }

  error(message: string, data?: unknown): void {
    this.output(this.formatLog("error", message, data));
  }

  debug(message: string, data?: unknown): void {
    this.output(this.formatLog("debug", message, data));
  }
}

export const logger = new Logger();
