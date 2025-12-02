/**
 * PDF Export API Route
 * Generates and returns a PDF of the specification
 * 
 * Requirements: 7.1, 7.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportService } from '@/lib/services/export-service';
import { sessionManager } from '@/lib/services/session-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session and specification
    const session = await sessionManager.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.state.specification) {
      return NextResponse.json(
        { error: 'No specification found for this session' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfDocument = await exportService.generatePDF(
      sessionId,
      session.state.specification
    );

    // Return PDF buffer as response
    if (!pdfDocument.buffer) {
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      );
    }

    return new NextResponse(pdfDocument.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="specification-${sessionId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
