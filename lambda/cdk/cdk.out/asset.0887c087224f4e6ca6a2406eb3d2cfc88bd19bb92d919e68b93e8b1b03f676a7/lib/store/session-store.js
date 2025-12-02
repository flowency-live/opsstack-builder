"use strict";
/**
 * Client-Side State Management with Zustand
 * Manages conversation history, specification, and progress state
 * Implements browser LocalStorage persistence and automatic server sync
 *
 * Requirements: 3.1, 6.1, 6.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
/**
 * Initial state for a new session
 */
const initialState = {
    sessionId: null,
    conversationHistory: [],
    specification: null,
    progress: null,
    isLoading: false,
    isSyncing: false,
    lastSyncedAt: null,
};
/**
 * Zustand store with localStorage persistence
 * Automatically syncs state to browser storage
 */
exports.useSessionStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    ...initialState,
    // Set the current session ID
    setSessionId: (sessionId) => {
        set({ sessionId });
    },
    // Add a new message to conversation history
    addMessage: (message) => {
        set((state) => ({
            conversationHistory: [...state.conversationHistory, message],
        }));
    },
    // Update the specification
    updateSpecification: (specification) => {
        set({ specification });
    },
    // Update progress state
    updateProgress: (progress) => {
        set({ progress });
    },
    // Set loading state
    setLoading: (isLoading) => {
        set({ isLoading });
    },
    // Set syncing state
    setSyncing: (isSyncing) => {
        set({ isSyncing });
    },
    // Set last synced timestamp
    setLastSyncedAt: (date) => {
        set({ lastSyncedAt: date });
    },
    // Clear all session data
    clearSession: () => {
        set(initialState);
    },
    // Restore session from server data
    restoreSession: (state, sessionId) => {
        set({
            sessionId,
            conversationHistory: state.conversationHistory,
            specification: state.specification,
            progress: state.progress,
            lastSyncedAt: new Date(),
        });
    },
    // Get total message count
    getMessageCount: () => {
        return get().conversationHistory.length;
    },
    // Get the most recent message
    getLatestMessage: () => {
        const messages = get().conversationHistory;
        return messages.length > 0 ? messages[messages.length - 1] : null;
    },
}), {
    name: 'spec-wizard-session', // localStorage key
    storage: (0, middleware_1.createJSONStorage)(() => localStorage),
    // TODO: Custom Date serialization needs to be implemented with zustand v4+ storage API
    // For now using default JSON serialization (Dates will be stored as ISO strings)
    // Partial persistence - only persist essential data
    partialize: (state) => ({
        sessionId: state.sessionId,
        conversationHistory: state.conversationHistory,
        specification: state.specification,
        progress: state.progress,
        lastSyncedAt: state.lastSyncedAt,
    }),
}));
//# sourceMappingURL=session-store.js.map