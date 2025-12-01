/**
 * Email Export API Route
 * Sends specification PDF and magic link via email
 * 
 * Requirements: 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportService } from '@/lib/services/export-service';
import { sessionManager } from '@/lib/services/session-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, recipient } = body;

    if (!sessionId || !recipient) {
      return NextResponse.json(
        { error: 'Session ID and recipient email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
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

    // Generate magic link
    const magicLink = await exportService.generateMagicLink(sessionId);

    // Send email
    await exportService.sendEmail({
      recipient,
      specification: session.state.specification,
      magicLink,
      pdfUrl: pdfDocument.url,
      sessionId,
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
