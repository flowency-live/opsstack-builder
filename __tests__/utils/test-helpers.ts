/**
 * Test Helper Utilities
 * Common utilities for testing
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Mock fetch for API testing
 */
export function mockFetch(response: unknown, status = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
      text: async () => JSON.stringify(response),
    } as Response)
  );
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  jest.clearAllMocks();
  jest.resetAllMocks();
}

/**
 * Create a mock WebSocket for testing streaming
 */
export class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public readyState: number = 0; // CONNECTING

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

/**
 * Setup LocalStack environment variables for tests
 */
export function setupLocalStackEnv() {
  process.env.USE_LOCALSTACK = 'true';
  process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
}

/**
 * Generate a random session ID for testing
 */
export function generateTestSessionId(): string {
  return `test-session-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a random magic link token for testing
 */
export function generateTestMagicLinkToken(): string {
  return `test-token-${Math.random().toString(36).substring(7)}`;
}

/**
 * Extract token from magic link URL
 */
export function extractTokenFromMagicLink(magicLink: string): string {
  const url = new URL(magicLink);
  return url.searchParams.get('token') || '';
}
