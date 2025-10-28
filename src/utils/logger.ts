interface Logger {
  error(message: string, error?: unknown): void;
  warn(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
}

class SilentLogger implements Logger {
  error(): void {}
  warn(): void {}
  info(): void {}
}

// Always use silent logger for MCP servers
// MCP servers use stdio for protocol communication, so console.* breaks the protocol
// Errors should be propagated through exceptions, not logged
export const logger: Logger = new SilentLogger();