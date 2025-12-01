/**
 * Property Test: Single Active Specification
 * **Feature: spec-wizard, Property 31: Single active specification**
 * **Validates: Requirements 16.1**
 * 
 * For any user session, there should be at most one active specification at any time.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitrarySessionState } from '../utils/factories';
import { setupLocalStackEnv } from '../utils/test-helpers';
import type { SessionState } from '../../lib/models/types';

// Setup LocalStack environment
setupLocalStackEnv();

describe('**Feature: spec-wizard, Property 31: Single active specification**', () => {
  let sessionManager: SessionManager;

  beforeAll(() => {
    sessionManager = new SessionManager();
  });

  test('session always has exactly one active specification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitrarySessionState, { minLength: 1, maxLength: 5 }),
        async (sessionStates) => {
          // Create a new session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          // Save multiple state updates
          for (let i = 0; i < sessionStates.length; i++) {
            const state: SessionState = {
              ...sessionStates[i],
              specification: {
                ...sessionStates[i].specification,
                id: sessionId,
                version: i + 1, // Increment version for each update
              },
            };

            await sessionManager.saveSessionState(sessionId, state);
          }

          // Retrieve the session
          const retrievedSession = await sessionManager.getSession(sessionId);

          // Verify session exists
          expect(retrievedSession).not.toBeNull();
          if (!retrievedSession) return; // Type guard

          // Verify there is exactly one specification (the latest one)
          expect(retrievedSession.state.specification).toBeDefined();
          expect(retrievedSession.state.specification.id).toBe(sessionId);

          // Verify it's the latest version
          expect(retrievedSession.state.specification.version).toBe(
            sessionStates.length
          );

          // Verify the specification content matches the last saved state
          const lastState = sessionStates[sessionStates.length - 1];
          expect(retrievedSession.state.specification.plainEnglishSummary).toEqual(
            lastState.specification.plainEnglishSummary
          );
          expect(retrievedSession.state.specification.formalPRD).toEqual(
            lastState.specification.formalPRD
          );
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test

  test('creating new session always starts with one specification', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Create a new session
        const session = await sessionManager.createSession();

        // Verify session has exactly one specification
        expect(session.state.specification).toBeDefined();
        expect(session.state.specification.id).toBe(session.id);
        expect(session.state.specification.version).toBe(0);

        // Retrieve the session to verify persistence
        const retrievedSession = await sessionManager.getSession(session.id);
        expect(retrievedSession).not.toBeNull();
        if (!retrievedSession) return; // Type guard

        // Verify retrieved session also has exactly one specification
        expect(retrievedSession.state.specification).toBeDefined();
        expect(retrievedSession.state.specification.id).toBe(session.id);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test

  test('session specification ID always matches session ID', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySessionState, async (sessionState) => {
        // Create a new session
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        // Update with arbitrary state
        const updatedState: SessionState = {
          ...sessionState,
          specification: {
            ...sessionState.specification,
            id: sessionId, // Ensure ID matches
            version: sessionState.specification.version + 1,
          },
        };

        await sessionManager.saveSessionState(sessionId, updatedState);

        // Retrieve the session
        const retrievedSession = await sessionManager.getSession(sessionId);

        // Verify specification ID matches session ID
        expect(retrievedSession).not.toBeNull();
        if (!retrievedSession) return; // Type guard

        expect(retrievedSession.state.specification.id).toBe(sessionId);
        expect(retrievedSession.id).toBe(sessionId);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test
});
