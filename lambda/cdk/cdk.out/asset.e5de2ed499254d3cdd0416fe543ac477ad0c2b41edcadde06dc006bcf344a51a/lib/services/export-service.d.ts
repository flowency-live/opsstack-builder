/**
 * ExportService
 * Handles PDF generation, magic links, presentation pages, and email delivery
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
import type { Specification } from '../models/types';
import { SessionManager } from './session-manager';
/**
 * PDF Document result
 */
export interface PDFDocument {
    url: string;
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
export declare class ExportService {
    private sessionManager;
    private bucketName;
    constructor(sessionManager?: SessionManager, bucketName?: string);
    /**
     * Generate a professionally formatted PDF from specification
     * Requirements: 7.1, 7.5
     */
    generatePDF(sessionId: string, specification: Specification): Promise<PDFDocument>;
    /**
     * Generate HTML content for PDF with branded template
     * Private helper method
     */
    private generatePDFHTML;
    /**
     * Generate a magic link for session sharing
     * Requirements: 7.2
     */
    generateMagicLink(sessionId: string): Promise<string>;
    /**
     * Generate a branded presentation page URL
     * Requirements: 7.3
     */
    generatePresentationPage(sessionId: string, specification: Specification): Promise<string>;
    /**
     * Send email with PDF attachment and magic link
     * Requirements: 7.4
     */
    sendEmail(options: EmailOptions): Promise<void>;
    /**
     * Get presentation data from S3
     * Helper method for retrieving presentation page data
     */
    getPresentationData(presentationId: string): Promise<{
        sessionId: string;
        specification: Specification;
        createdAt: string;
    } | null>;
}
export declare const exportService: ExportService;
//# sourceMappingURL=export-service.d.ts.map