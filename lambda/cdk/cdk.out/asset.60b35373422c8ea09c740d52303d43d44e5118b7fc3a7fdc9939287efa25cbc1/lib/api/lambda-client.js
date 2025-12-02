"use strict";
/**
 * Lambda API Client
 * Helper for Next.js API routes to call Lambda functions via API Gateway
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaClient = void 0;
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || '';
if (!API_GATEWAY_URL && process.env.NODE_ENV === 'production') {
    console.warn('API_GATEWAY_URL not set! Lambda calls will fail.');
}
async function callLambda(path, options = {}) {
    try {
        const url = `${API_GATEWAY_URL}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error: data.error || `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        return {
            success: true,
            data,
        };
    }
    catch (error) {
        console.error('Lambda call failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
exports.lambdaClient = {
    /**
     * Create a new session
     */
    createSession: async () => {
        return callLambda('/sessions', {
            method: 'POST',
        });
    },
    /**
     * Get session by ID
     */
    getSession: async (sessionId) => {
        return callLambda(`/sessions/${sessionId}`, {
            method: 'GET',
        });
    },
    /**
     * Send a message and get AI response
     */
    handleMessage: async (sessionId, message) => {
        return callLambda(`/sessions/${sessionId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    },
    /**
     * Generate magic link for session
     */
    generateMagicLink: async (sessionId) => {
        return callLambda(`/sessions/${sessionId}/magic-link`, {
            method: 'POST',
        });
    },
};
//# sourceMappingURL=lambda-client.js.map