/**
 * Property Test: Session Reset
 * **Feature: spec-wizard, Property 32: Session reset**
 * **Validates: Requirements 16.4**
 * 
 * For any session, when the user chooses to "Abandon and Start Fresh", 
 * the session state should be cleared and a new empty session should be created.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitrarySessionState } from '../utils/factories';
import { setupLocalStackEnv } from '../utils/test-helpers';
import type { SessionState } from '../../lib/models/types';

// Setup LocalStack environment
setupLocalStackEnv();

describe('**Feature: spec-wizard, Property 32: Session reset**', () => {
  let sessionManager: SessionManager;

  beforeAll(() => {
    sessionManager = new SessionManager();
  });

  test('abandoning session and creating new one produces fresh state', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySessionState, async (sessionState) => {
        // Create a session with some data
        const oldSession = await sessionManager.createSession();
        const oldSessionId = oldSession.id;

        // Save some state to the old session
        const populatedState: SessionState = {
          ...sessionState,
          specification: {
            ...sessionState.specification,
            id: oldSessionId,
            version: sessionState.specification.version + 1,
          },
        };

        await sessionManager.saveSessionState(oldSessionId, populatedState);

        // Abandon the old session
        await sessionManager.abandonSession(oldSessionId);

        // Create a new session (simulating "Start Fresh")
        const newSession = await sessionManager.createSession();
        const newSessionId = newSession.id;

        // Verify new session has different ID
        expect(newSessionId).not.toBe(oldSessionId);

        // Verify new session has empty/default state
        expect(newSession.state.conversationHistory).toHaveLength(0);
        expect(newSession.state.specification.version).toBe(0);
        expect(newSession.state.specification.plainEnglishSummary.overview).toBe(
          ''
        );
        expect(newSession.state.specification.plainEnglishSummary.keyFeatures).toEqual(
          []
        );
        expect(newSession.state.specification.formalPRD.requirements).toEqual([]);
        expect(newSession.state.progress.overallCompleteness).toBe(0);

        // Verify old session still exists but is marked as abandoned
        const oldSessionRetrieved = await sessionManager.getSession(oldSessionId);
        expect(oldSessionRetrieved).not.toBeNull();
        // Old session data should still be there (for potential retrieval)
        if (oldSessionRetrieved) {
          expect(oldSessionRetrieved.state.conversationHistory.length).toBe(
            populatedState.conversationHistory.length
          );
        }
      }),
      { numRuns: 50 }
    );
  }, 60000); // 60 second timeout for property test

  test('new session after abandon has independent state', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySessionState,
        arbitrarySessionState,
        async (oldState, newState) => {
          // Create and populate first session
          const session1 = await sessionManager.createSession();
          const state1: SessionState = {
            ...oldState,
            specification: {
              ...oldState.specification,
              id: session1.id,
              version: oldState.specification.version + 1,
            },
          };
          await sessionManager.saveSessionState(session1.id, state1);

          // Abandon first session
          await sessionManager.abandonSession(session1.id);

          // Create and populate second session
          const session2 = await sessionManager.createSession();
          const state2: SessionState = {
            ...newState,
            specification: {
              ...newState.specification,
              id: session2.id,
              version: newState.specification.version + 1,
            },
          };
          await sessionManager.saveSessionState(session2.id, state2);

          // Retrieve both sessions
          const retrieved1 = await sessionManager.getSession(session1.id);
          const retrieved2 = await sessionManager.getSession(session2.id);

          // Verify both exist
          expect(retrieved1).not.toBeNull();
          expect(retrieved2).not.toBeNull();
          if (!retrieved1 || !retrieved2) return; // Type guard

          // Verify they have different IDs
          expect(retrieved1.id).not.toBe(retrieved2.id);

          // Verify they have independent state
          // (Changes to one don't affect the other)
          expect(retrieved1.state.specification.version).toBe(
            state1.specification.version
          );
          expect(retrieved2.state.specification.version).toBe(
            state2.specification.version
          );

          // Verify conversation histories are independent
          expect(retrieved1.state.conversationHistory.length).toBe(
            state1.conversationHistory.length
          );
          expect(retrieved2.state.conversationHistory.length).toBe(
            state2.conversationHistory.length
          );
        }
      ),
      { numRuns: 50 }
    );
  }, 60000); // 60 second timeout for property test
});
