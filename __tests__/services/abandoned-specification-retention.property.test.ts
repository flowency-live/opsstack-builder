/**
 * Property Test: Abandoned Specification Retention
 * **Feature: spec-wizard, Property 33: Abandoned specification retention**
 * **Validates: Requirements 16.5**
 * 
 * For any abandoned specification, the data should remain in the database 
 * with status "abandoned" for potential future retrieval.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitrarySessionState } from '../utils/factories';
import { setupLocalStackEnv } from '../utils/test-helpers';
import { dynamoDBDocClient, tableNames } from '../../lib/aws';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { AccessPatterns } from '../../lib/models/dynamodb-schema';
import type { SessionState } from '../../lib/models/types';

// Setup LocalStack environment
setupLocalStackEnv();

describe('**Feature: spec-wizard, Property 33: Abandoned specification retention**', () => {
  let sessionManager: SessionManager;

  beforeAll(() => {
    sessionManager = new SessionManager();
  });

  test('abandoned session data remains in database', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySessionState.filter(state =>
          !isNaN(state.specification.lastUpdated.getTime()) &&
          state.conversationHistory.every(msg => !isNaN(msg.timestamp.getTime()))
        ),
        async (sessionState) => {
        // Create a session with data
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        // Populate the session with arbitrary data
        const populatedState: SessionState = {
          ...sessionState,
          specification: {
            ...sessionState.specification,
            id: sessionId,
            version: sessionState.specification.version + 1,
          },
        };

        await sessionManager.saveSessionState(sessionId, populatedState);

        // Abandon the session
        await sessionManager.abandonSession(sessionId);

        // Verify session can still be retrieved
        const retrievedSession = await sessionManager.getSession(sessionId);
        expect(retrievedSession).not.toBeNull();
        if (!retrievedSession) return; // Type guard

        // Verify all data is still present
        expect(retrievedSession.state.conversationHistory.length).toBe(
          populatedState.conversationHistory.length
        );
        expect(retrievedSession.state.specification.version).toBe(
          populatedState.specification.version
        );
        expect(retrievedSession.state.specification.plainEnglishSummary).toEqual(
          populatedState.specification.plainEnglishSummary
        );
        expect(retrievedSession.state.specification.formalPRD).toEqual(
          populatedState.specification.formalPRD
        );
        expect(retrievedSession.state.progress).toEqual(populatedState.progress);

        // Verify session is marked as abandoned in DynamoDB
        const metadataKey = AccessPatterns.getSessionMetadata(sessionId);
        const response = await dynamoDBDocClient.send(
          new GetCommand({
            TableName: tableNames.sessions,
            Key: metadataKey,
          })
        );

        expect(response.Item).toBeDefined();
        if (response.Item) {
          expect(response.Item.status).toBe('abandoned');
        }
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test

  test('multiple abandoned sessions retain independent data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitrarySessionState, { minLength: 2, maxLength: 5 }).filter(states => {
          // Filter out states with invalid dates
          return states.every(state => 
            !isNaN(state.specification.lastUpdated.getTime()) &&
            state.conversationHistory.every(msg => !isNaN(msg.timestamp.getTime()))
          );
        }),
        async (sessionStates) => {
          // Create and populate multiple sessions
          const sessions = await Promise.all(
            sessionStates.map(async (state, index) => {
              const session = await sessionManager.createSession();
              const populatedState: SessionState = {
                ...state,
                specification: {
                  ...state.specification,
                  id: session.id,
                  version: index + 1,
                },
              };
              await sessionManager.saveSessionState(session.id, populatedState);
              return { session, state: populatedState };
            })
          );

          // Abandon all sessions
          await Promise.all(
            sessions.map(({ session }) =>
              sessionManager.abandonSession(session.id)
            )
          );

          // Verify all sessions can still be retrieved with correct data
          for (let i = 0; i < sessions.length; i++) {
            const { session, state } = sessions[i];
            const retrieved = await sessionManager.getSession(session.id);

            expect(retrieved).not.toBeNull();
            if (!retrieved) continue; // Type guard

            // Verify data is preserved and independent
            expect(retrieved.id).toBe(session.id);
            expect(retrieved.state.specification.version).toBe(
              state.specification.version
            );
            expect(retrieved.state.conversationHistory.length).toBe(
              state.conversationHistory.length
            );

            // Verify status is abandoned
            const metadataKey = AccessPatterns.getSessionMetadata(session.id);
            const response = await dynamoDBDocClient.send(
              new GetCommand({
                TableName: tableNames.sessions,
                Key: metadataKey,
              })
            );

            expect(response.Item).toBeDefined();
            if (response.Item) {
              expect(response.Item.status).toBe('abandoned');
            }
          }
        }
      ),
      { numRuns: 50 } // Reduced runs due to multiple sessions
    );
  }, 90000); // 90 second timeout for property test

  test('abandoned session retains magic link capability', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySessionState.filter(state =>
          !isNaN(state.specification.lastUpdated.getTime()) &&
          state.conversationHistory.every(msg => !isNaN(msg.timestamp.getTime()))
        ),
        async (sessionState) => {
        // Create a session with data
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        // Populate and generate magic link
        const populatedState: SessionState = {
          ...sessionState,
          specification: {
            ...sessionState.specification,
            id: sessionId,
            version: sessionState.specification.version + 1,
          },
        };

        await sessionManager.saveSessionState(sessionId, populatedState);
        const token = await sessionManager.generateMagicLink(sessionId);

        // Abandon the session
        await sessionManager.abandonSession(sessionId);

        // Verify magic link still works
        const restoredSession = await sessionManager.restoreSessionFromMagicLink(
          token
        );

        expect(restoredSession).not.toBeNull();
        expect(restoredSession.id).toBe(sessionId);

        // Verify data is still accessible via magic link
        expect(restoredSession.state.conversationHistory.length).toBe(
          populatedState.conversationHistory.length
        );
        expect(restoredSession.state.specification.version).toBe(
          populatedState.specification.version
        );
      }),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for property test
});
