/**
 * ConversationEngine Service
 * Manages conversation flow, context, and question generation
 */

import { LLMRouter, StreamingResponse } from './llm-router';
import { PromptManager, ConversationContext, ConversationStage } from './prompt-manager';
import { Message, ProgressState, Specification } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { isEnglish, getNonEnglishMessage } from '../utils/language-detection';

export interface ExtractedInformation {
  topic: string;
  data: Record<string, any>;
  confidence: number;
}

/**
 * Technical jargon dictionary for business-friendly language filtering
 */
const TECHNICAL_JARGON = [
  'API',
  'REST',
  'GraphQL',
  'microservices',
  'kubernetes',
  'docker',
  'lambda',
  'serverless',
  'NoSQL',
  'SQL',
  'database schema',
  'ORM',
  'middleware',
  'webhook',
  'OAuth',
  'JWT',
  'authentication token',
  'endpoint',
  'payload',
  'JSON',
  'XML',
  'HTTP',
  'HTTPS',
  'SSL',
  'TLS',
  'CDN',
  'load balancer',
  'cache',
  'Redis',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
];

export class ConversationEngine {
  private llmRouter: LLMRouter;
  private promptManager: PromptManager;
  private askedQuestions: Map<string, Set<string>> = new Map(); // sessionId -> set of question topics

  constructor(llmRouter: LLMRouter, promptManager: PromptManager) {
    this.llmRouter = llmRouter;
    this.promptManager = promptManager;
  }

