/**
 * GET /api/sessions/restore/[token] - Restore session from magic link
 * Requirements: 6.3, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required',
        },
        { status: 400 }
      );
    }

    // Restore session from magic link token
    const session = await sessionManager.restoreSessionFromMagicLink(token);

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
    console.error('Error restoring session:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to restore session';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 404 }
    );
  }
}
