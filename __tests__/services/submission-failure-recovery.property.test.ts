/**
 * Property Test: Submission failure recovery
 * **Feature: spec-wizard, Property 20: Submission failure recovery**
 * **Validates: Requirements 8.5**
 *
 * For any submission that fails, the specification data should remain intact
 * and accessible, and the user should be able to retry submission.
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

describe('Property 20: Submission failure recovery', () => {
  let submissionService: SubmissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    submissionService = new SubmissionService(mockDynamoClient, 'test-table');
  });

  test('failed submissions should preserve specification data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryContactInfo,
        arbitrarySpecification,
        async (sessionId, contactInfo, originalSpecification) => {
          // Make a deep copy of the specification to compare later
          const specCopy = JSON.parse(JSON.stringify(originalSpecification));

          // Attempt submission (may fail due to validation)
          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification: originalSpecification,
          });

          // Specification should remain unchanged regardless of success/failure
          expect(originalSpecification.id).toBe(specCopy.id);
          expect(originalSpecification.version).toBe(specCopy.version);
          expect(originalSpecification.plainEnglishSummary).toEqual(specCopy.plainEnglishSummary);
          expect(originalSpecification.formalPRD).toEqual(specCopy.formalPRD);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('failed submissions should return clear error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryContactInfo,
        arbitrarySpecification,
        async (sessionId, contactInfo, specification) => {
          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification,
          });

          // If submission fails, should have error information
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);

            // Should have validation errors if validation failed
            if (result.error.includes('validation')) {
              expect(result.validationErrors).toBeDefined();
              expect(Array.isArray(result.validationErrors)).toBe(true);
              expect(result.validationErrors!.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('retry after fixing validation errors should succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitrarySpecification,
        async (sessionId, specification) => {
          // First attempt with invalid contact info (missing required fields)
          const invalidContactInfo: ContactInfo = {
            name: undefined,
            email: undefined,
            phone: undefined,
          };

          const firstResult = await submissionService.submitSpecification({
            sessionId,
            contactInfo: invalidContactInfo,
            specification,
          });

          // Should fail due to missing required fields
          expect(firstResult.success).toBe(false);
          expect(firstResult.validationErrors).toBeDefined();

          // Second attempt with valid contact info
          const validContactInfo: ContactInfo = {
            name: 'Test Name',
            email: 'test@example.com',
            phone: '1234567890',
          };

          // Mock successful DynamoDB operation for retry
          (mockDynamoClient.send as jest.Mock).mockResolvedValue({});

          const secondResult = await submissionService.submitSpecification({
            sessionId,
            contactInfo: validContactInfo,
            specification,
          });

          // If specification is complete, second attempt should succeed
          // If specification is incomplete, should fail with different error
          if (!secondResult.success) {
            // Should not fail due to contact info anymore
            const hasContactError = secondResult.validationErrors?.some(
              (error) =>
                error.toLowerCase().includes('name') ||
                error.toLowerCase().includes('email') ||
                error.toLowerCase().includes('phone')
            );
            expect(hasContactError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('database errors should not corrupt specification data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 20 }),
        arbitrarySpecification,
        async (sessionId, name, email, phone, originalSpecification) => {
          // Simulate database error
          (mockDynamoClient.send as jest.Mock).mockRejectedValue(
            new Error('Database connection failed')
          );

          // Store original values for comparison
          const originalId = originalSpecification.id;
          const originalVersion = originalSpecification.version;
          const originalOverview = originalSpecification.plainEnglishSummary.overview;
          const originalIntroduction = originalSpecification.formalPRD.introduction;

          const contactInfo: ContactInfo = {
            name,
            email,
            phone,
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification: originalSpecification,
          });

          // Should fail gracefully
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();

          // Specification key fields should remain unchanged
          expect(originalSpecification.id).toBe(originalId);
          expect(originalSpecification.version).toBe(originalVersion);
          expect(originalSpecification.plainEnglishSummary.overview).toBe(originalOverview);
          expect(originalSpecification.formalPRD.introduction).toBe(originalIntroduction);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple retry attempts should be allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 20 }),
        arbitrarySpecification,
        fc.integer({ min: 2, max: 5 }),
        async (sessionId, name, email, phone, specification, retryCount) => {
          const contactInfo: ContactInfo = {
            name,
            email,
            phone,
          };

          // Simulate multiple retry attempts
          const results = [];
          for (let i = 0; i < retryCount; i++) {
            // Alternate between success and failure
            if (i % 2 === 0) {
              (mockDynamoClient.send as jest.Mock).mockRejectedValue(
                new Error('Temporary error')
              );
            } else {
              (mockDynamoClient.send as jest.Mock).mockResolvedValue({});
            }

            const result = await submissionService.submitSpecification({
              sessionId,
              contactInfo,
              specification,
            });

            results.push(result);
          }

          // All attempts should return a result
          expect(results.length).toBe(retryCount);

          // Each result should have success flag
          results.forEach((result) => {
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('failed submission should not generate reference number', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitrarySpecification,
        async (sessionId, specification) => {
          // Invalid contact info
          const invalidContactInfo: ContactInfo = {
            name: '',
            email: 'invalid-email',
            phone: '',
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo: invalidContactInfo,
            specification,
          });

          // If submission fails, should not have a submission object
          if (!result.success) {
            expect(result.submission).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
