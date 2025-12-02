/**
 * ExportService
 * Handles PDF generation, magic links, presentation pages, and email delivery
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { s3Client, sesClient, bucketNames } from '../aws';
import type { Specification } from '../models/types';
import { SessionManager } from './session-manager';

/**
 * PDF Document result
 */
export interface PDFDocument {
  url: string; // S3 URL
  buffer?: Buffer;
}

/**
 * Email options
 */
export interface EmailOptions {
  recipient: string;
  specification: Specification;
  magicLink: string;
  pdfUrl: string;
  sessionId: string;
}

/**
 * ExportService handles document generation and sharing
 */
export class ExportService {
  private sessionManager: SessionManager;
  private bucketName: string;

  constructor(sessionManager?: SessionManager, bucketName?: string) {
    this.sessionManager = sessionManager || new SessionManager();
    this.bucketName = bucketName || bucketNames.exports;
  }

  /**
   * Generate a professionally formatted PDF from specification
   * Requirements: 7.1, 7.5
   */
  async generatePDF(
    sessionId: string,
    specification: Specification
  ): Promise<PDFDocument> {
    // Generate HTML content for PDF
    const htmlContent = this.generatePDFHTML(specification, sessionId);

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Set content and wait for any dynamic content to load
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      await browser.close();

      // Upload to S3 with encryption
      const fileName = `specifications/${sessionId}/spec-v${specification.version}-${Date.now()}.pdf`;
      const { putObjectEncrypted } = await import('../aws/s3');

      await putObjectEncrypted(
        this.bucketName,
        fileName,
        Buffer.from(pdfBuffer),
        'application/pdf'
      );

      // Generate S3 URL
      const url = `https://${this.bucketName}.s3.amazonaws.com/${fileName}`;

      return {
        url,
        buffer: Buffer.from(pdfBuffer),
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * Generate HTML content for PDF with branded template
   * Private helper method
   */
  private generatePDFHTML(
    specification: Specification,
    sessionId: string
  ): string {
    const { plainEnglishSummary, formalPRD, version, lastUpdated } = specification;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Specification - ${sessionId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header .metadata {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .content {
      padding: 0 30px 30px;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      color: #667eea;
      font-size: 24px;
      margin-bottom: 15px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 5px;
    }
    
    .section h3 {
      color: #764ba2;
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    .section p {
      margin-bottom: 10px;
      text-align: justify;
    }
    
    .feature-list, .requirement-list {
      list-style: none;
      padding-left: 0;
    }
    
    .feature-list li, .requirement-list li {
      padding: 8px 0 8px 25px;
      position: relative;
    }
    
    .feature-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }
    
    .requirement-list li {
      margin-bottom: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
    }
    
    .glossary-term {
      margin-bottom: 10px;
    }
    
    .glossary-term strong {
      color: #667eea;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    .priority-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    
    .priority-must-have {
      background: #ffeaa7;
      color: #d63031;
    }
    
    .priority-nice-to-have {
      background: #dfe6e9;
      color: #636e72;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Product Specification Document</h1>
    <div class="metadata">
      <p>Session ID: ${sessionId}</p>
      <p>Version: ${version}</p>
      <p>Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
      <p>Last Updated: ${lastUpdated.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>
  </div>

  <div class="content">
    <!-- Executive Summary -->
    <div class="section">
      <h2>Executive Summary</h2>
      <p>${plainEnglishSummary.overview || 'No overview provided yet.'}</p>
      
      ${plainEnglishSummary.estimatedComplexity ? `
      <p><strong>Estimated Complexity:</strong> ${plainEnglishSummary.estimatedComplexity}</p>
      ` : ''}
      
      ${plainEnglishSummary.targetUsers ? `
      <p><strong>Target Users:</strong> ${plainEnglishSummary.targetUsers}</p>
      ` : ''}
    </div>

    <!-- Key Features -->
    ${plainEnglishSummary.keyFeatures.length > 0 ? `
    <div class="section">
      <h2>Key Features</h2>
      <ul class="feature-list">
        ${plainEnglishSummary.keyFeatures.map(feature => `
          <li>${feature}</li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Integrations -->
    ${plainEnglishSummary.integrations.length > 0 ? `
    <div class="section">
      <h2>Integrations</h2>
      <ul class="feature-list">
        ${plainEnglishSummary.integrations.map(integration => `
          <li>${integration}</li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Formal PRD -->
    <div class="section">
      <h2>Product Requirements Document</h2>
      
      ${formalPRD.introduction ? `
      <h3>Introduction</h3>
      <p>${formalPRD.introduction}</p>
      ` : ''}
      
      ${Object.keys(formalPRD.glossary).length > 0 ? `
      <h3>Glossary</h3>
      ${Object.entries(formalPRD.glossary).map(([term, definition]) => `
        <div class="glossary-term">
          <strong>${term}:</strong> ${definition}
        </div>
      `).join('')}
      ` : ''}
    </div>

    <!-- Requirements -->
    ${formalPRD.requirements.length > 0 ? `
    <div class="section">
      <h2>Functional Requirements</h2>
      <ul class="requirement-list">
        ${formalPRD.requirements.map(req => `
          <li>
            <strong>${req.id}</strong>
            <span class="priority-badge priority-${req.priority}">${req.priority.toUpperCase()}</span>
            <p><em>${req.userStory}</em></p>
            <p><strong>Acceptance Criteria:</strong></p>
            <ul>
              ${req.acceptanceCriteria.map(criteria => `
                <li>${criteria}</li>
              `).join('')}
            </ul>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Non-Functional Requirements -->
    ${formalPRD.nonFunctionalRequirements.length > 0 ? `
    <div class="section">
      <h2>Non-Functional Requirements</h2>
      <ul class="requirement-list">
        ${formalPRD.nonFunctionalRequirements.map(nfr => `
          <li>
            <strong>${nfr.id} - ${nfr.category}</strong>
            <p>${nfr.description}</p>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by Specification Wizard - FlowencyBuild</p>
      <p>This document is confidential and intended for the recipient only.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate a magic link for session sharing
   * Requirements: 7.2
   */
  async generateMagicLink(sessionId: string): Promise<string> {
    const token = await this.sessionManager.generateMagicLink(sessionId);
    
    // In production, this would be the actual domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/restore/${token}`;
  }

  /**
   * Generate a branded presentation page URL
   * Requirements: 7.3
   */
  async generatePresentationPage(
    sessionId: string,
    specification: Specification
  ): Promise<string> {
    // Generate a unique presentation ID
    const presentationId = uuidv4();
    
    // Store presentation data in S3
    const presentationData = {
      sessionId,
      specification,
      createdAt: new Date().toISOString(),
    };

    const fileName = `presentations/${presentationId}.json`;
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: JSON.stringify(presentationData),
      ContentType: 'application/json',
      Metadata: {
        sessionId,
        presentationId,
      },
    });

    await s3Client.send(uploadCommand);

    // Return presentation page URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/presentation/${presentationId}`;
  }

  /**
   * Send email with PDF attachment and magic link
   * Requirements: 7.4
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const { recipient, specification, magicLink, pdfUrl, sessionId } = options;

    // Email configuration
    const senderEmail = process.env.SES_SENDER_EMAIL || 'noreply@flowency.build';
    const subject = 'Your Product Specification Document';

    // Email body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 5px 5px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 5px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Specification is Ready!</h1>
    </div>
    <div class="content">
      <p>Thank you for using the Specification Wizard.</p>
      
      <p>Your product specification document has been generated and is ready for review.</p>
      
      <p><strong>What's included:</strong></p>
      <ul>
        <li>Executive Summary</li>
        <li>Key Features Overview</li>
        <li>Detailed Requirements Document</li>
        <li>Technical Specifications</li>
      </ul>
      
      <p><strong>Next Steps:</strong></p>
      <p>
        <a href="${pdfUrl}" class="button">Download PDF</a>
        <a href="${magicLink}" class="button">Continue Editing</a>
      </p>
      
      <p>You can continue editing your specification by clicking the "Continue Editing" button above. 
      This link will work on any device and will restore your complete session.</p>
      
      <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p>Specification Wizard by FlowencyBuild</p>
      <p>Session ID: ${sessionId}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
Your Specification is Ready!

Thank you for using the Specification Wizard.

Your product specification document has been generated and is ready for review.

Download PDF: ${pdfUrl}
Continue Editing: ${magicLink}

You can continue editing your specification by visiting the link above. This link will work on any device and will restore your complete session.

If you have any questions or need assistance, please don't hesitate to contact us.

---
Specification Wizard by FlowencyBuild
Session ID: ${sessionId}
    `.trim();

    // Send email via SES
    const sendCommand = new SendEmailCommand({
      Source: senderEmail,
      Destination: {
        ToAddresses: [recipient],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(sendCommand);
  }

  /**
   * Get presentation data from S3
   * Helper method for retrieving presentation page data
   */
  async getPresentationData(presentationId: string): Promise<{
    sessionId: string;
    specification: Specification;
    createdAt: string;
  } | null> {
    try {
      const fileName = `presentations/${presentationId}.json`;
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      const response = await s3Client.send(getCommand);
      
      if (!response.Body) {
        return null;
      }

      const bodyString = await response.Body.transformToString();
      return JSON.parse(bodyString);
    } catch (error) {
      console.error('Failed to get presentation data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const exportService = new ExportService();
