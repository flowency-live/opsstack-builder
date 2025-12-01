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
import { v4 as uuidv4 } from 'uuid';
import type { Message, SessionState } from '@/lib/models/types';

// Initialize services
const llmRouter = new LLMRouter();
const promptManager = new PromptManager();
const conversationEngine = new ConversationEngine(llmRouter, promptManager);
const specificationGenerator = new SpecificationGenerator(llmRouter, promptManager);
const progressTracker = new ProgressTracker();

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
      session.state.progress
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

          // Extract information and update specification
          const extractedInfo = await specificationGenerator.extractInformation(
            userMessageContent,
            fullResponse,
            context
          );

          let updatedSpecification = session.state.specification;
          let specUpdated = false;

          if (extractedInfo && Object.keys(extractedInfo.data).length > 0) {
            updatedSpecification = await specificationGenerator.updateSpecification(
              sessionId,
              extractedInfo,
              session.state.specification
            );
            specUpdated = true;
          }

          // Update progress
          const updatedProgress = await progressTracker.updateProgress(
            sessionId,
            updatedSpecification
          );

          // Save session state (aggressive persistence)
          const updatedState: SessionState = {
            conversationHistory: finalHistory,
            specification: updatedSpecification,
            progress: updatedProgress,
            userInfo: session.state.userInfo,
          };

          await sessionManager.saveSessionState(sessionId, updatedState);

          // Send completion event
          const completionData = {
            messageId: assistantMessage.id,
            specUpdated,
            progress: updatedProgress,
            latency: Date.now() - startTime,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: completionData })}\n\n`)
          );
          controller.close();
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
