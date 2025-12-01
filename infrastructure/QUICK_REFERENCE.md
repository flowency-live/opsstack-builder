# Quick Reference Guide

## Common Commands

### Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Deploy specific stack
cdk deploy spec-wizard-DatabaseStack-dev
```

### Monitoring

```bash
# View CloudWatch dashboard
# Get URL from CloudFormation outputs

# Tail application logs
aws logs tail /aws/spec-wizard/dev/application --follow

# Tail error logs
aws logs tail /aws/spec-wizard/dev/errors --follow

# List alarms
aws cloudwatch describe-alarms --alarm-name-prefix spec-wizard-dev
```

### Secrets Management

```bash
# Update API keys
./scripts/update-secrets.sh dev

# View secrets (without values)
aws secretsmanager describe-secret --secret-id spec-wizard/api-keys/dev

# Get secret values
aws secretsmanager get-secret-value --secret-id spec-wizard/api-keys/dev
```

### Database Operations

```bash
# Describe table
aws dynamodb describe-table --table-name spec-wizard-sessions-dev

# Query item
aws dynamodb get-item \
  --table-name spec-wizard-sessions-dev \
  --key '{"PK":{"S":"SESSION#abc123"},"SK":{"S":"METADATA"}}'

# Scan table (use sparingly)
aws dynamodb scan --table-name spec-wizard-sessions-dev --max-items 10
```

### S3 Operations

```bash
# List buckets
aws s3 ls

# List objects in bucket
aws s3 ls s3://spec-wizard-exports-dev-123456789012/

# Upload file
aws s3 cp local-file.pdf s3://spec-wizard-exports-dev-123456789012/

# Download file
aws s3 cp s3://spec-wizard-exports-dev-123456789012/file.pdf ./
```

### SES Operations

```bash
# List verified identities
aws ses list-identities

# Verify email address
aws ses verify-email-identity --email-address noreply@example.com

# Check sending statistics
aws ses get-send-statistics

# Get account sending status
aws ses get-account-sending-enabled
```

### CloudFront Operations

```bash
# List distributions
aws cloudfront list-distributions

# Create invalidation (clear cache)
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Environment Variables

### Required for Deployment

```bash
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
ENVIRONMENT=dev
SES_FROM_EMAIL=noreply@flowency.build
ALERT_EMAIL=alerts@flowency.build
```

### Required for Application

```bash
# From CloudFormation outputs
DYNAMODB_TABLE_NAME=spec-wizard-sessions-dev
S3_BUCKET_NAME=spec-wizard-exports-dev-123456789012
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
WEBSOCKET_URL=wss://abc123.execute-api.us-east-1.amazonaws.com/dev

# From Secrets Manager
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Stack Dependencies

```
SecurityStack (IAM, KMS)
    ↓
DatabaseStack (DynamoDB)
StorageStack (S3)
    ↓
CDNStack (CloudFront)
EmailStack (SES)
APIGatewayStack (WebSocket)
    ↓
MonitoringStack (CloudWatch)
```

## Resource Naming Convention

```
{appName}-{resource}-{environment}-{accountId}

Examples:
- spec-wizard-sessions-dev
- spec-wizard-exports-dev-123456789012
- spec-wizard-lambda-execution-dev
```

## Access Patterns

### DynamoDB

```javascript
// Get session
PK: "SESSION#abc123"
SK: "METADATA"

// Get messages
PK: "SESSION#abc123"
SK: begins_with("MESSAGE#")

// Get latest spec
PK: "SESSION#abc123"
SK: begins_with("SPEC#")
ScanIndexForward: false
Limit: 1

// Magic link lookup (GSI1)
GSI1PK: "MAGIC_LINK#xyz789"

// Reference lookup (GSI1)
GSI1PK: "REFERENCE#REF-2024-001"
```

## Troubleshooting

### Deployment Fails

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name spec-wizard-DatabaseStack-dev \
  --max-items 20

# View stack status
aws cloudformation describe-stacks \
  --stack-name spec-wizard-DatabaseStack-dev
```

### SES Not Sending

```bash
# Check if email is verified
aws ses get-identity-verification-attributes \
  --identities noreply@example.com

# Check sending quota
aws ses get-send-quota

# Check if in sandbox
aws ses get-account-sending-enabled
```

### DynamoDB Throttling

```bash
# Check table metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=spec-wizard-sessions-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### High Costs

```bash
# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

## Security Checklist

- [ ] API keys stored in Secrets Manager
- [ ] KMS encryption enabled for DynamoDB and S3
- [ ] S3 buckets block public access
- [ ] CloudFront uses HTTPS only
- [ ] IAM roles follow least-privilege
- [ ] CloudWatch alarms configured
- [ ] MFA enabled on AWS account
- [ ] CloudTrail logging enabled
- [ ] Regular security audits scheduled

## Cost Optimization Checklist

- [ ] DynamoDB on-demand billing enabled
- [ ] S3 lifecycle policies configured
- [ ] CloudWatch log retention set appropriately
- [ ] Unused resources deleted
- [ ] Reserved capacity for predictable workloads
- [ ] Cost alerts configured
- [ ] Regular cost reviews scheduled

## Maintenance Schedule

### Daily
- Monitor CloudWatch dashboard
- Review error logs

### Weekly
- Check alarm notifications
- Review cost trends
- Verify backup status

### Monthly
- Review and optimize costs
- Update dependencies
- Security audit
- Performance review

### Quarterly
- Rotate API keys
- Review IAM policies
- Disaster recovery test
- Capacity planning

## Support Contacts

- AWS Support: https://console.aws.amazon.com/support/
- CDK Issues: https://github.com/aws/aws-cdk/issues
- Team Slack: #spec-wizard-infra
- On-call: [Your on-call rotation]

## Useful Links

- [AWS Console](https://console.aws.amazon.com/)
- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home#dashboards:)
- [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
- [S3 Console](https://console.aws.amazon.com/s3/)
- [SES Console](https://console.aws.amazon.com/ses/)
- [Secrets Manager](https://console.aws.amazon.com/secretsmanager/)
- [Cost Explorer](https://console.aws.amazon.com/cost-management/home#/cost-explorer)
