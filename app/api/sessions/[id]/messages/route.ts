/**
 * POST /api/sessions/[id]/messages - Handle message exchange
 * Requirements: 9.1, 9.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';
import { ConversationEngine } from '@/lib/services/conversation-engine';
import { LLMRouter } from '@/lib/services/llm-router';
import { PromptManager } from '@/lib/services/prompt-manager';
import { SpecificationGenerator } from '@/lib/services/specification-generator';
import { ProgressTracker } from '@/lib/services/progress-tracker';
import { PRDEngine } from '@/lib/services/prd-engine';
import { v4 as uuidv4 } from 'uuid';
import type { Message, SessionState } from '@/lib/models/types';

// Initialize services
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
const promptManager = new PromptManager();
const conversationEngine = new ConversationEngine(llmRouter, promptManager);
const specificationGenerator = new SpecificationGenerator(llmRouter);
const progressTracker = new ProgressTracker();
const prdEngine = new PRDEngine(llmRouter);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { message: userMessageContent } = body;

    if (!userMessageContent || typeof userMessageContent !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Message content is required',
        },
        { status: 400 }
      );
    }

    // Get session
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

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    // Add user message to conversation history
    const updatedHistory = [...session.state.conversationHistory, userMessage];

    // Reconstruct conversation context
    const context = await conversationEngine.reconstructContext(
      sessionId,
      updatedHistory,
      session.state.specification,
      session.state.progress,
      session.state.lockedSections
    );

    // Process message and get streaming response
    const streamingResponse = await conversationEngine.processMessage(
      sessionId,
      userMessageContent,
      context
    );

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = streamingResponse.stream.getReader();

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            fullResponse += value;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`));
          }

          // Create assistant message
          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          };

          // Update conversation history
          const finalHistory = [...updatedHistory, assistantMessage];

          // Count user messages only (not total history including assistant)
          const userMessageCount = finalHistory.filter(m => m.role === 'user').length;

          // Smart regeneration trigger
          const shouldUpdateSpec =
            userMessageCount % 3 === 0 ||
            /\b(summary|spec|PRD|requirements)\b/i.test(userMessageContent);

          console.log(`[SPEC] User message count: ${userMessageCount}, Should update: ${shouldUpdateSpec}`);

          // Update progress (fast, synchronous calculation)
          const updatedProgress = await progressTracker.updateProgress(
            session.state.specification
          );

          // Save conversation state immediately (no spec update yet)
          const updatedState: SessionState = {
            conversationHistory: finalHistory,
            specification: session.state.specification,
            progress: updatedProgress,
            userInfo: session.state.userInfo,
            lockedSections: session.state.lockedSections,
            completeness: session.state.completeness,
          };

          await sessionManager.saveSessionState(sessionId, updatedState);

          // Send completion event with current specification
          const completionData = {
            messageId: assistantMessage.id,
            specUpdated: false, // Will update async if needed
            specification: session.state.specification,
            completeness: session.state.completeness,
            progress: updatedProgress,
            latency: Date.now() - startTime,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: completionData })}\n\n`)
          );
          controller.close();

          // Run PRD Engine asynchronously in background (non-blocking)
          if (shouldUpdateSpec) {
            const isFirstRun = session.state.specification.version === 0;

            console.log(`[SPEC] Triggering async PRD engine update (isFirstRun: ${isFirstRun})`);

            // Fire and forget - runs after response is sent
            (async () => {
              try {
                const prdResult = await prdEngine.synthesize({
                  mode: 'update',
                  currentSpec: session.state.specification,
                  lastMessages: isFirstRun
                    ? finalHistory
                    : finalHistory.slice(-3),
                  isFirstRun
                });

                // PRD engine returns FULL spec - overwrite completely
                const updatedSpecification = {
                  ...prdResult.spec,
                  id: session.state.specification.id,
                  version: session.state.specification.version + 1,
                  lastUpdated: new Date()
                };

                // Calculate readyForHandoff in TypeScript (deterministic)
                const missingSections = prdResult.missingSections;
                const readyForHandoff =
                  updatedSpecification.plainEnglishSummary.overview.length > 50 &&
                  updatedSpecification.plainEnglishSummary.targetUsers.length > 20 &&
                  updatedSpecification.plainEnglishSummary.keyFeatures.length >= 5 &&
                  missingSections.length === 0;

                const updatedCompleteness = {
                  missingSections,
                  readyForHandoff,
                  lastEvaluated: new Date(),
                };

                // Update progress with new spec
                const finalProgress = await progressTracker.updateProgress(updatedSpecification);

                // Save updated spec to session
                const finalState: SessionState = {
                  conversationHistory: finalHistory,
                  specification: updatedSpecification,
                  progress: finalProgress,
                  userInfo: session.state.userInfo,
                  lockedSections: session.state.lockedSections,
                  completeness: updatedCompleteness,
                };

                await sessionManager.saveSessionState(sessionId, finalState);

                // Debug logging
                console.log('[PRD] Async update complete', {
                  sessionId,
                  version: updatedSpecification.version,
                  featuresCount: updatedSpecification.plainEnglishSummary.keyFeatures.length,
                  overview: updatedSpecification.plainEnglishSummary.overview.substring(0, 100),
                  missingSections,
                  readyForHandoff,
                });
              } catch (error) {
                console.error('[PRD] Async update failed:', error);
                // Session still has conversation saved, just no spec update
              }
            })();
          }
        } catch (error) {
          console.error('Streaming error:', error);
          
          // Preserve error state
          await sessionManager.preserveErrorState(
            sessionId,
            error as Error,
            userMessageContent,
            session.state
          );

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    // Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error processing message:', error);

    // Preserve error state
    try {
      const { id } = await params;
      await sessionManager.preserveErrorState(
        id,
        error as Error
      );
    } catch (preserveError) {
      console.error('Failed to preserve error state:', preserveError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process message',
      },
      { status: 500 }
    );
  }
}
