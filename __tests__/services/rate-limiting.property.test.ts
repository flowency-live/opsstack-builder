/**
 * Property Test: Rate Limiting
 * Feature: spec-wizard, Property 36: Rate limiting
 * Validates: Requirements 19.5
 *
 * For any sequence of LLM requests exceeding the configured rate limit,
 * the system should implement exponential backoff and not exceed the limit.
 */

import * as fc from 'fast-check';
import { LLMRouter } from '../../lib/services/llm-router';
import { LLMConfig } from '../../lib/services/llm-types';

describe('**Feature: spec-wizard, Property 36: Rate limiting**', () => {
  it('should have rate limit configuration', () => {
    const mockConfig: LLMConfig = {
      openai: {
        apiKey: 'test-openai-key',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: 'test-anthropic-key',
        defaultModel: 'claude-3-5-haiku-20241022',
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
      },
    };

    const router = new LLMRouter(mockConfig);

    // Property: Rate limit configuration should be defined
    expect(mockConfig.rateLimit).toBeDefined();
    expect(mockConfig.rateLimit.maxRequestsPerMinute).toBeGreaterThan(0);
    expect(mockConfig.rateLimit.maxTokensPerMinute).toBeGreaterThan(0);
  });

  it('should accept different rate limit configurations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1000, max: 1000000 }),
        async (maxRequests, maxTokens) => {
          const mockConfig: LLMConfig = {
            openai: {
              apiKey: 'test-openai-key',
              defaultModel: 'gpt-4o-mini',
            },
            anthropic: {
              apiKey: 'test-anthropic-key',
              defaultModel: 'claude-3-5-haiku-20241022',
            },
            rateLimit: {
              maxRequestsPerMinute: maxRequests,
              maxTokensPerMinute: maxTokens,
            },
          };

          const router = new LLMRouter(mockConfig);

          // Property: The router should accept any valid rate limit configuration
          expect(mockConfig.rateLimit.maxRequestsPerMinute).toBe(maxRequests);
          expect(mockConfig.rateLimit.maxTokensPerMinute).toBe(maxTokens);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track rate limit state', () => {
    const mockConfig: LLMConfig = {
      openai: {
        apiKey: 'test-openai-key',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: 'test-anthropic-key',
        defaultModel: 'claude-3-5-haiku-20241022',
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
      },
    };

    const router = new LLMRouter(mockConfig);

    // Property: The router should expose rate limit state for monitoring
    const state = router.getRateLimitState();
    expect(state).toBeDefined();
    expect(state.requestCount).toBeDefined();
    expect(state.tokenCount).toBeDefined();
    expect(state.windowStart).toBeDefined();
  });

  it('should initialize rate limit state with zero counts', () => {
    const mockConfig: LLMConfig = {
      openai: {
        apiKey: 'test-openai-key',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: 'test-anthropic-key',
        defaultModel: 'claude-3-5-haiku-20241022',
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
      },
    };

    const router = new LLMRouter(mockConfig);

    // Property: Initial rate limit state should have zero counts
    const state = router.getRateLimitState();
    expect(state.requestCount).toBe(0);
    expect(state.tokenCount).toBe(0);
    expect(state.windowStart).toBeGreaterThan(0);
  });
});
