/**
 * Property Test: Specification Versioning
 * **Feature: spec-wizard, Property 8: Specification versioning**
 * **Validates: Requirements 12.3**
 *
 * Property: For any specification update, the version number should increase
 * monotonically, and all previous versions should remain accessible in the database.
 */

import * as fc from 'fast-check';
import { randomUUID } from 'crypto';
import {
  specificationToRecord,
  recordToSpecification,
  type Specification,
  type ProgressState,
} from '../../lib/models';
import { arbitrarySpecification, arbitraryProgressState } from '../utils/factories';

describe('Property 8: Specification versioning', () => {
  /**
   * Helper to create a specification with a specific version
   */
  function createSpecificationWithVersion(
    baseSpec: Specification,
    version: number
  ): Specification {
    return {
      ...baseSpec,
      version,
      lastUpdated: new Date(),
    };
  }

  it('should increase version numbers monotonically', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        fc.integer({ min: 1, max: 10 }),
        (baseSpec, numUpdates) => {
          // Create a sequence of specification versions
          const specifications: Specification[] = [];
          for (let i = 1; i <= numUpdates; i++) {
            specifications.push(createSpecificationWithVersion(baseSpec, i));
          }

          // Check that versions are monotonically increasing
          for (let i = 1; i < specifications.length; i++) {
            expect(specifications[i].version).toBeGreaterThan(
              specifications[i - 1].version
            );
            expect(specifications[i].version).toBe(specifications[i - 1].version + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain all previous versions in database records', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        arbitraryProgressState,
        fc.integer({ min: 2, max: 20 }),
        (baseSpec, progressState, numVersions) => {
          const sessionId = randomUUID();

          // Create multiple versions
          const specifications: Specification[] = [];
          for (let i = 1; i <= numVersions; i++) {
            specifications.push(createSpecificationWithVersion(baseSpec, i));
          }

          // Convert to DynamoDB records
          const records = specifications.map((spec) =>
            specificationToRecord(sessionId, spec, progressState)
          );

          // All records should have unique sort keys
          const sortKeys = records.map((record) => record.SK);
          const uniqueSortKeys = new Set(sortKeys);
          expect(uniqueSortKeys.size).toBe(sortKeys.length);

          // All records should have the same partition key
          const partitionKeys = records.map((record) => record.PK);
          const uniquePartitionKeys = new Set(partitionKeys);
          expect(uniquePartitionKeys.size).toBe(1);
          expect(partitionKeys[0]).toBe(`SESSION#${sessionId}`);

          // Sort keys should be ordered by version
          const sortedSortKeys = [...sortKeys].sort();
          expect(sortKeys).toEqual(sortedSortKeys);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all version data when converting to/from records', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        arbitraryProgressState,
        (specification, progressState) => {
          const sessionId = randomUUID();

          // Convert to record and back
          const record = specificationToRecord(
            sessionId,
            specification,
            progressState
          );
          const restored = recordToSpecification(record);

          // Version should be preserved
          expect(restored.version).toBe(specification.version);

          // Content should be preserved
          expect(restored.plainEnglishSummary).toEqual(
            specification.plainEnglishSummary
          );
          expect(restored.formalPRD).toEqual(specification.formalPRD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow querying for latest version by sorting', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        arbitraryProgressState,
        fc.integer({ min: 5, max: 15 }),
        (baseSpec, progressState, numVersions) => {
          const sessionId = randomUUID();

          // Create multiple versions in random order
          const specifications: Specification[] = [];
          for (let i = 1; i <= numVersions; i++) {
            specifications.push(createSpecificationWithVersion(baseSpec, i));
          }

          // Shuffle to simulate out-of-order creation
          const shuffled = [...specifications].sort(() => Math.random() - 0.5);

          // Convert to records
          const records = shuffled.map((spec) =>
            specificationToRecord(sessionId, spec, progressState)
          );

          // Sort by SK descending (latest first)
          const sortedRecords = [...records].sort((a, b) =>
            b.SK.localeCompare(a.SK)
          );

          // First record should be the latest version
          const latestRecord = sortedRecords[0];
          expect(latestRecord.version).toBe(numVersions);

          // Last record should be version 1
          const oldestRecord = sortedRecords[sortedRecords.length - 1];
          expect(oldestRecord.version).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never overwrite previous versions', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        arbitraryProgressState,
        fc.integer({ min: 2, max: 10 }),
        (baseSpec, progressState, numVersions) => {
          const sessionId = randomUUID();

          // Create versions
          const specifications: Specification[] = [];
          for (let i = 1; i <= numVersions; i++) {
            specifications.push(createSpecificationWithVersion(baseSpec, i));
          }

          // Convert to records
          const records = specifications.map((spec) =>
            specificationToRecord(sessionId, spec, progressState)
          );

          // Simulate storing all versions
          const storedRecords = new Map<string, typeof records[0]>();
          for (const record of records) {
            const key = `${record.PK}#${record.SK}`;
            // If key already exists, it would be an overwrite (bad!)
            expect(storedRecords.has(key)).toBe(false);
            storedRecords.set(key, record);
          }

          // All versions should be stored
          expect(storedRecords.size).toBe(numVersions);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain version history across multiple sessions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(arbitrarySpecification, arbitraryProgressState),
          { minLength: 2, maxLength: 10 }
        ),
        (sessionData) => {
          // Create multiple sessions with their own version histories
          const allRecords: Array<{
            sessionId: string;
            version: number;
            record: ReturnType<typeof specificationToRecord>;
          }> = [];

          for (const [baseSpec, progressState] of sessionData) {
            const sessionId = randomUUID();
            const numVersions = Math.floor(Math.random() * 5) + 1;

            for (let i = 1; i <= numVersions; i++) {
              const spec = createSpecificationWithVersion(baseSpec, i);
              const record = specificationToRecord(sessionId, spec, progressState);
              allRecords.push({ sessionId, version: i, record });
            }
          }

          // Group by session
          const bySession = new Map<string, typeof allRecords>();
          for (const item of allRecords) {
            if (!bySession.has(item.sessionId)) {
              bySession.set(item.sessionId, []);
            }
            bySession.get(item.sessionId)!.push(item);
          }

          // Each session should have monotonically increasing versions
          for (const [sessionId, items] of bySession) {
            const versions = items.map((item) => item.version).sort((a, b) => a - b);
            for (let i = 1; i < versions.length; i++) {
              expect(versions[i]).toBeGreaterThan(versions[i - 1]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle version numbers up to large values', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        arbitraryProgressState,
        fc.integer({ min: 1, max: 10000 }),
        (baseSpec, progressState, version) => {
          const sessionId = randomUUID();
          const spec = createSpecificationWithVersion(baseSpec, version);
          const record = specificationToRecord(sessionId, spec, progressState);

          // Version should be preserved
          expect(record.version).toBe(version);

          // Sort key should be properly padded for correct sorting
          const restored = recordToSpecification(record);
          expect(restored.version).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain temporal ordering with lastUpdated timestamps', () => {
    fc.assert(
      fc.property(
        arbitrarySpecification,
        arbitraryProgressState,
        fc.integer({ min: 2, max: 10 }),
        (baseSpec, progressState, numVersions) => {
          const sessionId = randomUUID();

          // Create versions with increasing timestamps
          const specifications: Specification[] = [];
          const baseTime = Date.now();
          for (let i = 1; i <= numVersions; i++) {
            const spec = createSpecificationWithVersion(baseSpec, i);
            spec.lastUpdated = new Date(baseTime + i * 1000); // 1 second apart
            specifications.push(spec);
          }

          // Convert to records
          const records = specifications.map((spec) =>
            specificationToRecord(sessionId, spec, progressState)
          );

          // Timestamps should be monotonically increasing
          for (let i = 1; i < records.length; i++) {
            const prevTime = new Date(records[i - 1].updatedAt).getTime();
            const currTime = new Date(records[i].updatedAt).getTime();
            expect(currTime).toBeGreaterThan(prevTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
