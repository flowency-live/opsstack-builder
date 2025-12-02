"use strict";
/**
 * Postgres Database Client
 * Vercel Postgres integration for session management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.initializeDatabase = initializeDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
const postgres_1 = require("@vercel/postgres");
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return postgres_1.sql; } });
/**
 * Initialize database schema
 * Run this once during deployment to create tables
 */
async function initializeDatabase() {
    try {
        // Check if sessions table exists
        const result = await (0, postgres_1.sql) `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sessions'
      );
    `;
        if (!result.rows[0].exists) {
            console.log('Database tables not found. Please run the schema.sql file manually.');
            console.log('You can do this in the Vercel Postgres dashboard or using the Vercel CLI.');
        }
        return true;
    }
    catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}
/**
 * Health check for database connection
 */
async function checkDatabaseHealth() {
    try {
        await (0, postgres_1.sql) `SELECT 1 as health_check`;
        return true;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=postgres.js.map