/**
 * Property Test: Core Topics Coverage
 * **Feature: spec-wizard, Property 5: Core topics coverage**
 * **Validates: Requirements 5.1, 11.5**
 * 
 * For any completed specification, all core PRD topics (overview, users, features, 
 * integrations, data, workflows, non-functional requirements) should be addressed 
 * in the final document.
 */

import * as fc from 'fast-check';
import { SpecificationGenerator } from '../../lib/services/specification-generator';
import { arbitrarySpecification } from '../utils/factories';
import type { Specification, FormalPRD, PlainEnglishSummary } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 5: Core topics coverage**', () => {
  let specificationGenerator: SpecificationGenerator;

  beforeAll(() => {
    specificationGenerator = new SpecificationGenerator();
  });

  test('validateCompleteness identifies missing core topics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasOverview: fc.boolean(),
          hasUsers: fc.boolean(),
          hasFeatures: fc.boolean(),
          hasIntegrations: fc.boolean(),
          hasData: fc.boolean(),
          hasWorkflows: fc.boolean(),
          hasNFRs: fc.boolean(),
        }),
        async (coverage) => {
          // Create specification with selective coverage
          const spec: Specification = {
            id: 'test-spec',
            version: 1,
            plainEnglishSummary: {
              overview: coverage.hasOverview ? 'Test overview' : '',
              keyFeatures: coverage.hasFeatures ? ['Feature 1'] : [],
              targetUsers: coverage.hasUsers ? 'Test users' : '',
              integrations: coverage.hasIntegrations ? ['Integration 1'] : [],
            },
            formalPRD: {
              introduction: 'Test introduction',
              glossary: {},
              requirements: [
                ...(coverage.hasData
                  ? [
                      {
                        id: 'req-1',
                        userStory: 'As a user, I want to store data',
                        acceptanceCriteria: ['WHEN data is provided THEN THE System SHALL store the data'],
                        priority: 'must-have' as const,
                      },
                    ]
                  : []),
                ...(coverage.hasWorkflows
                  ? [
                      {
                        id: 'req-2',
                        userStory: 'As a user, I want to complete a workflow',
                        acceptanceCriteria: ['WHEN workflow is initiated THEN THE System SHALL process the workflow'],
                        priority: 'must-have' as const,
                      },
                    ]
                  : []),
              ],
              nonFunctionalRequirements: coverage.hasNFRs
                ? [
                    {
                      id: 'nfr-1',
                      category: 'Performance',
                      description: 'THE System SHALL respond within 2 seconds',
                    },
                  ]
                : [],
            },
            lastUpdated: new Date(),
          };

          // Validate completeness
          const validation = specificationGenerator.validateCompleteness(spec);

          // Check that missing topics are identified
          if (!coverage.hasOverview) {
            expect(validation.missingTopics).toContain('overview');
          }

          if (!coverage.hasUsers) {
            expect(validation.missingTopics).toContain('users');
          }

          if (!coverage.hasFeatures) {
            expect(validation.missingTopics).toContain('features');
          }

          if (!coverage.hasIntegrations) {
            expect(validation.missingTopics).toContain('integrations');
          }

          if (!coverage.hasData) {
            expect(validation.missingTopics).toContain('data');
          }

          if (!coverage.hasWorkflows) {
            expect(validation.missingTopics).toContain('workflows');
          }

          if (!coverage.hasNFRs) {
            expect(validation.missingTopics).toContain('non-functional requirements');
          }

          // If all topics are covered, should be complete
          const allCovered =
            coverage.hasOverview &&
            coverage.hasUsers &&
            coverage.hasFeatures &&
            coverage.hasIntegrations &&
            coverage.hasData &&
            coverage.hasWorkflows &&
            coverage.hasNFRs;

          if (allCovered) {
            expect(validation.missingTopics).toHaveLength(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('complete specification with all topics passes validation', async () => {
    // Create a complete specification
    const completeSpec: Specification = {
      id: 'complete-spec',
      version: 1,
      plainEnglishSummary: {
        overview: 'A comprehensive software system',
        keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
        targetUsers: 'Business users and administrators',
        integrations: ['Payment Gateway', 'Email Service'],
      },
      formalPRD: {
        introduction: 'This specification describes a comprehensive software system',
        glossary: {
          System: 'The software being specified',
        },
        requirements: [
          {
            id: 'req-1',
            userStory: 'As a user, I want to manage data',
            acceptanceCriteria: ['WHEN data is provided THEN THE System SHALL store the data'],
            priority: 'must-have',
          },
          {
            id: 'req-2',
            userStory: 'As a user, I want to complete workflows',
            acceptanceCriteria: ['WHEN workflow is initiated THEN THE System SHALL process the workflow'],
            priority: 'must-have',
          },
        ],
        nonFunctionalRequirements: [
          {
            id: 'nfr-1',
            category: 'Performance',
            description: 'THE System SHALL respond within 2 seconds',
          },
        ],
      },
      lastUpdated: new Date(),
    };

    const validation = specificationGenerator.validateCompleteness(completeSpec);

    // Should have no missing topics
    expect(validation.missingTopics).toHaveLength(0);
  });

  test('specification with no content fails validation for all topics', async () => {
    const emptySpec: Specification = {
      id: 'empty-spec',
      version: 1,
      plainEnglishSummary: {
        overview: '',
        keyFeatures: [],
        targetUsers: '',
        integrations: [],
      },
      formalPRD: {
        introduction: '',
        glossary: {},
        requirements: [],
        nonFunctionalRequirements: [],
      },
      lastUpdated: new Date(),
    };

    const validation = specificationGenerator.validateCompleteness(emptySpec);

    // Should identify all core topics as missing
    expect(validation.missingTopics.length).toBeGreaterThan(0);
    expect(validation.missingTopics).toContain('overview');
    expect(validation.missingTopics).toContain('users');
    expect(validation.missingTopics).toContain('features');
  });

  test('generateFormalPRD creates document with all core sections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          overview: fc.string({ minLength: 20, maxLength: 200 }),
          features: fc.array(fc.string({ minLength: 5, maxLength: 50 }), {
            minLength: 1,
            maxLength: 5,
          }),
          users: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            content: fc.string({ minLength: 10, maxLength: 200 }),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (userIntent, conversationHistory) => {
          // Generate formal PRD
          const formalPRD = await specificationGenerator.generateFormalPRD(
            userIntent,
            conversationHistory
          );

          // Verify all core sections exist
          expect(formalPRD.introduction).toBeDefined();
          expect(typeof formalPRD.introduction).toBe('string');

          expect(formalPRD.glossary).toBeDefined();
          expect(typeof formalPRD.glossary).toBe('object');

          expect(formalPRD.requirements).toBeDefined();
          expect(Array.isArray(formalPRD.requirements)).toBe(true);

          expect(formalPRD.nonFunctionalRequirements).toBeDefined();
          expect(Array.isArray(formalPRD.nonFunctionalRequirements)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('generatePlainEnglishSummary creates summary with all core fields', async () => {
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
          // Generate plain English summary
          const summary = await specificationGenerator.generatePlainEnglishSummary(formalPRD);

          // Verify all core fields exist
          expect(summary.overview).toBeDefined();
          expect(typeof summary.overview).toBe('string');

          expect(summary.keyFeatures).toBeDefined();
          expect(Array.isArray(summary.keyFeatures)).toBe(true);

          expect(summary.targetUsers).toBeDefined();
          expect(typeof summary.targetUsers).toBe('string');

          expect(summary.integrations).toBeDefined();
          expect(Array.isArray(summary.integrations)).toBe(true);

          expect(summary.estimatedComplexity).toBeDefined();
          expect(['Simple', 'Medium', 'Complex']).toContain(summary.estimatedComplexity);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
