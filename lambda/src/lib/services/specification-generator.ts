/**
 * SpecificationGenerator Service
 * Transforms conversation into structured PRD and plain English summaries
 */

import {
  Specification,
  FormalPRD,
  PlainEnglishSummary,
  Requirement,
  NFR,
  Message
} from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractedInformation } from './conversation-engine';

export interface ValidationResult {
  isComplete: boolean;
  missingTopics: string[];
  ambiguousRequirements: string[];
  conflictingRequirements: ConflictPair[];
}

export interface ConflictPair {
  requirement1: string;
  requirement2: string;
  conflictDescription: string;
}

/**
 * Core PRD topics that should be covered in a complete specification
 */
const CORE_PRD_TOPICS = [
  'overview',
  'users',
  'features',
  'integrations',
  'data',
  'workflows',
  'non-functional requirements',
];

/**
 * EARS patterns for requirement formatting
 */
const EARS_PATTERNS = {
  ubiquitous: 'THE <system> SHALL <response>',
  eventDriven: 'WHEN <trigger>, THE <system> SHALL <response>',
  stateDriven: 'WHILE <condition>, THE <system> SHALL <response>',
  unwantedEvent: 'IF <condition>, THEN THE <system> SHALL <response>',
  optionalFeature: 'WHERE <option>, THE <system> SHALL <response>',
};

export class SpecificationGenerator {
  /**
   * Extract information from user message and assistant response
   * This is a simplified version - in production, this would use LLM
   */
  async extractInformation(
    userMessage: string,
    assistantResponse: string,
    context: any
  ): Promise<ExtractedInformation | null> {
    const lowerUser = userMessage.toLowerCase();
    const lowerAssistant = assistantResponse.toLowerCase();

    // Detect topic based on keywords
    let topic = 'general';
    const data: Record<string, any> = {};
    let confidence = 0.5;

    // Check for overview/project description
    if (
      lowerUser.includes('build') ||
      lowerUser.includes('create') ||
      lowerUser.includes('want') ||
      lowerUser.includes('need')
    ) {
      topic = 'overview';
      data.description = userMessage;
      confidence = 0.7;
    }

    // Check for features
    if (
      lowerUser.includes('feature') ||
      lowerUser.includes('functionality') ||
      lowerUser.includes('should be able to')
    ) {
      topic = 'features';
      data.feature = userMessage;
      confidence = 0.8;
    }

    // Check for users
    if (
      lowerUser.includes('user') ||
      lowerUser.includes('customer') ||
      lowerUser.includes('audience')
    ) {
      topic = 'users';
      data.description = userMessage;
      confidence = 0.7;
    }

    // Check for integrations
    if (
      lowerUser.includes('integrate') ||
      lowerUser.includes('connect') ||
      lowerUser.includes('api')
    ) {
      topic = 'integrations';
      data.integration = userMessage;
      confidence = 0.8;
    }

    // Only return if we have meaningful data
    if (Object.keys(data).length === 0) {
      return null;
    }

    return {
      topic,
      data,
      confidence,
    };
  }

