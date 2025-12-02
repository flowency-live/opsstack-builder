"use strict";
/**
 * Error Handler Service
 * Provides user-friendly error notifications and recovery strategies
 * Requirements: 13.1, 13.2, 13.3, 13.5, 14.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
class ErrorHandler {
    /**
     * Create a user-friendly notification from an error
     */
    static notifyUser(error, context) {
        // Categorize the error
        const category = this.categorizeError(error);
        switch (category) {
            case 'network':
                return this.createNetworkErrorNotification(error);
            case 'llm':
                return this.createLLMErrorNotification(error);
            case 'persistence':
                return this.createPersistenceErrorNotification(error);
            case 'validation':
                return this.createValidationErrorNotification(error);
            default:
                return this.createGenericErrorNotification(error, context);
        }
    }
    /**
     * Categorize error type
     */
    static categorizeError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') ||
            message.includes('fetch') ||
            message.includes('connection') ||
            message.includes('timeout')) {
            return 'network';
        }
        if (message.includes('llm') ||
            message.includes('openai') ||
            message.includes('anthropic') ||
            message.includes('rate limit')) {
            return 'llm';
        }
        if (message.includes('dynamodb') ||
            message.includes('database') ||
            message.includes('save') ||
            message.includes('persist')) {
            return 'persistence';
        }
        if (message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('required')) {
            return 'validation';
        }
        return 'unknown';
    }
    /**
     * Create notification for network errors
     */
    static createNetworkErrorNotification(error) {
        return {
            message: "We're having trouble connecting to the server. Your messages are being saved locally and will be sent when the connection is restored.",
            severity: 'warning',
            actions: [
                {
                    label: 'Retry Now',
                    handler: () => {
                        // This will be implemented by the caller
                        console.log('Retry requested');
                    },
                },
                {
                    label: 'Continue Offline',
                    handler: () => {
                        // This will be implemented by the caller
                        console.log('Continue offline');
                    },
                },
            ],
        };
    }
    /**
     * Create notification for LLM errors
     */
    static createLLMErrorNotification(error) {
        return {
            message: "I'm having trouble processing your request right now. This could be due to high demand. Your information has been saved, and you can try again in a moment.",
            severity: 'warning',
            actions: [
                {
                    label: 'Try Again',
                    handler: () => {
                        console.log('Retry LLM request');
                    },
                },
                {
                    label: 'Contact Support',
                    handler: () => {
                        console.log('Contact support');
                    },
                },
            ],
        };
    }
    /**
     * Create notification for persistence errors
     */
    static createPersistenceErrorNotification(error) {
        return {
            message: "We're having trouble saving your progress. Don't worry - your information is stored locally. We'll keep trying to sync it to the server.",
            severity: 'error',
            actions: [
                {
                    label: 'Retry Save',
                    handler: () => {
                        console.log('Retry save');
                    },
                },
                {
                    label: 'Download Backup',
                    handler: () => {
                        console.log('Download backup');
                    },
                },
            ],
        };
    }
    /**
     * Create notification for validation errors
     */
    static createValidationErrorNotification(error) {
        return {
            message: error.message || 'Please check your input and try again.',
            severity: 'info',
            actions: [
                {
                    label: 'OK',
                    handler: () => {
                        console.log('Acknowledged');
                    },
                },
            ],
        };
    }
    /**
     * Create generic error notification
     */
    static createGenericErrorNotification(error, context) {
        const contextMessage = context ? ` while ${context}` : '';
        return {
            message: `Something went wrong${contextMessage}. Your progress has been saved, and you can continue working. If the problem persists, please contact support.`,
            severity: 'error',
            actions: [
                {
                    label: 'Continue',
                    handler: () => {
                        console.log('Continue after error');
                    },
                },
                {
                    label: 'Contact Support',
                    handler: () => {
                        console.log('Contact support');
                    },
                },
            ],
        };
    }
    /**
     * Log error with context for debugging
     */
    static logError(error, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
            },
            context,
        };
        // In production, this would send to a logging service
        console.error('Error logged:', JSON.stringify(logEntry, null, 2));
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.js.map