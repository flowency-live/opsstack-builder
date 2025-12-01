/**
 * Session State API Route
 * Handles saving session state from client
 * 
 * Requirements: 6.1, 13.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';
import type { SessionState } from '@/lib/models/types';

/**
 * PUT /api/sessions/[id]/state
 * Save session state to database
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const state: SessionState = await request.json();

    // Validate session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Save state to database (aggressive persistence)
    await sessionManager.saveSessionState(sessionId, state);

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save session state:', error);
    return NextResponse.json(
      { error: 'Failed to save session state' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[id]/state
 * Retrieve current session state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      state: session.state,
      lastAccessedAt: session.lastAccessedAt,
    });
  } catch (error) {
    console.error('Failed to retrieve session state:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session state' },
      { status: 500 }
    );
  }
}
