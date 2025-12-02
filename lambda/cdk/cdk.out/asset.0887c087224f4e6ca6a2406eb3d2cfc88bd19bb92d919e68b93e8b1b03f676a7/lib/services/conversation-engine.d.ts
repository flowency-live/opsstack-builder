/**
 * ConversationEngine Service
 * Manages conversation flow, context, and question generation
 */
import { LLMRouter, StreamingResponse } from './llm-router';
import { PromptManager, ConversationContext } from './prompt-manager';
import { Message, ProgressState, Specification } from '../models/types';
export interface ExtractedInformation {
    topic: string;
    data: Record<string, any>;
    confidence: number;
}
export declare class ConversationEngine {
    private llmRouter;
    private promptManager;
    private askedQuestions;
    constructor(llmRouter: LLMRouter, promptManager: PromptManager);
    /**
     * Process a user message and generate a streaming response
     */
    processMessage(sessionId: string, userMessage: string, context: ConversationContext): Promise<StreamingResponse>;
    /**
     * Reconstruct conversation context from stored data
     */
    reconstructContext(sessionId: string, conversationHistory: Message[], specification?: Specification, progressState?: ProgressState): Promise<ConversationContext>;
    /**
     * Generate follow-up questions based on conversation history and progress
     */
    generateFollowUpQuestions(context: ConversationContext, progress: ProgressState): Promise<string[]>;
    /**
     * Determine the current conversation stage
     */
    private determineConversationStage;
    /**
     * Enhance prompt with redundancy check instructions
     */
    private enhancePromptWithRedundancyCheck;
    /**
     * Enhance prompt for business-friendly language
     */
    private enhancePromptForBusinessLanguage;
    /**
     * Extract project type from conversation or specification
     */
    private extractProjectType;
    /**
     * Extract user intent from conversation history
     */
    private extractUserIntent;
    /**
     * Extract information already provided by the user
     */
    private extractProvidedInformation;
    /**
     * Generate a contextual question for a specific topic
     */
    private generateContextualQuestion;
    /**
     * Adapt question to project type
     */
    private adaptQuestionToProjectType;
    /**
     * Check if a question is redundant
     */
    private isQuestionRedundant;
    /**
     * Track that we've asked about a topic
     */
    private trackAskedQuestion;
    /**
     * Check if text contains technical jargon
     */
    containsTechnicalJargon(text: string): boolean;
    /**
     * Check if question focuses on intent (what/why) vs implementation (how)
     */
    isIntentFocused(question: string): boolean;
}
//# sourceMappingURL=conversation-engine.d.ts.map