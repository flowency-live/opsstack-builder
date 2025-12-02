/**
 * Error Handler Service
 * Provides user-friendly error notifications and recovery strategies
 * Requirements: 13.1, 13.2, 13.3, 13.5, 14.3
 */
export type ErrorSeverity = 'info' | 'warning' | 'error';
export interface UserNotification {
    message: string;
    severity: ErrorSeverity;
    actions: Action[];
}
export interface Action {
    label: string;
    handler: () => void;
}
export declare class ErrorHandler {
    /**
     * Create a user-friendly notification from an error
     */
    static notifyUser(error: Error, context?: string): UserNotification;
    /**
     * Categorize error type
     */
    private static categorizeError;
    /**
     * Create notification for network errors
     */
    private static createNetworkErrorNotification;
    /**
     * Create notification for LLM errors
     */
    private static createLLMErrorNotification;
    /**
     * Create notification for persistence errors
     */
    private static createPersistenceErrorNotification;
    /**
     * Create notification for validation errors
     */
    private static createValidationErrorNotification;
    /**
     * Create generic error notification
     */
    private static createGenericErrorNotification;
    /**
     * Log error with context for debugging
     */
    static logError(error: Error, context: {
        sessionId?: string;
        userId?: string;
        action?: string;
        additionalInfo?: Record<string, any>;
    }): void;
}
//# sourceMappingURL=error-handler.d.ts.map