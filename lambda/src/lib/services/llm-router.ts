/**
 * LLMRouter Service
 * Routes requests to appropriate LLM providers with fallback and rate limiting
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMOptions,
  StreamingResponse,
  LLMConfig,
  RateLimitState,
} from './llm-types';
import { ConversationContext } from './prompt-manager';

// Re-export for convenience
export type { StreamingResponse };

export class LLMRouter {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private config: LLMConfig;
  private rateLimitState: RateLimitState;

  constructor(config: LLMConfig) {
    this.config = config;
    this.rateLimitState = {
      requestCount: 0,
      tokenCount: 0,
      windowStart: Date.now(),
    };

    // Initialize clients if API keys are provided
    if (config.openai.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openai.apiKey,
        dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
      });
    }

    if (config.anthropic.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: config.anthropic.apiKey,
        dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
      });
    }
  }

  /**
   * Select the appropriate provider for a request
   */
  selectProvider(
    requestType: 'conversation' | 'extraction' | 'generation'
  ): LLMProvider {
    // Default to Anthropic for cost-effectiveness (Claude Haiku)
    // Fall back to OpenAI if Anthropic is not available
    if (this.anthropicClient) {
      return 'anthropic';
    }
    if (this.openaiClient) {
      return 'openai';
    }
    throw new Error('No LLM provider configured');
  }

  /**
   * Send a request to the LLM with automatic provider fallback
   */
  async sendRequest(
    prompt: string,
    context: ConversationContext,
    options: LLMOptions = {}
  ): Promise<StreamingResponse> {
    // Check rate limits before proceeding
    await this.checkRateLimit();

    const provider = options.provider || this.selectProvider('conversation');

    try {
      return await this.sendRequestToProvider(provider, prompt, context, options);
    } catch (error) {
      console.error(`Error with ${provider} provider:`, error);

      // Attempt fallback to alternative provider
      const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';

      if (this.isProviderAvailable(fallbackProvider)) {
        console.log(`Falling back to ${fallbackProvider} provider`);
        return await this.sendRequestToProvider(
          fallbackProvider,
          prompt,
          context,
          options
        );
      }

      throw error;
    }
  }

  /**
   * Check if a provider is available
   */
  private isProviderAvailable(provider: LLMProvider): boolean {
    return provider === 'openai'
      ? this.openaiClient !== null
      : this.anthropicClient !== null;
  }

  /**
   * Send request to a specific provider
   */
  private async sendRequestToProvider(
    provider: LLMProvider,
    prompt: string,
    context: ConversationContext,
    options: LLMOptions
  ): Promise<StreamingResponse> {
    if (provider === 'openai') {
      return this.sendOpenAIRequest(prompt, context, options);
    } else {
      return this.sendAnthropicRequest(prompt, context, options);
    }
  }

  /**
   * Send request to OpenAI with streaming support
   */
  private async sendOpenAIRequest(
    prompt: string,
    context: ConversationContext,
    options: LLMOptions
  ): Promise<StreamingResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || this.config.openai.defaultModel;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 1000;

    // Build messages array from context
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: prompt },
      ...context.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    ];

    const stream = await this.openaiClient.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let fullResponse = '';

    const readableStream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(content);
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream: readableStream,
      onComplete: async (response: string) => {
        // Track token usage for rate limiting
        this.updateRateLimitState(1, this.estimateTokens(response));
      },
    };
  }

  /**
   * Send request to Anthropic with streaming support
   */
  private async sendAnthropicRequest(
    prompt: string,
    context: ConversationContext,
    options: LLMOptions
  ): Promise<StreamingResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const model = options.model || this.config.anthropic.defaultModel;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 1000;

    // Build messages array from context (Anthropic format)
    const messages = context.conversationHistory.map((msg) => ({
      role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: msg.content,
    }));

    const stream = await this.anthropicClient.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: prompt,
      messages,
      stream: true,
    });

    let fullResponse = '';

    const readableStream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const content = chunk.delta.text;
              fullResponse += content;
              controller.enqueue(content);
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream: readableStream,
      onComplete: async (response: string) => {
        // Track token usage for rate limiting
        this.updateRateLimitState(1, this.estimateTokens(response));
      },
    };
  }

  /**
   * Check rate limits and implement exponential backoff if needed
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute in milliseconds

    // Reset window if it has passed
    if (now - this.rateLimitState.windowStart >= windowDuration) {
      this.rateLimitState = {
        requestCount: 0,
        tokenCount: 0,
        windowStart: now,
      };
      return;
    }

    // Check if we've exceeded limits
    if (
      this.rateLimitState.requestCount >= this.config.rateLimit.maxRequestsPerMinute
    ) {
      const waitTime = windowDuration - (now - this.rateLimitState.windowStart);
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      // Reset after waiting
      this.rateLimitState = {
        requestCount: 0,
        tokenCount: 0,
        windowStart: Date.now(),
      };
    }
  }

  /**
   * Update rate limit state after a request
   */
  private updateRateLimitState(requests: number, tokens: number): void {
    this.rateLimitState.requestCount += requests;
    this.rateLimitState.tokenCount += tokens;
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit state (for testing/monitoring)
   */
  getRateLimitState(): RateLimitState {
    return { ...this.rateLimitState };
  }

  /**
   * Provide a fallback response when LLM fails
   * Implements graceful degradation for LLM failures
   * Requirements: 14.3
   */
  getFallbackResponse(error: Error): string {
    console.error('LLM request failed, providing fallback response:', error);

    return `I apologize, but I'm having trouble processing your request right now. This could be due to high demand or a temporary service issue. 

Your information has been saved, and you can:
1. Try sending your message again
2. Continue the conversation - I'll do my best to help
3. Contact us directly if you need immediate assistance

Please try again, and I'll be here to help you build your specification.`;
  }

  /**
   * Create a fallback streaming response
   * Used when LLM providers are unavailable
   * Requirements: 14.3
   */
  createFallbackStreamingResponse(message: string): StreamingResponse {
    const readableStream = new ReadableStream<string>({
      start(controller) {
        // Stream the message character by character for a natural feel
        let index = 0;
        const interval = setInterval(() => {
          if (index < message.length) {
            controller.enqueue(message[index]);
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 10); // 10ms per character
      },
    });

    return {
      stream: readableStream,
      onComplete: async () => {
        // No-op for fallback responses
      },
    };
  }

  /**
   * Send request with graceful degradation
   * Wraps sendRequest with fallback handling
   * Requirements: 14.3
   */
  async sendRequestWithGracefulDegradation(
    prompt: string,
    context: ConversationContext,
    options: LLMOptions = {}
  ): Promise<StreamingResponse> {
    try {
      return await this.sendRequest(prompt, context, options);
    } catch (error) {
      console.error('All LLM providers failed, using fallback:', error);
      const fallbackMessage = this.getFallbackResponse(error as Error);
      return this.createFallbackStreamingResponse(fallbackMessage);
    }
  }
}
