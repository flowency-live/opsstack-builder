"use strict";
/**
 * AWS Services Export
 * Central export point for all AWS service clients
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketNames = exports.tableNames = exports.awsConfig = exports.sesClient = exports.s3Client = exports.dynamoDBDocClient = exports.dynamoDBClient = void 0;
var dynamodb_1 = require("./dynamodb");
Object.defineProperty(exports, "dynamoDBClient", { enumerable: true, get: function () { return dynamodb_1.dynamoDBClient; } });
Object.defineProperty(exports, "dynamoDBDocClient", { enumerable: true, get: function () { return dynamodb_1.dynamoDBDocClient; } });
var s3_1 = require("./s3");
Object.defineProperty(exports, "s3Client", { enumerable: true, get: function () { return s3_1.s3Client; } });
var ses_1 = require("./ses");
Object.defineProperty(exports, "sesClient", { enumerable: true, get: function () { return ses_1.sesClient; } });
var config_1 = require("./config");
Object.defineProperty(exports, "awsConfig", { enumerable: true, get: function () { return config_1.awsConfig; } });
Object.defineProperty(exports, "tableNames", { enumerable: true, get: function () { return config_1.tableNames; } });
Object.defineProperty(exports, "bucketNames", { enumerable: true, get: function () { return config_1.bucketNames; } });
//# sourceMappingURL=index.js.map