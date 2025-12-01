/**
 * Property Test: Business-to-Technical Translation
 * **Feature: spec-wizard, Property 27: Business-to-technical translation**
 * **Validates: Requirements 11.2**
 * 
 * For any business goal expressed by the user, the formal PRD should contain 
 * corresponding technical requirements that implement that goal.
 */

import * as fc from 'fast-check';
import { SpecificationGenerator } from '../../lib/services/specification-generator';
import type { Message } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 27: Business-to-technical translation**', () => {
  let specificationGenerator: SpecificationGenerator;

  beforeAll(() => {
    specificationGenerator = new SpecificationGenerator();
  });

  test('business features are translated to technical requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 10, maxLength: 100 }), {
          minLength: 1,
          maxLength: 5,
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
        async (businessFeatures, conversationHistory) => {
          // Create user intent with business features
          const userIntent = {
            features: businessFeatures,
          };

          // Generate formal PRD
          const formalPRD = await specificationGenerator.generateFormalPRD(
            userIntent,
            conversationHistory
          );

          // Verify requirements were generated
          expect(formalPRD.requirements.length).toBeGreaterThan(0);

          // Each business feature should result in at least one requirement
          expect(formalPRD.requirements.length).toBeGreaterThanOrEqual(businessFeatures.length);

          // Each requirement should have technical acceptance criteria
          formalPRD.requirements.forEach((req) => {
            expect(req.acceptanceCriteria).toBeDefined();
            expect(req.acceptanceCriteria.length).toBeGreaterThan(0);

            // Acceptance criteria should contain technical language (SHALL)
            req.acceptanceCriteria.forEach((ac) => {
              expect(ac).toContain('SHALL');
            });
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('common business goals are translated to appropriate technical actions', async () => {
    const businessGoalMappings = [
      { business: 'login', technical: ['authenticate', 'session'] },
      { business: 'search', technical: ['query', 'database', 'results'] },
      { business: 'save', technical: ['persist', 'database', 'store'] },
      { business: 'send email', technical: ['deliver', 'email', 'service'] },
      { business: 'payment', technical: ['process', 'payment', 'gateway'] },
      { business: 'upload', technical: ['accept', 'store', 'file', 'storage'] },
      { business: 'download', technical: ['retrieve', 'deliver', 'file'] },
    ];

    for (const mapping of businessGoalMappings) {
      const userIntent = {
        features: [mapping.business],
      };

      const conversationHistory: Message[] = [
        {
          id: '1',
          role: 'user',
          content: `I want users to be able to ${mapping.business}`,
          timestamp: new Date(),
        },
      ];

      const formalPRD = await specificationGenerator.generateFormalPRD(
        userIntent,
        conversationHistory
      );

      // Verify at least one requirement was generated
      expect(formalPRD.requirements.length).toBeGreaterThan(0);

      // Check that the technical translation contains expected terms
      const allRequirementText = formalPRD.requirements
        .map((req) => `${req.userStory} ${req.acceptanceCriteria.join(' ')}`)
        .join(' ')
        .toLowerCase();

      // At least one of the technical terms should be present
      const hasExpectedTerm = mapping.technical.some((term) =>
        allRequirementText.includes(term.toLowerCase())
      );

      expect(hasExpectedTerm).toBe(true);
    }
  });

  test('business workflows are translated to technical requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 15, maxLength: 100 }), {
          minLength: 1,
          maxLength: 3,
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
        async (workflows, conversationHistory) => {
          // Create user intent with workflows
          const userIntent = {
            workflows,
          };

          // Generate formal PRD
          const formalPRD = await specificationGenerator.generateFormalPRD(
            userIntent,
            conversationHistory
          );

          // Verify requirements were generated for workflows
          expect(formalPRD.requirements.length).toBeGreaterThan(0);

          // Each requirement should have EARS-formatted acceptance criteria
          formalPRD.requirements.forEach((req) => {
            expect(req.acceptanceCriteria.length).toBeGreaterThan(0);

            req.acceptanceCriteria.forEach((ac) => {
              // Should follow EARS pattern with SHALL
              expect(ac).toContain('SHALL');

              // Should have a trigger (WHEN/IF/WHILE/WHERE) or be ubiquitous (THE)
              const hasEARSPattern =
                ac.includes('WHEN') ||
                ac.includes('IF') ||
                ac.includes('WHILE') ||
                ac.includes('WHERE') ||
                ac.includes('THE');

              expect(hasEARSPattern).toBe(true);
            });
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('business goals in conversation are extracted and translated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (businessGoal) => {
          // Create conversation with business goal
          const conversationHistory: Message[] = [
            {
              id: '1',
              role: 'user',
              content: `I need my users to be able to ${businessGoal}`,
              timestamp: new Date(),
            },
            {
              id: '2',
              role: 'assistant',
              content: 'I understand. Tell me more about that.',
              timestamp: new Date(),
            },
          ];

          const userIntent = {
            features: [businessGoal],
          };

          // Generate formal PRD
          const formalPRD = await specificationGenerator.generateFormalPRD(
            userIntent,
            conversationHistory
          );

          // Verify requirements were generated
          expect(formalPRD.requirements.length).toBeGreaterThan(0);

          // Requirements should reference the business goal
          const allRequirementText = formalPRD.requirements
            .map((req) => req.userStory.toLowerCase())
            .join(' ');

          // The business goal should be mentioned in at least one user story
          expect(allRequirementText).toContain(businessGoal.toLowerCase());

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('technical requirements maintain traceability to business goals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 10, maxLength: 100 }), {
          minLength: 1,
          maxLength: 5,
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
        async (businessFeatures, conversationHistory) => {
          const userIntent = {
            features: businessFeatures,
          };

          const formalPRD = await specificationGenerator.generateFormalPRD(
            userIntent,
            conversationHistory
          );

          // Each requirement should have a user story that traces back to business value
          formalPRD.requirements.forEach((req) => {
            // User story should follow the pattern "As a..., I want..., so that..."
            expect(req.userStory).toContain('As a');
            expect(req.userStory).toContain('I want');

            // User story should be non-empty and meaningful
            expect(req.userStory.length).toBeGreaterThan(20);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('non-functional business requirements are translated to technical NFRs', async () => {
    const nfrMappings = [
      { business: 'fast', technical: ['performance', 'respond', 'seconds'] },
      { business: 'secure', technical: ['security', 'encrypt', 'data'] },
      { business: 'scalable', technical: ['scalability', 'concurrent', 'users'] },
    ];

    for (const mapping of nfrMappings) {
      const conversationHistory: Message[] = [
        {
          id: '1',
          role: 'user',
          content: `The system needs to be ${mapping.business}`,
          timestamp: new Date(),
        },
      ];

      const userIntent = {};

      const formalPRD = await specificationGenerator.generateFormalPRD(
        userIntent,
        conversationHistory
      );

      // Should generate at least one NFR
      expect(formalPRD.nonFunctionalRequirements.length).toBeGreaterThan(0);

      // Check that the NFR contains expected technical terms
      const allNFRText = formalPRD.nonFunctionalRequirements
        .map((nfr) => `${nfr.category} ${nfr.description}`)
        .join(' ')
        .toLowerCase();

      // At least one of the technical terms should be present
      const hasExpectedTerm = mapping.technical.some((term) =>
        allNFRText.includes(term.toLowerCase())
      );

      expect(hasExpectedTerm).toBe(true);
    }
  });
});
