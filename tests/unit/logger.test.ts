import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be silent in test environment', () => {
    logger.error('Test error message');
    logger.warn('Test warning message');
    logger.info('Test info message');

    // In test environment, logger should be silent
    expect(consoleSpy.error).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
  });

  it('should not throw when logging', () => {
    expect(() => {
      logger.error('Error with object', { test: 'data' });
      logger.warn('Warning with data', ['item1', 'item2']);
      logger.info('Info message');
    }).not.toThrow();
  });
});