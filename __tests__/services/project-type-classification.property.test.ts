/**
 * Property Test: Project Type Classification
 * **Feature: spec-wizard, Property 25: Project type classification**
 * **Validates: Requirements 10.4**
 * 
 * For any project description containing keywords associated with common project types 
 * (website, booking system, CRM, mobile app, e-commerce), the system should correctly 
 * classify the project type.
 */

import * as fc from 'fast-check';
import { ProgressTracker } from '../../lib/services/progress-tracker';
import { Specification } from '../../lib/models/types';
import { createSpecification } from '../utils/factories';

describe('**Feature: spec-wizard, Property 25: Project type classification**', () => {
  let progressTracker: ProgressTracker;

  beforeAll(() => {
    progressTracker = new ProgressTracker();
  });

  test('correctly classifies booking system projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'booking',
          'appointment',
          'reservation',
          'schedule',
          'calendar booking'
        ),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (keyword, features) => {
          // Create specification with booking-related keywords
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A system for ${keyword} management`,
              keyFeatures: features,
              targetUsers: 'Business users',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Verify that booking-specific topics are included
          const hasBookingTopics = progress.topics.some(
            (topic) =>
              topic.id === 'calendar' ||
              topic.id === 'notifications' ||
              topic.id === 'payments'
          );

          expect(hasBookingTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('correctly classifies e-commerce projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'shop',
          'store',
          'product',
          'cart',
          'checkout',
          'e-commerce',
          'ecommerce'
        ),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (keyword, features) => {
          // Create specification with e-commerce keywords
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `An online ${keyword} platform`,
              keyFeatures: features,
              targetUsers: 'Shoppers',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Verify that e-commerce-specific topics are included
          const hasEcommerceTopics = progress.topics.some(
            (topic) =>
              topic.id === 'products' ||
              topic.id === 'cart' ||
              topic.id === 'payments' ||
              topic.id === 'shipping'
          );

          expect(hasEcommerceTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('correctly classifies CRM projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'crm',
          'customer relationship',
          'contact management',
          'lead tracking'
        ),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (keyword, features) => {
          // Create specification with CRM keywords
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} system`,
              keyFeatures: features,
              targetUsers: 'Sales teams',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Verify that CRM-specific topics are included
          const hasCRMTopics = progress.topics.some(
            (topic) =>
              topic.id === 'contacts' ||
              topic.id === 'reporting' ||
              topic.id === 'automation'
          );

          expect(hasCRMTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('correctly classifies mobile app projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('mobile app', 'ios', 'android', 'smartphone app'),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (keyword, features) => {
          // Create specification with mobile app keywords
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} for users`,
              keyFeatures: features,
              targetUsers: 'Mobile users',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Verify that mobile-specific topics are included
          const hasMobileTopics = progress.topics.some(
            (topic) =>
              topic.id === 'platforms' ||
              topic.id === 'offline' ||
              topic.id === 'push-notifications'
          );

          expect(hasMobileTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('correctly classifies website projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('website', 'landing page', 'marketing site', 'blog'),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (keyword, features) => {
          // Create specification with website keywords
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} for our company`,
              keyFeatures: features,
              targetUsers: 'Visitors',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Verify that website-specific topics are included
          const hasWebsiteTopics = progress.topics.some(
            (topic) => topic.id === 'seo' || topic.id === 'content'
          );

          expect(hasWebsiteTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('correctly classifies API projects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('REST API', 'GraphQL API', 'API service', 'API endpoint'),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (keyword, features) => {
          // Create specification with API keywords
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: `A ${keyword} for developers`,
              keyFeatures: features,
              targetUsers: 'Developers',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Verify that API-specific topics are included
          const hasAPITopics = progress.topics.some(
            (topic) =>
              topic.id === 'endpoints' ||
              topic.id === 'authentication' ||
              topic.id === 'rate-limiting'
          );

          expect(hasAPITopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('classification is consistent for the same keywords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'booking system',
          'e-commerce store',
          'crm platform',
          'mobile app',
          'website'
        ),
        async (projectDescription) => {
          // Create two specifications with the same description
          const spec1: Specification = createSpecification({
            plainEnglishSummary: {
              overview: projectDescription,
              keyFeatures: ['Feature 1'],
              targetUsers: 'Users',
              integrations: [],
            },
          });

          const spec2: Specification = createSpecification({
            plainEnglishSummary: {
              overview: projectDescription,
              keyFeatures: ['Feature 2'],
              targetUsers: 'Users',
              integrations: [],
            },
          });

          // Get progress for both
          const progress1 = await progressTracker.updateProgress(spec1);
          const progress2 = await progressTracker.updateProgress(spec2);

          // Extract project-type-specific topic IDs
          const typeSpecificTopics1 = progress1.topics
            .filter(
              (t) =>
                !['overview', 'users', 'features', 'integrations', 'data', 'workflows'].includes(
                  t.id
                )
            )
            .map((t) => t.id)
            .sort();

          const typeSpecificTopics2 = progress2.topics
            .filter(
              (t) =>
                !['overview', 'users', 'features', 'integrations', 'data', 'workflows'].includes(
                  t.id
                )
            )
            .map((t) => t.id)
            .sort();

          // Should have the same project-type-specific topics
          expect(typeSpecificTopics1).toEqual(typeSpecificTopics2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('classification works with keywords in features as well as overview', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('booking system', 'online shop', 'CRM', 'mobile app', 'REST API'),
        async (keyword) => {
          // Create specification with keyword only in features
          const specification: Specification = createSpecification({
            plainEnglishSummary: {
              overview: 'A business platform',
              keyFeatures: [`${keyword} functionality`, 'User management'],
              targetUsers: 'Business users',
              integrations: [],
            },
          });

          // Update progress to trigger project type classification
          const progress = await progressTracker.updateProgress(specification);

          // Should have more than just core topics
          const hasProjectSpecificTopics = progress.topics.some(
            (topic) =>
              !['overview', 'users', 'features', 'integrations'].includes(topic.id)
          );

          expect(hasProjectSpecificTopics).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
