/**
 * Client-Side State Management with Zustand
 * Manages conversation history, specification, and progress state
 * Implements browser LocalStorage persistence and automatic server sync
 *
 * Requirements: 3.1, 6.1, 6.2
 */
import type { Message, Specification, ProgressState, SessionState } from '../models/types';
/**
 * Session store state interface
 */
interface SessionStore {
    sessionId: string | null;
    conversationHistory: Message[];
    specification: Specification | null;
    progress: ProgressState | null;
    isLoading: boolean;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    setSessionId: (sessionId: string) => void;
    addMessage: (message: Message) => void;
    updateSpecification: (specification: Specification) => void;
    updateProgress: (progress: ProgressState) => void;
    setLoading: (isLoading: boolean) => void;
    setSyncing: (isSyncing: boolean) => void;
    setLastSyncedAt: (date: Date) => void;
    clearSession: () => void;
    restoreSession: (state: SessionState, sessionId: string) => void;
    getMessageCount: () => number;
    getLatestMessage: () => Message | null;
}
/**
 * Zustand store with localStorage persistence
 * Automatically syncs state to browser storage
 */
export declare const useSessionStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SessionStore>, "persist" | "setState"> & {
    setState(partial: SessionStore | Partial<SessionStore> | ((state: SessionStore) => SessionStore | Partial<SessionStore>), replace?: false | undefined): unknown;
    setState(state: SessionStore | ((state: SessionStore) => SessionStore), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SessionStore, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SessionStore) => void) => () => void;
        onFinishHydration: (fn: (state: SessionStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SessionStore, unknown, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=session-store.d.ts.map