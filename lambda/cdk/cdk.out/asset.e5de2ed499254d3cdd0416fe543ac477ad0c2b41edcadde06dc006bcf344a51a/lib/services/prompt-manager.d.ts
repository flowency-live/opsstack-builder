/**
 * PromptManager Service
 * Manages system prompts and templates for different conversation stages
 */
export type ConversationStage = 'initial' | 'discovery' | 'refinement' | 'validation' | 'completion';
export interface ConversationContext {
    sessionId: string;
    conversationHistory: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    currentSpecification?: any;
    progressState?: any;
    projectType?: string;
    userIntent?: Record<string, any>;
}
export declare class PromptManager {
    /**
     * Get system prompt for a specific conversation stage
     */
    getSystemPrompt(stage: ConversationStage, projectType?: string): string;
    /**
     * Format user message with context for LLM
     */
    formatUserMessage(message: string, context: ConversationContext): string;
    /**
     * Get extraction prompt for pulling structured data from conversation
     */
    getExtractionPrompt(conversationHistory: Array<{
        role: string;
        content: string;
    }>): string;
}
//# sourceMappingURL=prompt-manager.d.ts.map