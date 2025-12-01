import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
  encryptionKey: kms.Key;
}

export class DatabaseStack extends cdk.Stack {
  public readonly mainTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { environment, appName, encryptionKey } = props;

    // Determine billing mode from environment variable
    const billingMode = process.env.DYNAMODB_BILLING_MODE === 'PROVISIONED'
      ? dynamodb.BillingMode.PROVISIONED
      : dynamodb.BillingMode.PAY_PER_REQUEST;

    // Main table with single-table design
    this.mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: `${appName}-sessions-${environment}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: environment === 'production',
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      ...(billingMode === dynamodb.BillingMode.PROVISIONED && {
        readCapacity: parseInt(process.env.DYNAMODB_READ_CAPACITY || '5'),
        writeCapacity: parseInt(process.env.DYNAMODB_WRITE_CAPACITY || '5'),
      }),
    });

    // Global Secondary Index for magic link lookups
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
      ...(billingMode === dynamodb.BillingMode.PROVISIONED && {
        readCapacity: parseInt(process.env.DYNAMODB_READ_CAPACITY || '5'),
        writeCapacity: parseInt(process.env.DYNAMODB_WRITE_CAPACITY || '5'),
      }),
    });

    // Auto-scaling for provisioned mode
    if (billingMode === dynamodb.BillingMode.PROVISIONED) {
      // Table auto-scaling
      const readScaling = this.mainTable.autoScaleReadCapacity({
        minCapacity: 5,
        maxCapacity: 100,
      });
      readScaling.scaleOnUtilization({
        targetUtilizationPercent: 70,
      });

      const writeScaling = this.mainTable.autoScaleWriteCapacity({
        minCapacity: 5,
        maxCapacity: 100,
      });
      writeScaling.scaleOnUtilization({
        targetUtilizationPercent: 70,
      });
    }

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: this.mainTable.tableName,
      description: 'DynamoDB table name for application configuration',
      exportName: `${appName}-DynamoDBTableName-${environment}`,
    });

    new cdk.CfnOutput(this, 'DynamoDBTableArn', {
      value: this.mainTable.tableArn,
      description: 'DynamoDB table ARN',
      exportName: `${appName}-DynamoDBTableArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'DynamoDBStreamArn', {
      value: this.mainTable.tableStreamArn || 'N/A',
      description: 'DynamoDB stream ARN for change data capture',
      exportName: `${appName}-DynamoDBStreamArn-${environment}`,
    });

    // Tags
    cdk.Tags.of(this.mainTable).add('Component', 'Database');
    cdk.Tags.of(this.mainTable).add('DataClassification', 'Confidential');
  }
}
