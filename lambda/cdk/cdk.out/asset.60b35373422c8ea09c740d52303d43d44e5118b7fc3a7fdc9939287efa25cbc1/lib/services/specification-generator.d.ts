/**
 * SpecificationGenerator Service
 * Transforms conversation into structured PRD and plain English summaries
 */
import { Specification, FormalPRD, PlainEnglishSummary, Message } from '../models/types';
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
export declare class SpecificationGenerator {
    /**
     * Extract information from user message and assistant response
     * This is a simplified version - in production, this would use LLM
     */
    extractInformation(userMessage: string, assistantResponse: string, context: any): Promise<ExtractedInformation | null>;
    /**
     * Update specification with newly extracted information from conversation
     */
    updateSpecification(sessionId: string, extractedInfo: ExtractedInformation, currentSpecification: Specification): Promise<Specification>;
    /**
     * Generate formal PRD with EARS-formatted requirements
     */
    generateFormalPRD(userIntent: Record<string, any>, conversationHistory: Message[]): Promise<FormalPRD>;
    /**
     * Generate plain English summary for user-facing view
     */
    generatePlainEnglishSummary(formalPRD: FormalPRD): Promise<PlainEnglishSummary>;
    /**
     * Validate specification completeness
     */
    validateCompleteness(specification: Specification): ValidationResult;
    /**
     * Create an empty specification
     */
    private createEmptySpecification;
    /**
     * Update plain English summary with new information
     */
    private updatePlainEnglishSummary;
    /**
     * Update formal PRD with new information
     */
    private updateFormalPRD;
    /**
     * Extract introduction from conversation history
     */
    private extractIntroduction;
    /**
     * Build glossary from conversation and user intent
     */
    private buildGlossary;
    /**
     * Generate requirements from user intent
     */
    private generateRequirements;
    /**
     * Generate non-functional requirements
     */
    private generateNonFunctionalRequirements;
    /**
     * Create a requirement from a feature description
     */
    private createRequirementFromFeature;
    /**
     * Create a requirement from a workflow description
     */
    private createRequirementFromWorkflow;
    /**
     * Translate business goal to technical requirement
     */
    private translateBusinessToTechnical;
    /**
     * Extract overview from introduction
     */
    private extractOverviewFromIntroduction;
    /**
     * Extract key features from requirements
     */
    private extractKeyFeaturesFromRequirements;
    /**
     * Extract target users from requirements
     */
    private extractTargetUsersFromRequirements;
    /**
     * Extract integrations from requirements
     */
    private extractIntegrationsFromRequirements;
    /**
     * Estimate complexity based on requirements
     */
    private estimateComplexity;
    /**
     * Identify which core topics are covered in the specification
     */
    private identifyCoveredTopics;
    /**
     * Check if a requirement is ambiguous
     */
    private isAmbiguous;
    /**
     * Detect conflicting requirements
     */
    private detectConflicts;
    /**
     * Generate introduction from extracted data
     */
    private generateIntroductionFromData;
    /**
     * Generate requirements from extracted data
     */
    private generateRequirementsFromData;
}
//# sourceMappingURL=specification-generator.d.ts.map