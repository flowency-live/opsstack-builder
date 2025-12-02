"use strict";
/**
 * Data Models Export
 * Central export point for all data models and schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleQueries = exports.accessPatternsDocumentation = exports.enableTTL = exports.createMainTable = exports.mainTableDefinition = exports.recordToSubmission = exports.submissionToRecord = exports.recordToSpecification = exports.specificationToRecord = exports.recordToMessage = exports.messageToRecord = exports.recordToSession = exports.sessionToRecord = exports.AccessPatterns = void 0;
var dynamodb_schema_1 = require("./dynamodb-schema");
Object.defineProperty(exports, "AccessPatterns", { enumerable: true, get: function () { return dynamodb_schema_1.AccessPatterns; } });
Object.defineProperty(exports, "sessionToRecord", { enumerable: true, get: function () { return dynamodb_schema_1.sessionToRecord; } });
Object.defineProperty(exports, "recordToSession", { enumerable: true, get: function () { return dynamodb_schema_1.recordToSession; } });
Object.defineProperty(exports, "messageToRecord", { enumerable: true, get: function () { return dynamodb_schema_1.messageToRecord; } });
Object.defineProperty(exports, "recordToMessage", { enumerable: true, get: function () { return dynamodb_schema_1.recordToMessage; } });
Object.defineProperty(exports, "specificationToRecord", { enumerable: true, get: function () { return dynamodb_schema_1.specificationToRecord; } });
Object.defineProperty(exports, "recordToSpecification", { enumerable: true, get: function () { return dynamodb_schema_1.recordToSpecification; } });
Object.defineProperty(exports, "submissionToRecord", { enumerable: true, get: function () { return dynamodb_schema_1.submissionToRecord; } });
Object.defineProperty(exports, "recordToSubmission", { enumerable: true, get: function () { return dynamodb_schema_1.recordToSubmission; } });
// Table definitions
var table_definitions_1 = require("./table-definitions");
Object.defineProperty(exports, "mainTableDefinition", { enumerable: true, get: function () { return table_definitions_1.mainTableDefinition; } });
Object.defineProperty(exports, "createMainTable", { enumerable: true, get: function () { return table_definitions_1.createMainTable; } });
Object.defineProperty(exports, "enableTTL", { enumerable: true, get: function () { return table_definitions_1.enableTTL; } });
Object.defineProperty(exports, "accessPatternsDocumentation", { enumerable: true, get: function () { return table_definitions_1.accessPatternsDocumentation; } });
Object.defineProperty(exports, "exampleQueries", { enumerable: true, get: function () { return table_definitions_1.exampleQueries; } });
//# sourceMappingURL=index.js.map