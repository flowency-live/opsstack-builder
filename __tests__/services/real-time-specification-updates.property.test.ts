/**
 * Property Test: Real-time Specification Updates
 * **Feature: spec-wizard, Property 6: Real-time specification updates**
 * **Validates: Requirements 3.1**
 * 
 * For any user message that contains extractable information, the specification 
 * should be updated and the update should be reflected in the preview within 
 * the same request-response cycle.
 */

import * as fc from 'fast-check';
import { SpecificationGenerator, ExtractedInformation } from '../../lib/services/specification-generator';
import { arbitrarySpecification, arbitraryMessage } from '../utils/factories';
import type { Specification, Message } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 6: Real-time specification updates**', () => {
  let specificationGenerator: SpecificationGenerator;

  beforeAll(() => {
    specificationGenerator = new SpecificationGenerator();
  });

  test('specification is updated when extractable information is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(arbitrarySpecification, { nil: undefined }),
        fc.record({
          topic: fc.constantFrom(
            'overview',
            'features',
            'users',
            'integrations',
            'data',
            'workflows'
          ),
          data: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 100 }),
              fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })
            )
          ),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (currentSpec, extractedInfo, conversationHistory) => {
          // Get initial version
          const initialVersion = currentSpec?.version || 0;

          // Update specification
          const updatedSpec = await specificationGenerator.updateSpecification(
            currentSpec,
            extractedInfo as ExtractedInformation,
            conversationHistory
          );

          // Verify specification was updated
          expect(updatedSpec).toBeDefined();
          expect(updatedSpec.version).toBeGreaterThan(initialVersion);
          expect(updatedSpec.lastUpdated).toBeInstanceOf(Date);

          // Verify the update happened in the same cycle (synchronously)
          // The specification should have the new version immediately
          expect(updatedSpec.version).toBe(initialVersion + 1);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('specification updates reflect extracted information in plain English summary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(arbitrarySpecification, { nil: undefined }),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (currentSpec, featureDescription, conversationHistory) => {
          // Create extracted information about a feature
          const extractedInfo: ExtractedInformation = {
            topic: 'features',
            data: {
              feature: featureDescription,
            },
            confidence: 0.9,
          };

          // Update specification
          const updatedSpec = await specificationGenerator.updateSpecification(
            currentSpec,
            extractedInfo,
            conversationHistory
          );

          // Verify the feature was added to plain English summary
          expect(updatedSpec.plainEnglishSummary.keyFeatures).toContain(featureDescription);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('specification updates reflect extracted information in formal PRD', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(arbitrarySpecification, { nil: undefined }),
        fc.string({ minLength: 20, maxLength: 200 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (currentSpec, overviewText, conversationHistory) => {
          // Create extracted information about overview
          const extractedInfo: ExtractedInformation = {
            topic: 'overview',
            data: {
              description: overviewText,
            },
            confidence: 0.9,
          };

          // Update specification
          const updatedSpec = await specificationGenerator.updateSpecification(
            currentSpec,
            extractedInfo,
            conversationHistory
          );

          // Verify the overview was updated in plain English summary
          expect(updatedSpec.plainEnglishSummary.overview).toBe(overviewText);

          // Verify the introduction was updated in formal PRD
          expect(updatedSpec.formalPRD.introduction).toContain(overviewText);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('multiple updates increment version monotonically', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            topic: fc.constantFrom('overview', 'features', 'users', 'integrations'),
            data: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.string({ minLength: 1, maxLength: 100 })
            ),
            confidence: fc.float({ min: 0, max: 1 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (extractedInfoList, conversationHistory) => {
          let currentSpec: Specification | undefined = undefined;
          let previousVersion = 0;

          // Apply multiple updates
          for (const extractedInfo of extractedInfoList) {
            currentSpec = await specificationGenerator.updateSpecification(
              currentSpec,
              extractedInfo as ExtractedInformation,
              conversationHistory
            );

            // Verify version increments
            expect(currentSpec.version).toBeGreaterThan(previousVersion);
            expect(currentSpec.version).toBe(previousVersion + 1);

            previousVersion = currentSpec.version;
          }

          // Final version should equal number of updates
          expect(currentSpec!.version).toBe(extractedInfoList.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('updates preserve existing specification data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySpecification,
        fc.record({
          topic: fc.constantFrom('integrations'),
          data: fc.record({
            integration: fc.string({ minLength: 5, maxLength: 50 }),
          }),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (currentSpec, extractedInfo, conversationHistory) => {
          // Store original data
          const originalOverview = currentSpec.plainEnglishSummary.overview;
          const originalFeatures = [...currentSpec.plainEnglishSummary.keyFeatures];
          const originalUsers = currentSpec.plainEnglishSummary.targetUsers;

          // Update with integration info (should not affect other fields)
          const updatedSpec = await specificationGenerator.updateSpecification(
            currentSpec,
            extractedInfo as ExtractedInformation,
            conversationHistory
          );

          // Verify original data is preserved
          expect(updatedSpec.plainEnglishSummary.overview).toBe(originalOverview);
          expect(updatedSpec.plainEnglishSummary.targetUsers).toBe(originalUsers);

          // Original features should still be present
          originalFeatures.forEach((feature) => {
            expect(updatedSpec.plainEnglishSummary.keyFeatures).toContain(feature);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
