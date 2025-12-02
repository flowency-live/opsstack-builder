/**
 * Share Link API Route
 * Generates a shareable presentation page link
 * 
 * Requirements: 7.2, 7.3
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

    // Generate presentation page URL
    const presentationUrl = await exportService.generatePresentationPage(
      sessionId,
      session.state.specification
    );

    return NextResponse.json({
      shareLink: presentationUrl,
    });
  } catch (error) {
    console.error('Share link generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    );
  }
}
