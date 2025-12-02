/**
 * Lambda API Client
 * Helper for Next.js API routes to call Lambda functions via API Gateway
 */
export interface LambdaResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export declare const lambdaClient: {
    /**
     * Create a new session
     */
    createSession: () => Promise<LambdaResponse<any>>;
    /**
     * Get session by ID
     */
    getSession: (sessionId: string) => Promise<LambdaResponse<any>>;
    /**
     * Send a message and get AI response
     */
    handleMessage: (sessionId: string, message: string) => Promise<LambdaResponse<any>>;
    /**
     * Generate magic link for session
     */
    generateMagicLink: (sessionId: string) => Promise<LambdaResponse<any>>;
};
//# sourceMappingURL=lambda-client.d.ts.map