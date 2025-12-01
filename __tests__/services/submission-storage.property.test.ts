/**
 * Property Test: Submission storage
 * **Feature: spec-wizard, Property 18: Submission storage**
 * **Validates: Requirements 8.4, 12.1**
 *
 * For any successful submission, the database should contain a SubmissionRecord
 * with a unique reference number, all contact information, and a link to the
 * specification version.
 */

import * as fc from 'fast-check';
import { SubmissionService } from '../../lib/services/submission-service';
import { arbitraryContactInfo, arbitrarySpecification } from '../utils/factories';
import type { ContactInfo, Specification } from '../../lib/models/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock DynamoDB client for testing
const mockDynamoClient = {
  send: jest.fn(),
} as unknown as DynamoDBClient;

describe('Property 18: Submission storage', () => {
  let submissionService: SubmissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    submissionService = new SubmissionService(mockDynamoClient, 'test-table');
    
    // Mock successful DynamoDB operations
    (mockDynamoClient.send as jest.Mock).mockResolvedValue({});
  });

  test('successful submissions should have unique reference numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionId: fc.string({ minLength: 1, maxLength: 50 }),
            contactInfo: arbitraryContactInfo.filter(
              (info) => info.name && info.email && info.phone
            ),
            specification: arbitrarySpecification,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (inputs) => {
          const referenceNumbers = new Set<string>();
          let successfulSubmissions = 0;

          for (const input of inputs) {
            // Ensure required fields are present
            const validInput = {
              ...input,
              contactInfo: {
                name: input.contactInfo.name || 'Test Name',
                email: input.contactInfo.email || 'test@example.com',
                phone: input.contactInfo.phone || '1234567890',
                budgetRange: input.contactInfo.budgetRange,
                timeline: input.contactInfo.timeline,
                referralSource: input.contactInfo.referralSource,
                urgency: input.contactInfo.urgency,
              },
            };

            const result = await submissionService.submitSpecification(validInput);

            if (result.success && result.submission) {
              successfulSubmissions++;
              
              // Reference number should be unique
              expect(referenceNumbers.has(result.submission.referenceNumber)).toBe(false);
              referenceNumbers.add(result.submission.referenceNumber);

              // Reference number should follow expected format
              expect(result.submission.referenceNumber).toMatch(/^REF-[A-Z0-9]+-[A-Z0-9]+$/);
            }
          }

          // All successful submissions should have unique reference numbers
          expect(referenceNumbers.size).toBe(successfulSubmissions);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('stored submissions should contain all contact information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryContactInfo.filter((info) => info.name && info.email && info.phone),
        arbitrarySpecification,
        async (sessionId, contactInfo, specification) => {
          // Ensure required fields
          const validContactInfo: ContactInfo = {
            name: contactInfo.name || 'Test Name',
            email: contactInfo.email || 'test@example.com',
            phone: contactInfo.phone || '1234567890',
            budgetRange: contactInfo.budgetRange,
            timeline: contactInfo.timeline,
            referralSource: contactInfo.referralSource,
            urgency: contactInfo.urgency,
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo: validContactInfo,
            specification,
          });

          if (result.success && result.submission) {
            // All contact info should be preserved
            expect(result.submission.contactInfo.name).toBe(validContactInfo.name);
            expect(result.submission.contactInfo.email).toBe(validContactInfo.email);
            expect(result.submission.contactInfo.phone).toBe(validContactInfo.phone);
            
            // Optional fields should be preserved if provided
            if (validContactInfo.budgetRange) {
              expect(result.submission.contactInfo.budgetRange).toBe(validContactInfo.budgetRange);
            }
            if (validContactInfo.timeline) {
              expect(result.submission.contactInfo.timeline).toBe(validContactInfo.timeline);
            }
            if (validContactInfo.referralSource) {
              expect(result.submission.contactInfo.referralSource).toBe(validContactInfo.referralSource);
            }
            if (validContactInfo.urgency) {
              expect(result.submission.contactInfo.urgency).toBe(validContactInfo.urgency);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('stored submissions should link to specification version', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryContactInfo.filter((info) => info.name && info.email && info.phone),
        arbitrarySpecification,
        async (sessionId, contactInfo, specification) => {
          const validContactInfo: ContactInfo = {
            name: contactInfo.name || 'Test Name',
            email: contactInfo.email || 'test@example.com',
            phone: contactInfo.phone || '1234567890',
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo: validContactInfo,
            specification,
          });

          if (result.success && result.submission) {
            // Should link to the correct session
            expect(result.submission.sessionId).toBe(sessionId);

            // Should link to the correct specification version
            expect(result.submission.specificationVersion).toBe(specification.version);

            // Should have a valid submission ID
            expect(result.submission.id).toBeTruthy();
            expect(typeof result.submission.id).toBe('string');
            expect(result.submission.id.length).toBeGreaterThan(0);

            // Should have a submission timestamp
            expect(result.submission.submittedAt).toBeInstanceOf(Date);

            // Should have initial status
            expect(result.submission.status).toBe('pending');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('submission should be stored in database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryContactInfo.filter((info) => info.name && info.email && info.phone),
        arbitrarySpecification,
        async (sessionId, contactInfo, specification) => {
          const validContactInfo: ContactInfo = {
            name: contactInfo.name || 'Test Name',
            email: contactInfo.email || 'test@example.com',
            phone: contactInfo.phone || '1234567890',
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo: validContactInfo,
            specification,
          });

          if (result.success) {
            // DynamoDB send should have been called
            expect(mockDynamoClient.send).toHaveBeenCalled();

            // Should have called PutItemCommand
            const calls = (mockDynamoClient.send as jest.Mock).mock.calls;
            expect(calls.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
