/**
 * Property Test: Project Type Adaptation
 * **Feature: spec-wizard, Property 24: Project type adaptation**
 * **Validates: Requirements 10.1, 10.3**
 * 
 * For any two different project types (e.g., "booking system" vs "static website"), 
 * the system should adapt the required topics and terminology appropriately for each type.
 */

import * as fc from 'fast-check';
import { ProgressTracker } from '../../lib/services/progress-tracker';
import { Specification } from '../../lib/models/types';
import { createSpecification } from '../utils/factories';

describe('**Feature: spec-wizard, Property 24: Project type adaptation**', () => {
  let progressTracker: ProgressTracker;

  beforeAll(() => {
    progressTracker = new ProgressTracker();
  });

  test('different project types have different topic lists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.constantFrom('booking system', 'e-commerce store', 'CRM platform', 'mobile app', 'website'),
          fc.constantFrom('booking system', 'e-commerce store', 'CRM platform', 'mobile app', 'website')
        ).filter(([type1, type2]) => type1 !== type2),
        async ([projectType1, projectType2]) => {
          // Create specifications for two different project types
          const spec1: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${projectType1} for businesses`,
              keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
              targetUsers: 'Business users',
              integrations: [],
            },
          });

          const spec2: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${projectType2} for businesses`,
              keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3'],
              targetUsers: 'Business users',
              integrations: [],
            },
          });

          // Get progress for both
          const progress1 = await progressTracker.updateProgress(spec1);
          const progress2 = await progressTracker.updateProgress(spec2);

          // Extract project-type-specific topic IDs (excluding core topics)
          const coreTopicIds = ['overview', 'users', 'features', 'integrations', 'data', 'workflows', 'security', 'performance', 'scalability'];
          
          const typeSpecificTopics1 = progress1.topics
            .filter((t) => !coreTopicIds.includes(t.id))
            .map((t) => t.id)
            .sort();

          const typeSpecificTopics2 = progress2.topics
            .filter((t) => !coreTopicIds.includes(t.id))
            .map((t) => t.id)
            .sort();

          // Different project types should have different type-specific topics
          expect(typeSpecificTopics1).not.toEqual(typeSpecificTopics2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('booking systems have calendar and notification topics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('booking', 'appointment', 'reservation', 'schedule'),
        fc.integer({ min: 1, max: 10 }),
        async (keyword, featureCount) => {
          // Create a booking system specification
          const features = Array.from({ length: featureCount }, (_, i) => `Feature ${i + 1}`);
          
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} management system`,
              keyFeatures: features,
              targetUsers: 'Business users',
              integrations: [],
            },
          });

          // Get progress
          const progress = await progressTracker.updateProgress(specification);

          // Should have booking-specific topics
          const topicIds = progress.topics.map((t) => t.id);
          
          // At least one booking-specific topic should be present
          const hasBookingTopics = 
            topicIds.includes('calendar') ||
            topicIds.includes('notifications') ||
            topicIds.includes('payments');

          expect(hasBookingTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('e-commerce projects have product and cart topics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('shop', 'store', 'e-commerce', 'ecommerce'),
        fc.integer({ min: 1, max: 10 }),
        async (keyword, featureCount) => {
          // Create an e-commerce specification
          const features = Array.from({ length: featureCount }, (_, i) => `Feature ${i + 1}`);
          
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `An online ${keyword} platform`,
              keyFeatures: features,
              targetUsers: 'Shoppers',
              integrations: [],
            },
          });

          // Get progress
          const progress = await progressTracker.updateProgress(specification);

          // Should have e-commerce-specific topics
          const topicIds = progress.topics.map((t) => t.id);
          
          // At least one e-commerce-specific topic should be present
          const hasEcommerceTopics = 
            topicIds.includes('products') ||
            topicIds.includes('cart') ||
            topicIds.includes('payments') ||
            topicIds.includes('shipping');

          expect(hasEcommerceTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('mobile apps have platform-specific topics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('mobile app', 'iOS app', 'Android app', 'smartphone application'),
        fc.integer({ min: 1, max: 10 }),
        async (keyword, featureCount) => {
          // Create a mobile app specification
          const features = Array.from({ length: featureCount }, (_, i) => `Feature ${i + 1}`);
          
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} for users`,
              keyFeatures: features,
              targetUsers: 'Mobile users',
              integrations: [],
            },
          });

          // Get progress
          const progress = await progressTracker.updateProgress(specification);

          // Should have mobile-specific topics
          const topicIds = progress.topics.map((t) => t.id);
          
          // At least one mobile-specific topic should be present
          const hasMobileTopics = 
            topicIds.includes('platforms') ||
            topicIds.includes('offline') ||
            topicIds.includes('push-notifications');

          expect(hasMobileTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('websites have SEO and content topics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('website', 'landing page', 'marketing site', 'blog'),
        fc.integer({ min: 1, max: 10 }),
        async (keyword, featureCount) => {
          // Create a website specification
          const features = Array.from({ length: featureCount }, (_, i) => `Feature ${i + 1}`);
          
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} for our company`,
              keyFeatures: features,
              targetUsers: 'Visitors',
              integrations: [],
            },
          });

          // Get progress
          const progress = await progressTracker.updateProgress(specification);

          // Should have website-specific topics
          const topicIds = progress.topics.map((t) => t.id);
          
          // At least one website-specific topic should be present
          const hasWebsiteTopics = 
            topicIds.includes('seo') ||
            topicIds.includes('content');

          expect(hasWebsiteTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('topic adaptation is consistent across complexity levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('booking system', 'e-commerce store', 'mobile app'),
        fc.constantFrom('Simple', 'Medium', 'Complex'),
        async (projectType, complexity) => {
          // Create specifications with different complexities
          let featureCount: number;
          let nfrCount: number;

          if (complexity === 'Simple') {
            featureCount = 2;
            nfrCount = 0;
          } else if (complexity === 'Medium') {
            featureCount = 5;
            nfrCount = 2;
          } else {
            featureCount = 10;
            nfrCount = 5;
          }

          const features = Array.from({ length: featureCount }, (_, i) => `Feature ${i + 1}`);
          const nfrs = Array.from({ length: nfrCount }, (_, i) => ({
            id: `nfr-${i + 1}`,
            category: 'Performance',
            description: `NFR ${i + 1}`,
          }));

          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${projectType} for businesses`,
              keyFeatures: features,
              targetUsers: 'Business users',
              integrations: [],
            },
            formalPRD: {
              introduction: 'Test PRD',
              glossary: {},
              requirements: features.map((f, i) => ({
                id: `req-${i + 1}`,
                userStory: f,
                acceptanceCriteria: ['Criterion 1'],
                priority: 'must-have' as const,
              })),
              nonFunctionalRequirements: nfrs,
            },
          });

          // Get progress
          const progress = await progressTracker.updateProgress(specification);

          // Verify complexity is as expected
          expect(progress.projectComplexity).toBe(complexity);

          // Project-type-specific topics should still be present regardless of complexity
          const topicIds = progress.topics.map((t) => t.id);
          const coreTopicIds = ['overview', 'users', 'features', 'integrations', 'data', 'workflows', 'security', 'performance', 'scalability'];
          const hasTypeSpecificTopics = topicIds.some((id) => !coreTopicIds.includes(id));

          expect(hasTypeSpecificTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('core topics are always present regardless of project type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('booking system', 'e-commerce store', 'CRM platform', 'mobile app', 'website', 'API service'),
        async (projectType) => {
          // Create specification
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${projectType} for businesses`,
              keyFeatures: ['Feature 1', 'Feature 2'],
              targetUsers: 'Business users',
              integrations: [],
            },
          });

          // Get progress
          const progress = await progressTracker.updateProgress(specification);

          // Core topics should always be present
          const topicIds = progress.topics.map((t) => t.id);
          
          expect(topicIds).toContain('overview');
          expect(topicIds).toContain('users');
          expect(topicIds).toContain('features');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('required topics vary by project type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.constantFrom('website', 'e-commerce store'),
          fc.constantFrom('website', 'e-commerce store')
        ).filter(([type1, type2]) => type1 !== type2),
        async ([projectType1, projectType2]) => {
          // Create specifications
          const spec1: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${projectType1}`,
              keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
              targetUsers: 'Users',
              integrations: [],
            },
          });

          const spec2: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${projectType2}`,
              keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
              targetUsers: 'Users',
              integrations: [],
            },
          });

          // Get progress
          const progress1 = await progressTracker.updateProgress(spec1);
          const progress2 = await progressTracker.updateProgress(spec2);

          // Count required topics for each
          const requiredCount1 = progress1.topics.filter((t) => t.required).length;
          const requiredCount2 = progress2.topics.filter((t) => t.required).length;

          // E-commerce should have more required topics than a simple website
          if (projectType1 === 'e-commerce store') {
            expect(requiredCount1).toBeGreaterThan(requiredCount2);
          } else {
            expect(requiredCount2).toBeGreaterThan(requiredCount1);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
