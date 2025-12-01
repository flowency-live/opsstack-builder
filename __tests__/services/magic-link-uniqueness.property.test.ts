/**
 * Property Test: Magic Link Uniqueness
 * **Feature: spec-wizard, Property 15: Magic link uniqueness**
 * **Validates: Requirements 6.3**
 * 
 * For any two different sessions, the generated magic links should have 
 * unique tokens that cannot be confused or collide.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { setupLocalStackEnv } from '../utils/test-helpers';

// Setup LocalStack environment
setupLocalStackEnv();

describe('**Feature: spec-wizard, Property 15: Magic link uniqueness**', () => {
  let sessionManager: SessionManager;

  beforeAll(() => {
    sessionManager = new SessionManager();
  });

  test('magic links for different sessions have unique tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // Number of sessions to create
        async (numSessions) => {
          // Create multiple sessions
          const sessions = await Promise.all(
            Array.from({ length: numSessions }, () =>
              sessionManager.createSession()
            )
          );

          // Generate magic links for all sessions
          const tokens = await Promise.all(
            sessions.map((session) =>
              sessionManager.generateMagicLink(session.id)
            )
          );

          // Verify all tokens are unique
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(tokens.length);

          // Verify each token can restore the correct session
          for (let i = 0; i < sessions.length; i++) {
            const restoredSession =
              await sessionManager.restoreSessionFromMagicLink(tokens[i]);
            expect(restoredSession.id).toBe(sessions[i].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test

  test('generating multiple magic links for same session produces unique tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of magic links to generate
        async (numLinks) => {
          // Create a single session
          const session = await sessionManager.createSession();

          // Generate multiple magic links for the same session
          const tokens = await Promise.all(
            Array.from({ length: numLinks }, () =>
              sessionManager.generateMagicLink(session.id)
            )
          );

          // Verify all tokens are unique
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(tokens.length);

          // Verify the last token can restore the session
          // (Each generation overwrites the previous token in the session record)
          const lastToken = tokens[tokens.length - 1];
          const restoredSession =
            await sessionManager.restoreSessionFromMagicLink(lastToken);
          expect(restoredSession.id).toBe(session.id);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test

  test('magic link tokens are non-empty and properly formatted', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Create a session
        const session = await sessionManager.createSession();

        // Generate magic link
        const token = await sessionManager.generateMagicLink(session.id);

        // Verify token is non-empty
        expect(token).toBeTruthy();
        expect(token.length).toBeGreaterThan(0);

        // Verify token is a valid UUID v4 format
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(token).toMatch(uuidV4Regex);
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test
});
