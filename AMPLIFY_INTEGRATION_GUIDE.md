# AWS Amplify Integration Guide

## Overview

This guide explains how to integrate the CDK-deployed infrastructure with AWS Amplify for continuous deployment from GitHub.

**Repository**: https://github.com/flowency-live/builder

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Workflow                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Git Push → GitHub (flowency-live/builder)                  │
│                    ↓                                         │
│              AWS Amplify                                     │
│                    ↓                                         │
│         Builds & Deploys Next.js App                        │
│                    ↓                                         │
│         Uses CDK Infrastructure:                            │
│         • DynamoDB (sessions/specs)                         │
│         • S3 (PDFs/exports)                                 │
│         • SES (emails)                                      │
│         • CloudWatch (monitoring)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### Phase 1: Deploy Infrastructure (One-Time)

#### 1. Deploy CDK Infrastructure

```bash
# Navigate to infrastructure directory
cd SpecBuild/spec-wizard/infrastructure

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your AWS account details

# Bootstrap CDK (first time only)
npm run bootstrap

# Deploy infrastructure
npm run deploy:dev
```

#### 2. Save Infrastructure Outputs

After deployment, CDK will output values. **Save these** - you'll need them for Amplify:

```bash
# Example outputs (yours will be different)
DynamoDBTableName = spec-wizard-sessions-dev
S3BucketName = spec-wizard-exports-dev-123456789012
CloudFrontDomain = d1234567890.cloudfront.net
WebSocketURL = wss://abc123.execute-api.us-east-1.amazonaws.com/dev
```

#### 3. Configure API Keys in Secrets Manager

```bash
cd SpecBuild/spec-wizard/infrastructure
./scripts/update-secrets.sh dev
```

Enter your API keys when prompted:
- OpenAI API Key
- Anthropic API Key

#### 4. Verify SES Email Address

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Navigate to "Verified identities"
3. Click "Create identity" → "Email address"
4. Enter your sender email (from `.env`)
5. Check email and click verification link

### Phase 2: Configure AWS Amplify

#### Option A: Using AWS Amplify Console (Recommended)

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/

2. **Create New App** (if not already created)
   - Click "New app" → "Host web app"
   - Select "GitHub"
   - Authorize AWS Amplify to access your GitHub account
   - Select repository: `flowency-live/builder`
   - Select branch: `main` (or your preferred branch)

3. **Configure Build Settings**
   
   Amplify should auto-detect Next.js. Verify the build settings:

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
         - .next/cache/**/*
   ```

4. **Add Environment Variables**

   In Amplify Console → App Settings → Environment variables, add:

   ```bash
   # AWS Infrastructure (from CDK outputs)
   AWS_REGION=us-east-1
   DYNAMODB_TABLE_NAME=spec-wizard-sessions-dev
   S3_BUCKET_NAME=spec-wizard-exports-dev-123456789012
   CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
   WEBSOCKET_URL=wss://abc123.execute-api.us-east-1.amazonaws.com/dev
   
   # AWS Credentials (use IAM role instead - see below)
   # AWS_ACCESS_KEY_ID=<from IAM>
   # AWS_SECRET_ACCESS_KEY=<from IAM>
   
   # LLM API Keys (from Secrets Manager)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   
   # SES Configuration
   SES_FROM_EMAIL=noreply@flowency.build
   SES_CONFIGURATION_SET=spec-wizard-dev
   
   # Application Settings
   NEXT_PUBLIC_APP_URL=https://your-amplify-domain.amplifyapp.com
   NODE_ENV=production
   ```

5. **Configure IAM Service Role** (Recommended over access keys)

   Create an IAM role for Amplify with permissions to access your infrastructure:

   ```bash
   # In AWS IAM Console:
   # 1. Create new role
   # 2. Trusted entity: AWS service → Amplify
   # 3. Attach policies:
   #    - Custom policy with DynamoDB, S3, SES access
   # 4. Name: AmplifySpecWizardRole
   ```

   Then in Amplify Console → App Settings → General → Service role:
   - Select the role you created

6. **Deploy**
   - Click "Save and deploy"
   - Amplify will build and deploy your app
   - Monitor the build logs for any errors

#### Option B: Using Amplify CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
cd SpecBuild/spec-wizard
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

### Phase 3: Grant Amplify Access to Infrastructure

The Amplify app needs permissions to access your CDK-deployed infrastructure.

#### Create IAM Policy for Amplify

Create a custom IAM policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/spec-wizard-sessions-dev",
        "arn:aws:dynamodb:us-east-1:*:table/spec-wizard-sessions-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::spec-wizard-exports-dev-*",
        "arn:aws:s3:::spec-wizard-exports-dev-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@flowency.build"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:spec-wizard/api-keys/dev-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:*:key/*"
      ]
    }
  ]
}
```

Attach this policy to the Amplify service role.

### Phase 4: Test the Integration

#### 1. Push Code to GitHub

