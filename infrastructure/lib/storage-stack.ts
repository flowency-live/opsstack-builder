import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
  encryptionKey: kms.Key;
}

export class StorageStack extends cdk.Stack {
  public readonly exportsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { environment, appName, encryptionKey } = props;

    // Server access logging bucket (optional for production)
    let logsBucket: s3.Bucket | undefined;
    if (environment === 'production') {
      logsBucket = new s3.Bucket(this, 'LogsBucket', {
        bucketName: `${appName}-logs-${environment}-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        enforceSSL: true,
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            enabled: true,
            expiration: cdk.Duration.days(90),
          },
        ],
      });
    }

    // S3 bucket for PDFs and exports
    this.exportsBucket = new s3.Bucket(this, 'ExportsBucket', {
      bucketName: `${appName}-exports-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      versioned: process.env.ENABLE_S3_VERSIONING === 'true',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'production',
      enforceSSL: true,
      serverAccessLogsBucket: logsBucket,
      serverAccessLogsPrefix: logsBucket ? 'access-logs/' : undefined,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'], // Restrict in production
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'ArchiveOldExports',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(
                parseInt(process.env.S3_LIFECYCLE_DAYS || '90')
              ),
            },
          ],
          expiration: cdk.Duration.days(365), // Delete after 1 year
        },
        {
          id: 'DeleteIncompleteUploads',
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ExportsBucketName', {
      value: this.exportsBucket.bucketName,
      description: 'S3 bucket name for exports',
      exportName: `${appName}-ExportsBucketName-${environment}`,
    });

    new cdk.CfnOutput(this, 'ExportsBucketArn', {
      value: this.exportsBucket.bucketArn,
      description: 'S3 bucket ARN',
      exportName: `${appName}-ExportsBucketArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'ExportsBucketDomainName', {
      value: this.exportsBucket.bucketDomainName,
      description: 'S3 bucket domain name',
      exportName: `${appName}-ExportsBucketDomainName-${environment}`,
    });

    // Tags
    cdk.Tags.of(this.exportsBucket).add('Component', 'Storage');
    cdk.Tags.of(this.exportsBucket).add('DataClassification', 'Confidential');
  }
}
