/**
 * SubmissionService
 * Handles submission workflow including validation, storage, and reference generation
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { Submission, ContactInfo, Specification } from '../models/types';
export interface SubmissionInput {
    sessionId: string;
    contactInfo: ContactInfo;
    specification: Specification;
}
export interface SubmissionResult {
    success: boolean;
    submission?: Submission;
    error?: string;
    validationErrors?: string[];
}
export declare class SubmissionService {
    private dynamoClient;
    private tableName;
    private specGenerator;
    constructor(dynamoClient?: DynamoDBClient, tableName?: string);
    /**
     * Validate contact information
     */
    validateContactInfo(contactInfo: ContactInfo): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Generate unique reference number
     */
    generateReferenceNumber(): string;
    /**
     * Submit a specification
     */
    submitSpecification(input: SubmissionInput): Promise<SubmissionResult>;
    /**
     * Store submission in DynamoDB
     */
    private storeSubmission;
    /**
     * Get submission by ID
     */
    getSubmission(submissionId: string): Promise<Submission | null>;
    /**
     * Get submission by reference number
     */
    getSubmissionByReference(referenceNumber: string): Promise<Submission | null>;
}
//# sourceMappingURL=submission-service.d.ts.map