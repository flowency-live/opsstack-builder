/**
 * useSession Hook
 * Provides convenient access to session state with automatic sync
 * 
 * Requirements: 3.1, 6.1, 6.2
 */

import { useEffect, useCallback } from 'react';
import { useSessionStore } from './session-store';
import { syncService } from './sync-service';
import type { Message, Specification, ProgressState } from '../models/types';

/**
 * Hook for managing session state with automatic sync
 */
export function useSession() {
  const {
    sessionId,
    conversationHistory,
    specification,
    progress,
    isLoading,
    isSyncing,
    lastSyncedAt,
    setSessionId,
    addMessage,
    updateSpecification,
    updateProgress,
    clearSession,
    getMessageCount,
    getLatestMessage,
  } = useSessionStore();

  // Start sync service on mount
  useEffect(() => {
    syncService.start();
    return () => {
      syncService.stop();
    };
  }, []);

  /**
   * Initialize a new session
   */
  const initializeSession = useCallback(async () => {
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
    } catch (error) {
      console.error('Failed to initialize session:', error);
      throw error;
    }
  }, [setSessionId]);

  /**
   * Send a message and sync to server
   * Implements aggressive persistence
   */
  const sendMessage = useCallback(
    async (content: string, role: 'user' | 'assistant' | 'system' = 'user') => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      const message: Message = {
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        timestamp: new Date(),
      };

      // Add to local state immediately
      addMessage(message);

      // Sync to server (aggressive persistence)
      await syncService.syncAfterMessage();

      return message;
    },
    [sessionId, addMessage]
  );

  /**
   * Update specification and sync
   */
  const updateSpec = useCallback(
    async (spec: Specification) => {
      updateSpecification(spec);
      await syncService.syncToServer();
    },
    [updateSpecification]
  );

  /**
   * Update progress and sync
   */
  const updateProgressState = useCallback(
    async (progressState: ProgressState) => {
      updateProgress(progressState);
      await syncService.syncToServer();
    },
    [updateProgress]
  );

  /**
   * Restore session from server
   */
  const restoreSession = useCallback(async (id: string) => {
    await syncService.restoreFromServer(id);
  }, []);

  /**
   * Restore session from magic link
   */
  const restoreFromMagicLink = useCallback(async (token: string) => {
    await syncService.restoreFromMagicLink(token);
  }, []);

  /**
   * Generate magic link for current session
   */
  const generateMagicLink = useCallback(async () => {
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
  const abandonSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      await fetch(`/api/sessions/${sessionId}/abandon`, {
        method: 'POST',
      });
    } catch (error) {
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
