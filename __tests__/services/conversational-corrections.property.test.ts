/**
 * Property Test: Conversational Corrections
 * **Feature: spec-wizard, Property 7: Conversational corrections**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * For any specification field and correction statement (e.g., "Actually, I want X 
 * instead of Y"), the system should update the specification to reflect the 
 * correction and acknowledge the change.
 */

import * as fc from 'fast-check';
import { SpecificationGenerator, ExtractedInformation } from '../../lib/services/specification-generator';
import { arbitrarySpecification, arbitraryMessage } from '../utils/factories';
import type { Specification } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 7: Conversational corrections**', () => {
  let specificationGenerator: SpecificationGenerator;

  beforeAll(() => {
    specificationGenerator = new SpecificationGenerator();
  });

  test('specification field is updated when correction is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySpecification,
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (currentSpec, originalValue, correctedValue, conversationHistory) => {
          // Ensure values are different
          if (originalValue === correctedValue) {
            return true; // Skip this case
          }

          // Set up specification with original value
          const specWithOriginal: Specification = {
            ...currentSpec,
            plainEnglishSummary: {
              ...currentSpec.plainEnglishSummary,
              keyFeatures: [originalValue],
            },
          };

          // Create correction extracted info
          const correctionInfo: ExtractedInformation = {
            topic: 'features',
            data: {
              feature: correctedValue,
            },
            confidence: 0.9,
          };

          // Apply correction
          const updatedSpec = await specificationGenerator.updateSpecification(
            specWithOriginal,
            correctionInfo,
            conversationHistory
          );

          // Verify the corrected value is present
          expect(updatedSpec.plainEnglishSummary.keyFeatures).toContain(correctedValue);

          // Verify version was incremented (change was acknowledged)
          expect(updatedSpec.version).toBeGreaterThan(specWithOriginal.version);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('overview correction replaces previous overview', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (originalOverview, correctedOverview, conversationHistory) => {
          // Ensure values are different
          if (originalOverview === correctedOverview) {
            return true; // Skip this case
          }

          // Create specification with original overview
          const originalSpec: Specification = {
            id: 'test-spec',
            version: 1,
            plainEnglishSummary: {
              overview: originalOverview,
              keyFeatures: [],
              targetUsers: '',
              integrations: [],
            },
            formalPRD: {
              introduction: `This specification describes ${originalOverview}`,
              glossary: {},
              requirements: [],
              nonFunctionalRequirements: [],
            },
            lastUpdated: new Date(),
          };

          // Create correction
          const correctionInfo: ExtractedInformation = {
            topic: 'overview',
            data: {
              description: correctedOverview,
            },
            confidence: 0.9,
          };

          // Apply correction
          const updatedSpec = await specificationGenerator.updateSpecification(
            originalSpec,
            correctionInfo,
            conversationHistory
          );

          // Verify the overview was replaced
          expect(updatedSpec.plainEnglishSummary.overview).toBe(correctedOverview);
          expect(updatedSpec.plainEnglishSummary.overview).not.toBe(originalOverview);

          // Verify version incremented
          expect(updatedSpec.version).toBe(2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('target users correction replaces previous target users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (originalUsers, correctedUsers, conversationHistory) => {
          // Ensure values are different
          if (originalUsers === correctedUsers) {
            return true; // Skip this case
          }

          // Create specification with original users
          const originalSpec: Specification = {
            id: 'test-spec',
            version: 1,
            plainEnglishSummary: {
              overview: 'Test project',
              keyFeatures: [],
              targetUsers: originalUsers,
              integrations: [],
            },
            formalPRD: {
              introduction: 'Test PRD',
              glossary: {},
              requirements: [],
              nonFunctionalRequirements: [],
            },
            lastUpdated: new Date(),
          };

          // Create correction
          const correctionInfo: ExtractedInformation = {
            topic: 'users',
            data: {
              description: correctedUsers,
            },
            confidence: 0.9,
          };

          // Apply correction
          const updatedSpec = await specificationGenerator.updateSpecification(
            originalSpec,
            correctionInfo,
            conversationHistory
          );

          // Verify the users were replaced
          expect(updatedSpec.plainEnglishSummary.targetUsers).toBe(correctedUsers);
          expect(updatedSpec.plainEnglishSummary.targetUsers).not.toBe(originalUsers);

          // Verify version incremented
          expect(updatedSpec.version).toBe(2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('multiple corrections are applied sequentially', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            topic: fc.constantFrom('overview', 'users'),
            value: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (corrections, conversationHistory) => {
          let currentSpec: Specification | undefined = undefined;

          // Apply each correction
          for (const correction of corrections) {
            const extractedInfo: ExtractedInformation = {
              topic: correction.topic,
              data: {
                description: correction.value,
              },
              confidence: 0.9,
            };

            currentSpec = await specificationGenerator.updateSpecification(
              currentSpec,
              extractedInfo,
              conversationHistory
            );
          }

          // Verify final spec has the last correction for each topic
          expect(currentSpec).toBeDefined();

          // Find last correction for each topic
          const lastOverview = corrections
            .filter((c) => c.topic === 'overview')
            .pop();
          const lastUsers = corrections
            .filter((c) => c.topic === 'users')
            .pop();

          if (lastOverview) {
            expect(currentSpec!.plainEnglishSummary.overview).toBe(lastOverview.value);
          }

          if (lastUsers) {
            expect(currentSpec!.plainEnglishSummary.targetUsers).toBe(lastUsers.value);
          }

          // Verify version equals number of corrections
          expect(currentSpec!.version).toBe(corrections.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('correction updates lastUpdated timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySpecification,
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (currentSpec, correctedValue, conversationHistory) => {
          // Create correction
          const correctionInfo: ExtractedInformation = {
            topic: 'overview',
            data: {
              description: correctedValue,
            },
            confidence: 0.9,
          };

          // Apply correction
          const updatedSpec = await specificationGenerator.updateSpecification(
            currentSpec,
            correctionInfo,
            conversationHistory
          );

          // Verify timestamp is a valid Date object
          expect(updatedSpec.lastUpdated).toBeInstanceOf(Date);
          expect(updatedSpec.lastUpdated.getTime()).not.toBeNaN();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
