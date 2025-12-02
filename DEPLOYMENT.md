# Flowency Build Deployment Guide

This guide explains how to deploy Flowency Build using the BNDY pattern: Amplify + Lambda + DynamoDB.

## Architecture

```
Amplify (Next.js frontend)
    ↓ calls
API Gateway
    ↓ triggers
Lambda Functions
    ↓ reads/writes
DynamoDB
```

## Prerequisites

- AWS CLI configured with your credentials
- Node.js >= 20.9.0
- AWS CDK CLI installed: `npm install -g aws-cdk`
- OpenAI API key
- Anthropic API key

## Deployment Steps

### 1. Deploy Lambda Backend (One Time)

```bash
# Navigate to lambda directory
cd lambda

# Install dependencies
npm install

# Install CDK dependencies
cd cdk && npm install && cd ..

# Set environment variables for deployment
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export APP_URL="https://my.flowency.build"
export AWS_REGION="eu-west-2"

# Bootstrap CDK (only needed once per AWS account/region)
cd cdk && cdk bootstrap && cd ..

# Deploy the stack
npm run deploy
```

**Output:** You'll get an API Gateway URL like:
```
https://abc123xyz.execute-api.eu-west-2.amazonaws.com/prod/
```

**Save this URL!** You'll need it for Amplify configuration.

### 2. Configure Amplify Environment Variables

Go to AWS Amplify Console → Your App → Environment Variables

Add these variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `API_GATEWAY_URL` | `https://your-api-url.amazonaws.com/prod` | From CDK deployment output |
| `OPENAI_API_KEY` | `sk-proj-...` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Your Anthropic API key |
| `AWS_REGION` | `eu-west-2` | Your AWS region |

### 3. Deploy Frontend to Amplify

The frontend auto-deploys from GitHub when you push to main:

```bash
cd spec-wizard
git add .
git commit -m "Deploy Lambda + DynamoDB architecture"
git push origin main
```

Amplify will automatically:
1. Detect the push
2. Build the Next.js app
3. Deploy to production

### 4. Verify Deployment

1. Visit your Amplify URL (e.g., `https://main.d32q1fe4on3zdo.amplifyapp.com`)
2. Click "Start here"
3. Type a message
4. Verify AI responds
5. Check browser dev tools - you should see API calls to API Gateway

## Architecture Details

### Lambda Functions

| Function | Purpose | Timeout | Memory |
|----------|---------|---------|---------|
| `create-session` | Creates new session in DynamoDB | 10s | 256MB |
| `get-session` | Retrieves session by ID | 10s | 256MB |
| `handle-message` | Processes AI conversation | 30s | 512MB |
| `generate-magic-link` | Generates session restoration token | 10s | 256MB |

### DynamoDB Schema

**Table:** `flowency-build-sessions`
- **PK**: Partition key (e.g., `SESSION#uuid`)
- **SK**: Sort key (e.g., `METADATA`, `MESSAGE#timestamp`, `SPEC#version`)
- **GSI1**: Global Secondary Index for magic link lookups

### API Gateway Routes

```
POST   /sessions              → create-session Lambda
GET    /sessions/{id}         → get-session Lambda
POST   /sessions/{id}/messages → handle-message Lambda
POST   /sessions/{id}/magic-link → generate-magic-link Lambda
```

## Cost Breakdown (Free Tier)

- **DynamoDB**: 25GB storage, 25 RCU/WCU (always free)
- **Lambda**: 1M requests/month (12 months free)
- **API Gateway**: 1M requests/month (12 months free)
- **Amplify**: Build minutes + hosting (12 months free)

**Total after free tier expires:** ~$5-10/month for 1-5 users/week

## Troubleshooting

### Lambda Can't Access DynamoDB

Check IAM role permissions:
```bash
aws iam get-role --role-name FlowencyBuildStack-LambdaExecutionRole
```

Verify the role has `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query` permissions.

### API Gateway Returns 502

Check Lambda logs:
```bash
aws logs tail /aws/lambda/flowency-build-handle-message --follow
```

### Amplify Build Fails

Check that environment variables are set correctly in Amplify Console.

### Session Creation Fails

1. Check Lambda logs for errors
2. Verify DynamoDB table exists: `aws dynamodb describe-table --table-name flowency-build-sessions --region eu-west-2`
3. Check API Gateway URL is correct in Amplify env vars

## Updating Lambda Functions

After making code changes to Lambda functions:

```bash
cd lambda
npm run deploy
```

This rebuilds and redeploys all Lambda functions. No need to redeploy Amplify unless you change the frontend.

## Monitoring

### CloudWatch Logs

View Lambda execution logs:
```bash
# Create session logs
aws logs tail /aws/lambda/flowency-build-create-session --follow

# Handle message logs
aws logs tail /aws/lambda/flowency-build-handle-message --follow
```

### DynamoDB

View recent sessions:
```bash
aws dynamodb scan \
  --table-name flowency-build-sessions \
  --limit 10 \
  --region eu-west-2
```

## Cleanup (Optional)

To remove all infrastructure:

```bash
cd lambda/cdk
cdk destroy
```

This removes:
- All Lambda functions
- API Gateway
- DynamoDB table (if RemovalPolicy allows)

**Note:** DynamoDB table has `RETAIN` policy to prevent accidental data loss.

## Support

For issues, check:
1. Lambda CloudWatch logs
2. Amplify build logs
3. Browser console for frontend errors
4. API Gateway execution logs
