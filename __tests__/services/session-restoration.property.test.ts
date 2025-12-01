/**
 * Property Test: Session Restoration Round-Trip
 * **Feature: spec-wizard, Property 10: Session restoration round-trip**
 * **Validates: Requirements 6.2, 6.3, 6.4**
 * 
 * For any session state, saving the state and then restoring it (either from 
 * local storage or magic link) should produce an equivalent session state with 
 * identical conversation history and specification content.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitrarySessionState } from '../utils/factories';
import { setupLocalStackEnv } from '../utils/test-helpers';
import type { SessionState } from '../../lib/models/types';

// Setup LocalStack environment
setupLocalStackEnv();

describe('**Feature: spec-wizard, Property 10: Session restoration round-trip**', () => {
  let sessionManager: SessionManager;

  beforeAll(() => {
    sessionManager = new SessionManager();
  });

  test('session state round-trip via getSession preserves all data', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySessionState, async (sessionState) => {
        // Create a new session
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        // Update the session state with arbitrary data
        const updatedState: SessionState = {
          ...sessionState,
          specification: {
            ...sessionState.specification,
            id: sessionId, // Ensure ID matches
            version: sessionState.specification.version + 1, // Increment version
          },
        };

        // Save the session state
        await sessionManager.saveSessionState(sessionId, updatedState);

        // Retrieve the session
        const retrievedSession = await sessionManager.getSession(sessionId);

        // Verify session was retrieved
        expect(retrievedSession).not.toBeNull();
        if (!retrievedSession) return; // Type guard

        // Verify conversation history is preserved
        expect(retrievedSession.state.conversationHistory).toHaveLength(
          updatedState.conversationHistory.length
        );

        // Verify each message is preserved (sorted by timestamp)
        const sortedOriginal = [...updatedState.conversationHistory].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
        
        for (let i = 0; i < sortedOriginal.length; i++) {
          const original = sortedOriginal[i];
          const retrieved = retrievedSession.state.conversationHistory[i];

          expect(retrieved.id).toBe(original.id);
          expect(retrieved.role).toBe(original.role);
          expect(retrieved.content).toBe(original.content);
          expect(retrieved.timestamp.getTime()).toBe(original.timestamp.getTime());
        }

        // Verify specification is preserved
        expect(retrievedSession.state.specification.version).toBe(
          updatedState.specification.version
        );
        expect(retrievedSession.state.specification.plainEnglishSummary).toEqual(
          updatedState.specification.plainEnglishSummary
        );
        expect(retrievedSession.state.specification.formalPRD).toEqual(
          updatedState.specification.formalPRD
        );

        // Verify progress is preserved
        expect(retrievedSession.state.progress).toEqual(updatedState.progress);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test

  test('session state round-trip via magic link preserves all data', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySessionState, async (sessionState) => {
        // Create a new session
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        // Update the session state with arbitrary data
        const updatedState: SessionState = {
          ...sessionState,
          specification: {
            ...sessionState.specification,
            id: sessionId,
            version: sessionState.specification.version + 1,
          },
        };

        // Save the session state
        await sessionManager.saveSessionState(sessionId, updatedState);

        // Generate magic link
        const token = await sessionManager.generateMagicLink(sessionId);

        // Restore session from magic link
        const restoredSession = await sessionManager.restoreSessionFromMagicLink(
          token
        );

        // Verify session was restored
        expect(restoredSession).not.toBeNull();
        expect(restoredSession.id).toBe(sessionId);

        // Verify conversation history is preserved
        expect(restoredSession.state.conversationHistory).toHaveLength(
          updatedState.conversationHistory.length
        );

        // Verify each message is preserved (sorted by timestamp)
        const sortedOriginal = [...updatedState.conversationHistory].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
        
        for (let i = 0; i < sortedOriginal.length; i++) {
          const original = sortedOriginal[i];
          const retrieved = restoredSession.state.conversationHistory[i];

          expect(retrieved.id).toBe(original.id);
          expect(retrieved.role).toBe(original.role);
          expect(retrieved.content).toBe(original.content);
          expect(retrieved.timestamp.getTime()).toBe(original.timestamp.getTime());
        }

        // Verify specification is preserved
        expect(restoredSession.state.specification.version).toBe(
          updatedState.specification.version
        );
        expect(restoredSession.state.specification.plainEnglishSummary).toEqual(
          updatedState.specification.plainEnglishSummary
        );
        expect(restoredSession.state.specification.formalPRD).toEqual(
          updatedState.specification.formalPRD
        );

        // Verify progress is preserved
        expect(restoredSession.state.progress).toEqual(updatedState.progress);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test
});
