# Deployment Guide

This guide walks through deploying the Specification Wizard infrastructure to AWS.

## Prerequisites

### 1. AWS Account Setup

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18+ installed
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

### 2. Verify AWS Credentials

```bash
aws sts get-caller-identity
```

This should return your AWS account ID and user/role information.

### 3. Required Permissions

Your AWS user/role needs permissions for:
- CloudFormation (create/update/delete stacks)
- DynamoDB (create/manage tables)
- S3 (create/manage buckets)
- IAM (create/manage roles and policies)
- KMS (create/manage encryption keys)
- SES (configure email sending)
- CloudFront (create distributions)
- API Gateway (create WebSocket APIs)
- CloudWatch (create logs, metrics, alarms)
- Secrets Manager (create/manage secrets)
- Lambda (create/manage functions)

## Step-by-Step Deployment

### Step 1: Configure Environment

1. Navigate to the infrastructure directory:
```bash
cd infrastructure
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:
```bash
# Required
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
ENVIRONMENT=dev
SES_FROM_EMAIL=noreply@yourdomain.com
ALERT_EMAIL=alerts@yourdomain.com

# Optional
DOMAIN_NAME=wizard.yourdomain.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxx
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Bootstrap CDK (First Time Only)

Bootstrap CDK in your AWS account and region:

```bash
npm run bootstrap
```

Or with explicit account/region:

```bash
cdk bootstrap aws://123456789012/us-east-1
```

### Step 4: Review Infrastructure

Preview what will be created:

```bash
npm run diff
```

Or synthesize CloudFormation templates:

```bash
npm run synth
```

Review the generated templates in `cdk.out/` directory.

### Step 5: Deploy Infrastructure

#### Development Environment

```bash
npm run deploy:dev
```

Or using the deployment script:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev
```

#### Staging Environment

```bash
npm run deploy:staging
```

#### Production Environment

```bash
npm run deploy:prod
```

**Note**: Production deployment requires explicit approval for security changes.

### Step 6: Save Outputs

After deployment, CDK will output important values. Save these to your application's `.env` file:

```bash
# Example outputs
DYNAMODB_TABLE_NAME=spec-wizard-sessions-dev
S3_BUCKET_NAME=spec-wizard-exports-dev-123456789012
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
WEBSOCKET_URL=wss://abc123.execute-api.us-east-1.amazonaws.com/dev
```

### Step 7: Configure API Keys

Update Secrets Manager with your LLM provider API keys:

```bash
chmod +x scripts/update-secrets.sh
./scripts/update-secrets.sh dev
```

Or manually via AWS Console:
1. Go to AWS Secrets Manager
2. Find secret: `spec-wizard/api-keys/dev`
3. Update with your API keys:
```json
{
  "openaiApiKey": "sk-...",
  "anthropicApiKey": "sk-ant-..."
}
```

### Step 8: Verify SES Email

If using SES in sandbox mode, verify your sender email:

1. Go to AWS SES Console
2. Navigate to "Verified identities"
3. Click "Create identity"
4. Choose "Email address"
5. Enter your sender email (from `.env`)
6. Click "Create identity"
7. Check your email and click the verification link

**For Production**: Request production access to send to any email address.

### Step 9: Test Infrastructure

Test each component:

#### DynamoDB
```bash
aws dynamodb describe-table \
  --table-name spec-wizard-sessions-dev \
  --region us-east-1
```

#### S3
```bash
aws s3 ls s3://spec-wizard-exports-dev-123456789012
```

#### Secrets Manager
```bash
aws secretsmanager get-secret-value \
  --secret-id spec-wizard/api-keys/dev \
  --region us-east-1
```

### Step 10: Deploy Application

With infrastructure ready, deploy your Next.js application:

1. Update application `.env` with infrastructure outputs
2. Deploy to Vercel, AWS Amplify, or your hosting platform
3. Configure environment variables in hosting platform
4. Test end-to-end functionality

## Post-Deployment Configuration

### CloudWatch Alarms

Verify alarms are configured:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix spec-wizard-dev \
  --region us-east-1
```

