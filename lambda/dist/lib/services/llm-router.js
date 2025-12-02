"use strict";
/**
 * LLMRouter Service
 * Routes requests to appropriate LLM providers with fallback and rate limiting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class LLMRouter {
    constructor(config) {
        this.openaiClient = null;
        this.anthropicClient = null;
        this.config = config;
        this.rateLimitState = {
            requestCount: 0,
            tokenCount: 0,
            windowStart: Date.now(),
        };
        // Initialize clients if API keys are provided
        if (config.openai.apiKey) {
            this.openaiClient = new openai_1.default({
                apiKey: config.openai.apiKey,
                dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
            });
        }
        if (config.anthropic.apiKey) {
            this.anthropicClient = new sdk_1.default({
                apiKey: config.anthropic.apiKey,
                dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
            });
        }
    }
    /**
     * Select the appropriate provider for a request
     */
    selectProvider(requestType) {
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
    async sendRequest(prompt, context, options = {}) {
        // Check rate limits before proceeding
        await this.checkRateLimit();
        const provider = options.provider || this.selectProvider('conversation');
        try {
            return await this.sendRequestToProvider(provider, prompt, context, options);
        }
        catch (error) {
            console.error(`Error with ${provider} provider:`, error);
            // Attempt fallback to alternative provider
            const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';
            if (this.isProviderAvailable(fallbackProvider)) {
                console.log(`Falling back to ${fallbackProvider} provider`);
                return await this.sendRequestToProvider(fallbackProvider, prompt, context, options);
            }
            throw error;
        }
    }
    /**
     * Check if a provider is available
     */
    isProviderAvailable(provider) {
        return provider === 'openai'
            ? this.openaiClient !== null
            : this.anthropicClient !== null;
    }
    /**
     * Send request to a specific provider
     */
    async sendRequestToProvider(provider, prompt, context, options) {
        if (provider === 'openai') {
            return this.sendOpenAIRequest(prompt, context, options);
        }
        else {
            return this.sendAnthropicRequest(prompt, context, options);
        }
    }
    /**
     * Send request to OpenAI with streaming support
     */
    async sendOpenAIRequest(prompt, context, options) {
        if (!this.openaiClient) {
            throw new Error('OpenAI client not initialized');
        }
        const model = options.model || this.config.openai.defaultModel;
        const temperature = options.temperature ?? 0.7;
        const maxTokens = options.maxTokens ?? 1000;
        // Build messages array from context
        const messages = [
            { role: 'system', content: prompt },
            ...context.conversationHistory.map((msg) => ({
                role: msg.role,
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
        const readableStream = new ReadableStream({
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
                }
                catch (error) {
                    controller.error(error);
                }
            },
        });
        return {
            stream: readableStream,
            onComplete: async (response) => {
                // Track token usage for rate limiting
                this.updateRateLimitState(1, this.estimateTokens(response));
            },
        };
    }
    /**
     * Send request to Anthropic with streaming support
     */
    async sendAnthropicRequest(prompt, context, options) {
        if (!this.anthropicClient) {
            throw new Error('Anthropic client not initialized');
        }
        const model = options.model || this.config.anthropic.defaultModel;
        const temperature = options.temperature ?? 0.7;
        const maxTokens = options.maxTokens ?? 1000;
        // Build messages array from context (Anthropic format)
        const messages = context.conversationHistory.map((msg) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
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
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        if (chunk.type === 'content_block_delta' &&
                            chunk.delta.type === 'text_delta') {
                            const content = chunk.delta.text;
                            fullResponse += content;
                            controller.enqueue(content);
                        }
                    }
                    controller.close();
                }
                catch (error) {
                    controller.error(error);
                }
            },
        });
        return {
            stream: readableStream,
            onComplete: async (response) => {
                // Track token usage for rate limiting
                this.updateRateLimitState(1, this.estimateTokens(response));
            },
        };
    }
    /**
     * Check rate limits and implement exponential backoff if needed
     */
    async checkRateLimit() {
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
        if (this.rateLimitState.requestCount >= this.config.rateLimit.maxRequestsPerMinute) {
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
    updateRateLimitState(requests, tokens) {
        this.rateLimitState.requestCount += requests;
        this.rateLimitState.tokenCount += tokens;
    }
    /**
     * Estimate token count (rough approximation: 1 token ≈ 4 characters)
     */
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    /**
     * Sleep utility for rate limiting
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get current rate limit state (for testing/monitoring)
     */
    getRateLimitState() {
        return { ...this.rateLimitState };
    }
    /**
     * Provide a fallback response when LLM fails
     * Implements graceful degradation for LLM failures
     * Requirements: 14.3
     */
    getFallbackResponse(error) {
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
    createFallbackStreamingResponse(message) {
        const readableStream = new ReadableStream({
            start(controller) {
                // Stream the message character by character for a natural feel
                let index = 0;
                const interval = setInterval(() => {
                    if (index < message.length) {
                        controller.enqueue(message[index]);
                        index++;
                    }
                    else {
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
    async sendRequestWithGracefulDegradation(prompt, context, options = {}) {
        try {
            return await this.sendRequest(prompt, context, options);
        }
        catch (error) {
            console.error('All LLM providers failed, using fallback:', error);
            const fallbackMessage = this.getFallbackResponse(error);
            return this.createFallbackStreamingResponse(fallbackMessage);
        }
    }
}
exports.LLMRouter = LLMRouter;
//# sourceMappingURL=llm-router.js.map