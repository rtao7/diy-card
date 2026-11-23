/**
 * Logger utility that only logs in development mode
 * Prevents console pollution in production
 */

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  private logInternal(level: LogLevel, ...args: unknown[]) {
    const write = console[level] as (...data: unknown[]) => void;
    if (!this.isDevelopment) {
      // In production, only log errors
      if (level === "error") {
        write(...args);
      }
      return;
    }

    // In development, log everything
    write(...args);
  }

  /**
   * Log general information (development only)
   */
  info(...args: unknown[]) {
    this.logInternal("info", ...args);
  }

  /**
   * Log warnings (development only)
   */
  warn(...args: unknown[]) {
    this.logInternal("warn", ...args);
  }

  /**
   * Log errors (always logged, even in production)
   */
  error(...args: unknown[]) {
    this.logInternal("error", ...args);
  }

  /**
   * Log debug information (development only)
   */
  debug(...args: unknown[]) {
    this.logInternal("debug", ...args);
  }

  /**
   * Log general messages (development only)
   */
  log(...args: unknown[]) {
    this.logInternal("log", ...args);
  }
}

// Export singleton instance
export const logger = new Logger();
