/**
 * Property Test: PDF Completeness
 * **Feature: spec-wizard, Property 14: PDF completeness**
 * **Validates: Requirements 7.1, 7.5**
 * 
 * For any specification, the generated PDF should contain all sections present 
 * in the formal PRD plus an executive summary and metadata (creation date, version, session ID).
 */

import * as fc from 'fast-check';
import { ExportService } from '../../lib/services/export-service';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitrarySpecification } from '../utils/factories';
import type { Specification } from '../../lib/models/types';

// Mock AWS services
jest.mock('../../lib/aws', () => ({
  s3Client: {
    send: jest.fn().mockResolvedValue({}),
  },
  sesClient: {
    send: jest.fn().mockResolvedValue({}),
  },
  bucketNames: {
    exports: 'test-bucket',
  },
  tableNames: {
    sessions: 'test-table',
  },
}));

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('Property 14: PDF Completeness', () => {
  let exportService: ExportService;
  let sessionManager: SessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionManager = new SessionManager('test-table');
    exportService = new ExportService(sessionManager, 'test-bucket');
  });

  test('**Feature: spec-wizard, Property 14: PDF completeness**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySpecification,
        fc.string({ minLength: 10, maxLength: 36 }), // sessionId
        async (specification: Specification, sessionId: string) => {
          // Generate PDF
          const pdfResult = await exportService.generatePDF(sessionId, specification);

          // Verify PDF was generated
          expect(pdfResult).toBeDefined();
          expect(pdfResult.url).toBeDefined();
          expect(pdfResult.buffer).toBeDefined();

          // Get the HTML content that was used to generate the PDF
          // We need to access the private method for testing
          const htmlContent = (exportService as any).generatePDFHTML(
            specification,
            sessionId
          );

          // Verify metadata is present
          expect(htmlContent).toContain(sessionId);
          expect(htmlContent).toContain(`Version: ${specification.version}`);
          expect(htmlContent).toContain('Generated:');
          expect(htmlContent).toContain('Last Updated:');

          // Verify executive summary section
          expect(htmlContent).toContain('Executive Summary');
          if (specification.plainEnglishSummary.overview) {
            expect(htmlContent).toContain(specification.plainEnglishSummary.overview);
          }

          // Verify key features if present
          if (specification.plainEnglishSummary.keyFeatures.length > 0) {
            expect(htmlContent).toContain('Key Features');
            specification.plainEnglishSummary.keyFeatures.forEach((feature) => {
              expect(htmlContent).toContain(feature);
            });
          }

          // Verify integrations if present
          if (specification.plainEnglishSummary.integrations.length > 0) {
            expect(htmlContent).toContain('Integrations');
            specification.plainEnglishSummary.integrations.forEach((integration) => {
              expect(htmlContent).toContain(integration);
            });
          }

          // Verify formal PRD sections
          expect(htmlContent).toContain('Product Requirements Document');

          if (specification.formalPRD.introduction) {
            expect(htmlContent).toContain(specification.formalPRD.introduction);
          }

          // Verify glossary if present
          if (Object.keys(specification.formalPRD.glossary).length > 0) {
            expect(htmlContent).toContain('Glossary');
            Object.entries(specification.formalPRD.glossary).forEach(([term, definition]) => {
              expect(htmlContent).toContain(term);
              expect(htmlContent).toContain(definition);
            });
          }

          // Verify functional requirements if present
          if (specification.formalPRD.requirements.length > 0) {
            expect(htmlContent).toContain('Functional Requirements');
            specification.formalPRD.requirements.forEach((req) => {
              expect(htmlContent).toContain(req.id);
              expect(htmlContent).toContain(req.userStory);
              req.acceptanceCriteria.forEach((criteria) => {
                expect(htmlContent).toContain(criteria);
              });
            });
          }

          // Verify non-functional requirements if present
          if (specification.formalPRD.nonFunctionalRequirements.length > 0) {
            expect(htmlContent).toContain('Non-Functional Requirements');
            specification.formalPRD.nonFunctionalRequirements.forEach((nfr) => {
              expect(htmlContent).toContain(nfr.id);
              expect(htmlContent).toContain(nfr.category);
              expect(htmlContent).toContain(nfr.description);
            });
          }

          // Verify footer/branding
          expect(htmlContent).toContain('FlowencyBuild');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('PDF contains all required metadata fields', async () => {
    const specification: Specification = {
      id: 'test-spec-123',
      version: 5,
      plainEnglishSummary: {
        overview: 'Test overview',
        keyFeatures: ['Feature 1', 'Feature 2'],
        targetUsers: 'Test users',
        integrations: ['Integration 1'],
        estimatedComplexity: 'Medium',
      },
      formalPRD: {
        introduction: 'Test introduction',
        glossary: { Term1: 'Definition 1' },
        requirements: [
          {
            id: 'REQ-1',
            userStory: 'As a user, I want to test',
            acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
            priority: 'must-have',
          },
        ],
        nonFunctionalRequirements: [
          {
            id: 'NFR-1',
            category: 'Performance',
            description: 'System should be fast',
          },
        ],
      },
      lastUpdated: new Date('2024-01-15'),
    };

    const sessionId = 'session-abc-123';
    const htmlContent = (exportService as any).generatePDFHTML(specification, sessionId);

    // Check all required metadata
    expect(htmlContent).toContain(sessionId);
    expect(htmlContent).toContain('Version: 5');
    expect(htmlContent).toContain('Generated:');
    expect(htmlContent).toContain('Last Updated:');

    // Check all sections are present
    expect(htmlContent).toContain('Executive Summary');
    expect(htmlContent).toContain('Key Features');
    expect(htmlContent).toContain('Integrations');
    expect(htmlContent).toContain('Product Requirements Document');
    expect(htmlContent).toContain('Glossary');
    expect(htmlContent).toContain('Functional Requirements');
    expect(htmlContent).toContain('Non-Functional Requirements');
  });

  test('PDF handles empty specification gracefully', async () => {
    const emptySpecification: Specification = {
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

    const sessionId = 'session-empty';
    const htmlContent = (exportService as any).generatePDFHTML(
      emptySpecification,
      sessionId
    );

    // Should still contain metadata
    expect(htmlContent).toContain(sessionId);
    expect(htmlContent).toContain('Version: 1');

    // Should contain section headers even if empty
    expect(htmlContent).toContain('Executive Summary');
    expect(htmlContent).toContain('Product Requirements Document');

    // Should handle empty content gracefully
    expect(htmlContent).toContain('No overview provided yet');
  });
});
