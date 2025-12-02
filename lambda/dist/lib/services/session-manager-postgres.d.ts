/**
 * SessionManager Service - Postgres Implementation
 * Manages user sessions with aggressive persistence and magic link support
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 16.1, 16.4, 16.5
 */
import type { Session, SessionState, Message } from '../models/types';
/**
 * SessionManager handles all session-related operations using Postgres
 */
export declare class SessionManager {
    /**
     * Create a new session
     * Generates a unique session ID and initializes empty state
     */
    createSession(): Promise<Session>;
    /**
     * Get a session by ID
     * Reconstructs full session state from Postgres
     */
    getSession(sessionId: string): Promise<Session | null>;
    /**
     * Save session state to Postgres
     * Implements aggressive persistence - saves after every message
     */
    saveSessionState(sessionId: string, state: SessionState): Promise<void>;
    /**
     * Generate a magic link token for session restoration
     * Uses UUID v4 for cryptographically secure tokens
     */
    generateMagicLink(sessionId: string): Promise<string>;
    /**
     * Restore session from magic link token
     */
    restoreSessionFromMagicLink(token: string): Promise<Session>;
    /**
     * Abandon current session and mark it as abandoned
     * Session data is retained for potential future retrieval
     */
    abandonSession(sessionId: string): Promise<void>;
    /**
     * Update last accessed time for a session
     * Private helper method
     */
    private updateLastAccessedTime;
    /**
     * Preserve error state in the database
     * Saves user input and session state before reporting error
     * Requirements: 13.1, 13.5
     */
    preserveErrorState(sessionId: string, error: Error, userInput?: string, currentState?: SessionState): Promise<void>;
    /**
     * Reconstruct conversation context after an error
     * Retrieves the last known good state from the database
     * Requirements: 13.2
     */
    reconstructContextAfterError(sessionId: string): Promise<SessionState | null>;
    /**
     * Get queued offline messages from browser storage
     * This is a helper method that works with browser localStorage
     * Requirements: 13.3
     */
    static getOfflineMessages(sessionId: string): Message[];
    /**
     * Queue a message for offline storage
     * Stores message in browser localStorage when offline
     * Requirements: 13.3
     */
    static queueOfflineMessage(sessionId: string, message: Message): void;
    /**
     * Clear offline messages after successful sync
     * Requirements: 13.3
     */
    static clearOfflineMessages(sessionId: string): void;
    /**
     * Sync offline messages to the server
     * Sends queued messages when connectivity is restored
     * Requirements: 13.3
     */
    syncOfflineMessages(sessionId: string): Promise<void>;
}
export declare const sessionManager: SessionManager;
//# sourceMappingURL=session-manager-postgres.d.ts.map