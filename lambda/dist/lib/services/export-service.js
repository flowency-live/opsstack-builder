"use strict";
/**
 * ExportService
 * Handles PDF generation, magic links, presentation pages, and email delivery
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportService = exports.ExportService = void 0;
const uuid_1 = require("uuid");
const puppeteer_1 = __importDefault(require("puppeteer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const client_ses_1 = require("@aws-sdk/client-ses");
const aws_1 = require("../aws");
const session_manager_1 = require("./session-manager");
/**
 * ExportService handles document generation and sharing
 */
class ExportService {
    constructor(sessionManager, bucketName) {
        this.sessionManager = sessionManager || new session_manager_1.SessionManager();
        this.bucketName = bucketName || aws_1.bucketNames.exports;
    }
    /**
     * Generate a professionally formatted PDF from specification
     * Requirements: 7.1, 7.5
     */
    async generatePDF(sessionId, specification) {
        // Generate HTML content for PDF
        const htmlContent = this.generatePDFHTML(specification, sessionId);
        // Launch headless browser
        const browser = await puppeteer_1.default.launch({
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
            const { putObjectEncrypted } = await Promise.resolve().then(() => __importStar(require('../aws/s3')));
            await putObjectEncrypted(this.bucketName, fileName, Buffer.from(pdfBuffer), 'application/pdf');
            // Generate S3 URL
            const url = `https://${this.bucketName}.s3.amazonaws.com/${fileName}`;
            return {
                url,
                buffer: Buffer.from(pdfBuffer),
            };
        }
        catch (error) {
            await browser.close();
            throw error;
        }
    }
    /**
     * Generate HTML content for PDF with branded template
     * Private helper method
     */
    generatePDFHTML(specification, sessionId) {
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
    async generateMagicLink(sessionId) {
        const token = await this.sessionManager.generateMagicLink(sessionId);
        // In production, this would be the actual domain
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/restore/${token}`;
    }
    /**
     * Generate a branded presentation page URL
     * Requirements: 7.3
     */
    async generatePresentationPage(sessionId, specification) {
        // Generate a unique presentation ID
        const presentationId = (0, uuid_1.v4)();
        // Store presentation data in S3
        const presentationData = {
            sessionId,
            specification,
            createdAt: new Date().toISOString(),
        };
        const fileName = `presentations/${presentationId}.json`;
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
            Body: JSON.stringify(presentationData),
            ContentType: 'application/json',
            Metadata: {
                sessionId,
                presentationId,
            },
        });
        await aws_1.s3Client.send(uploadCommand);
        // Return presentation page URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/presentation/${presentationId}`;
    }
    /**
     * Send email with PDF attachment and magic link
     * Requirements: 7.4
     */
    async sendEmail(options) {
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
        const sendCommand = new client_ses_1.SendEmailCommand({
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
        await aws_1.sesClient.send(sendCommand);
    }
    /**
     * Get presentation data from S3
     * Helper method for retrieving presentation page data
     */
    async getPresentationData(presentationId) {
        try {
            const fileName = `presentations/${presentationId}.json`;
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
            });
            const response = await aws_1.s3Client.send(getCommand);
            if (!response.Body) {
                return null;
            }
            const bodyString = await response.Body.transformToString();
            return JSON.parse(bodyString);
        }
        catch (error) {
            console.error('Failed to get presentation data:', error);
            return null;
        }
    }
}
exports.ExportService = ExportService;
// Export singleton instance
exports.exportService = new ExportService();
//# sourceMappingURL=export-service.js.map