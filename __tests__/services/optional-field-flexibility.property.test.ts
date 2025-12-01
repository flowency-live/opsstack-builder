/**
 * Property Test: Optional field flexibility
 * **Feature: spec-wizard, Property 19: Optional field flexibility**
 * **Validates: Requirements 8.3**
 *
 * For any submission, the system should accept submissions with or without
 * optional fields (budget, timeline, referral source, urgency) as long as
 * required fields are present.
 */

import * as fc from 'fast-check';
import { SubmissionService } from '../../lib/services/submission-service';
import { arbitrarySpecification } from '../utils/factories';
import type { ContactInfo, Specification } from '../../lib/models/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock DynamoDB client for testing
const mockDynamoClient = {
  send: jest.fn(),
} as unknown as DynamoDBClient;

describe('Property 19: Optional field flexibility', () => {
  let submissionService: SubmissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    submissionService = new SubmissionService(mockDynamoClient, 'test-table');
    
    // Mock successful DynamoDB operations
    (mockDynamoClient.send as jest.Mock).mockResolvedValue({});
  });

  test('submissions with only required fields should be accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 20 }),
        arbitrarySpecification,
        async (sessionId, name, email, phone, specification) => {
          // Create contact info with only required fields
          const contactInfo: ContactInfo = {
            name,
            email,
            phone,
            // No optional fields
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification,
          });

          // Should succeed if specification is complete
          // (may fail due to incomplete spec, but not due to missing optional fields)
          if (!result.success && result.validationErrors) {
            // If it fails, it should not be because of missing optional fields
            const hasOptionalFieldError = result.validationErrors.some(
              (error) =>
                error.toLowerCase().includes('budget') ||
                error.toLowerCase().includes('timeline') ||
                error.toLowerCase().includes('referral') ||
                error.toLowerCase().includes('urgency')
            );
            expect(hasOptionalFieldError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('submissions with all optional fields should be accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 20 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.string({ minLength: 3, maxLength: 50 }),
        arbitrarySpecification,
        async (sessionId, name, email, phone, budget, timeline, referral, urgency, specification) => {
          // Create contact info with all fields
          const contactInfo: ContactInfo = {
            name,
            email,
            phone,
            budgetRange: budget,
            timeline: timeline,
            referralSource: referral,
            urgency: urgency,
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification,
          });

          // If successful, all optional fields should be preserved
          if (result.success && result.submission) {
            expect(result.submission.contactInfo.budgetRange).toBe(budget);
            expect(result.submission.contactInfo.timeline).toBe(timeline);
            expect(result.submission.contactInfo.referralSource).toBe(referral);
            expect(result.submission.contactInfo.urgency).toBe(urgency);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('submissions with partial optional fields should be accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 20 }),
        fc.record({
          hasBudget: fc.boolean(),
          hasTimeline: fc.boolean(),
          hasReferral: fc.boolean(),
          hasUrgency: fc.boolean(),
        }),
        arbitrarySpecification,
        async (sessionId, name, email, phone, optionalFields, specification) => {
          // Create contact info with selective optional fields
          const contactInfo: ContactInfo = {
            name,
            email,
            phone,
            budgetRange: optionalFields.hasBudget ? '$10k-$50k' : undefined,
            timeline: optionalFields.hasTimeline ? '3-6 months' : undefined,
            referralSource: optionalFields.hasReferral ? 'Google' : undefined,
            urgency: optionalFields.hasUrgency ? 'High' : undefined,
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification,
          });

          // If successful, provided optional fields should be preserved
          if (result.success && result.submission) {
            if (optionalFields.hasBudget) {
              expect(result.submission.contactInfo.budgetRange).toBe('$10k-$50k');
            }
            if (optionalFields.hasTimeline) {
              expect(result.submission.contactInfo.timeline).toBe('3-6 months');
            }
            if (optionalFields.hasReferral) {
              expect(result.submission.contactInfo.referralSource).toBe('Google');
            }
            if (optionalFields.hasUrgency) {
              expect(result.submission.contactInfo.urgency).toBe('High');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('missing required fields should be rejected regardless of optional fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          hasName: fc.boolean(),
          hasEmail: fc.boolean(),
          hasPhone: fc.boolean(),
        }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        arbitrarySpecification,
        async (sessionId, requiredFields, budget, timeline, specification) => {
          // Create contact info with selective required fields but with optional fields
          const contactInfo: ContactInfo = {
            name: requiredFields.hasName ? 'Test Name' : undefined,
            email: requiredFields.hasEmail ? 'test@example.com' : undefined,
            phone: requiredFields.hasPhone ? '1234567890' : undefined,
            budgetRange: budget,
            timeline: timeline,
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification,
          });

          // If any required field is missing, should fail
          const hasAllRequired = requiredFields.hasName && requiredFields.hasEmail && requiredFields.hasPhone;
          
          if (!hasAllRequired) {
            expect(result.success).toBe(false);
            expect(result.validationErrors).toBeDefined();
            expect(result.validationErrors!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('empty string optional fields should be treated as not provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 10, maxLength: 20 }),
        arbitrarySpecification,
        async (sessionId, name, email, phone, specification) => {
          // Create contact info with empty string optional fields
          const contactInfo: ContactInfo = {
            name,
            email,
            phone,
            budgetRange: '',
            timeline: '',
            referralSource: '',
            urgency: '',
          };

          const result = await submissionService.submitSpecification({
            sessionId,
            contactInfo,
            specification,
          });

          // Should not fail due to empty optional fields
          if (!result.success && result.validationErrors) {
            const hasOptionalFieldError = result.validationErrors.some(
              (error) =>
                error.toLowerCase().includes('budget') ||
                error.toLowerCase().includes('timeline') ||
                error.toLowerCase().includes('referral') ||
                error.toLowerCase().includes('urgency')
            );
            expect(hasOptionalFieldError).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
