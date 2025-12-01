import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SecurityStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
}

export class SecurityStack extends cdk.Stack {
  public readonly dynamoDBEncryptionKey: kms.Key;
  public readonly s3EncryptionKey: kms.Key;
  public readonly lambdaExecutionRole: iam.Role;
  public readonly apiKeySecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    const { environment, appName } = props;

    // KMS key for DynamoDB encryption
    this.dynamoDBEncryptionKey = new kms.Key(this, 'DynamoDBEncryptionKey', {
      alias: `${appName}/dynamodb/${environment}`,
      description: `Encryption key for ${appName} DynamoDB tables in ${environment}`,
      enableKeyRotation: true,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // KMS key for S3 encryption
    this.s3EncryptionKey = new kms.Key(this, 'S3EncryptionKey', {
      alias: `${appName}/s3/${environment}`,
      description: `Encryption key for ${appName} S3 buckets in ${environment}`,
      enableKeyRotation: true,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Secrets Manager for API keys
    this.apiKeySecret = new secretsmanager.Secret(this, 'APIKeySecret', {
      secretName: `${appName}/api-keys/${environment}`,
      description: 'API keys for LLM providers and other services',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          openaiApiKey: '',
          anthropicApiKey: '',
        }),
        generateStringKey: 'placeholder',
      },
    });

    // Lambda execution role
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${appName}-lambda-execution-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
    });

    // Grant Lambda role access to secrets
    this.apiKeySecret.grantRead(this.lambdaExecutionRole);

    // Grant Lambda role access to KMS keys
    this.dynamoDBEncryptionKey.grantDecrypt(this.lambdaExecutionRole);
    this.s3EncryptionKey.grantDecrypt(this.lambdaExecutionRole);
    this.s3EncryptionKey.grantEncrypt(this.lambdaExecutionRole);

    // IAM policy for DynamoDB access
    const dynamoDBPolicy = new iam.Policy(this, 'DynamoDBPolicy', {
      policyName: `${appName}-dynamodb-access-${environment}`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:Scan',
            'dynamodb:BatchGetItem',
            'dynamodb:BatchWriteItem',
          ],
          resources: [
            `arn:aws:dynamodb:${this.region}:${this.account}:table/${appName}-sessions-${environment}`,
            `arn:aws:dynamodb:${this.region}:${this.account}:table/${appName}-sessions-${environment}/index/*`,
          ],
        }),
      ],
    });
    dynamoDBPolicy.attachToRole(this.lambdaExecutionRole);

    // IAM policy for S3 access
    const s3Policy = new iam.Policy(this, 'S3Policy', {
      policyName: `${appName}-s3-access-${environment}`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket',
          ],
          resources: [
            `arn:aws:s3:::${appName}-exports-${environment}-${this.account}`,
            `arn:aws:s3:::${appName}-exports-${environment}-${this.account}/*`,
          ],
        }),
      ],
    });
    s3Policy.attachToRole(this.lambdaExecutionRole);

    // IAM policy for SES access
    const sesPolicy = new iam.Policy(this, 'SESPolicy', {
      policyName: `${appName}-ses-access-${environment}`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ses:SendEmail',
            'ses:SendRawEmail',
            'ses:SendTemplatedEmail',
          ],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'ses:FromAddress': process.env.SES_FROM_EMAIL || 'noreply@example.com',
            },
          },
        }),
      ],
    });
    sesPolicy.attachToRole(this.lambdaExecutionRole);

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'DynamoDBEncryptionKeyId', {
      value: this.dynamoDBEncryptionKey.keyId,
      description: 'KMS key ID for DynamoDB encryption',
      exportName: `${appName}-DynamoDBKeyId-${environment}`,
    });

    new cdk.CfnOutput(this, 'S3EncryptionKeyId', {
      value: this.s3EncryptionKey.keyId,
      description: 'KMS key ID for S3 encryption',
      exportName: `${appName}-S3KeyId-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN',
      exportName: `${appName}-LambdaRoleArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'APIKeySecretArn', {
      value: this.apiKeySecret.secretArn,
      description: 'Secrets Manager ARN for API keys',
      exportName: `${appName}-APIKeySecretArn-${environment}`,
    });

    // Tags
    cdk.Tags.of(this.dynamoDBEncryptionKey).add('Component', 'Security');
    cdk.Tags.of(this.s3EncryptionKey).add('Component', 'Security');
    cdk.Tags.of(this.lambdaExecutionRole).add('Component', 'Security');
  }
}
