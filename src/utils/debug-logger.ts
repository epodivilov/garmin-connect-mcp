/**
 * Debug logger for Garmin API HTTP operations
 *
 * Provides diagnostic logging capabilities to help debug API issues.
 * Enable via GARMIN_DEBUG environment variable.
 *
 * @example
 * ```typescript
 * const logger = new DebugLogger();
 * logger.logRequest('GET', '/api/endpoint', { param: 'value' });
 * logger.logResponse('GET', '/api/endpoint', 200, { result: 'data' });
 * logger.logError('GET', '/api/endpoint', error);
 * ```
 */

export class DebugLogger {
  private enabled: boolean;

  constructor() {
    // Enable debug logging via GARMIN_DEBUG environment variable
    this.enabled = process.env.GARMIN_DEBUG === 'true' || process.env.GARMIN_DEBUG === '1';
  }

  /**
   * Check if debug logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log HTTP request details
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param url - Request URL
   * @param params - Request parameters or body
   */
  logRequest(method: string, url: string, params?: unknown): void {
    if (!this.enabled) return;

    console.log('[GARMIN DEBUG] Request:', {
      timestamp: new Date().toISOString(),
      method,
      url,
      params: params ? JSON.stringify(params, null, 2) : 'none',
    });
  }

  /**
   * Log HTTP response details
   *
   * @param method - HTTP method that was used
   * @param url - Request URL
   * @param status - HTTP status code
   * @param body - Response body
   */
  logResponse(method: string, url: string, status: number, body?: unknown): void {
    if (!this.enabled) return;

    console.log('[GARMIN DEBUG] Response:', {
      timestamp: new Date().toISOString(),
      method,
      url,
      status,
      body: body ? JSON.stringify(body, null, 2) : 'empty',
    });
  }

  /**
   * Log HTTP error details
   *
   * @param method - HTTP method that was used
   * @param url - Request URL
   * @param error - Error object
   */
  logError(method: string, url: string, error: unknown): void {
    if (!this.enabled) return;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[GARMIN DEBUG] Error:', {
      timestamp: new Date().toISOString(),
      method,
      url,
      error: errorMessage,
      stack: errorStack,
    });
  }

  /**
   * Log general debug message
   *
   * @param message - Debug message
   * @param data - Optional additional data
   */
  log(message: string, data?: unknown): void {
    if (!this.enabled) return;

    console.log('[GARMIN DEBUG]', {
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined,
    });
  }
}
