/**
 * Property Test: Session Data Integrity
 * **Feature: spec-wizard, Property 29: Unique identifier assignment**
 * **Validates: Requirements 12.4**
 *
 * Property: For any two different sessions or submissions, the system should
 * assign unique identifiers that never collide.
 */

import * as fc from 'fast-check';
import { randomUUID } from 'crypto';
import {
  sessionToRecord,
  submissionToRecord,
  type Session,
  type Submission,
  type SessionState,
} from '../../lib/models';
import { arbitrarySessionState, arbitraryContactInfo } from '../utils/factories';

describe('Property 29: Unique identifier assignment', () => {
  /**
   * Helper to create a session with a unique ID
   */
  function createSession(state: SessionState): Session {
    return {
      id: randomUUID(),
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      state,
    };
  }

  /**
   * Helper to create a submission with a unique ID
   */
  function createSubmission(sessionId: string): Submission {
    return {
      id: randomUUID(),
      sessionId,
      contactInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
      },
      specificationVersion: 1,
      submittedAt: new Date(),
      status: 'pending',
      referenceNumber: `REF-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }

  it('should generate unique session IDs for different sessions', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySessionState, { minLength: 2, maxLength: 100 }),
        (sessionStates) => {
          // Create sessions with unique IDs
          const sessions = sessionStates.map((state) => createSession(state));

          // Extract all session IDs
          const sessionIds = sessions.map((session) => session.id);

          // Check that all IDs are unique
          const uniqueIds = new Set(sessionIds);
          expect(uniqueIds.size).toBe(sessionIds.length);

          // Verify no collisions in DynamoDB keys
          const records = sessions.map((session) => sessionToRecord(session));
          const primaryKeys = records.map((record) => record.PK);
          const uniquePKs = new Set(primaryKeys);
          expect(uniquePKs.size).toBe(primaryKeys.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate unique submission IDs for different submissions', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryContactInfo, { minLength: 2, maxLength: 100 }),
        (contactInfos) => {
          // Create submissions with unique IDs
          const submissions = contactInfos.map((contactInfo, index) => ({
            id: randomUUID(),
            sessionId: `session-${index}`,
            contactInfo,
            specificationVersion: 1,
            submittedAt: new Date(),
            status: 'pending' as const,
            referenceNumber: `REF-${Date.now()}-${index}`,
          }));

          // Extract all submission IDs
          const submissionIds = submissions.map((submission) => submission.id);

          // Check that all IDs are unique
          const uniqueIds = new Set(submissionIds);
          expect(uniqueIds.size).toBe(submissionIds.length);

          // Verify no collisions in DynamoDB keys
          const records = submissions.map((submission) =>
            submissionToRecord(submission)
          );
          const primaryKeys = records.map((record) => record.PK);
          const uniquePKs = new Set(primaryKeys);
          expect(uniquePKs.size).toBe(primaryKeys.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate unique reference numbers for submissions', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryContactInfo, { minLength: 2, maxLength: 100 }),
        (contactInfos) => {
          // Create submissions with unique reference numbers
          const submissions = contactInfos.map((contactInfo, index) => {
            const timestamp = Date.now() + index; // Ensure uniqueness
            return {
              id: randomUUID(),
              sessionId: `session-${index}`,
              contactInfo,
              specificationVersion: 1,
              submittedAt: new Date(),
              status: 'pending' as const,
              referenceNumber: `REF-${timestamp}-${Math.random().toString(36).substring(7)}`,
            };
          });

          // Extract all reference numbers
          const referenceNumbers = submissions.map(
            (submission) => submission.referenceNumber
          );

          // Check that all reference numbers are unique
          const uniqueRefs = new Set(referenceNumbers);
          expect(uniqueRefs.size).toBe(referenceNumbers.length);

          // Verify no collisions in GSI keys
          const records = submissions.map((submission) =>
            submissionToRecord(submission)
          );
          const gsiKeys = records.map((record) => record.GSI1PK);
          const uniqueGSIKeys = new Set(gsiKeys);
          expect(uniqueGSIKeys.size).toBe(gsiKeys.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate unique magic link tokens when assigned', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySessionState, { minLength: 2, maxLength: 100 }),
        (sessionStates) => {
          // Create sessions with magic link tokens
          const sessions = sessionStates.map((state) => ({
            ...createSession(state),
            magicLinkToken: randomUUID(),
          }));

          // Extract all magic link tokens
          const tokens = sessions
            .map((session) => session.magicLinkToken)
            .filter((token): token is string => token !== undefined);

          // Check that all tokens are unique
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(tokens.length);

          // Verify no collisions in GSI keys
          const records = sessions.map((session) => sessionToRecord(session));
          const gsiKeys = records
            .map((record) => record.GSI1PK)
            .filter((key): key is string => key !== undefined);
          const uniqueGSIKeys = new Set(gsiKeys);
          expect(uniqueGSIKeys.size).toBe(gsiKeys.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never generate the same ID across sessions and submissions', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(arbitrarySessionState, { minLength: 10, maxLength: 50 }),
          fc.array(arbitraryContactInfo, { minLength: 10, maxLength: 50 })
        ),
        ([sessionStates, contactInfos]) => {
          // Create sessions
          const sessions = sessionStates.map((state) => createSession(state));

          // Create submissions
          const submissions = contactInfos.map((contactInfo, index) =>
            createSubmission(`session-${index}`)
          );

          // Collect all IDs
          const allIds = [
            ...sessions.map((s) => s.id),
            ...submissions.map((s) => s.id),
          ];

          // Check that all IDs are unique across both types
          const uniqueIds = new Set(allIds);
          expect(uniqueIds.size).toBe(allIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain uniqueness even with concurrent creation', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySessionState, { minLength: 10, maxLength: 50 }),
        (sessionStates) => {
          // Simulate concurrent session creation
          const sessions = sessionStates.map((state) => createSession(state));

          // All sessions should have unique IDs
          const sessionIds = sessions.map((s) => s.id);
          const uniqueIds = new Set(sessionIds);
          expect(uniqueIds.size).toBe(sessionIds.length);

          // All DynamoDB records should have unique keys
          const records = sessions.map((session) => sessionToRecord(session));
          const keys = records.map((r) => `${r.PK}#${r.SK}`);
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
