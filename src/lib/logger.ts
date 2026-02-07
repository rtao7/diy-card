/**
 * Logger utility that only logs in development mode
 * Prevents console pollution in production
 */

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  private logInternal(level: LogLevel, ...args: any[]) {
    if (!this.isDevelopment) {
      // In production, only log errors
      if (level === "error") {
        console.error(...args);
      }
      return;
    }

    // In development, log everything
    console[level](...args);
  }

  /**
   * Log general information (development only)
   */
  info(...args: any[]) {
    this.logInternal("info", ...args);
  }

  /**
   * Log warnings (development only)
   */
  warn(...args: any[]) {
    this.logInternal("warn", ...args);
  }

  /**
   * Log errors (always logged, even in production)
   */
  error(...args: any[]) {
    this.logInternal("error", ...args);
  }

  /**
   * Log debug information (development only)
   */
  debug(...args: any[]) {
    this.logInternal("debug", ...args);
  }

  /**
   * Log general messages (development only)
   */
  log(...args: any[]) {
    this.logInternal("log", ...args);
  }
}

// Export singleton instance
export const logger = new Logger();
