/**
 * ConversationEngine Service
 * Manages conversation flow, context, and question generation
 */

import { LLMRouter, StreamingResponse } from './llm-router';
import { PromptManager, ConversationContext, ConversationStage } from './prompt-manager';
import { Message, CompletenessState, Specification, LockedSection } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { isEnglish, getNonEnglishMessage } from '../utils/language-detection';
import { getRelevantExamples, formatExamplesForPrompt } from '../prompts/jason-examples';

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

    // Add spec context to inform chat of captured information
    const withSpecContext = this.enhancePromptWithSpecContext(
      systemPrompt,
      context.currentSpecification,
      context.completeness
    );

    // Add instruction to avoid redundant questions
    const withRedundancyCheck = this.enhancePromptWithRedundancyCheck(
      withSpecContext,
      context
    );

    // Add locked sections to prevent re-litigation
    const withLockedSections = this.enhancePromptWithLockedSections(
      withRedundancyCheck,
      (context as any).lockedSections
    );

    // Add few-shot examples demonstrating Jason-style responses
    // TEMPORARILY DISABLED: Reduce token usage to prevent timeouts
    // const withExamples = this.enhancePromptWithExamples(withLockedSections, stage);
    // const finalPrompt = this.enhancePromptForBusinessLanguage(withExamples);

    // Add instruction for business-friendly language
    const finalPrompt = this.enhancePromptForBusinessLanguage(withLockedSections);

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
    lockedSections?: LockedSection[],
    completeness?: CompletenessState
  ): Promise<ConversationContext> {
    // Extract project type from conversation history or specification
    const projectType = this.extractProjectType(conversationHistory, specification);

    // Extract user intent from conversation
    const userIntent = this.extractUserIntent(conversationHistory);

    // Prune conversation history if it's getting too long
    // CRITICAL: Match llm-router limit to ensure consistency
    const prunedHistory = this.pruneConversationHistory(
      conversationHistory,
      lockedSections,
      10 // Keep last 10 messages (matches llm-router slice)
    );

    return {
      sessionId,
      conversationHistory: prunedHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      currentSpecification: specification,
      completeness,
      projectType,
      userIntent,
      lockedSections,
    };
  }

  /**
   * Generate follow-up questions based on conversation history and missing sections
   * v0.3: Driven by missingSections rather than topic tracking
   */
  async generateFollowUpQuestions(
    context: ConversationContext,
    completeness?: CompletenessState
  ): Promise<string[]> {
    const missingSections = completeness?.missingSections ?? [];

    if (missingSections.length === 0) {
      return ['Is there anything else you\'d like to add or clarify?'];
    }

    // Get the next missing section
    const nextSection = missingSections[0];

    // Generate contextual question for this section
    const question = await this.generateContextualQuestion(
      nextSection,
      context
    );

    // Check for redundancy
    if (this.isQuestionRedundant(context.sessionId, question, context)) {
      // Try next section
      if (missingSections.length > 1) {
        const alternativeSection = missingSections[1];
        return [await this.generateContextualQuestion(alternativeSection, context)];
      }
      return ['Is there anything else you\'d like to add or clarify?'];
    }

    // Track this question
    this.trackAskedQuestion(context.sessionId, nextSection);

    return [question];
  }

  /**
   * Determine the current conversation stage
   * v0.3: Simplified stage determination based on spec state and message count
   */
  private determineConversationStage(context: ConversationContext): ConversationStage {
    const messageCount = context.conversationHistory.length;
    const missingSections = context.completeness?.missingSections ?? [];
    const readyForHandoff = context.completeness?.readyForHandoff ?? false;

    // CRITICAL: Never complete before minimum message threshold
    const MIN_MESSAGES_FOR_COMPLETION = 20;

    if (messageCount === 0) {
      return 'initial';
    } else if (!context.currentSpecification || context.currentSpecification.version === 0) {
      return 'discovery';
    } else if (missingSections.length > 3) {
      return 'discovery';
    } else if (missingSections.length > 0) {
      return 'refinement';
    } else if (!readyForHandoff || messageCount < MIN_MESSAGES_FOR_COMPLETION) {
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
   * Enhance prompt with few-shot Jason-style examples
   */
  private enhancePromptWithExamples(prompt: string, stage: ConversationStage): string {
    const examples = getRelevantExamples(stage, 2);
    const formattedExamples = formatExamplesForPrompt(examples);

    return `${prompt}${formattedExamples}`;
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
   * Enhance prompt with current specification context
   * Informs the AI of what has already been captured and what's missing
   */
  private enhancePromptWithSpecContext(
    prompt: string,
    specification?: Specification,
    completeness?: CompletenessState
  ): string {
    // If no spec exists yet, return prompt unchanged
    if (!specification) {
      return prompt;
    }

    const overview = specification.plainEnglishSummary?.overview ?? '';
    const targetUsers = specification.plainEnglishSummary?.targetUsers ?? '';
    const keyFeatures = specification.plainEnglishSummary?.keyFeatures ?? [];
    const flows = specification.plainEnglishSummary?.flows ?? [];
    const missingSections = completeness?.missingSections ?? [];

    // Build spec context string
    let specContext = `

CURRENT SPECIFICATION STATE:
Overview: ${overview || 'Not yet defined'}
Target Users: ${targetUsers || 'Not yet defined'}
Features Captured: ${keyFeatures.length} features`;

    if (keyFeatures.length > 0) {
      specContext += `\nKey Features: ${keyFeatures.slice(0, 5).join(', ')}`;
    }

    if (flows.length > 0) {
      specContext += `\nUser Flows: ${flows.length} flows captured`;
    }

    // Add missing sections - CRITICAL for gap-driven conversation
    if (missingSections.length > 0) {
      specContext += `

MISSING SECTIONS (focus your questions here):
${missingSections.map(section => `- ${section}`).join('\n')}`;
    }

    specContext += `

INSTRUCTIONS:
- Reference what we already know from the spec
- Focus questions on MISSING SECTIONS above
- Don't repeat questions about captured information
- Build on existing knowledge`;

    return `${prompt}${specContext}`;
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

  /**
   * Create a checkpoint (locked section) when a stage transition occurs
   * This captures key decisions that shouldn't be re-litigated
   */
  createCheckpoint(
    sectionName: string,
    specification?: Specification,
    completeness?: CompletenessState
  ): LockedSection | null {
    if (!specification) return null;

    const summary = this.generateCheckpointSummary(sectionName, specification, completeness);
    if (!summary) return null;

    return {
      name: sectionName,
      summary,
      lockedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a concise summary for a checkpoint
   */
  private generateCheckpointSummary(
    sectionName: string,
    specification: Specification,
    completeness?: CompletenessState
  ): string | null {
    const spec = specification.plainEnglishSummary;

    switch (sectionName) {
      case 'Problem Statement':
        return spec.overview ? `Problem: ${spec.overview.split('.')[0]}` : null;

      case 'Target Users':
        return spec.targetUsers ? `Users: ${spec.targetUsers}` : null;

      case 'Scope':
        const features = spec.keyFeatures?.slice(0, 3).join(', ');
        return features ? `Core features: ${features}` : null;

      case 'User Flows':
        const flows = spec.flows?.slice(0, 2).join('; ');
        return flows ? `User flows: ${flows}` : null;

      case 'Business Rules':
        const rules = spec.rulesAndConstraints?.slice(0, 2).join('; ');
        return rules ? `Rules: ${rules}` : null;

      default:
        return null;
    }
  }

  /**
   * Determine if we should create a checkpoint based on stage transition
   */
  shouldCreateCheckpoint(
    previousStage: ConversationStage,
    currentStage: ConversationStage
  ): { shouldCreate: boolean; sectionName?: string } {
    // Map stage transitions to PRD sections that should be locked
    const checkpointMap: Record<string, string> = {
      'initial->discovery': 'Problem Statement',
      'discovery->refinement': 'Target Users & Scope',
      'refinement->validation': 'Requirements',
      'validation->completion': 'Full Specification',
    };

    const transitionKey = `${previousStage}->${currentStage}`;
    const sectionName = checkpointMap[transitionKey];

    return {
      shouldCreate: !!sectionName,
      sectionName,
    };
  }

  /**
   * Prune conversation history while preserving recent messages
   * This prevents token limit issues while maintaining context
   */
  pruneConversationHistory(
    conversationHistory: Message[],
    lockedSections?: LockedSection[],
    maxRecentMessages: number = 15
  ): Message[] {
    // If conversation is short, don't prune
    if (conversationHistory.length <= maxRecentMessages) {
      return conversationHistory;
    }

    // Keep only the most recent messages
    const recentMessages = conversationHistory.slice(-maxRecentMessages);

    // Create a synthetic "checkpoint" message summarizing locked decisions
    if (lockedSections && lockedSections.length > 0) {
      const checkpointMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: this.formatLockedSectionsAsMessage(lockedSections),
        timestamp: new Date().toISOString(),
      };

      // Insert checkpoint at the beginning
      return [checkpointMessage, ...recentMessages];
    }

    return recentMessages;
  }

  /**
   * Format locked sections as a system message
   */
  private formatLockedSectionsAsMessage(lockedSections: LockedSection[]): string {
    const sections = lockedSections
      .map((section) => `${section.name}: ${section.summary}`)
      .join('\n');

    return `LOCKED IN DECISIONS (do not re-litigate):\n${sections}`;
  }

  /**
   * Enhance prompt with locked sections to prevent re-litigation
   */
  enhancePromptWithLockedSections(
    prompt: string,
    lockedSections?: LockedSection[]
  ): string {
    if (!lockedSections || lockedSections.length === 0) {
      return prompt;
    }

    const formattedSections = lockedSections
      .map((section) => `- ${section.name}: ${section.summary}`)
      .join('\n');

    return `${prompt}

LOCKED IN DECISIONS (these are final, do not revisit or re-litigate):
${formattedSections}

Build on these locked decisions. If the user tries to change something fundamental that's locked, acknowledge what was decided and ask if they want to revise the entire specification.`;
  }
}
