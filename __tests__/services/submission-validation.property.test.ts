/**
 * Property Test: Submission validation
 * **Feature: spec-wizard, Property 17: Submission validation**
 * **Validates: Requirements 5.5, 8.1**
 *
 * For any specification marked as incomplete by the validation logic,
 * submission should be rejected with specific feedback about missing information.
 */

import * as fc from 'fast-check';
import { SpecificationGenerator, ValidationResult } from '../../lib/services/specification-generator';
import { arbitrarySpecification } from '../utils/factories';
import type { Specification } from '../../lib/models/types';

describe('Property 17: Submission validation', () => {
  const specGenerator = new SpecificationGenerator();

  test('incomplete specifications should be rejected with specific feedback', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        (spec: Specification) => {
          // Validate the specification
          const validationResult: ValidationResult = specGenerator.validateCompleteness(spec);

          // If the specification is incomplete, it should have specific feedback
          if (!validationResult.isComplete) {
            // Should have at least one type of feedback
            const hasFeedback =
              validationResult.missingTopics.length > 0 ||
              validationResult.ambiguousRequirements.length > 0 ||
              validationResult.conflictingRequirements.length > 0;

            expect(hasFeedback).toBe(true);

            // All feedback arrays should be defined
            expect(validationResult.missingTopics).toBeDefined();
            expect(validationResult.ambiguousRequirements).toBeDefined();
            expect(validationResult.conflictingRequirements).toBeDefined();

            // Feedback should be specific (not empty strings)
            validationResult.missingTopics.forEach((topic) => {
              expect(topic).toBeTruthy();
              expect(typeof topic).toBe('string');
              expect(topic.length).toBeGreaterThan(0);
            });

            validationResult.ambiguousRequirements.forEach((reqId) => {
              expect(reqId).toBeTruthy();
              expect(typeof reqId).toBe('string');
              expect(reqId.length).toBeGreaterThan(0);
            });

            validationResult.conflictingRequirements.forEach((conflict) => {
              expect(conflict.requirement1).toBeTruthy();
              expect(conflict.requirement2).toBeTruthy();
              expect(conflict.conflictDescription).toBeTruthy();
              expect(typeof conflict.conflictDescription).toBe('string');
              expect(conflict.conflictDescription.length).toBeGreaterThan(0);
            });
          }

          // If complete, should have no feedback
          if (validationResult.isComplete) {
            expect(validationResult.missingTopics.length).toBe(0);
            expect(validationResult.ambiguousRequirements.length).toBe(0);
            expect(validationResult.conflictingRequirements.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('specifications with missing required fields should be marked incomplete', () => {
    fc.assert(
      fc.property(
        fc.record({
          overview: fc.boolean(),
          features: fc.boolean(),
          users: fc.boolean(),
        }),
        (fields) => {
          // Create a specification with selectively missing fields
          const spec: Specification = {
            id: 'test-spec',
            version: 1,
            plainEnglishSummary: {
              overview: fields.overview ? 'Test overview' : '',
              keyFeatures: fields.features ? ['Feature 1'] : [],
              targetUsers: fields.users ? 'Test users' : '',
              integrations: [],
            },
            formalPRD: {
              introduction: 'Test introduction',
              glossary: {},
              requirements: [],
              nonFunctionalRequirements: [],
            },
            lastUpdated: new Date(),
          };

          const validationResult = specGenerator.validateCompleteness(spec);

          // If any required field is missing, should be incomplete
          const hasAllRequiredFields = fields.overview && fields.features && fields.users;
          
          if (!hasAllRequiredFields) {
            // Should have missing topics
            expect(validationResult.missingTopics.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('validation result structure should be consistent', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        (spec: Specification) => {
          const validationResult = specGenerator.validateCompleteness(spec);

          // Result should always have these properties
          expect(validationResult).toHaveProperty('isComplete');
          expect(validationResult).toHaveProperty('missingTopics');
          expect(validationResult).toHaveProperty('ambiguousRequirements');
          expect(validationResult).toHaveProperty('conflictingRequirements');

          // Properties should be of correct types
          expect(typeof validationResult.isComplete).toBe('boolean');
          expect(Array.isArray(validationResult.missingTopics)).toBe(true);
          expect(Array.isArray(validationResult.ambiguousRequirements)).toBe(true);
          expect(Array.isArray(validationResult.conflictingRequirements)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
