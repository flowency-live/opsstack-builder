"use strict";
/**
 * SubmissionService
 * Handles submission workflow including validation, storage, and reference generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionService = void 0;
const uuid_1 = require("uuid");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const dynamodb_schema_1 = require("../models/dynamodb-schema");
const specification_generator_1 = require("./specification-generator");
const aws_1 = require("../aws");
class SubmissionService {
    constructor(dynamoClient, tableName = process.env.DYNAMODB_TABLE_NAME || 'spec-wizard-table') {
        this.dynamoClient = dynamoClient || aws_1.dynamoDBClient;
        this.tableName = tableName;
        this.specGenerator = new specification_generator_1.SpecificationGenerator();
    }
    /**
     * Validate contact information
     */
    validateContactInfo(contactInfo) {
        const errors = [];
        // Required fields
        if (!contactInfo.name || contactInfo.name.trim().length === 0) {
            errors.push('Name is required');
        }
        if (!contactInfo.email || contactInfo.email.trim().length === 0) {
            errors.push('Email is required');
        }
        else if (!this.isValidEmail(contactInfo.email)) {
            errors.push('Email format is invalid');
        }
        if (!contactInfo.phone || contactInfo.phone.trim().length === 0) {
            errors.push('Phone number is required');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Generate unique reference number
     */
    generateReferenceNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `REF-${timestamp}-${random}`;
    }
    /**
     * Submit a specification
     */
    async submitSpecification(input) {
        try {
            // Validate contact information
            const contactValidation = this.validateContactInfo(input.contactInfo);
            if (!contactValidation.valid) {
                return {
                    success: false,
                    error: 'Contact information validation failed',
                    validationErrors: contactValidation.errors,
                };
            }
            // Validate specification completeness
            const specValidation = this.specGenerator.validateCompleteness(input.specification);
            if (!specValidation.isComplete) {
                const errors = [];
                if (specValidation.missingTopics.length > 0) {
                    errors.push(`Missing topics: ${specValidation.missingTopics.join(', ')}`);
                }
                if (specValidation.ambiguousRequirements.length > 0) {
                    errors.push(`Ambiguous requirements: ${specValidation.ambiguousRequirements.join(', ')}`);
                }
                if (specValidation.conflictingRequirements.length > 0) {
                    errors.push(`Conflicting requirements detected`);
                }
                return {
                    success: false,
                    error: 'Specification is incomplete',
                    validationErrors: errors,
                };
            }
            // Create submission
            const submission = {
                id: (0, uuid_1.v4)(),
                sessionId: input.sessionId,
                contactInfo: input.contactInfo,
                specificationVersion: input.specification.version,
                submittedAt: new Date(),
                status: 'pending',
                referenceNumber: this.generateReferenceNumber(),
            };
            // Store in DynamoDB
            await this.storeSubmission(submission);
            return {
                success: true,
                submission,
            };
        }
        catch (error) {
            console.error('Submission error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    /**
     * Store submission in DynamoDB
     */
    async storeSubmission(submission) {
        const record = (0, dynamodb_schema_1.submissionToRecord)(submission);
        const command = new client_dynamodb_1.PutItemCommand({
            TableName: this.tableName,
            Item: (0, util_dynamodb_1.marshall)(record, { removeUndefinedValues: true }),
        });
        await this.dynamoClient.send(command);
    }
    /**
     * Get submission by ID
     */
    async getSubmission(submissionId) {
        try {
            const command = new client_dynamodb_1.GetItemCommand({
                TableName: this.tableName,
                Key: (0, util_dynamodb_1.marshall)({
                    PK: `SUBMISSION#${submissionId}`,
                    SK: 'METADATA',
                }),
            });
            const response = await this.dynamoClient.send(command);
            if (!response.Item) {
                return null;
            }
            const record = (0, util_dynamodb_1.unmarshall)(response.Item);
            return (0, dynamodb_schema_1.recordToSubmission)(record);
        }
        catch (error) {
            console.error('Error getting submission:', error);
            return null;
        }
    }
    /**
     * Get submission by reference number
     */
    async getSubmissionByReference(referenceNumber) {
        try {
            // In a real implementation, this would use GSI1 to query by reference number
            // For now, we'll implement a simple version
            // This is a placeholder - actual implementation would use Query with GSI
            return null;
        }
        catch (error) {
            console.error('Error getting submission by reference:', error);
            return null;
        }
    }
}
exports.SubmissionService = SubmissionService;
//# sourceMappingURL=submission-service.js.map