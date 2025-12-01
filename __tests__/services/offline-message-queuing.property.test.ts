/**
 * Property Test: Offline Message Queuing
 * **Feature: spec-wizard, Property 13: Offline message queuing**
 * **Validates: Requirements 13.3**
 *
 * For any message sent while offline, the message should be queued in browser
 * storage and successfully sent when connectivity is restored, maintaining
 * message order.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { arbitraryMessage } from '../utils/factories';
import { Message } from '../../lib/models/types';

// Mock localStorage for Node.js environment
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('Property 13: Offline Message Queuing', () => {
  let sessionManager: SessionManager;
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    sessionManager = new SessionManager();
    localStorageMock = new LocalStorageMock();
    // @ts-ignore - Mock global localStorage
    global.localStorage = localStorageMock;
    // @ts-ignore - Mock window object
    global.window = { localStorage: localStorageMock } as any;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  test('**Feature: spec-wizard, Property 13: Offline message queuing**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }), // sessionId
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (sessionId, messages) => {
          // Filter out messages with invalid timestamps
          const validMessages = messages
            .filter((msg) => !isNaN(msg.timestamp.getTime()))
            .map((msg, index) => ({
              ...msg,
              id: `msg-${index}`,
              timestamp: new Date(Date.now() + index * 1000),
            }));

          if (validMessages.length === 0) {
            return;
          }

          // Queue messages offline
          for (const message of validMessages) {
            SessionManager.queueOfflineMessage(sessionId, message);
          }

          // Retrieve queued messages
          const queuedMessages = SessionManager.getOfflineMessages(sessionId);

          // Verify all messages were queued
          expect(queuedMessages.length).toBe(validMessages.length);

          // Verify message order is maintained
          for (let i = 0; i < validMessages.length; i++) {
            expect(queuedMessages[i].id).toBe(validMessages[i].id);
            expect(queuedMessages[i].content).toBe(validMessages[i].content);
            expect(queuedMessages[i].role).toBe(validMessages[i].role);
          }

          // Clear messages
          SessionManager.clearOfflineMessages(sessionId);

          // Verify messages were cleared
          const clearedMessages = SessionManager.getOfflineMessages(sessionId);
          expect(clearedMessages.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('offline messages can be synced to server', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 5 }),
        async (messages) => {
          // Filter out messages with invalid timestamps
          const validMessages = messages
            .filter((msg) => !isNaN(msg.timestamp.getTime()))
            .map((msg, index) => ({
              ...msg,
              id: `msg-${index}`,
              timestamp: new Date(Date.now() + index * 1000),
            }));

          if (validMessages.length === 0) {
            return;
          }

          // Create a session
          const session = await sessionManager.createSession();
          const sessionId = session.id;

          // Queue messages offline
          for (const message of validMessages) {
            SessionManager.queueOfflineMessage(sessionId, message);
          }

          // Verify messages are queued
          const queuedMessages = SessionManager.getOfflineMessages(sessionId);
          expect(queuedMessages.length).toBe(validMessages.length);

          // Sync offline messages to server
          await sessionManager.syncOfflineMessages(sessionId);

          // Verify messages were cleared from offline storage
          const remainingMessages = SessionManager.getOfflineMessages(sessionId);
          expect(remainingMessages.length).toBe(0);

          // Verify messages were saved to server
          const retrievedSession = await sessionManager.getSession(sessionId);
          expect(retrievedSession).not.toBeNull();
          expect(retrievedSession!.state.conversationHistory.length).toBe(
            validMessages.length
          );

          // Verify message order is preserved
          for (let i = 0; i < validMessages.length; i++) {
            expect(retrievedSession!.state.conversationHistory[i].id).toBe(
              validMessages[i].id
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('queuing messages for different sessions keeps them separate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.string({ minLength: 1, maxLength: 36 }),
        arbitraryMessage,
        arbitraryMessage,
        async (sessionId1, sessionId2, message1, message2) => {
          // Ensure different session IDs
          if (sessionId1 === sessionId2) {
            return;
          }

          // Filter invalid timestamps
          if (
            isNaN(message1.timestamp.getTime()) ||
            isNaN(message2.timestamp.getTime())
          ) {
            return;
          }

          // Queue messages for different sessions
          SessionManager.queueOfflineMessage(sessionId1, message1);
          SessionManager.queueOfflineMessage(sessionId2, message2);

          // Retrieve messages for each session
          const session1Messages = SessionManager.getOfflineMessages(sessionId1);
          const session2Messages = SessionManager.getOfflineMessages(sessionId2);

          // Verify messages are kept separate
          expect(session1Messages.length).toBe(1);
          expect(session2Messages.length).toBe(1);
          expect(session1Messages[0].id).toBe(message1.id);
          expect(session2Messages[0].id).toBe(message2.id);

          // Clean up
          SessionManager.clearOfflineMessages(sessionId1);
          SessionManager.clearOfflineMessages(sessionId2);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('offline message queuing handles localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    const errorMock = {
      getItem: () => {
        throw new Error('Storage quota exceeded');
      },
      setItem: () => {
        throw new Error('Storage quota exceeded');
      },
      removeItem: () => {
        throw new Error('Storage quota exceeded');
      },
    };

    // @ts-ignore
    global.localStorage = errorMock;
    // @ts-ignore
    global.window = { localStorage: errorMock } as any;

    const sessionId = 'test-session';
    const message: Message = {
      id: 'test-msg',
      role: 'user',
      content: 'test content',
      timestamp: new Date(),
    };

    // These should not throw even when localStorage fails
    expect(() => {
      SessionManager.queueOfflineMessage(sessionId, message);
    }).not.toThrow();

    expect(() => {
      SessionManager.getOfflineMessages(sessionId);
    }).not.toThrow();

    expect(() => {
      SessionManager.clearOfflineMessages(sessionId);
    }).not.toThrow();

    // Restore mock
    // @ts-ignore
    global.localStorage = localStorageMock;
    // @ts-ignore
    global.window = { localStorage: localStorageMock } as any;
  });
});
