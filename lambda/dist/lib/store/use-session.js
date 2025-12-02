"use strict";
/**
 * useSession Hook
 * Provides convenient access to session state with automatic sync
 *
 * Requirements: 3.1, 6.1, 6.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSession = useSession;
const react_1 = require("react");
const session_store_1 = require("./session-store");
const sync_service_1 = require("./sync-service");
/**
 * Hook for managing session state with automatic sync
 */
function useSession() {
    const { sessionId, conversationHistory, specification, progress, isLoading, isSyncing, lastSyncedAt, setSessionId, addMessage, updateSpecification, updateProgress, clearSession, getMessageCount, getLatestMessage, } = (0, session_store_1.useSessionStore)();
    // Start sync service on mount
    (0, react_1.useEffect)(() => {
        sync_service_1.syncService.start();
        return () => {
            sync_service_1.syncService.stop();
        };
    }, []);
    /**
     * Initialize a new session
     */
    const initializeSession = (0, react_1.useCallback)(async () => {
        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Failed to create session');
            }
            const session = await response.json();
            setSessionId(session.id);
            return session.id;
        }
        catch (error) {
            console.error('Failed to initialize session:', error);
            throw error;
        }
    }, [setSessionId]);
    /**
     * Send a message and sync to server
     * Implements aggressive persistence
     */
    const sendMessage = (0, react_1.useCallback)(async (content, role = 'user') => {
        if (!sessionId) {
            throw new Error('No active session');
        }
        const message = {
            id: `${Date.now()}-${Math.random()}`,
            role,
            content,
            timestamp: new Date(),
        };
        // Add to local state immediately
        addMessage(message);
        // Sync to server (aggressive persistence)
        await sync_service_1.syncService.syncAfterMessage();
        return message;
    }, [sessionId, addMessage]);
    /**
     * Update specification and sync
     */
    const updateSpec = (0, react_1.useCallback)(async (spec) => {
        updateSpecification(spec);
        await sync_service_1.syncService.syncToServer();
    }, [updateSpecification]);
    /**
     * Update progress and sync
     */
    const updateProgressState = (0, react_1.useCallback)(async (progressState) => {
        updateProgress(progressState);
        await sync_service_1.syncService.syncToServer();
    }, [updateProgress]);
    /**
     * Restore session from server
     */
    const restoreSession = (0, react_1.useCallback)(async (id) => {
        await sync_service_1.syncService.restoreFromServer(id);
    }, []);
    /**
     * Restore session from magic link
     */
    const restoreFromMagicLink = (0, react_1.useCallback)(async (token) => {
        await sync_service_1.syncService.restoreFromMagicLink(token);
    }, []);
    /**
     * Generate magic link for current session
     */
    const generateMagicLink = (0, react_1.useCallback)(async () => {
        if (!sessionId) {
            throw new Error('No active session');
        }
        const response = await fetch(`/api/sessions/${sessionId}/magic-link`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to generate magic link');
        }
        const { token, url } = await response.json();
        return { token, url };
    }, [sessionId]);
    /**
     * Abandon current session and start fresh
     */
    const abandonSession = (0, react_1.useCallback)(async () => {
        if (!sessionId) {
            return;
        }
        try {
            await fetch(`/api/sessions/${sessionId}/abandon`, {
                method: 'POST',
            });
        }
        catch (error) {
            console.error('Failed to abandon session on server:', error);
        }
        clearSession();
    }, [sessionId, clearSession]);
    return {
        // State
        sessionId,
        conversationHistory,
        specification,
        progress,
        isLoading,
        isSyncing,
        lastSyncedAt,
        // Actions
        initializeSession,
        sendMessage,
        updateSpec,
        updateProgressState,
        restoreSession,
        restoreFromMagicLink,
        generateMagicLink,
        abandonSession,
        // Computed
        messageCount: getMessageCount(),
        latestMessage: getLatestMessage(),
    };
}
//# sourceMappingURL=use-session.js.map