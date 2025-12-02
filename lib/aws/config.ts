/**
 * AWS SDK Configuration
 * Configures AWS clients for DynamoDB, S3, and SES
 * Supports LocalStack for local development
 */

const isLocalStack = process.env.USE_LOCALSTACK === 'true';
const localStackEndpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';

// Base config with credentials
// Amplify doesn't allow AWS_* prefix, so we use FBUILDER_AWS_* environment variables
const baseConfig: any = {
  region: process.env.AWS_REGION || process.env.REGION || 'eu-west-2',
};

// Add credentials if provided (Amplify SSR requires explicit credentials)
// These credentials allow Next.js API routes to access DynamoDB directly
if (process.env.FBUILDER_AWS_ACCESS_KEY_ID && process.env.FBUILDER_AWS_SECRET_ACCESS_KEY) {
  baseConfig.credentials = {
    accessKeyId: process.env.FBUILDER_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.FBUILDER_AWS_SECRET_ACCESS_KEY,
  };
}

// Override for LocalStack local development
export const awsConfig = {
  ...baseConfig,
  ...(isLocalStack && {
    endpoint: localStackEndpoint,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
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
  sessions: process.env.DYNAMODB_TABLE_NAME || 'fbuilder-sessions-dev',
};

export const bucketNames = {
  // Extract bucket name from ARN if S3_BUCKET_NAME is not set
  exports: process.env.S3_BUCKET_NAME ||
           (process.env.S3_BUCKET_ARN?.split(':')?.pop() || 'fbuilder-exports-dev-771551874768'),
};
