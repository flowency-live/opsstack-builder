/**
 * Property Test: Error State Preservation
 * **Feature: spec-wizard, Property 12: Error state preservation**
 * **Validates: Requirements 13.1, 13.5**
 *
 * For any error that occurs during processing, the user's input and current
 * session state should be preserved in the database before the error is reported.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitrarySessionState } from '../utils/factories';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocClient, tableNames } from '../../lib/aws';

describe('Property 12: Error State Preservation', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager(tableNames.sessions);
  });

  test('**Feature: spec-wizard, Property 12: Error state preservation**', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySessionState,
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 5, maxLength: 200 }),
        async (sessionState, userInput, errorMessage) => {
          // Create a session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          // Save initial state
          await sessionManager.saveSessionState(sessionId, sessionState);

          // Simulate an error occurring
          const error = new Error(errorMessage);

          // Preserve error state
          await sessionManager.preserveErrorState(
            sessionId,
            error,
            userInput,
            sessionState
          );

          // Verify error record was saved
          const errorRecords = await dynamoDBDocClient.send(
            new QueryCommand({
              TableName: tableNames.sessions,
              KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
              ExpressionAttributeValues: {
                ':pk': `SESSION#${sessionId}`,
                ':sk': 'ERROR#',
              },
            })
          );

          // Should have at least one error record
          expect(errorRecords.Items).toBeDefined();
          expect(errorRecords.Items!.length).toBeGreaterThan(0);

          // Verify error record contains the error information
          const errorRecord = errorRecords.Items![0];
          expect(errorRecord.errorMessage).toBe(errorMessage);
          expect(errorRecord.userInput).toBe(userInput);
          expect(errorRecord.sessionId).toBe(sessionId);

          // Verify session state is still intact and can be retrieved
          const retrievedSession = await sessionManager.getSession(sessionId);
          expect(retrievedSession).not.toBeNull();
          expect(retrievedSession!.state.conversationHistory.length).toBe(
            sessionState.conversationHistory.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error preservation should not fail even if state save fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (errorMessage, userInput) => {
          // Use an invalid session ID to simulate a failure scenario
          const invalidSessionId = 'nonexistent-session-id';
          const error = new Error(errorMessage);

          // This should not throw even though the session doesn't exist
          await expect(
            sessionManager.preserveErrorState(
              invalidSessionId,
              error,
              userInput,
              undefined
            )
          ).resolves.not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });
});
