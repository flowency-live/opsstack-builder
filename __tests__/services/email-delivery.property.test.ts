/**
 * Property Test: Email Delivery
 * **Feature: spec-wizard, Property 16: Email delivery**
 * **Validates: Requirements 7.4**
 * 
 * For any valid email address and specification, the email service should 
 * successfully send a message containing the PDF attachment and magic link.
 */

import * as fc from 'fast-check';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import type { Specification } from '../../lib/models/types';
import { arbitrarySpecification } from '../utils/factories';

// Mock AWS services
jest.mock('../../lib/aws', () => ({
  s3Client: {
    send: jest.fn(),
  },
  sesClient: {
    send: jest.fn(),
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

// Import after mocks
import { ExportService } from '../../lib/services/export-service';
import { SessionManager } from '../../lib/services/session-manager';
import { sesClient, s3Client } from '../../lib/aws';

describe('Property 16: Email Delivery', () => {
  let exportService: ExportService;
  let sessionManager: SessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (sesClient.send as jest.Mock).mockResolvedValue({});
    (s3Client.send as jest.Mock).mockResolvedValue({});
    sessionManager = new SessionManager('test-table');
    exportService = new ExportService(sessionManager, 'test-bucket');
  });

  test('**Feature: spec-wizard, Property 16: Email delivery**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        arbitrarySpecification,
        fc.uuid(), // sessionId - use UUID format like real sessions
        fc.webUrl(), // magicLink
        fc.webUrl(), // pdfUrl
        async (
          recipient: string,
          specification: Specification,
          sessionId: string,
          magicLink: string,
          pdfUrl: string
        ) => {
          // Clear mocks before each property test run
          jest.clearAllMocks();
          (sesClient.send as jest.Mock).mockResolvedValue({});
          (s3Client.send as jest.Mock).mockResolvedValue({});

          // Send email
          await exportService.sendEmail({
            recipient,
            specification,
            magicLink,
            pdfUrl,
            sessionId,
          });

          // Verify SES send was called
          expect(sesClient.send).toHaveBeenCalledTimes(1);

          // Get the command that was sent
          const sendCommand = (sesClient.send as jest.Mock).mock.calls[0][0];
          expect(sendCommand).toBeInstanceOf(SendEmailCommand);

          // Verify email structure
          const emailInput = sendCommand.input;
          
          // Verify recipient
          expect(emailInput.Destination.ToAddresses).toContain(recipient);

          // Verify sender
          expect(emailInput.Source).toBeDefined();

          // Verify subject
          expect(emailInput.Message.Subject.Data).toBeDefined();
          expect(emailInput.Message.Subject.Data.length).toBeGreaterThan(0);

          // Verify HTML body
          expect(emailInput.Message.Body.Html).toBeDefined();
          const htmlBody = emailInput.Message.Body.Html.Data;
          
          // HTML body should contain magic link
          expect(htmlBody).toContain(magicLink);
          
          // HTML body should contain PDF URL
          expect(htmlBody).toContain(pdfUrl);
          
          // HTML body should contain session ID
          expect(htmlBody).toContain(sessionId);

          // Verify text body
          expect(emailInput.Message.Body.Text).toBeDefined();
          const textBody = emailInput.Message.Body.Text.Data;
          
          // Text body should also contain magic link and PDF URL
          expect(textBody).toContain(magicLink);
          expect(textBody).toContain(pdfUrl);
          expect(textBody).toContain(sessionId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Email contains all required elements', async () => {
    const recipient = 'test@example.com';
    const sessionId = 'session-123';
    const magicLink = 'https://example.com/restore/token-123';
    const pdfUrl = 'https://example.com/pdf/spec.pdf';
    const specification: Specification = {
      id: 'spec-123',
      version: 1,
      plainEnglishSummary: {
        overview: 'Test spec',
        keyFeatures: ['Feature 1'],
        targetUsers: 'Users',
        integrations: [],
      },
      formalPRD: {
        introduction: 'Intro',
        glossary: {},
        requirements: [],
        nonFunctionalRequirements: [],
      },
      lastUpdated: new Date(),
    };

    await exportService.sendEmail({
      recipient,
      specification,
      magicLink,
      pdfUrl,
      sessionId,
    });

    expect(sesClient.send).toHaveBeenCalledTimes(1);
    const sendCommand = (sesClient.send as jest.Mock).mock.calls[0][0];
    const emailInput = sendCommand.input;

    // Check HTML body structure
    const htmlBody = emailInput.Message.Body.Html.Data;
    expect(htmlBody).toContain('<!DOCTYPE html>');
    expect(htmlBody).toContain('Your Specification is Ready!');
    expect(htmlBody).toContain('Download PDF');
    expect(htmlBody).toContain('Continue Editing');
    expect(htmlBody).toContain('FlowencyBuild');

    // Check text body structure
    const textBody = emailInput.Message.Body.Text.Data;
    expect(textBody).toContain('Your Specification is Ready!');
    expect(textBody).toContain('Download PDF:');
    expect(textBody).toContain('Continue Editing:');
  });

  test('Email handles special characters in recipient', async () => {
    const recipient = 'test+special@example.com';
    const sessionId = 'session-123';
    const magicLink = 'https://example.com/restore/token';
    const pdfUrl = 'https://example.com/pdf/spec.pdf';
    const specification: Specification = {
      id: 'spec-123',
      version: 1,
      plainEnglishSummary: {
        overview: 'Test',
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

    await exportService.sendEmail({
      recipient,
      specification,
      magicLink,
      pdfUrl,
      sessionId,
    });

    expect(sesClient.send).toHaveBeenCalledTimes(1);
    const sendCommand = (sesClient.send as jest.Mock).mock.calls[0][0];
    expect(sendCommand.input.Destination.ToAddresses).toContain(recipient);
  });

  test('Email includes UTF-8 charset', async () => {
    const recipient = 'test@example.com';
    const sessionId = 'session-123';
    const magicLink = 'https://example.com/restore/token';
    const pdfUrl = 'https://example.com/pdf/spec.pdf';
    const specification: Specification = {
      id: 'spec-123',
      version: 1,
      plainEnglishSummary: {
        overview: 'Test with émojis 🎉',
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

    await exportService.sendEmail({
      recipient,
      specification,
      magicLink,
      pdfUrl,
      sessionId,
    });

    expect(sesClient.send).toHaveBeenCalledTimes(1);
    const sendCommand = (sesClient.send as jest.Mock).mock.calls[0][0];
    const emailInput = sendCommand.input;

    // Verify UTF-8 charset
    expect(emailInput.Message.Subject.Charset).toBe('UTF-8');
    expect(emailInput.Message.Body.Html.Charset).toBe('UTF-8');
    expect(emailInput.Message.Body.Text.Charset).toBe('UTF-8');
  });
});
