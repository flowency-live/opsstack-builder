/**
 * GET /api/sessions/[id] - Retrieve session by ID
 * Requirements: 6.2, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Get session from database
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Return session data
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        lastAccessedAt: session.lastAccessedAt.toISOString(),
        state: {
          conversationHistory: session.state.conversationHistory.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          })),
          specification: {
            ...session.state.specification,
            lastUpdated: session.state.specification.lastUpdated.toISOString(),
          },
          progress: session.state.progress,
          userInfo: session.state.userInfo,
        },
      },
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve session',
      },
      { status: 500 }
    );
  }
}
