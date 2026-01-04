/**
 * Rate limiter utility to prevent hitting API quotas
 * Tracks request times and enforces delays between requests
 */

interface RateLimiterConfig {
  minDelay?: number; // Minimum delay between requests in ms
  maxRequestsPerWindow?: number; // Max requests per time window
  windowDuration?: number; // Time window duration in ms
}

class RateLimiter {
  private requestTimes: number[] = [];
  private minDelay: number;
  private maxRequestsPerWindow: number;
  private windowDuration: number;

  constructor(config: RateLimiterConfig = {}) {
    this.minDelay = config.minDelay ?? 200; // Default: 200ms between requests (5 req/sec)
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 50; // Default: 50 requests
    this.windowDuration = config.windowDuration ?? 100000; // Default: 100 seconds
  }

  /**
   * Waits if necessary to respect rate limits before making a request
   */
  async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Clean up old requests outside the window
    this.requestTimes = this.requestTimes.filter(
      (time) => now - time < this.windowDuration
    );

    // If we're at the limit, wait until the oldest request expires
    if (this.requestTimes.length >= this.maxRequestsPerWindow) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.windowDuration - (now - oldestRequest) + 1000; // Add 1s buffer

      if (waitTime > 0) {
        console.log(
          `⏳ Rate limit: waiting ${Math.ceil(waitTime / 1000)}s before next request`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Always wait minimum delay between requests
    const lastRequest = this.requestTimes[this.requestTimes.length - 1];
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }
    }

    // Record this request
    this.requestTimes.push(Date.now());
  }

  /**
   * Reset the rate limiter (useful for testing or manual resets)
   */
  reset(): void {
    this.requestTimes = [];
  }

  /**
   * Get current request count in the window
   */
  getCurrentRequestCount(): number {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(
      (time) => now - time < this.windowDuration
    );
    return this.requestTimes.length;
  }
}

// Export a singleton instance for use across the app
export const rateLimiter = new RateLimiter();

// Also export the class for custom instances if needed
export { RateLimiter };

