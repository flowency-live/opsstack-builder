#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { CDNStack } from '../lib/cdn-stack';
import { EmailStack } from '../lib/email-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { SecurityStack } from '../lib/security-stack';
import { APIGatewayStack } from '../lib/apigateway-stack';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'eu-west-2',
};

const environment = process.env.ENVIRONMENT || 'dev';
const appName = process.env.APP_NAME || 'opstack-builder';

// Common tags for all resources
const commonTags = {
  Project: process.env.PROJECT || 'OpStackBuilder',
  Product: 'OpStackBuilder',
  Environment: environment,
  Owner: process.env.OWNER || 'engineering-team',
  CostCenter: process.env.COST_CENTER || 'product-development',
  ManagedBy: 'CDK',
};

// Security Stack (IAM roles, KMS keys, Secrets Manager)
const securityStack = new SecurityStack(app, `${appName}-SecurityStack-${environment}`, {
  env,
  description: 'Security resources including IAM roles and KMS keys',
  tags: commonTags,
  environment,
  appName,
});

// Database Stack (DynamoDB)
const databaseStack = new DatabaseStack(app, `${appName}-DatabaseStack-${environment}`, {
  env,
  description: 'DynamoDB tables for sessions, specifications, and submissions',
  tags: commonTags,
  environment,
  appName,
  encryptionKey: securityStack.dynamoDBEncryptionKey,
});

// Storage Stack (S3)
const storageStack = new StorageStack(app, `${appName}-StorageStack-${environment}`, {
  env,
  description: 'S3 buckets for PDFs and exports',
  tags: commonTags,
  environment,
  appName,
  encryptionKey: securityStack.s3EncryptionKey,
});

// CDN Stack (CloudFront)
const cdnStack = new CDNStack(app, `${appName}-CDNStack-${environment}`, {
  env,
  description: 'CloudFront distribution for content delivery',
  tags: commonTags,
  environment,
  appName,
  exportsBucket: storageStack.exportsBucket,
});

// Email Stack (SES)
const emailStack = new EmailStack(app, `${appName}-EmailStack-${environment}`, {
  env,
  description: 'SES configuration for email sending',
  tags: commonTags,
  environment,
  appName,
});

// API Gateway Stack (WebSocket)
const apiGatewayStack = new APIGatewayStack(app, `${appName}-APIGatewayStack-${environment}`, {
  env,
  description: 'API Gateway for WebSocket support',
  tags: commonTags,
  environment,
  appName,
  lambdaRole: securityStack.lambdaExecutionRole,
});

// Monitoring Stack (CloudWatch)
const monitoringStack = new MonitoringStack(app, `${appName}-MonitoringStack-${environment}`, {
  env,
  description: 'CloudWatch monitoring, logging, and alarms',
  tags: commonTags,
  environment,
  appName,
  dynamoDBTable: databaseStack.mainTable,
  exportsBucket: storageStack.exportsBucket,
  apiGateway: apiGatewayStack.webSocketApi,
});

// Stack dependencies
databaseStack.addDependency(securityStack);
storageStack.addDependency(securityStack);
cdnStack.addDependency(storageStack);
apiGatewayStack.addDependency(securityStack);
monitoringStack.addDependency(databaseStack);
monitoringStack.addDependency(storageStack);
monitoringStack.addDependency(apiGatewayStack);

app.synth();
