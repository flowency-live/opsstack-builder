/**
 * useSession Hook
 * Provides convenient access to session state with automatic sync
 *
 * Requirements: 3.1, 6.1, 6.2
 */
import type { Message, Specification, ProgressState } from '../models/types';
/**
 * Hook for managing session state with automatic sync
 */
export declare function useSession(): {
    sessionId: string | null;
    conversationHistory: Message[];
    specification: Specification | null;
    progress: ProgressState | null;
    isLoading: boolean;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    initializeSession: () => Promise<any>;
    sendMessage: (content: string, role?: "user" | "assistant" | "system") => Promise<Message>;
    updateSpec: (spec: Specification) => Promise<void>;
    updateProgressState: (progressState: ProgressState) => Promise<void>;
    restoreSession: (id: string) => Promise<void>;
    restoreFromMagicLink: (token: string) => Promise<void>;
    generateMagicLink: () => Promise<{
        token: any;
        url: any;
    }>;
    abandonSession: () => Promise<void>;
    messageCount: number;
    latestMessage: Message | null;
};
//# sourceMappingURL=use-session.d.ts.map