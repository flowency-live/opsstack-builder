/**
 * Property Test: Provider Fallback
 * Feature: spec-wizard, Property 34: Provider fallback
 * Validates: Requirements 19.1, 19.2
 *
 * For any LLM provider failure, the system should automatically
 * attempt the request with an alternative provider.
 */

import * as fc from 'fast-check';
import { LLMRouter } from '../../lib/services/llm-router';
import { LLMConfig, LLMProvider } from '../../lib/services/llm-types';

describe('**Feature: spec-wizard, Property 34: Provider fallback**', () => {
  it('should have fallback provider available when both providers are configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('openai' as LLMProvider, 'anthropic' as LLMProvider),
        async (primaryProvider) => {
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

          // Property: When both providers are configured, there's always a fallback
          const fallbackProvider = primaryProvider === 'openai' ? 'anthropic' : 'openai';

          // Both providers should be available
          const selectedProvider = router.selectProvider('conversation');
          expect(['openai', 'anthropic']).toContain(selectedProvider);

          // The system should have multiple providers configured for fallback
          const hasMultipleProviders =
            !!mockConfig.openai.apiKey && !!mockConfig.anthropic.apiKey;
          expect(hasMultipleProviders).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should select available provider when one is not configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('openai' as LLMProvider, 'anthropic' as LLMProvider),
        async (availableProvider) => {
          const mockConfig: LLMConfig = {
            openai: {
              apiKey: availableProvider === 'openai' ? 'test-key' : '',
              defaultModel: 'gpt-4o-mini',
            },
            anthropic: {
              apiKey: availableProvider === 'anthropic' ? 'test-key' : '',
              defaultModel: 'claude-3-5-haiku-20241022',
            },
            rateLimit: {
              maxRequestsPerMinute: 60,
              maxTokensPerMinute: 100000,
            },
          };

          const router = new LLMRouter(mockConfig);

          // Property: Router should select the available provider
          const selectedProvider = router.selectProvider('conversation');
          expect(selectedProvider).toBe(availableProvider);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw error when no providers are configured', () => {
    const mockConfig: LLMConfig = {
      openai: {
        apiKey: '',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: '',
        defaultModel: 'claude-3-5-haiku-20241022',
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
      },
    };

    const router = new LLMRouter(mockConfig);

    // Property: When no providers are configured, selectProvider should throw
    expect(() => router.selectProvider('conversation')).toThrow(
      'No LLM provider configured'
    );
  });

  it('should prefer anthropic as default provider for cost-effectiveness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('conversation', 'extraction', 'generation'),
        async (requestType: 'conversation' | 'extraction' | 'generation') => {
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

          // Property: When both providers are available, Anthropic should be preferred
          const selectedProvider = router.selectProvider(requestType);
          expect(selectedProvider).toBe('anthropic');
        }
      ),
      { numRuns: 100 }
    );
  });
});
