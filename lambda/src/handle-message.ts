/**
 * Lambda: Handle Message
 * Processes user messages and generates AI responses
 * This is the most complex Lambda as it handles conversation logic
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from './lib/session-manager';
import { ConversationEngine } from './lib/conversation-engine';
import { LLMRouter } from './lib/llm-router';
import { PromptManager } from './lib/prompt-manager';
import { SpecificationGenerator } from './lib/specification-generator';
import { ProgressTracker } from './lib/progress-tracker';
import type { Message, SessionState } from './lib/types';

const sessionManager = new SessionManager();

// Initialize AI services
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
const specificationGenerator = new SpecificationGenerator();
const progressTracker = new ProgressTracker();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();

  try {
    const sessionId = event.pathParameters?.id;

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Session ID is required',
        }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { message: userMessageContent } = body;

    if (!userMessageContent || typeof userMessageContent !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Message content is required',
        }),
      };
    }

    console.log('Processing message for session:', sessionId);

    // Get current session state
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Session not found',
        }),
      };
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

    // Generate AI response (streaming not supported in Lambda, return full response)
    const aiResponse = await conversationEngine.generateResponse(
      updatedHistory,
      session.state.specification,
      session.state.progress
    );

    // Create assistant message
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date(),
    };

    // Update specification if needed
    let updatedSpecification = session.state.specification;
    if (aiResponse.specificationUpdate) {
      updatedSpecification = {
        ...session.state.specification,
        ...aiResponse.specificationUpdate,
        version: session.state.specification.version + 1,
        lastUpdated: new Date(),
      };
    }

    // Update progress
    const updatedProgress = progressTracker.calculateProgress(updatedSpecification);

    // Save updated state
    const newState: SessionState = {
      conversationHistory: [...updatedHistory, assistantMessage],
      specification: updatedSpecification,
      progress: updatedProgress,
    };

    await sessionManager.saveSessionState(sessionId, newState);

    const processingTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        success: true,
        message: assistantMessage,
        specification: {
          ...updatedSpecification,
          lastUpdated: updatedSpecification.lastUpdated.toISOString(),
        },
        progress: updatedProgress,
        metadata: {
          processingTime,
          provider: aiResponse.provider,
          model: aiResponse.model,
        },
      }),
    };
  } catch (error) {
    console.error('Error handling message:', error);

    // Attempt to preserve error state
    const sessionId = event.pathParameters?.id;
    if (sessionId) {
      try {
        await sessionManager.preserveErrorState(sessionId, error as Error);
      } catch (preserveError) {
        console.error('Failed to preserve error state:', preserveError);
      }
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to process message',
      }),
    };
  }
};
