/**
 * AWS SDK Configuration
 * Configures AWS clients for DynamoDB, S3, and SES
 * Supports LocalStack for local development
 */

const isLocalStack = process.env.USE_LOCALSTACK === 'true';
const localStackEndpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';

export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  ...(isLocalStack && {
    endpoint: localStackEndpoint,
  }),
};

export const dynamoDBConfig = {
  ...awsConfig,
  ...(isLocalStack && {
    endpoint: process.env.DYNAMODB_ENDPOINT || localStackEndpoint,
  }),
};

export const s3Config = {
  ...awsConfig,
  forcePathStyle: isLocalStack, // Required for LocalStack
  ...(isLocalStack && {
    endpoint: process.env.S3_ENDPOINT || localStackEndpoint,
  }),
};

export const sesConfig = {
  ...awsConfig,
  ...(isLocalStack && {
    endpoint: process.env.SES_ENDPOINT || localStackEndpoint,
  }),
};

export const tableNames = {
  sessions: process.env.DYNAMODB_TABLE_NAME || 'spec-wizard-sessions',
};

export const bucketNames = {
  exports: process.env.S3_BUCKET_NAME || 'spec-wizard-exports',
};
