# AWS Infrastructure Setup - Task 21 Summary

## Overview

This document summarizes the AWS infrastructure setup for the Specification Wizard, implemented using AWS CDK (Cloud Development Kit) with TypeScript.

## What Was Created

### Infrastructure as Code (IaC)

All infrastructure is defined in the `infrastructure/` directory using AWS CDK, providing:

1. **Version Control**: Infrastructure code is tracked in Git
2. **Reproducibility**: Deploy identical infrastructure across environments
3. **Type Safety**: TypeScript provides compile-time validation
4. **Best Practices**: Built-in security and compliance features

### Directory Structure

```
infrastructure/
├── README.md                    # Infrastructure documentation
├── DEPLOYMENT_GUIDE.md          # Step-by-step deployment instructions
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── cdk.json                    # CDK configuration
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── bin/
│   └── app.ts                  # CDK app entry point
├── lib/
│   ├── database-stack.ts       # DynamoDB tables
│   ├── storage-stack.ts        # S3 buckets
│   ├── cdn-stack.ts            # CloudFront distribution
│   ├── email-stack.ts          # SES configuration
│   ├── security-stack.ts       # IAM roles and KMS keys
│   ├── apigateway-stack.ts     # WebSocket API
│   └── monitoring-stack.ts     # CloudWatch monitoring
└── scripts/
    ├── deploy.sh               # Deployment automation
    ├── destroy.sh              # Cleanup automation
    └── update-secrets.sh       # Secrets management
```

## Infrastructure Components

### 1. Database Stack (DynamoDB)

**Purpose**: Store sessions, specifications, messages, and submissions

**Features**:
- Single-table design with PK/SK structure
- Global Secondary Index (GSI1) for magic link and reference lookups
- TTL enabled for 30-day session expiration
- Point-in-time recovery (production)
- Customer-managed encryption with KMS
- Auto-scaling support (provisioned mode)
- DynamoDB Streams for change data capture

**Configuration**:
- Billing mode: On-demand (default) or Provisioned
- Encryption: Customer-managed KMS key
- Backup: Point-in-time recovery in production

### 2. Storage Stack (S3)

**Purpose**: Store PDFs and exported documents

**Features**:
- Encryption at rest with KMS
- Versioning enabled (configurable)
- CORS configuration for browser uploads
- Lifecycle policies:
  - Transition to Intelligent Tiering after 30 days
  - Archive to Glacier after 90 days
  - Delete after 365 days
- Server access logging (production)
- Block all public access
- SSL enforcement

### 3. CDN Stack (CloudFront)

**Purpose**: Fast global content delivery for PDFs

**Features**:
- Origin Access Identity for S3 security
- HTTPS only with TLS 1.2+
- Custom cache policies for PDFs (7-day default)
- Security headers (HSTS, XSS protection, etc.)
- Gzip and Brotli compression
- HTTP/2 and HTTP/3 support
- Custom domain support (optional)
- Access logging (production)

### 4. Email Stack (SES)

**Purpose**: Send specification exports and submission confirmations

**Features**:
- Configuration set for tracking
- SNS topics for bounce/complaint notifications
- Email templates:
  - Export notification template
  - Submission confirmation template
- Event destinations for delivery tracking
- Reputation metrics enabled

**Templates Created**:
1. **Export Email**: Sends PDF and magic link to users
2. **Submission Email**: Confirms specification submission with reference number

### 5. Security Stack (IAM & KMS)

**Purpose**: Manage access control and encryption

**Features**:
- KMS keys for DynamoDB and S3 encryption
- Automatic key rotation enabled
- Lambda execution role with least-privilege policies
- Secrets Manager for API keys
- IAM policies for:
  - DynamoDB access
  - S3 access
  - SES sending
  - CloudWatch logging

**Secrets Managed**:
- OpenAI API key
- Anthropic API key

### 6. API Gateway Stack (WebSocket)

**Purpose**: Real-time chat streaming support

**Features**:
- WebSocket API for bidirectional communication
- Lambda integrations for:
  - Connection handling ($connect)
  - Disconnection handling ($disconnect)
  - Message handling (sendMessage)
- Throttling (500 burst, 100 rate limit)
- CloudWatch access logging
- Stage-based deployment

**Note**: Lambda functions are placeholders. Replace with actual implementation.

### 7. Monitoring Stack (CloudWatch)

**Purpose**: Observability, logging, and alerting

**Features**:
- CloudWatch Dashboard with:
  - DynamoDB operations and latency
  - S3 requests and errors
  - API Gateway requests and latency
  - Business KPIs (sessions, submissions, completion rate)
- CloudWatch Alarms for:
  - DynamoDB throttling
  - S3 4xx/5xx errors
  - API Gateway 5xx errors
- SNS topic for alarm notifications
- Log groups with retention policies:
  - Application logs (30 days)
  - Error logs (90 days)

## Deployment Process

### Prerequisites

1. AWS CLI configured
2. Node.js 18+ installed
3. AWS CDK CLI: `npm install -g aws-cdk`
4. AWS account with appropriate permissions

### Quick Start

