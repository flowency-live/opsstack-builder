/**
 * Types and interfaces for LLM integration
 */
export type LLMProvider = 'openai' | 'anthropic';
export interface LLMOptions {
    provider?: LLMProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}
export interface StreamingResponse {
    stream: ReadableStream<string>;
    onComplete: (fullResponse: string) => Promise<void>;
}
export interface LLMConfig {
    openai: {
        apiKey: string;
        defaultModel: string;
    };
    anthropic: {
        apiKey: string;
        defaultModel: string;
    };
    rateLimit: {
        maxRequestsPerMinute: number;
        maxTokensPerMinute: number;
    };
}
export interface RateLimitState {
    requestCount: number;
    tokenCount: number;
    windowStart: number;
}
//# sourceMappingURL=llm-types.d.ts.map