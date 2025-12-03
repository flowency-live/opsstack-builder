/**
 * POST /api/sessions/[id]/submit - Submit completed specification
 * Final polish and handoff for completed specifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';
import { PRDEngine } from '@/lib/services/prd-engine';
import { LLMRouter } from '@/lib/services/llm-router';

const llmRouter = new LLMRouter({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: 'claude-3-5-haiku-20241022',
  },
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 100000,
  },
});

const prdEngine = new PRDEngine(llmRouter);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if spec is ready for handoff
    if (!session.state.completeness?.readyForHandoff) {
      return NextResponse.json(
        {
          success: false,
          error: 'Specification not complete',
          missingSections: session.state.completeness?.missingSections || []
        },
        { status: 400 }
      );
    }

    console.log('[SUBMIT] Finalizing specification for session:', sessionId);

    // Finalize spec (polish for handoff)
    const finalPRD = await prdEngine.synthesize({
      mode: 'finalize',
      currentSpec: session.state.specification
    });

    console.log('[SUBMIT] Spec finalized, generating feature suggestions');

    // Generate feature suggestions (with proper JSON.stringify)
    const suggestionsResponse = await llmRouter.complete({
      messages: [{
        role: 'user',
        content: `Based on this specification, suggest 3-5 additional features that would enhance the MVP:

${JSON.stringify(finalPRD.spec.plainEnglishSummary, null, 2)}

Return as JSON array: ["feature 1", "feature 2", ...]

Keep suggestions practical and aligned with the product vision.`
      }],
      temperature: 0.7,
      maxTokens: 500,
    });

    let suggestions: string[] = [];
    try {
      suggestions = JSON.parse(suggestionsResponse.content);
    } catch (error) {
      console.error('[SUBMIT] Failed to parse suggestions:', error);
      suggestions = ['Error generating suggestions'];
    }

    console.log('[SUBMIT] Suggestions generated:', suggestions);

    // TODO: Send notification to Jason
    // TODO: Generate magic link
    // TODO: Store submission in DynamoDB

    return NextResponse.json({
      success: true,
      finalSpec: finalPRD.spec,
      suggestions,
      message: 'Specification submitted successfully. We will review and get back to you within 48 hours.'
    });

  } catch (error) {
    console.error('[SUBMIT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit specification' },
      { status: 500 }
    );
  }
}
