/**
 * Property Test: Dual Format Storage
 * **Feature: spec-wizard, Property 28: Dual format storage**
 * **Validates: Requirements 12.2**
 * 
 * For any stored specification, the database record should contain both the 
 * formal EARS-formatted PRD and the Plain English Summary.
 */

import * as fc from 'fast-check';
import { SpecificationGenerator, ExtractedInformation } from '../../lib/services/specification-generator';
import { arbitrarySpecification, arbitraryMessage } from '../utils/factories';
import type { Specification } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 28: Dual format storage**', () => {
  let specificationGenerator: SpecificationGenerator;

  beforeAll(() => {
    specificationGenerator = new SpecificationGenerator();
  });

  test('specification always contains both plainEnglishSummary and formalPRD', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(arbitrarySpecification, { nil: undefined }),
        fc.record({
          topic: fc.constantFrom('overview', 'features', 'users', 'integrations'),
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
          // Update specification
          const updatedSpec = await specificationGenerator.updateSpecification(
            currentSpec,
            extractedInfo as ExtractedInformation,
            conversationHistory
          );

          // Verify both formats exist
          expect(updatedSpec.plainEnglishSummary).toBeDefined();
          expect(updatedSpec.formalPRD).toBeDefined();

          // Verify plainEnglishSummary has all required fields
          expect(updatedSpec.plainEnglishSummary.overview).toBeDefined();
          expect(updatedSpec.plainEnglishSummary.keyFeatures).toBeDefined();
          expect(Array.isArray(updatedSpec.plainEnglishSummary.keyFeatures)).toBe(true);
          expect(updatedSpec.plainEnglishSummary.targetUsers).toBeDefined();
          expect(updatedSpec.plainEnglishSummary.integrations).toBeDefined();
          expect(Array.isArray(updatedSpec.plainEnglishSummary.integrations)).toBe(true);

          // Verify formalPRD has all required fields
          expect(updatedSpec.formalPRD.introduction).toBeDefined();
          expect(updatedSpec.formalPRD.glossary).toBeDefined();
          expect(typeof updatedSpec.formalPRD.glossary).toBe('object');
          expect(updatedSpec.formalPRD.requirements).toBeDefined();
          expect(Array.isArray(updatedSpec.formalPRD.requirements)).toBe(true);
          expect(updatedSpec.formalPRD.nonFunctionalRequirements).toBeDefined();
          expect(Array.isArray(updatedSpec.formalPRD.nonFunctionalRequirements)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('generatePlainEnglishSummary creates summary from formalPRD', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          introduction: fc.string({ minLength: 20, maxLength: 200 }),
          glossary: fc.dictionary(
            fc.string({ minLength: 3, maxLength: 30 }),
            fc.string({ minLength: 10, maxLength: 100 })
          ),
          requirements: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              userStory: fc.string({ minLength: 20, maxLength: 200 }),
              acceptanceCriteria: fc.array(fc.string({ minLength: 10, maxLength: 200 }), {
                minLength: 1,
                maxLength: 5,
              }),
              priority: fc.constantFrom('must-have' as const, 'nice-to-have' as const),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          nonFunctionalRequirements: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              category: fc.string({ minLength: 5, maxLength: 30 }),
              description: fc.string({ minLength: 10, maxLength: 200 }),
            }),
            { maxLength: 5 }
          ),
        }),
        async (formalPRD) => {
          // Generate plain English summary from formal PRD
          const summary = await specificationGenerator.generatePlainEnglishSummary(formalPRD);

          // Verify summary was generated with all fields
          expect(summary).toBeDefined();
          expect(summary.overview).toBeDefined();
          expect(typeof summary.overview).toBe('string');
          expect(summary.keyFeatures).toBeDefined();
          expect(Array.isArray(summary.keyFeatures)).toBe(true);
          expect(summary.targetUsers).toBeDefined();
          expect(typeof summary.targetUsers).toBe('string');
          expect(summary.integrations).toBeDefined();
          expect(Array.isArray(summary.integrations)).toBe(true);
          expect(summary.estimatedComplexity).toBeDefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('both formats contain consistent information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 10, maxLength: 100 }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (features, conversationHistory) => {
          // Create user intent with features
          const userIntent = {
            features,
          };

          // Generate formal PRD
          const formalPRD = await specificationGenerator.generateFormalPRD(
            userIntent,
            conversationHistory
          );

          // Generate plain English summary from the PRD
          const summary = await specificationGenerator.generatePlainEnglishSummary(formalPRD);

          // Verify consistency: number of key features should match or be less than requirements
          // (since summary might consolidate or limit features)
          expect(summary.keyFeatures.length).toBeLessThanOrEqual(formalPRD.requirements.length + 1);

          // If there are requirements, there should be key features
          if (formalPRD.requirements.length > 0) {
            expect(summary.keyFeatures.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('specification serialization preserves both formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySpecification,
        async (specification) => {
          // Serialize to JSON (simulating database storage)
          const serialized = JSON.stringify(specification);

          // Deserialize
          const deserialized = JSON.parse(serialized) as Specification;

          // Verify both formats are preserved
          expect(deserialized.plainEnglishSummary).toBeDefined();
          expect(deserialized.formalPRD).toBeDefined();

          // Verify structure is intact
          expect(deserialized.plainEnglishSummary.overview).toBe(
            specification.plainEnglishSummary.overview
          );
          expect(deserialized.plainEnglishSummary.keyFeatures).toEqual(
            specification.plainEnglishSummary.keyFeatures
          );
          expect(deserialized.plainEnglishSummary.targetUsers).toBe(
            specification.plainEnglishSummary.targetUsers
          );
          expect(deserialized.plainEnglishSummary.integrations).toEqual(
            specification.plainEnglishSummary.integrations
          );

          expect(deserialized.formalPRD.introduction).toBe(specification.formalPRD.introduction);
          expect(deserialized.formalPRD.glossary).toEqual(specification.formalPRD.glossary);
          expect(deserialized.formalPRD.requirements.length).toBe(
            specification.formalPRD.requirements.length
          );
          expect(deserialized.formalPRD.nonFunctionalRequirements.length).toBe(
            specification.formalPRD.nonFunctionalRequirements.length
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('updates to one format are reflected in the other', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 200 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (overviewText, conversationHistory) => {
          // Start with empty spec
          let spec: Specification | undefined = undefined;

          // Update with overview information
          const extractedInfo: ExtractedInformation = {
            topic: 'overview',
            data: {
              description: overviewText,
            },
            confidence: 0.9,
          };

          spec = await specificationGenerator.updateSpecification(
            spec,
            extractedInfo,
            conversationHistory
          );

          // Verify overview is in plain English summary
          expect(spec.plainEnglishSummary.overview).toBe(overviewText);

          // Verify overview is reflected in formal PRD introduction
          expect(spec.formalPRD.introduction).toContain(overviewText);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('both formats are always present even for minimal specifications', async () => {
    // Create minimal specification
    const minimalSpec: Specification | undefined = undefined;

    const extractedInfo: ExtractedInformation = {
      topic: 'overview',
      data: {
        description: 'A simple test system',
      },
      confidence: 0.9,
    };

    const conversationHistory = [
      {
        id: '1',
        role: 'user' as const,
        content: 'I want to build a simple system',
        timestamp: new Date(),
      },
    ];

    const updatedSpec = await specificationGenerator.updateSpecification(
      minimalSpec,
      extractedInfo,
      conversationHistory
    );

    // Verify both formats exist even for minimal spec
    expect(updatedSpec.plainEnglishSummary).toBeDefined();
    expect(updatedSpec.formalPRD).toBeDefined();

    // Verify they have the required structure
    expect(typeof updatedSpec.plainEnglishSummary.overview).toBe('string');
    expect(Array.isArray(updatedSpec.plainEnglishSummary.keyFeatures)).toBe(true);
    expect(typeof updatedSpec.plainEnglishSummary.targetUsers).toBe('string');
    expect(Array.isArray(updatedSpec.plainEnglishSummary.integrations)).toBe(true);

    expect(typeof updatedSpec.formalPRD.introduction).toBe('string');
    expect(typeof updatedSpec.formalPRD.glossary).toBe('object');
    expect(Array.isArray(updatedSpec.formalPRD.requirements)).toBe(true);
    expect(Array.isArray(updatedSpec.formalPRD.nonFunctionalRequirements)).toBe(true);
  });
});
