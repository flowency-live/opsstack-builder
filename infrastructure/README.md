# AWS Infrastructure Setup

This directory contains Infrastructure as Code (IaC) for deploying the Specification Wizard to AWS.

## Overview

The infrastructure is defined using AWS CDK (Cloud Development Kit) with TypeScript, providing:

- **DynamoDB Tables**: Single-table design with GSI for magic links and reference numbers
- **S3 Buckets**: Storage for PDFs and exports with CloudFront CDN
- **SES Configuration**: Email sending with templates
- **CloudFront Distribution**: CDN for fast global content delivery
- **API Gateway**: WebSocket support for real-time chat
- **CloudWatch**: Logging, monitoring, and alarms
- **IAM Roles**: Least-privilege access policies

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 18+ installed
3. AWS CDK CLI installed: `npm install -g aws-cdk`

## Quick Start

### 1. Install Dependencies

```bash
cd infrastructure
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `AWS_ACCOUNT_ID`: Your AWS account ID
- `AWS_REGION`: Deployment region (default: us-east-1)
- `ENVIRONMENT`: dev, staging, or production
- `DOMAIN_NAME`: Custom domain for CloudFront (optional)
- `SES_FROM_EMAIL`: Verified sender email address

### 3. Bootstrap CDK (First Time Only)

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### 4. Deploy Infrastructure

```bash
# Preview changes
cdk diff

# Deploy all stacks
cdk deploy --all

# Deploy specific stack
cdk deploy SpecWizardDatabaseStack
```

## Stack Architecture

### DatabaseStack
- DynamoDB table with single-table design
- Global Secondary Index (GSI1) for magic links and reference lookups
- TTL enabled for 30-day session expiration
- Point-in-time recovery enabled
- On-demand billing mode

### StorageStack
- S3 bucket for PDFs and exports
- Encryption at rest (AES-256)
- Lifecycle policies for cost optimization
- CORS configuration for browser uploads
- Versioning enabled

### CDNStack
- CloudFront distribution for S3 content
- HTTPS only with TLS 1.2+
- Custom domain support (optional)
- Cache optimization for PDFs
- Origin Access Identity for S3 security

### EmailStack
- SES configuration for email sending
- Email templates for notifications
- Bounce and complaint handling
- SNS topics for delivery notifications
- Domain verification (if using custom domain)

### MonitoringStack
- CloudWatch Log Groups with retention policies
- CloudWatch Alarms for critical metrics
- Custom dashboard for business metrics
- X-Ray tracing configuration
- SNS topics for alerts

### SecurityStack
- IAM roles for Lambda functions
- IAM policies with least-privilege access
- Secrets Manager for API keys
- KMS keys for encryption
- Security group configurations

## Environment-Specific Deployments

### Development
```bash
ENVIRONMENT=dev cdk deploy --all
```

### Staging
```bash
ENVIRONMENT=staging cdk deploy --all
```

### Production
```bash
ENVIRONMENT=production cdk deploy --all --require-approval broadening
```

## Outputs

After deployment, CDK will output important values:

- `DynamoDBTableName`: Table name for application configuration
- `S3BucketName`: Bucket name for exports
- `CloudFrontDistributionDomain`: CDN domain for content delivery
- `APIGatewayWebSocketURL`: WebSocket endpoint URL
- `SESConfigurationSet`: SES configuration set name

Save these outputs to your application's `.env` file.

## Cost Optimization

The infrastructure is configured for cost efficiency:

- **DynamoDB**: On-demand billing (pay per request)
- **S3**: Lifecycle policies to archive old documents
- **CloudFront**: Free tier eligible, pay per GB transferred
- **SES**: $0.10 per 1,000 emails
- **CloudWatch**: Free tier for basic monitoring

Estimated monthly cost for low-medium traffic: $10-50

## Monitoring and Alarms

CloudWatch alarms are configured for:

- DynamoDB throttling errors
- S3 4xx/5xx errors
- SES bounce rate > 5%
- Lambda errors and timeouts
- API Gateway 5xx errors

Alerts are sent to the SNS topic specified in configuration.

## Cleanup

To destroy all infrastructure:

```bash
cdk destroy --all
```

**Warning**: This will delete all data including DynamoDB tables and S3 buckets. Ensure you have backups before destroying production infrastructure.

## Troubleshooting

### CDK Bootstrap Issues
If you encounter bootstrap errors, ensure your AWS credentials have sufficient permissions and run:
```bash
cdk bootstrap --trust <account-id> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

### SES Email Sending Issues
- Verify your sender email address in SES console
- If in SES sandbox, verify recipient addresses
- Request production access to send to any email

### DynamoDB Access Issues
- Verify IAM roles have correct permissions
- Check VPC security groups if using VPC endpoints
- Review CloudWatch Logs for detailed error messages

## Security Best Practices

1. **Never commit `.env` files** - Use AWS Secrets Manager for production
2. **Enable MFA** on AWS accounts with deployment permissions
3. **Use least-privilege IAM policies** - Review and tighten as needed
4. **Enable CloudTrail** for audit logging
5. **Regularly rotate credentials** - Use IAM roles instead of access keys where possible
6. **Review security groups** - Ensure no unnecessary ports are open
7. **Enable AWS Config** for compliance monitoring

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
