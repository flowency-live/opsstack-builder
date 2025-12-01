/**
 * POST /api/submissions
 * Submit a specification for quotation
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubmissionService } from '../../../lib/services/submission-service';
import { SessionManager } from '../../../lib/services/session-manager';
import type { ContactInfo } from '../../../lib/models/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, contactInfo } = body as {
      sessionId: string;
      contactInfo: ContactInfo;
    };

    // Validate input
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!contactInfo) {
      return NextResponse.json(
        { error: 'Contact information is required' },
        { status: 400 }
      );
    }

    // Get session and specification
    const sessionManager = new SessionManager();
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Submit specification
    const submissionService = new SubmissionService();
    const result = await submissionService.submitSpecification({
      sessionId,
      contactInfo,
      specification: session.state.specification,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          validationErrors: result.validationErrors,
        },
        { status: 400 }
      );
    }

    // Update session state with contact info
    await sessionManager.saveSessionState(sessionId, {
      ...session.state,
      userInfo: contactInfo,
    });

    // Return success with submission details
    return NextResponse.json({
      success: true,
      submission: {
        id: result.submission!.id,
        referenceNumber: result.submission!.referenceNumber,
        submittedAt: result.submission!.submittedAt,
      },
    });
  } catch (error) {
    console.error('Submission API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
