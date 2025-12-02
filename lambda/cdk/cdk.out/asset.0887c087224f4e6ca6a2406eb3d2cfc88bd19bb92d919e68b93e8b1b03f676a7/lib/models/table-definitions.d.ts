/**
 * DynamoDB Table Definitions
 * Single-table design with GSI for magic link and reference number lookups
 */
import { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';
/**
 * Main table definition for single-table design
 * Stores sessions, messages, specifications, and submissions
 */
export declare const mainTableDefinition: CreateTableCommandInput;
/**
 * Create the main table if it doesn't exist
 */
export declare function createMainTable(): Promise<void>;
/**
 * Enable Time To Live (TTL) for 30-day session expiration
 */
export declare function enableTTL(): Promise<void>;
/**
 * Access patterns documentation
 */
export declare const accessPatternsDocumentation: {
    patterns: {
        name: string;
        description: string;
        query: string;
    }[];
};
/**
 * Example queries for each access pattern
 */
export declare const exampleQueries: {
    getSession: {
        PK: string;
        SK: string;
    };
    getConversationHistory: {
        PK: string;
        SK: {
            $beginsWith: string;
        };
    };
    getLatestSpec: {
        PK: string;
        SK: {
            $beginsWith: string;
        };
        ScanIndexForward: boolean;
        Limit: number;
    };
    restoreFromMagicLink: {
        IndexName: string;
        GSI1PK: string;
    };
    getSubmissionByReference: {
        IndexName: string;
        GSI1PK: string;
    };
};
//# sourceMappingURL=table-definitions.d.ts.map