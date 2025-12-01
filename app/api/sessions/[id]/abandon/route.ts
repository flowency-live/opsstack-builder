/**
 * Abandon Session API Route
 * Marks a session as abandoned
 * 
 * Requirements: 16.4, 16.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

/**
 * POST /api/sessions/[id]/abandon
 * Mark session as abandoned (data is retained)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Validate session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Mark as abandoned (data is retained for potential future retrieval)
    await sessionManager.abandonSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session abandoned successfully',
    });
  } catch (error) {
    console.error('Failed to abandon session:', error);
    return NextResponse.json(
      { error: 'Failed to abandon session' },
      { status: 500 }
    );
  }
}
