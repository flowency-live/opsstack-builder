"use strict";
/**
 * Sync Service
 * Handles automatic synchronization between client state and server
 * Implements aggressive persistence by syncing after every message
 *
 * Requirements: 6.1, 13.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncService = exports.SyncService = void 0;
const session_store_1 = require("./session-store");
/**
 * SyncService manages automatic synchronization with the server
 */
class SyncService {
    constructor(config = { autoSync: true }) {
        this.syncTimer = null;
        this.pendingSync = false;
        /**
         * Handle online event - sync queued changes
         */
        this.handleOnline = async () => {
            console.log('Connection restored, syncing...');
            await this.syncToServer();
        };
        /**
         * Handle offline event
         */
        this.handleOffline = () => {
            console.log('Connection lost, will queue changes locally');
        };
        this.config = config;
    }
    /**
     * Start automatic sync service
     * Syncs state to server at regular intervals
     */
    start() {
        if (!this.config.autoSync) {
            return;
        }
        // Set up periodic sync if interval is specified
        if (this.config.syncInterval) {
            this.syncTimer = setInterval(() => {
                this.syncToServer();
            }, this.config.syncInterval);
        }
        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }
    }
    /**
     * Stop automatic sync service
     */
    stop() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
    }
    /**
     * Manually trigger a sync to server
     * Implements aggressive persistence - saves after every message
     */
    async syncToServer() {
        // Prevent concurrent syncs
        if (this.pendingSync) {
            return;
        }
        const store = session_store_1.useSessionStore.getState();
        const { sessionId, conversationHistory, specification, progress } = store;
        // Nothing to sync if no session
        if (!sessionId) {
            return;
        }
        this.pendingSync = true;
        store.setSyncing(true);
        try {
            const sessionState = {
                conversationHistory,
                specification: specification,
                progress: progress,
            };
            // Call API to save session state
            const response = await fetch(`/api/sessions/${sessionId}/state`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionState),
            });
            if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`);
            }
            // Update last synced timestamp
            store.setLastSyncedAt(new Date());
            // Call success callback
            if (this.config.onSyncSuccess) {
                this.config.onSyncSuccess();
            }
        }
        catch (error) {
            console.error('Failed to sync to server:', error);
            // Call error callback
            if (this.config.onSyncError) {
                this.config.onSyncError(error);
            }
        }
        finally {
            this.pendingSync = false;
            store.setSyncing(false);
        }
    }
    /**
     * Sync after adding a message
     * Implements aggressive persistence requirement
     */
    async syncAfterMessage() {
        await this.syncToServer();
    }
    /**
     * Restore session from server
     */
    async restoreFromServer(sessionId) {
        const store = session_store_1.useSessionStore.getState();
        store.setLoading(true);
        try {
            const response = await fetch(`/api/sessions/${sessionId}`);
            if (!response.ok) {
                throw new Error(`Failed to restore session: ${response.statusText}`);
            }
            const session = await response.json();
            store.restoreSession(session.state, sessionId);
        }
        catch (error) {
            console.error('Failed to restore session:', error);
            throw error;
        }
        finally {
            store.setLoading(false);
        }
    }
    /**
     * Restore session from magic link
     */
    async restoreFromMagicLink(token) {
        const store = session_store_1.useSessionStore.getState();
        store.setLoading(true);
        try {
            const response = await fetch(`/api/sessions/restore/${token}`);
            if (!response.ok) {
                throw new Error(`Failed to restore from magic link: ${response.statusText}`);
            }
            const session = await response.json();
            store.restoreSession(session.state, session.id);
        }
        catch (error) {
            console.error('Failed to restore from magic link:', error);
            throw error;
        }
        finally {
            store.setLoading(false);
        }
    }
}
exports.SyncService = SyncService;
// Export singleton instance
exports.syncService = new SyncService({
    autoSync: true,
    syncInterval: 30000, // Sync every 30 seconds as backup
});
//# sourceMappingURL=sync-service.js.map