```bash
# 1. Navigate to infrastructure directory
cd infrastructure

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Bootstrap CDK (first time only)
npm run bootstrap

# 5. Deploy to development
npm run deploy:dev

# 6. Update API keys
./scripts/update-secrets.sh dev

# 7. Verify SES sender email in AWS Console
```

### Environment-Specific Deployment

```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Production (requires confirmation)
npm run deploy:prod
```

## Configuration

### Environment Variables

Key configuration in `.env`:

```bash
# Required
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
ENVIRONMENT=dev
SES_FROM_EMAIL=noreply@flowency.build
ALERT_EMAIL=alerts@flowency.build

# Optional
DOMAIN_NAME=wizard.flowency.build
CERTIFICATE_ARN=arn:aws:acm:...
ENABLE_CLOUDFRONT=true
DYNAMODB_BILLING_MODE=PAY_PER_REQUEST
S3_LIFECYCLE_DAYS=90
```

### Cost Optimization Settings

- **DynamoDB**: On-demand billing (pay per request)
- **S3**: Lifecycle policies for archival
- **CloudFront**: Can be disabled if not needed
- **CloudWatch**: Configurable log retention

## Outputs

After deployment, save these outputs to your application `.env`:

```bash
DYNAMODB_TABLE_NAME=spec-wizard-sessions-dev
S3_BUCKET_NAME=spec-wizard-exports-dev-123456789012
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
WEBSOCKET_URL=wss://abc123.execute-api.us-east-1.amazonaws.com/dev
```

## Security Features

1. **Encryption**:
   - DynamoDB: Customer-managed KMS encryption
   - S3: KMS encryption at rest
   - CloudFront: TLS 1.2+ in transit

2. **Access Control**:
   - IAM roles with least-privilege policies
   - S3 bucket blocks all public access
   - CloudFront Origin Access Identity

3. **Secrets Management**:
   - API keys stored in Secrets Manager
   - Never committed to Git

4. **Monitoring**:
   - CloudWatch alarms for security events
   - Access logging enabled
   - CloudTrail integration (recommended)

## Monitoring and Alarms

### Alarms Configured

1. **DynamoDB**:
   - Read throttling > 10 errors in 5 minutes
   - Write throttling > 10 errors in 5 minutes

2. **S3**:
   - 4xx errors > 50 in 5 minutes
   - 5xx errors > 10 in 5 minutes

3. **API Gateway**:
   - 5xx errors > 10 in 5 minutes

### Dashboard Metrics

- DynamoDB operations and latency
- S3 requests and errors
- API Gateway requests and latency
- Business KPIs:
  - Sessions created (24h)
  - Submissions completed (24h)
  - Average session duration
  - Completion rate

## Cost Estimation

Estimated monthly costs for low-medium traffic:

- **DynamoDB**: $5-15 (on-demand)
- **S3**: $1-5 (storage + requests)
- **CloudFront**: $0-10 (free tier eligible)
- **SES**: $0-5 ($0.10 per 1,000 emails)
- **CloudWatch**: $0-5 (basic monitoring)
- **API Gateway**: $1-5 (WebSocket connections)
- **KMS**: $2 (2 keys)
- **Secrets Manager**: $0.80 (2 secrets)

**Total**: $10-50/month

## Maintenance

### Regular Tasks

1. **Monitor Costs**: Review AWS Cost Explorer monthly
2. **Review Logs**: Check CloudWatch logs for errors
3. **Update Dependencies**: Keep CDK and packages updated
4. **Rotate Keys**: Rotate API keys quarterly
5. **Review Alarms**: Ensure alarms are functioning

### Updates

To update infrastructure:

```bash
# 1. Modify stack files in lib/
# 2. Build and review changes
npm run build
npm run diff

# 3. Deploy updates
npm run deploy:dev
```

## Disaster Recovery

### Backup Strategy

- **DynamoDB**: Point-in-time recovery (production)
- **S3**: Versioning enabled
- **Infrastructure**: Code in Git

### Recovery Procedure

1. Deploy infrastructure from Git
2. Restore DynamoDB from backup
3. Restore S3 from versioning
4. Update application configuration

## Cleanup

To destroy all infrastructure:

```bash
./scripts/destroy.sh dev
```

**Warning**: This permanently deletes all data.

## Next Steps

1. **Deploy Infrastructure**: Follow DEPLOYMENT_GUIDE.md
2. **Configure Application**: Update app `.env` with outputs
3. **Test Integration**: Verify all services work together
4. **Monitor**: Set up alerts and review dashboard
5. **Optimize**: Adjust based on actual usage patterns

## Requirements Validated

This implementation satisfies:

- **Requirement 12.1**: DynamoDB tables for data storage
- **Requirement 12.5**: AWS infrastructure with proper configuration

All infrastructure components are:
- ✅ Defined as code (CDK)
- ✅ Version controlled (Git)
- ✅ Environment-specific (dev/staging/prod)
- ✅ Secure (encryption, IAM, least-privilege)
- ✅ Monitored (CloudWatch, alarms)
- ✅ Cost-optimized (on-demand, lifecycle policies)
- ✅ Documented (README, deployment guide)

## Additional Resources

- `infrastructure/README.md` - Infrastructure overview
- `infrastructure/DEPLOYMENT_GUIDE.md` - Detailed deployment steps
- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
- DynamoDB Best Practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
