/**
 * ProgressTracker Service
 * Tracks specification completion progress and adapts to project complexity
 */
import { Specification, ProgressState, Topic } from '../models/types';
/**
 * Project types recognized by the system
 */
export type ProjectType = 'website' | 'booking-system' | 'crm' | 'mobile-app' | 'e-commerce' | 'web-application' | 'api' | 'unknown';
export declare class ProgressTracker {
    /**
     * Update progress based on current specification
     */
    updateProgress(specification: Specification): Promise<ProgressState>;
    /**
     * Determine project complexity based on requirements
     */
    determineProjectComplexity(specification: Specification): 'Simple' | 'Medium' | 'Complex';
    /**
     * Get required topics based on project type and complexity
     */
    getRequiredTopics(projectType: ProjectType, complexity: 'Simple' | 'Medium' | 'Complex'): Topic[];
    /**
     * Determine project type from specification content
     */
    private determineProjectType;
    /**
     * Update topic statuses based on specification content
     */
    private updateTopicStatuses;
    /**
     * Get status for a specific topic
     */
    private getTopicStatus;
    /**
     * Check for data requirements in PRD
     */
    private checkForDataRequirements;
    /**
     * Check for workflows in PRD
     */
    private checkForWorkflows;
    /**
     * Check for NFR category
     */
    private checkForNFRCategory;
    /**
     * Check for keyword in specification
     */
    private checkForKeyword;
    /**
     * Calculate overall completeness percentage
     */
    private calculateCompleteness;
}
//# sourceMappingURL=progress-tracker.d.ts.map