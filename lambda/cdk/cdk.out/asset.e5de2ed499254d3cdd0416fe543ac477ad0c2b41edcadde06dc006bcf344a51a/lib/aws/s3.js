"use strict";
/**
 * S3 Client Configuration
 * Includes encryption at rest configuration
 * Requirements: 18.2 - Data encryption
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
exports.putObjectEncrypted = putObjectEncrypted;
exports.getObject = getObject;
exports.isBucketEncrypted = isBucketEncrypted;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("./config");
// Create S3 client with encryption enabled
// Note: Server-side encryption is applied per-object via PutObject parameters
const client = new client_s3_1.S3Client({
    ...config_1.s3Config,
    // Ensure TLS 1.3 for data in transit
    requestHandler: {
        httpsAgent: {
            minVersion: 'TLSv1.3',
        },
    },
});
exports.s3Client = client;
/**
 * Upload object to S3 with encryption
 * Automatically applies AES256 server-side encryption
 */
async function putObjectEncrypted(bucket, key, body, contentType) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ServerSideEncryption: 'AES256', // Enable server-side encryption
        ContentType: contentType,
    });
    await client.send(command);
}
/**
 * Get object from S3
 */
async function getObject(bucket, key) {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    const response = await client.send(command);
    const stream = response.Body;
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
/**
 * Check if an S3 bucket has default encryption enabled
 */
async function isBucketEncrypted(bucketName) {
    try {
        const { GetBucketEncryptionCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
        const command = new GetBucketEncryptionCommand({ Bucket: bucketName });
        const response = await client.send(command);
        // Check if encryption rules exist
        return (response.ServerSideEncryptionConfiguration?.Rules?.length ?? 0) > 0;
    }
    catch (error) {
        // If error is ServerSideEncryptionConfigurationNotFoundError, encryption is not enabled
        if (error.name === 'ServerSideEncryptionConfigurationNotFoundError') {
            return false;
        }
        console.error('Error checking bucket encryption:', error);
        return false;
    }
}
//# sourceMappingURL=s3.js.map