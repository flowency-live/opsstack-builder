/**
 * POST /api/sessions - Create a new session
 * Requirements: 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

export async function POST(request: NextRequest) {
  try {
    // Debug: Log AWS-related environment variables
    console.log('AWS Environment Check:', {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN ? 'SET' : 'NOT SET',
      AWS_REGION: process.env.AWS_REGION,
      REGION: process.env.REGION,
      LAMBDA_EXECUTION_ROLE_ARN: process.env.LAMBDA_EXECUTION_ROLE_ARN,
    });

    // Create new session
    const session = await sessionManager.createSession();

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session.id,
          createdAt: session.createdAt.toISOString(),
          lastAccessedAt: session.lastAccessedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
