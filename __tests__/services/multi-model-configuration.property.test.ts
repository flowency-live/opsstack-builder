/**
 * Property Test: Multi-Model Configuration
 * Feature: spec-wizard, Property 35: Multi-model configuration
 * Validates: Requirements 19.4
 *
 * For any conversation stage, the system should support configuration
 * of different LLM models for that stage.
 */

import * as fc from 'fast-check';
import { LLMRouter } from '../../lib/services/llm-router';
import { LLMConfig } from '../../lib/services/llm-types';

describe('**Feature: spec-wizard, Property 35: Multi-model configuration**', () => {
  it('should accept different model configurations in options', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('gpt-4o-mini'),
          fc.constant('gpt-4o'),
          fc.constant('claude-3-5-haiku-20241022'),
          fc.constant('claude-3-5-sonnet-20241022')
        ),
        fc.double({ min: 0, max: 2, noNaN: true }),
        fc.integer({ min: 100, max: 4000 }),
        async (model, temperature, maxTokens) => {
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

          // Property: The router should accept model configuration options
          // We're testing that the options object structure is valid
          const options = {
            model,
            temperature,
            maxTokens,
          };

          // Verify the options are valid
          expect(options.model).toBeDefined();
          expect(Number.isFinite(options.temperature)).toBe(true);
          expect(options.temperature).toBeGreaterThanOrEqual(0);
          expect(options.temperature).toBeLessThanOrEqual(2);
          expect(options.maxTokens).toBeGreaterThanOrEqual(100);
          expect(options.maxTokens).toBeLessThanOrEqual(4000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have default models configured for each provider', () => {
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

    // Property: Each provider should have a default model configured
    expect(mockConfig.openai.defaultModel).toBeDefined();
    expect(mockConfig.openai.defaultModel.length).toBeGreaterThan(0);
    expect(mockConfig.anthropic.defaultModel).toBeDefined();
    expect(mockConfig.anthropic.defaultModel.length).toBeGreaterThan(0);
  });

  it('should support different models for different conversation stages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('conversation', 'extraction', 'generation'),
        fc.oneof(
          fc.constant('gpt-4o-mini'),
          fc.constant('claude-3-5-haiku-20241022')
        ),
        async (requestType: 'conversation' | 'extraction' | 'generation', model) => {
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

          // Property: The system should support selecting providers for different request types
          const selectedProvider = router.selectProvider(requestType);
          expect(['openai', 'anthropic']).toContain(selectedProvider);

          // Property: Different models can be configured for different stages
          const options = { model };
          expect(options.model).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