  /**
   * Process a user message and generate a streaming response
   */
  async processMessage(
    sessionId: string,
    userMessage: string,
    context: ConversationContext
  ): Promise<StreamingResponse> {
    // Check if the message is in English
    if (!isEnglish(userMessage)) {
      // Return a polite message indicating English is required
      const nonEnglishMessage = getNonEnglishMessage();
      
      // Create a simple streaming response with the message
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(nonEnglishMessage));
          controller.close();
        }
      });

      return {
        stream,
        onComplete: async (fullResponse: string) => {
          // No-op for non-English responses
        }
      };
    }

    // Determine conversation stage based on progress
    const stage = this.determineConversationStage(context);

    // Get system prompt for current stage
    const systemPrompt = this.promptManager.getSystemPrompt(
      stage,
      context.projectType
    );

    // Add instruction to avoid redundant questions
    const enhancedPrompt = this.enhancePromptWithRedundancyCheck(
      systemPrompt,
      context
    );

    // Add instruction for business-friendly language
    const finalPrompt = this.enhancePromptForBusinessLanguage(enhancedPrompt);

    // Send request to LLM
    const response = await this.llmRouter.sendRequest(
      finalPrompt,
      context,
      { stream: true }
    );

    return response;
  }

  /**
   * Reconstruct conversation context from stored data
   */
  async reconstructContext(
    sessionId: string,
    conversationHistory: Message[],
    specification?: Specification,
    progressState?: ProgressState
  ): Promise<ConversationContext> {
    // Extract project type from conversation history or specification
    const projectType = this.extractProjectType(conversationHistory, specification);

    // Extract user intent from conversation
    const userIntent = this.extractUserIntent(conversationHistory);

    return {
      sessionId,
      conversationHistory: conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      currentSpecification: specification,
      progressState,
      projectType,
      userIntent,
    };
  }

  /**
   * Generate follow-up questions based on conversation history and progress
   */
  async generateFollowUpQuestions(
    context: ConversationContext,
    progress: ProgressState
  ): Promise<string[]> {
    // Identify topics that need coverage
    const uncoveredTopics = progress.topics.filter(
      (topic) => topic.status === 'not-started' && topic.required
    );

    if (uncoveredTopics.length === 0) {
      return ['Is there anything else you\'d like to add or clarify?'];
    }

    // Get the next topic to cover
    const nextTopic = uncoveredTopics[0];

    // Generate contextual question for this topic
    const question = await this.generateContextualQuestion(
      nextTopic.name,
      context
    );

    // Check for redundancy
    if (this.isQuestionRedundant(context.sessionId, question, context)) {
      // Try next topic
      if (uncoveredTopics.length > 1) {
        const alternativeTopic = uncoveredTopics[1];
        return [await this.generateContextualQuestion(alternativeTopic.name, context)];
      }
      return ['Is there anything else you\'d like to add or clarify?'];
    }

    // Track this question
    this.trackAskedQuestion(context.sessionId, nextTopic.name);

    return [question];
  }

  /**
   * Determine the current conversation stage
   */
  private determineConversationStage(context: ConversationContext): ConversationStage {
    const messageCount = context.conversationHistory.length;
    const completeness = context.progressState?.overallCompleteness || 0;

    if (messageCount === 0) {
      return 'initial';
    } else if (completeness < 30) {
      return 'discovery';
    } else if (completeness < 70) {
      return 'refinement';
    } else if (completeness < 90) {
      return 'validation';
    } else {
      return 'completion';
    }
  }

  /**
   * Enhance prompt with redundancy check instructions
   */
  private enhancePromptWithRedundancyCheck(
    prompt: string,
    context: ConversationContext
  ): string {
    // Extract information already provided
    const providedInfo = this.extractProvidedInformation(context);

    if (Object.keys(providedInfo).length === 0) {
      return prompt;
    }

    const infoSummary = Object.entries(providedInfo)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    return `${prompt}

IMPORTANT: The user has already provided the following information. DO NOT ask about these topics again:
${infoSummary}

Build on this information with new, contextual questions.`;
  }

  /**
   * Enhance prompt for business-friendly language
   */
  private enhancePromptForBusinessLanguage(prompt: string): string {
    return `${prompt}

LANGUAGE GUIDELINES:
- Use plain business language that any SME owner can understand
- Avoid technical jargon like: ${TECHNICAL_JARGON.slice(0, 10).join(', ')}, etc.
- When technical concepts are necessary, explain them in business terms
- Focus on business outcomes and user needs, not implementation details
- Ask about "what" and "why" rather than "how"`;
  }

  /**
   * Extract project type from conversation or specification
   */
  private extractProjectType(
    conversationHistory: Message[],
    specification?: Specification
  ): string | undefined {
    // Check specification first
    if (specification?.plainEnglishSummary?.overview) {
      const overview = specification.plainEnglishSummary.overview.toLowerCase();
      if (overview.includes('website')) return 'website';
      if (overview.includes('booking')) return 'booking-system';
      if (overview.includes('crm')) return 'crm';
      if (overview.includes('mobile app')) return 'mobile-app';
      if (overview.includes('e-commerce') || overview.includes('ecommerce')) {
        return 'e-commerce';
      }
    }

    // Check conversation history
    const allText = conversationHistory
      .map((msg) => msg.content.toLowerCase())
      .join(' ');

    if (allText.includes('website') || allText.includes('web site')) {
      return 'website';
    }
    if (allText.includes('booking') || allText.includes('reservation')) {
      return 'booking-system';
    }
    if (allText.includes('crm') || allText.includes('customer relationship')) {
      return 'crm';
    }
    if (allText.includes('mobile app') || allText.includes('ios') || allText.includes('android')) {
      return 'mobile-app';
    }
    if (allText.includes('e-commerce') || allText.includes('ecommerce') || allText.includes('online store')) {
      return 'e-commerce';
    }

    return undefined;
  }

  /**
   * Extract user intent from conversation history
   */
  private extractUserIntent(conversationHistory: Message[]): Record<string, any> {
    const intent: Record<string, any> = {};

    // Simple extraction - in production, this would use LLM
    const userMessages = conversationHistory.filter((msg) => msg.role === 'user');

    userMessages.forEach((msg) => {
      const content = msg.content.toLowerCase();

      // Extract features
      if (content.includes('feature') || content.includes('need')) {
        if (!intent.features) intent.features = [];
        intent.features.push(msg.content);
      }

      // Extract users
      if (content.includes('user') || content.includes('customer')) {
        if (!intent.targetUsers) intent.targetUsers = [];
        intent.targetUsers.push(msg.content);
      }

      // Extract integrations
      if (content.includes('integrate') || content.includes('connect')) {
        if (!intent.integrations) intent.integrations = [];
        intent.integrations.push(msg.content);
      }
    });

    return intent;
  }

  /**
   * Extract information already provided by the user
   */
  private extractProvidedInformation(context: ConversationContext): Record<string, string> {
    const provided: Record<string, string> = {};

    // Check specification
    if (context.currentSpecification) {
      const spec = context.currentSpecification;

      if (spec.plainEnglishSummary?.overview) {
        provided['Project Overview'] = spec.plainEnglishSummary.overview;
      }

      if (spec.plainEnglishSummary?.keyFeatures?.length > 0) {
        provided['Key Features'] = spec.plainEnglishSummary.keyFeatures.join(', ');
      }

      if (spec.plainEnglishSummary?.targetUsers) {
        provided['Target Users'] = spec.plainEnglishSummary.targetUsers;
      }

      if (spec.plainEnglishSummary?.integrations?.length > 0) {
        provided['Integrations'] = spec.plainEnglishSummary.integrations.join(', ');
      }
    }

    // Check user intent
    if (context.userIntent) {
      Object.entries(context.userIntent).forEach(([key, value]) => {
        if (value && !provided[key]) {
          provided[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      });
    }

    return provided;
  }

  /**
   * Generate a contextual question for a specific topic
   */
  private async generateContextualQuestion(
    topic: string,
    context: ConversationContext
  ): Promise<string> {
    // Map topics to question templates
    const questionTemplates: Record<string, string> = {
      'Project Overview': 'Can you tell me more about what you want to build?',
      'Target Users': 'Who will be using this software? What are their main needs?',
      'Key Features': 'What are the most important features you need?',
      'Integrations': 'Do you need to integrate with any existing systems or services?',
      'Data Requirements': 'What kind of information will the system need to store and manage?',
      'User Workflows': 'Can you walk me through how users will interact with the system?',
      'Non-Functional Requirements': 'Are there any specific requirements around performance, security, or scalability?',
    };

    // Get base question
    let question = questionTemplates[topic] || `Can you tell me about ${topic.toLowerCase()}?`;

    // Make it contextual based on project type
    if (context.projectType) {
      question = this.adaptQuestionToProjectType(question, topic, context.projectType);
    }

    return question;
  }

  /**
   * Adapt question to project type
   */
  private adaptQuestionToProjectType(
    question: string,
    topic: string,
    projectType: string
  ): string {
    const adaptations: Record<string, Record<string, string>> = {
      'booking-system': {
        'Key Features': 'What types of bookings or reservations do you need to handle?',
        'User Workflows': 'How should customers make and manage their bookings?',
      },
      'e-commerce': {
        'Key Features': 'What products will you be selling, and how should customers browse and purchase?',
        'Integrations': 'Which payment processors and shipping providers do you want to use?',
      },
      'mobile-app': {
        'Target Users': 'Will this be for iOS, Android, or both? Who are your target users?',
        'Key Features': 'What are the core features users will need on their mobile device?',
      },
    };

    return adaptations[projectType]?.[topic] || question;
  }

  /**
   * Check if a question is redundant
   */
  private isQuestionRedundant(
    sessionId: string,
    question: string,
    context: ConversationContext
  ): boolean {
    // Check if we've already asked about this topic
    const askedTopics = this.askedQuestions.get(sessionId) || new Set();

    // Extract topic from question (simple keyword matching)
    const questionLower = question.toLowerCase();
    const topics = [
      'overview',
      'users',
      'features',
      'integrations',
      'data',
      'workflows',
      'performance',
      'security',
    ];

    for (const topic of topics) {
      if (questionLower.includes(topic) && askedTopics.has(topic)) {
        return true;
      }
    }

    // Check if information is already in specification
    const providedInfo = this.extractProvidedInformation(context);
    for (const [key, value] of Object.entries(providedInfo)) {
      if (value && questionLower.includes(key.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Track that we've asked about a topic
   */
  private trackAskedQuestion(sessionId: string, topic: string): void {
    if (!this.askedQuestions.has(sessionId)) {
      this.askedQuestions.set(sessionId, new Set());
    }
    this.askedQuestions.get(sessionId)!.add(topic.toLowerCase());
  }

  /**
   * Check if text contains technical jargon
   */
  containsTechnicalJargon(text: string): boolean {
    const lowerText = text.toLowerCase();
    return TECHNICAL_JARGON.some((jargon) => {
      const jargonLower = jargon.toLowerCase();
      // Use word boundaries to avoid false positives (e.g., "stored" containing "redis")
      const regex = new RegExp(`\\b${jargonLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  /**
   * Check if question focuses on intent (what/why) vs implementation (how)
   */
  isIntentFocused(question: string): boolean {
    const lowerQuestion = question.toLowerCase();

    // Intent-focused indicators
    const intentIndicators = [
      'what',
      'why',
      'who',
      'which',
      'when',
      'where',
      'describe',
      'tell me about',
      'can you explain',
      'what are',
      'what do you need',
    ];

    // Implementation-focused indicators
    const implementationIndicators = [
      'how should we implement',
      'what technology',
      'which framework',
      'what database',
      'how will you build',
      'what programming language',
    ];

    const hasIntentIndicator = intentIndicators.some((indicator) =>
      lowerQuestion.includes(indicator)
    );
    const hasImplementationIndicator = implementationIndicators.some((indicator) =>
      lowerQuestion.includes(indicator)
    );

    // Intent-focused if it has intent indicators and no implementation indicators
    return hasIntentIndicator && !hasImplementationIndicator;
  }
}
