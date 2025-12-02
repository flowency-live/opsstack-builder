/**
 * LLMRouter Service
 * Routes requests to appropriate LLM providers with fallback and rate limiting
 */
import { LLMProvider, LLMOptions, StreamingResponse, LLMConfig, RateLimitState } from './llm-types';
import { ConversationContext } from './prompt-manager';
export type { StreamingResponse };
export declare class LLMRouter {
    private openaiClient;
    private anthropicClient;
    private config;
    private rateLimitState;
    constructor(config: LLMConfig);
    /**
     * Select the appropriate provider for a request
     */
    selectProvider(requestType: 'conversation' | 'extraction' | 'generation'): LLMProvider;
    /**
     * Send a request to the LLM with automatic provider fallback
     */
    sendRequest(prompt: string, context: ConversationContext, options?: LLMOptions): Promise<StreamingResponse>;
    /**
     * Check if a provider is available
     */
    private isProviderAvailable;
    /**
     * Send request to a specific provider
     */
    private sendRequestToProvider;
    /**
     * Send request to OpenAI with streaming support
     */
    private sendOpenAIRequest;
    /**
     * Send request to Anthropic with streaming support
     */
    private sendAnthropicRequest;
    /**
     * Check rate limits and implement exponential backoff if needed
     */
    private checkRateLimit;
    /**
     * Update rate limit state after a request
     */
    private updateRateLimitState;
    /**
     * Estimate token count (rough approximation: 1 token ≈ 4 characters)
     */
    private estimateTokens;
    /**
     * Sleep utility for rate limiting
     */
    private sleep;
    /**
     * Get current rate limit state (for testing/monitoring)
     */
    getRateLimitState(): RateLimitState;
    /**
     * Provide a fallback response when LLM fails
     * Implements graceful degradation for LLM failures
     * Requirements: 14.3
     */
    getFallbackResponse(error: Error): string;
    /**
     * Create a fallback streaming response
     * Used when LLM providers are unavailable
     * Requirements: 14.3
     */
    createFallbackStreamingResponse(message: string): StreamingResponse;
    /**
     * Send request with graceful degradation
     * Wraps sendRequest with fallback handling
     * Requirements: 14.3
     */
    sendRequestWithGracefulDegradation(prompt: string, context: ConversationContext, options?: LLMOptions): Promise<StreamingResponse>;
}
//# sourceMappingURL=llm-router.d.ts.map