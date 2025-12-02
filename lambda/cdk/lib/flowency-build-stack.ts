/**
 * Flowency Build Infrastructure Stack
 * Simple serverless stack: DynamoDB + Lambda + API Gateway
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class FlowencyBuildStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table (same schema as before)
    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: 'flowency-build-sessions',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI for magic link lookups
    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Shared Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB access to Lambda role
    sessionsTable.grantReadWriteData(lambdaRole);

    // Shared environment variables
    const lambdaEnvironment = {
      DYNAMODB_TABLE_NAME: sessionsTable.tableName,
      REGION: this.region,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      APP_URL: process.env.APP_URL || 'https://my.flowency.build',
    };

    // Lambda Functions
    const createSessionLambda = new lambda.Function(this, 'CreateSession', {
      functionName: 'flowency-build-create-session',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create-session.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: lambdaEnvironment,
      role: lambdaRole,
    });

    const getSessionLambda = new lambda.Function(this, 'GetSession', {
      functionName: 'flowency-build-get-session',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get-session.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: lambdaEnvironment,
      role: lambdaRole,
    });

    const generateMagicLinkLambda = new lambda.Function(this, 'GenerateMagicLink', {
      functionName: 'flowency-build-generate-magic-link',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'generate-magic-link.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: lambdaEnvironment,
      role: lambdaRole,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'FlowencyBuildAPI', {
      restApiName: 'Flowency Build API',
      description: 'API for Flowency Build specification wizard',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API Routes
    const sessions = api.root.addResource('sessions');
    sessions.addMethod('POST', new apigateway.LambdaIntegration(createSessionLambda));

    const session = sessions.addResource('{id}');
    session.addMethod('GET', new apigateway.LambdaIntegration(getSessionLambda));

    const magicLink = session.addResource('magic-link');
    magicLink.addMethod('POST', new apigateway.LambdaIntegration(generateMagicLinkLambda));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'FlowencyBuildApiUrl',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: sessionsTable.tableName,
      description: 'DynamoDB Table Name',
      exportName: 'FlowencyBuildTableName',
    });
  }
}
