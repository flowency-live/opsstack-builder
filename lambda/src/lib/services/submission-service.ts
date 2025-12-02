/**
 * SubmissionService
 * Handles submission workflow including validation, storage, and reference generation
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Submission, ContactInfo, Specification } from '../models/types';
import { submissionToRecord, recordToSubmission, type SubmissionRecord } from '../models/dynamodb-schema';
import { SpecificationGenerator } from './specification-generator';
import { dynamoDBClient } from '../aws';

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

export class SubmissionService {
  private dynamoClient: DynamoDBClient;
  private tableName: string;
  private specGenerator: SpecificationGenerator;

  constructor(
    dynamoClient?: DynamoDBClient,
    tableName: string = process.env.DYNAMODB_TABLE_NAME || 'spec-wizard-table'
  ) {
    this.dynamoClient = dynamoClient || dynamoDBClient;
    this.tableName = tableName;
    this.specGenerator = new SpecificationGenerator();
  }

  /**
   * Validate contact information
   */
  validateContactInfo(contactInfo: ContactInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!contactInfo.name || contactInfo.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!contactInfo.email || contactInfo.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(contactInfo.email)) {
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
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate unique reference number
   */
  generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REF-${timestamp}-${random}`;
  }

  /**
   * Submit a specification
   */
  async submitSpecification(input: SubmissionInput): Promise<SubmissionResult> {
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
        const errors: string[] = [];
        
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
      const submission: Submission = {
        id: uuidv4(),
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
    } catch (error) {
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
  private async storeSubmission(submission: Submission): Promise<void> {
    const record = submissionToRecord(submission);
    
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(record, { removeUndefinedValues: true }),
    });

    await this.dynamoClient.send(command);
  }

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId: string): Promise<Submission | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `SUBMISSION#${submissionId}`,
          SK: 'METADATA',
        }),
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        return null;
      }

      const record = unmarshall(response.Item) as SubmissionRecord;
      return recordToSubmission(record);
    } catch (error) {
      console.error('Error getting submission:', error);
      return null;
    }
  }

  /**
   * Get submission by reference number
   */
  async getSubmissionByReference(referenceNumber: string): Promise<Submission | null> {
    try {
      // In a real implementation, this would use GSI1 to query by reference number
      // For now, we'll implement a simple version
      // This is a placeholder - actual implementation would use Query with GSI
      return null;
    } catch (error) {
      console.error('Error getting submission by reference:', error);
      return null;
    }
  }
}
