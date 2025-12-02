"use strict";
/**
 * Lambda: Create Session
 * Creates a new session in DynamoDB
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const session_manager_1 = require("./lib/services/session-manager");
const sessionManager = new session_manager_1.SessionManager();
const handler = async (event) => {
    try {
        console.log('Creating new session');
        const session = await sessionManager.createSession();
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
                success: true,
                session: {
                    id: session.id,
                    createdAt: session.createdAt.toISOString(),
                    lastAccessedAt: session.lastAccessedAt.toISOString(),
                },
            }),
        };
    }
    catch (error) {
        console.error('Error creating session:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to create session',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=create-session.js.map