Subscribe to alarm notifications by confirming the SNS subscription email.

### CloudFront Custom Domain (Optional)

If using a custom domain:

1. Create ACM certificate in `us-east-1` (required for CloudFront)
2. Add certificate ARN to `.env`
3. Redeploy CDN stack
4. Update DNS records to point to CloudFront distribution

### SES Production Access

To send emails to any address (not just verified):

1. Go to AWS SES Console
2. Click "Request production access"
3. Fill out the form with your use case
4. Wait for approval (usually 24-48 hours)

## Monitoring and Maintenance

### View CloudWatch Dashboard

```bash
# Get dashboard URL from outputs
aws cloudformation describe-stacks \
  --stack-name spec-wizard-MonitoringStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
  --output text
```

### View Logs

```bash
# Application logs
aws logs tail /aws/spec-wizard/dev/application --follow

# Error logs
aws logs tail /aws/spec-wizard/dev/errors --follow
```

### Monitor Costs

Set up AWS Cost Explorer and Budgets:

1. Go to AWS Billing Console
2. Create a budget for your project
3. Set alerts for cost thresholds
4. Review costs regularly

## Updating Infrastructure

### Update Stack

After modifying infrastructure code:

```bash
npm run build
npm run diff  # Review changes
npm run deploy:dev
```

### Update Specific Stack

```bash
cdk deploy spec-wizard-DatabaseStack-dev
```

### Rollback

If deployment fails, CDK automatically rolls back. To manually rollback:

```bash
aws cloudformation cancel-update-stack \
  --stack-name spec-wizard-DatabaseStack-dev
```

## Troubleshooting

### Bootstrap Errors

If bootstrap fails with permission errors:

```bash
cdk bootstrap \
  --trust 123456789012 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

### Stack Deletion Failures

If a stack fails to delete due to retained resources:

1. Manually delete retained resources (S3 buckets, KMS keys)
2. Retry stack deletion

### SES Sending Errors

- Verify sender email address
- Check SES sending limits
- Review bounce/complaint rates
- Ensure not in sandbox mode for production

### DynamoDB Throttling

If experiencing throttling:

1. Switch to on-demand billing mode
2. Or increase provisioned capacity
3. Review access patterns for optimization

### Cost Optimization

To reduce costs:

1. Use on-demand billing for DynamoDB
2. Enable S3 lifecycle policies
3. Reduce CloudWatch log retention
4. Disable CloudFront if not needed
5. Use reserved capacity for predictable workloads

## Disaster Recovery

### Backup Strategy

- DynamoDB: Point-in-time recovery enabled (production)
- S3: Versioning enabled
- CloudFormation: Templates stored in Git

### Restore Procedure

1. Deploy infrastructure from CloudFormation templates
2. Restore DynamoDB from point-in-time backup
3. Restore S3 objects from versioning
4. Update application configuration
5. Verify functionality

## Security Best Practices

1. **Rotate API Keys**: Regularly rotate LLM provider API keys
2. **Review IAM Policies**: Ensure least-privilege access
3. **Enable MFA**: Require MFA for AWS console access
4. **Monitor Access**: Review CloudTrail logs regularly
5. **Update Dependencies**: Keep CDK and dependencies updated
6. **Encrypt Data**: Verify encryption at rest and in transit
7. **Audit Logs**: Review CloudWatch logs for suspicious activity

## Cleanup

To destroy all infrastructure:

```bash
chmod +x scripts/destroy.sh
./scripts/destroy.sh dev
```

**Warning**: This permanently deletes all data. Ensure you have backups before destroying production infrastructure.

## Support

For issues or questions:

1. Check CloudWatch logs for errors
2. Review CloudFormation events for deployment issues
3. Consult AWS documentation
4. Contact your AWS support team

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [CloudWatch Best Practices](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html)