  /**
   * Update specification with newly extracted information from conversation
   */
  async updateSpecification(
    sessionId: string,
    extractedInfo: ExtractedInformation,
    currentSpecification: Specification
  ): Promise<Specification> {
    // Extract the topic and data
    const { topic, data } = extractedInfo;

    // Update plain English summary
    const updatedSummary = this.updatePlainEnglishSummary(
      currentSpecification.plainEnglishSummary,
      topic,
      data
    );

    // Update formal PRD (pass empty array for conversation history since we don't have it here)
    const updatedPRD = await this.updateFormalPRD(
      currentSpecification.formalPRD,
      topic,
      data,
      []
    );

    // Increment version
    const newVersion = currentSpecification.version + 1;

    return {
      ...currentSpecification,
      version: newVersion,
      plainEnglishSummary: updatedSummary,
      formalPRD: updatedPRD,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate formal PRD with EARS-formatted requirements
   */
  async generateFormalPRD(
    userIntent: Record<string, any>,
    conversationHistory: Message[]
  ): Promise<FormalPRD> {
    // Extract introduction from conversation
    const introduction = this.extractIntroduction(conversationHistory, userIntent);

    // Build glossary from technical terms
    const glossary = this.buildGlossary(conversationHistory, userIntent);

    // Generate requirements from user intent
    const requirements = this.generateRequirements(userIntent, conversationHistory);

    // Generate non-functional requirements
    const nonFunctionalRequirements = this.generateNonFunctionalRequirements(
      userIntent,
      conversationHistory
    );

    return {
      introduction,
      glossary,
      requirements,
      nonFunctionalRequirements,
    };
  }

  /**
   * Generate plain English summary for user-facing view
   */
  async generatePlainEnglishSummary(formalPRD: FormalPRD): Promise<PlainEnglishSummary> {
    // Extract overview from introduction
    const overview = this.extractOverviewFromIntroduction(formalPRD.introduction);

    // Extract key features from requirements
    const keyFeatures = this.extractKeyFeaturesFromRequirements(formalPRD.requirements);

    // Extract target users from requirements
    const targetUsers = this.extractTargetUsersFromRequirements(formalPRD.requirements);

    // Extract integrations from requirements
    const integrations = this.extractIntegrationsFromRequirements(formalPRD.requirements);

    // Estimate complexity based on requirements count and NFRs
    const estimatedComplexity = this.estimateComplexity(formalPRD);

    return {
      overview,
      keyFeatures,
      targetUsers,
      integrations,
      estimatedComplexity,
    };
  }

  /**
   * Validate specification completeness
   */
  validateCompleteness(specification: Specification): ValidationResult {
    const missingTopics: string[] = [];
    const ambiguousRequirements: string[] = [];
    const conflictingRequirements: ConflictPair[] = [];

    // Check for missing core topics
    const coveredTopics = this.identifyCoveredTopics(specification);
    for (const topic of CORE_PRD_TOPICS) {
      if (!coveredTopics.includes(topic)) {
        missingTopics.push(topic);
      }
    }

    // Check for ambiguous requirements
    for (const req of specification.formalPRD.requirements) {
      if (this.isAmbiguous(req)) {
        ambiguousRequirements.push(req.id);
      }
    }

    // Check for conflicting requirements
    const conflicts = this.detectConflicts(specification.formalPRD.requirements);
    conflictingRequirements.push(...conflicts);

    const isComplete = 
      missingTopics.length === 0 && 
      ambiguousRequirements.length === 0 && 
      conflictingRequirements.length === 0;

    return {
      isComplete,
      missingTopics,
      ambiguousRequirements,
      conflictingRequirements,
    };
  }

  /**
   * Create an empty specification
   */
  private createEmptySpecification(): Specification {
    return {
      id: uuidv4(),
      version: 1,
      plainEnglishSummary: {
        overview: '',
        keyFeatures: [],
        targetUsers: '',
        integrations: [],
      },
      formalPRD: {
        introduction: '',
        glossary: {},
        requirements: [],
        nonFunctionalRequirements: [],
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Update plain English summary with new information
   */
  private updatePlainEnglishSummary(
    currentSummary: PlainEnglishSummary,
    topic: string,
    data: Record<string, any>
  ): PlainEnglishSummary {
    const updated = { ...currentSummary };

    switch (topic.toLowerCase()) {
      case 'overview':
      case 'project overview':
        updated.overview = data.description || data.overview || data.text || '';
        break;

      case 'features':
      case 'key features':
        if (data.features && Array.isArray(data.features)) {
          updated.keyFeatures = [...new Set([...updated.keyFeatures, ...data.features])];
        } else if (data.feature) {
          updated.keyFeatures = [...new Set([...updated.keyFeatures, data.feature])];
        }
        break;

      case 'users':
      case 'target users':
        updated.targetUsers = data.description || data.users || data.text || '';
        break;

      case 'integrations':
        if (data.integrations && Array.isArray(data.integrations)) {
          updated.integrations = [...new Set([...updated.integrations, ...data.integrations])];
        } else if (data.integration) {
          updated.integrations = [...new Set([...updated.integrations, data.integration])];
        }
        break;
    }

    return updated;
  }

  /**
   * Update formal PRD with new information
   */
  private async updateFormalPRD(
    currentPRD: FormalPRD,
    topic: string,
    data: Record<string, any>,
    conversationHistory: Message[]
  ): Promise<FormalPRD> {
    const updated = { ...currentPRD };

    // Update introduction if overview topic
    if (topic.toLowerCase().includes('overview')) {
      updated.introduction = this.generateIntroductionFromData(data);
    }

    // Add to glossary if technical terms are present
    if (data.terms && typeof data.terms === 'object') {
      updated.glossary = { ...updated.glossary, ...data.terms };
    }

    // Generate requirements from the data
    if (data.requirements || data.feature || data.features) {
      const newRequirements = this.generateRequirementsFromData(topic, data);
      updated.requirements = [...updated.requirements, ...newRequirements];
    }

    return updated;
  }

  /**
   * Extract introduction from conversation history
   */
  private extractIntroduction(
    conversationHistory: Message[],
    userIntent: Record<string, any>
  ): string {
    // Find the first substantial user message
    const firstUserMessage = conversationHistory.find(
      (msg) => msg.role === 'user' && msg.content.length > 20
    );

    if (firstUserMessage) {
      return `This specification describes ${firstUserMessage.content}`;
    }

    if (userIntent.overview) {
      return `This specification describes ${userIntent.overview}`;
    }

    return 'This specification describes a software system.';
  }

  /**
   * Build glossary from conversation and user intent
   */
  private buildGlossary(
    conversationHistory: Message[],
    userIntent: Record<string, any>
  ): Record<string, string> {
    const glossary: Record<string, string> = {};

    // Extract system name if mentioned
    const allText = conversationHistory
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content)
      .join(' ');

    // Look for common patterns like "the system", "the app", "the platform"
    const systemMatch = allText.match(/the (system|app|application|platform|website|software)/i);
    if (systemMatch) {
      glossary['System'] = `The ${systemMatch[1]} being specified`;
    }

    // Add any terms from user intent
    if (userIntent.terms && typeof userIntent.terms === 'object') {
      Object.assign(glossary, userIntent.terms);
    }

    return glossary;
  }

  /**
   * Generate requirements from user intent
   */
  private generateRequirements(
    userIntent: Record<string, any>,
    conversationHistory: Message[]
  ): Requirement[] {
    const requirements: Requirement[] = [];

    // Generate requirements from features
    if (userIntent.features && Array.isArray(userIntent.features)) {
      userIntent.features.forEach((feature: string, index: number) => {
        const requirement = this.createRequirementFromFeature(feature, index + 1);
        requirements.push(requirement);
      });
    }

    // Generate requirements from workflows
    if (userIntent.workflows && Array.isArray(userIntent.workflows)) {
      userIntent.workflows.forEach((workflow: string, index: number) => {
        const requirement = this.createRequirementFromWorkflow(
          workflow,
          requirements.length + index + 1
        );
        requirements.push(requirement);
      });
    }

    return requirements;
  }

  /**
   * Generate non-functional requirements
   */
  private generateNonFunctionalRequirements(
    userIntent: Record<string, any>,
    conversationHistory: Message[]
  ): NFR[] {
    const nfrs: NFR[] = [];

    // Check for performance requirements
    const allText = conversationHistory
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content.toLowerCase())
      .join(' ');

    if (allText.includes('fast') || allText.includes('performance') || allText.includes('speed')) {
      nfrs.push({
        id: `nfr-${nfrs.length + 1}`,
        category: 'Performance',
        description: 'THE System SHALL respond to user actions within 2 seconds',
      });
    }

    if (allText.includes('secure') || allText.includes('security') || allText.includes('safe')) {
      nfrs.push({
        id: `nfr-${nfrs.length + 1}`,
        category: 'Security',
        description: 'THE System SHALL encrypt all sensitive data at rest and in transit',
      });
    }

    if (allText.includes('scale') || allText.includes('scalable') || allText.includes('growth')) {
      nfrs.push({
        id: `nfr-${nfrs.length + 1}`,
        category: 'Scalability',
        description: 'THE System SHALL support concurrent usage by multiple users',
      });
    }

    // Add from user intent
    if (userIntent.nonFunctionalRequirements && Array.isArray(userIntent.nonFunctionalRequirements)) {
      userIntent.nonFunctionalRequirements.forEach((nfr: any, index: number) => {
        nfrs.push({
          id: `nfr-${nfrs.length + index + 1}`,
          category: nfr.category || 'General',
          description: nfr.description || nfr,
        });
      });
    }

    return nfrs;
  }

  /**
   * Create a requirement from a feature description
   */
  private createRequirementFromFeature(feature: string, index: number): Requirement {
    // Translate business feature to technical requirement
    const technicalDescription = this.translateBusinessToTechnical(feature);

    return {
      id: `req-${index}`,
      userStory: `As a user, I want ${feature}, so that I can accomplish my goals`,
      acceptanceCriteria: [
        `WHEN a user requests ${feature} THEN THE System SHALL ${technicalDescription}`,
      ],
      priority: 'must-have',
    };
  }

  /**
   * Create a requirement from a workflow description
   */
  private createRequirementFromWorkflow(workflow: string, index: number): Requirement {
    return {
      id: `req-${index}`,
      userStory: `As a user, I want to ${workflow}, so that I can complete my tasks`,
      acceptanceCriteria: [
        `WHEN a user initiates ${workflow} THEN THE System SHALL process the workflow`,
      ],
      priority: 'must-have',
    };
  }

  /**
   * Translate business goal to technical requirement
   */
  private translateBusinessToTechnical(businessGoal: string): string {
    const lowerGoal = businessGoal.toLowerCase();

    // Common business-to-technical translations
    if (lowerGoal.includes('login') || lowerGoal.includes('sign in')) {
      return 'authenticate the user and create a session';
    }

    if (lowerGoal.includes('search')) {
      return 'query the database and return matching results';
    }

    if (lowerGoal.includes('save') || lowerGoal.includes('store')) {
      return 'persist the data to the database';
    }

    if (lowerGoal.includes('send') || lowerGoal.includes('email')) {
      return 'deliver the message via email service';
    }

    if (lowerGoal.includes('pay') || lowerGoal.includes('payment')) {
      return 'process the payment through the payment gateway';
    }

    if (lowerGoal.includes('upload')) {
      return 'accept and store the file in cloud storage';
    }

    if (lowerGoal.includes('download')) {
      return 'retrieve and deliver the file to the user';
    }

    // Default: use the business goal as-is
    return `provide ${businessGoal}`;
  }

  /**
   * Extract overview from introduction
   */
  private extractOverviewFromIntroduction(introduction: string): string {
    // Remove "This specification describes" prefix if present
    return introduction.replace(/^This specification describes\s*/i, '');
  }

  /**
   * Extract key features from requirements
   */
  private extractKeyFeaturesFromRequirements(requirements: Requirement[]): string[] {
    return requirements
      .filter((req) => req.priority === 'must-have')
      .map((req) => {
        // Extract feature from user story
        const match = req.userStory.match(/I want (.+?),/);
        return match ? match[1] : req.userStory;
      })
      .slice(0, 10); // Limit to top 10 features
  }

  /**
   * Extract target users from requirements
   */
  private extractTargetUsersFromRequirements(requirements: Requirement[]): string {
    // Look for user stories that mention specific user types
    const userTypes = new Set<string>();

    requirements.forEach((req) => {
      const match = req.userStory.match(/As (?:a|an) (.+?),/);
      if (match && match[1] !== 'user') {
        userTypes.add(match[1]);
      }
    });

    if (userTypes.size > 0) {
      return Array.from(userTypes).join(', ');
    }

    return 'General users';
  }

  /**
   * Extract integrations from requirements
   */
  private extractIntegrationsFromRequirements(requirements: Requirement[]): string[] {
    const integrations = new Set<string>();

    requirements.forEach((req) => {
      const text = `${req.userStory} ${req.acceptanceCriteria.join(' ')}`.toLowerCase();

      // Look for common integration keywords
      if (text.includes('stripe') || text.includes('payment gateway')) {
        integrations.add('Payment Gateway');
      }
      if (text.includes('email') || text.includes('ses')) {
        integrations.add('Email Service');
      }
      if (text.includes('storage') || text.includes('s3')) {
        integrations.add('Cloud Storage');
      }
      if (text.includes('database')) {
        integrations.add('Database');
      }
      if (text.includes('api')) {
        integrations.add('External API');
      }
    });

    return Array.from(integrations);
  }

  /**
   * Estimate complexity based on requirements
   */
  private estimateComplexity(formalPRD: FormalPRD): 'Simple' | 'Medium' | 'Complex' {
    const reqCount = formalPRD.requirements.length;
    const nfrCount = formalPRD.nonFunctionalRequirements.length;
    const totalComplexity = reqCount + nfrCount * 2; // NFRs count double

    if (totalComplexity <= 5) {
      return 'Simple';
    } else if (totalComplexity <= 15) {
      return 'Medium';
    } else {
      return 'Complex';
    }
  }

  /**
   * Identify which core topics are covered in the specification
   */
  private identifyCoveredTopics(specification: Specification): string[] {
    const covered: string[] = [];

    if (specification.plainEnglishSummary.overview) {
      covered.push('overview');
    }

    if (specification.plainEnglishSummary.targetUsers) {
      covered.push('users');
    }

    if (specification.plainEnglishSummary.keyFeatures.length > 0) {
      covered.push('features');
    }

    if (specification.plainEnglishSummary.integrations.length > 0) {
      covered.push('integrations');
    }

    // Check for data requirements in formal PRD
    const hasDataRequirements = specification.formalPRD.requirements.some((req) =>
      req.userStory.toLowerCase().includes('data') ||
      req.acceptanceCriteria.some((ac) => ac.toLowerCase().includes('data'))
    );
    if (hasDataRequirements) {
      covered.push('data');
    }

    // Check for workflows
    const hasWorkflows = specification.formalPRD.requirements.some((req) =>
      req.userStory.toLowerCase().includes('workflow') ||
      req.acceptanceCriteria.some((ac) => ac.toLowerCase().includes('workflow'))
    );
    if (hasWorkflows) {
      covered.push('workflows');
    }

    // Check for NFRs
    if (specification.formalPRD.nonFunctionalRequirements.length > 0) {
      covered.push('non-functional requirements');
    }

    return covered;
  }

  /**
   * Check if a requirement is ambiguous
   */
  private isAmbiguous(requirement: Requirement): boolean {
    // Check for vague terms
    const vagueTerms = [
      'quickly',
      'slowly',
      'adequate',
      'appropriate',
      'reasonable',
      'sufficient',
      'good',
      'bad',
      'easy',
      'hard',
      'simple',
      'complex',
      'many',
      'few',
      'some',
      'several',
    ];

    const text = `${requirement.userStory} ${requirement.acceptanceCriteria.join(' ')}`.toLowerCase();

    return vagueTerms.some((term) => text.includes(term));
  }

  /**
   * Detect conflicting requirements
   */
  private detectConflicts(requirements: Requirement[]): ConflictPair[] {
    const conflicts: ConflictPair[] = [];

    // Check for contradictory statements
    for (let i = 0; i < requirements.length; i++) {
      for (let j = i + 1; j < requirements.length; j++) {
        const req1 = requirements[i];
        const req2 = requirements[j];

        // Simple conflict detection: look for negations
        const text1 = `${req1.userStory} ${req1.acceptanceCriteria.join(' ')}`.toLowerCase();
        const text2 = `${req2.userStory} ${req2.acceptanceCriteria.join(' ')}`.toLowerCase();

        // Check for "not" patterns that might conflict
        if (
          (text1.includes('not') && text2.includes('shall')) ||
          (text2.includes('not') && text1.includes('shall'))
        ) {
          // Check if they're talking about the same thing
          const words1 = new Set(text1.split(/\s+/));
          const words2 = new Set(text2.split(/\s+/));
          const commonWords = Array.from(words1).filter((word) => words2.has(word));

          if (commonWords.length > 3) {
            conflicts.push({
              requirement1: req1.id,
              requirement2: req2.id,
              conflictDescription: 'Potential contradiction detected',
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Generate introduction from extracted data
   */
  private generateIntroductionFromData(data: Record<string, any>): string {
    if (data.description) {
      return `This specification describes ${data.description}`;
    }
    if (data.overview) {
      return `This specification describes ${data.overview}`;
    }
    if (data.text) {
      return `This specification describes ${data.text}`;
    }
    return 'This specification describes a software system.';
  }

  /**
   * Generate requirements from extracted data
   */
  private generateRequirementsFromData(
    topic: string,
    data: Record<string, any>
  ): Requirement[] {
    const requirements: Requirement[] = [];

    if (data.feature) {
      requirements.push(this.createRequirementFromFeature(data.feature, 1));
    }

    if (data.features && Array.isArray(data.features)) {
      data.features.forEach((feature: string, index: number) => {
        requirements.push(this.createRequirementFromFeature(feature, index + 1));
      });
    }

    if (data.requirements && Array.isArray(data.requirements)) {
      data.requirements.forEach((req: any, index: number) => {
        if (typeof req === 'string') {
          requirements.push(this.createRequirementFromFeature(req, index + 1));
        } else if (req.userStory && req.acceptanceCriteria) {
          requirements.push({
            id: req.id || `req-${index + 1}`,
            userStory: req.userStory,
            acceptanceCriteria: req.acceptanceCriteria,
            priority: req.priority || 'must-have',
          });
        }
      });
    }

    return requirements;
  }
}
