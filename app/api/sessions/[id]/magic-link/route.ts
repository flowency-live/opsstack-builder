/**
 * Magic Link API Route
 * Generates magic links for session restoration
 * 
 * Requirements: 6.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

/**
 * POST /api/sessions/[id]/magic-link
 * Generate a magic link for session restoration
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

    // Generate magic link token
    const token = await sessionManager.generateMagicLink(sessionId);

    // Construct full URLs
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://my.flowency.build';

    // Secure token-based URL (expires in 30 days)
    const tokenUrl = `${baseUrl}/restore?token=${token}`;

    // Simple session ID-based URL (for easy collaboration)
    const sessionUrl = `${baseUrl}/chat?sessionId=${sessionId}`;

    return NextResponse.json({
      token,
      url: tokenUrl,
      sessionUrl, // Direct collaboration link
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });
  } catch (error) {
    console.error('Failed to generate magic link:', error);
    return NextResponse.json(
      { error: 'Failed to generate magic link' },
      { status: 500 }
    );
  }
}
