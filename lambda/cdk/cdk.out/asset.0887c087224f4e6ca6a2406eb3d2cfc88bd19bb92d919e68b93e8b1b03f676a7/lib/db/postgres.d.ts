/**
 * Postgres Database Client
 * Vercel Postgres integration for session management
 */
import { sql } from '@vercel/postgres';
export { sql };
/**
 * Initialize database schema
 * Run this once during deployment to create tables
 */
export declare function initializeDatabase(): Promise<boolean>;
/**
 * Health check for database connection
 */
export declare function checkDatabaseHealth(): Promise<boolean>;
//# sourceMappingURL=postgres.d.ts.map