```bash
cd SpecBuild/spec-wizard

# Add remote if not already added
git remote add origin https://github.com/flowency-live/builder.git

# Push to GitHub
git add .
git commit -m "Initial commit with infrastructure integration"
git push origin main
```

#### 2. Monitor Amplify Build

- Go to Amplify Console
- Watch the build progress
- Check for any errors in build logs

#### 3. Test the Deployed App

Once deployed, test these features:

- [ ] Landing page loads
- [ ] Start a new session
- [ ] Send messages (check DynamoDB for storage)
- [ ] View specification preview
- [ ] Export PDF (check S3 for file)
- [ ] Send email (check SES for delivery)
- [ ] Magic link restoration

#### 4. Verify Infrastructure Usage

```bash
# Check DynamoDB for session data
aws dynamodb scan --table-name spec-wizard-sessions-dev --max-items 5

# Check S3 for exported files
aws s3 ls s3://spec-wizard-exports-dev-123456789012/

# Check CloudWatch logs
aws logs tail /aws/spec-wizard/dev/application --follow
```

## Continuous Deployment Workflow

Once set up, your workflow is:

```bash
# 1. Make code changes locally
# 2. Commit and push to GitHub
git add .
git commit -m "Add new feature"
git push origin main

# 3. Amplify automatically:
#    - Detects the push
#    - Builds the Next.js app
#    - Runs tests
#    - Deploys to production
#    - Uses your CDK infrastructure
```

## Environment Management

### Development Environment

```bash
# Infrastructure
cd infrastructure
npm run deploy:dev

# Amplify branch: dev
# Environment variables: dev values
```

### Staging Environment

```bash
# Infrastructure
cd infrastructure
npm run deploy:staging

# Amplify branch: staging
# Environment variables: staging values
```

### Production Environment

```bash
# Infrastructure
cd infrastructure
npm run deploy:prod

# Amplify branch: main
# Environment variables: production values
```

## Updating Infrastructure

When you need to update infrastructure (add tables, change configs, etc.):

```bash
# 1. Update CDK code in infrastructure/lib/
# 2. Deploy changes
cd infrastructure
npm run deploy:dev

# 3. If outputs changed, update Amplify environment variables
# 4. Redeploy Amplify app (or it will auto-deploy on next push)
```

## Troubleshooting

### Build Fails in Amplify

**Check build logs** in Amplify Console for specific errors.

Common issues:
- Missing environment variables
- Node version mismatch
- Dependency installation failures

**Solution**: Update build settings or environment variables in Amplify Console.

### App Can't Access DynamoDB

**Error**: `AccessDeniedException` or `ResourceNotFoundException`

**Solutions**:
1. Verify IAM role has correct permissions
2. Check table name in environment variables matches CDK output
3. Verify AWS region is correct

### App Can't Upload to S3

**Error**: `Access Denied` when uploading files

**Solutions**:
1. Check S3 bucket policy allows Amplify role
2. Verify bucket name in environment variables
3. Check CORS configuration on bucket

### Emails Not Sending

**Error**: `MessageRejected` from SES

**Solutions**:
1. Verify sender email is verified in SES
2. Check SES is out of sandbox mode (for production)
3. Verify IAM permissions for SES

## Best Practices

1. **Use IAM Roles**: Prefer IAM service roles over access keys
2. **Separate Environments**: Use different Amplify apps for dev/staging/prod
3. **Monitor Costs**: Set up AWS Budgets for cost alerts
4. **Review Logs**: Regularly check CloudWatch logs for errors
5. **Test Before Production**: Always test in dev/staging first
6. **Backup Data**: Enable point-in-time recovery for production DynamoDB
7. **Use Secrets Manager**: Store sensitive values in Secrets Manager, not environment variables

## Quick Reference

### Amplify Console URLs

- **Main Console**: https://console.aws.amazon.com/amplify/
- **Your App**: https://console.aws.amazon.com/amplify/home?region=us-east-1#/[app-id]

### Useful Commands

```bash
# View Amplify app status
aws amplify get-app --app-id [app-id]

# Trigger manual deployment
aws amplify start-job --app-id [app-id] --branch-name main --job-type RELEASE

# View environment variables
aws amplify get-branch --app-id [app-id] --branch-name main

# Update environment variable
aws amplify update-branch --app-id [app-id] --branch-name main \
  --environment-variables KEY=VALUE
```

## Support

- **Amplify Issues**: Check build logs in Amplify Console
- **Infrastructure Issues**: Check CloudWatch logs
- **GitHub Issues**: Verify webhook is configured in GitHub repo settings
- **AWS Support**: https://console.aws.amazon.com/support/

## Next Steps

1. ✅ Deploy CDK infrastructure
2. ✅ Configure Amplify with GitHub repo
3. ✅ Add environment variables
4. ✅ Set up IAM permissions
5. ✅ Push code and test deployment
6. 🔄 Monitor and iterate

Your Specification Wizard is now set up for continuous deployment! Every push to GitHub will automatically build and deploy your app using the CDK-managed infrastructure.
