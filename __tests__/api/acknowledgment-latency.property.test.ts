/**
 * Property Test: Acknowledgment latency
 * **Feature: spec-wizard, Property 21: Acknowledgment latency**
 * **Validates: Requirements 9.1**
 * 
 * For any user message, the system should provide a UI acknowledgment
 * (message appears in chat) within 200 milliseconds.
 */

import * as fc from 'fast-check';
import { sessionManager } from '@/lib/services/session-manager';
import type { Message } from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';

describe('Property 21: Acknowledgment latency', () => {
  // Arbitrary message content generator
  const arbitraryMessageContent = fc.string({ minLength: 1, maxLength: 500 });

  test('**Feature: spec-wizard, Property 21: Acknowledgment latency**', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryMessageContent, async (messageContent) => {
        // Create a session
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        // Measure time to acknowledge message (add to conversation history)
        const startTime = Date.now();

        // Create user message
        const userMessage: Message = {
          id: uuidv4(),
          role: 'user',
          content: messageContent,
          timestamp: new Date(),
        };

        // Add message to conversation history (this is the acknowledgment)
        const updatedHistory = [...session.state.conversationHistory, userMessage];

        // Save state (this simulates what the API would do)
        await sessionManager.saveSessionState(sessionId, {
          ...session.state,
          conversationHistory: updatedHistory,
        });

        const endTime = Date.now();
        const latency = endTime - startTime;

        // Property: Acknowledgment should happen within 200ms
        // Note: In a real UI test, we'd measure when the message appears in the DOM
        // Here we're testing the backend persistence latency as a proxy
        expect(latency).toBeLessThan(200);

        // Cleanup
        await sessionManager.abandonSession(sessionId);
      }),
      { numRuns: 100 }
    );
  }, 30000); // 30 second timeout for property test
});
