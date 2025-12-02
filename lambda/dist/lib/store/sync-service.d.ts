/**
 * Sync Service
 * Handles automatic synchronization between client state and server
 * Implements aggressive persistence by syncing after every message
 *
 * Requirements: 6.1, 13.4
 */
/**
 * Sync configuration
 */
interface SyncConfig {
    autoSync: boolean;
    syncInterval?: number;
    onSyncSuccess?: () => void;
    onSyncError?: (error: Error) => void;
}
/**
 * SyncService manages automatic synchronization with the server
 */
export declare class SyncService {
    private config;
    private syncTimer;
    private pendingSync;
    constructor(config?: SyncConfig);
    /**
     * Start automatic sync service
     * Syncs state to server at regular intervals
     */
    start(): void;
    /**
     * Stop automatic sync service
     */
    stop(): void;
    /**
     * Manually trigger a sync to server
     * Implements aggressive persistence - saves after every message
     */
    syncToServer(): Promise<void>;
    /**
     * Sync after adding a message
     * Implements aggressive persistence requirement
     */
    syncAfterMessage(): Promise<void>;
    /**
     * Handle online event - sync queued changes
     */
    private handleOnline;
    /**
     * Handle offline event
     */
    private handleOffline;
    /**
     * Restore session from server
     */
    restoreFromServer(sessionId: string): Promise<void>;
    /**
     * Restore session from magic link
     */
    restoreFromMagicLink(token: string): Promise<void>;
}
export declare const syncService: SyncService;
export {};
//# sourceMappingURL=sync-service.d.ts.map