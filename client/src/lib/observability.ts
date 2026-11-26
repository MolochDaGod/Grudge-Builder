/**
 * Frontend observability utilities for structured error reporting and telemetry.
 */

export interface ErrorContext {
  component?: string;
  userId?: string;
  characterId?: string;
  route?: string;
  action?: string;
  [key: string]: any;
}

export interface TelemetryEvent {
  type: string;
  timestamp: number;
  context: ErrorContext;
}

class FrontendObservability {
  private errors: Array<{ error: Error; context: ErrorContext; timestamp: number }> = [];
  private events: TelemetryEvent[] = [];
  private maxStoredErrors = 50;
  private maxStoredEvents = 100;

  /**
   * Report an error with context for structured logging.
   */
  reportError(error: Error, context: ErrorContext = {}) {
    const entry = {
      error,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.errors.push(entry);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[Observability] Error reported:', error, context);
    }

    // Send to backend error tracking endpoint
    this.sendErrorToBackend(entry).catch(err => {
      console.error('[Observability] Failed to send error to backend:', err);
    });
  }

  /**
   * Record a telemetry event.
   */
  recordEvent(type: string, context: ErrorContext = {}) {
    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      context: {
        ...context,
        url: window.location.href,
      },
    };

    this.events.push(event);
    if (this.events.length > this.maxStoredEvents) {
      this.events.shift();
    }

    if (import.meta.env.DEV) {
      console.log('[Observability] Event recorded:', type, context);
    }
  }

  /**
   * Get recent errors for diagnostics.
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  /**
   * Get recent events for diagnostics.
   */
  getRecentEvents(limit = 20) {
    return this.events.slice(-limit);
  }

  /**
   * Check frontend health status.
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded';
    errors: number;
    events: number;
    apiReachable: boolean;
  }> {
    let apiReachable = false;
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      apiReachable = response.ok;
    } catch {
      apiReachable = false;
    }

    const recentErrors = this.errors.filter(e => Date.now() - e.timestamp < 60000).length;
    const status = recentErrors > 10 || !apiReachable ? 'degraded' : 'healthy';

    return {
      status,
      errors: this.errors.length,
      events: this.events.length,
      apiReachable,
    };
  }

  /**
   * Send error to backend tracking endpoint.
   */
  private async sendErrorToBackend(entry: { error: Error; context: ErrorContext; timestamp: number }) {
    try {
      await fetch('/api/telemetry/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: entry.error.message,
          stack: entry.error.stack,
          context: entry.context,
          timestamp: entry.timestamp,
        }),
      });
    } catch (err) {
      // Silently fail - don't want error reporting to break the app
    }
  }

  /**
   * Clear stored errors and events (for testing/reset).
   */
  clear() {
    this.errors = [];
    this.events = [];
  }
}

export const observability = new FrontendObservability();

/**
 * React hook for error boundary integration.
 */
export function useErrorReporting() {
  return {
    reportError: (error: Error, context?: ErrorContext) => {
      observability.reportError(error, context);
    },
    recordEvent: (type: string, context?: ErrorContext) => {
      observability.recordEvent(type, context);
    },
  };
}

/**
 * Performance monitoring helper.
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  context?: ErrorContext
): Promise<T> {
  const start = performance.now();
  
  const complete = (result: T) => {
    const duration = performance.now() - start;
    observability.recordEvent('performance', {
      ...context,
      operation: name,
      durationMs: Math.round(duration),
    });
    return result;
  };

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(complete).catch(error => {
        observability.reportError(error, { ...context, operation: name });
        throw error;
      });
    }
    return Promise.resolve(complete(result));
  } catch (error) {
    observability.reportError(error as Error, { ...context, operation: name });
    throw error;
  }
}
