"use strict";
/**
 * Lambda: Handle Message
 * Processes user messages and generates AI responses
 * This is the most complex Lambda as it handles conversation logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const uuid_1 = require("uuid");
const session_manager_1 = require("./lib/session-manager");
const conversation_engine_1 = require("./lib/services/conversation-engine");
const llm_router_1 = require("./lib/services/llm-router");
const prompt_manager_1 = require("./lib/services/prompt-manager");
const specification_generator_1 = require("./lib/services/specification-generator");
const progress_tracker_1 = require("./lib/services/progress-tracker");
const sessionManager = new session_manager_1.SessionManager();
// Initialize AI services
const llmRouter = new llm_router_1.LLMRouter({
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
const promptManager = new prompt_manager_1.PromptManager();
const conversationEngine = new conversation_engine_1.ConversationEngine(llmRouter, promptManager);
const specificationGenerator = new specification_generator_1.SpecificationGenerator();
const progressTracker = new progress_tracker_1.ProgressTracker();
const handler = async (event) => {
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
        const userMessage = {
            id: (0, uuid_1.v4)(),
            role: 'user',
            content: userMessageContent,
            timestamp: new Date(),
        };
        // Add user message to conversation history
        const updatedHistory = [...session.state.conversationHistory, userMessage];
        // Generate AI response (streaming not supported in Lambda, return full response)
        const aiResponse = await conversationEngine.generateResponse(updatedHistory, session.state.specification, session.state.progress);
        // Create assistant message
        const assistantMessage = {
            id: (0, uuid_1.v4)(),
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
        const newState = {
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
    }
    catch (error) {
        console.error('Error handling message:', error);
        // Attempt to preserve error state
        const sessionId = event.pathParameters?.id;
        if (sessionId) {
            try {
                await sessionManager.preserveErrorState(sessionId, error);
            }
            catch (preserveError) {
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
exports.handler = handler;
//# sourceMappingURL=handle-message.js.map