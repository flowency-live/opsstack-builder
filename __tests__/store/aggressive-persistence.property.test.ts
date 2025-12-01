/**
 * Property Test: Aggressive Persistence
 * **Feature: spec-wizard, Property 9: Aggressive persistence**
 * **Validates: Requirements 6.1, 13.4**
 * 
 * For any message exchange, the conversation state and specification should be
 * persisted to the database before the response is sent to the user.
 */

import * as fc from 'fast-check';
import { SessionManager } from '@/lib/services/session-manager';
import { dynamoDBDocClient, tableNames } from '@/lib/aws';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Message, SessionState, Specification } from '@/lib/models/types';
import {
  arbitraryMessage,
  arbitrarySpecification,
  arbitraryProgressState,
} from '../utils/factories';

describe('Property 9: Aggressive Persistence', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager(tableNames.sessions);
  });

  /**
   * Property: For any message exchange, state should be persisted before response
   * 
   * Test strategy:
   * 1. Generate random messages and session state
   * 2. Save state to database
   * 3. Immediately retrieve from database
   * 4. Verify all data was persisted correctly
   */
  test('**Feature: spec-wizard, Property 9: Aggressive persistence**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        arbitrarySpecification,
        arbitraryProgressState,
        async (messages, specification, progress) => {
          // Skip if any dates are invalid
          if (messages.some((m) => isNaN(m.timestamp.getTime()))) {
            return;
          }
          if (isNaN(specification.lastUpdated.getTime())) {
            return;
          }

          // Create a session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          // Ensure unique message IDs by appending index
          const uniqueMessages = messages.map((msg, index) => ({
            ...msg,
            id: `${msg.id}-${index}-${Date.now()}`,
          }));

          // Build session state with messages
          const sessionState: SessionState = {
            conversationHistory: uniqueMessages,
            specification,
            progress,
          };

          // Save state (aggressive persistence)
          await sessionManager.saveSessionState(sessionId, sessionState);

          // Immediately retrieve the session from database
          const retrievedSession = await sessionManager.getSession(sessionId);

          // Verify session was retrieved
          expect(retrievedSession).not.toBeNull();
          if (!retrievedSession) return;

          // Verify all messages were persisted
          expect(retrievedSession.state.conversationHistory).toHaveLength(
            uniqueMessages.length
          );

          // Verify all message IDs are present (messages are sorted by timestamp)
          const retrievedIds = new Set(
            retrievedSession.state.conversationHistory.map((m) => m.id)
          );
          const originalIds = new Set(uniqueMessages.map((m) => m.id));
          
          expect(retrievedIds.size).toBe(originalIds.size);
          for (const id of originalIds) {
            expect(retrievedIds.has(id)).toBe(true);
          }

          // Verify message content matches (find by ID since order may differ)
          for (const original of uniqueMessages) {
            const persisted = retrievedSession.state.conversationHistory.find(
              (m) => m.id === original.id
            );
            expect(persisted).toBeDefined();
            if (!persisted) continue;

            expect(persisted.role).toBe(original.role);
            expect(persisted.content).toBe(original.content);
            // Timestamps should be close (within 1 second due to serialization)
            expect(
              Math.abs(
                persisted.timestamp.getTime() - original.timestamp.getTime()
              )
            ).toBeLessThan(1000);
          }

          // Verify specification was persisted
          expect(retrievedSession.state.specification.version).toBe(
            specification.version
          );
          expect(
            retrievedSession.state.specification.plainEnglishSummary.overview
          ).toBe(specification.plainEnglishSummary.overview);
          expect(
            retrievedSession.state.specification.formalPRD.introduction
          ).toBe(specification.formalPRD.introduction);

          // Verify progress was persisted
          expect(retrievedSession.state.progress.overallCompleteness).toBe(
            progress.overallCompleteness
          );
          expect(retrievedSession.state.progress.projectComplexity).toBe(
            progress.projectComplexity
          );
        }
      ),
      {
        numRuns: 100,
        timeout: 30000,
      }
    );
  }, 60000);

  /**
   * Property: State should be persisted after EVERY message, not just batches
   * 
   * Test strategy:
   * 1. Start with empty conversation
   * 2. Add messages one at a time
   * 3. After each message, verify it's immediately in the database
   */
  test('state persists after each individual message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryMessage, { minLength: 2, maxLength: 5 }),
        arbitrarySpecification,
        arbitraryProgressState,
        async (messages, specification, progress) => {
          // Create a session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, index) => ({
            ...msg,
            id: `${msg.id}-${index}-${Date.now()}`,
          }));

          // Add messages one at a time
          for (let i = 0; i < uniqueMessages.length; i++) {
            const currentMessages = uniqueMessages.slice(0, i + 1);

            const sessionState: SessionState = {
              conversationHistory: currentMessages,
              specification: {
                ...specification,
                version: i + 1, // Increment version with each save
              },
              progress,
            };

            // Save state after this message
            await sessionManager.saveSessionState(sessionId, sessionState);

            // Immediately verify it's in the database
            const retrieved = await sessionManager.getSession(sessionId);
            expect(retrieved).not.toBeNull();
            if (!retrieved) continue;

            // Should have exactly i+1 messages
            expect(retrieved.state.conversationHistory).toHaveLength(i + 1);

            // Current message should be present (find by ID since messages are sorted by timestamp)
            const currentMessage = retrieved.state.conversationHistory.find(
              (m) => m.id === uniqueMessages[i].id
            );
            expect(currentMessage).toBeDefined();
            if (currentMessage) {
              expect(currentMessage.content).toBe(uniqueMessages[i].content);
            }
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 30000,
      }
    );
  }, 60000);

  /**
   * Property: Persistence should happen synchronously before returning
   * 
   * Test strategy:
   * 1. Save state
   * 2. Immediately query database (no delay)
   * 3. Data should already be there
   */
  test('persistence is synchronous - data available immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMessage,
        arbitrarySpecification,
        arbitraryProgressState,
        async (message, specification, progress) => {
          // Create a session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          const sessionState: SessionState = {
            conversationHistory: [message],
            specification,
            progress,
          };

          // Save state
          const saveStartTime = Date.now();
          await sessionManager.saveSessionState(sessionId, sessionState);
          const saveEndTime = Date.now();

          // Immediately retrieve (no artificial delay)
          const retrieveStartTime = Date.now();
          const retrieved = await sessionManager.getSession(sessionId);
          const retrieveEndTime = Date.now();

          // Verify data is there
          expect(retrieved).not.toBeNull();
          expect(retrieved!.state.conversationHistory).toHaveLength(1);
          expect(retrieved!.state.conversationHistory[0].id).toBe(message.id);

          // Log timing for verification (should be fast)
          const saveTime = saveEndTime - saveStartTime;
          const retrieveTime = retrieveEndTime - retrieveStartTime;
          console.log(
            `Save time: ${saveTime}ms, Retrieve time: ${retrieveTime}ms`
          );

          // Both operations should complete reasonably quickly
          expect(saveTime).toBeLessThan(5000); // 5 seconds max
          expect(retrieveTime).toBeLessThan(5000);
        }
      ),
      {
        numRuns: 20,
        timeout: 30000,
      }
    );
  }, 60000);

  /**
   * Property: No data loss during rapid message exchanges
   * 
   * Test strategy:
   * 1. Rapidly add multiple messages in quick succession
   * 2. Verify all messages are persisted
   * 3. No messages should be lost due to race conditions
   */
  test('no data loss during rapid message exchanges', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryMessage, { minLength: 3, maxLength: 8 }),
        arbitrarySpecification,
        arbitraryProgressState,
        async (messages, specification, progress) => {
          // Skip if any dates are invalid
          if (messages.some((m) => isNaN(m.timestamp.getTime()))) {
            return;
          }
          if (isNaN(specification.lastUpdated.getTime())) {
            return;
          }

          // Create a session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, index) => ({
            ...msg,
            id: `${msg.id}-${index}-${Date.now()}`,
          }));

          // Rapidly save messages (simulating quick user interaction)
          const savePromises = uniqueMessages.map(async (_, index) => {
            const currentMessages = uniqueMessages.slice(0, index + 1);
            const sessionState: SessionState = {
              conversationHistory: currentMessages,
              specification: {
                ...specification,
                version: index + 1,
              },
              progress,
            };

            await sessionManager.saveSessionState(sessionId, sessionState);
          });

          // Wait for all saves to complete
          await Promise.all(savePromises);

          // Retrieve final state
          const retrieved = await sessionManager.getSession(sessionId);
          expect(retrieved).not.toBeNull();
          if (!retrieved) return;

          // Should have all messages
          expect(retrieved.state.conversationHistory.length).toBeGreaterThanOrEqual(
            uniqueMessages.length
          );

          // All original message IDs should be present
          const retrievedIds = new Set(
            retrieved.state.conversationHistory.map((m) => m.id)
          );
          for (const message of uniqueMessages) {
            expect(retrievedIds.has(message.id)).toBe(true);
          }
        }
      ),
      {
        numRuns: 30,
        timeout: 30000,
      }
    );
  }, 60000);
});
