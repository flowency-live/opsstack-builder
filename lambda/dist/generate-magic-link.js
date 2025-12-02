"use strict";
/**
 * Lambda: Generate Magic Link
 * Generates a magic link token for session restoration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const session_manager_1 = require("./lib/services/session-manager");
const sessionManager = new session_manager_1.SessionManager();
const handler = async (event) => {
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
        console.log('Generating magic link for session:', sessionId);
        const token = await sessionManager.generateMagicLink(sessionId);
        const magicLink = `${process.env.APP_URL}/restore/${token}`;
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
                magicLink,
                token,
            }),
        };
    }
    catch (error) {
        console.error('Error generating magic link:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to generate magic link',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=generate-magic-link.js.map