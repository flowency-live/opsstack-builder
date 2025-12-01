# Specification Wizard

An intelligent web-based system that guides SME users through creating comprehensive product specifications for software and digital products using conversational AI.

## 🚀 Quick Start

### For AWS Amplify Deployment

This repository is configured for automatic deployment via AWS Amplify connected to GitHub.

**Repository**: https://github.com/flowency-live/builder

### Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Node.js 18+ installed
4. Git configured

## 📋 Deployment Steps

### 1. Deploy Backend Infrastructure (One-Time)

```bash
# Navigate to infrastructure directory
cd infrastructure

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

**Save the outputs** - you'll need them for Amplify configuration.

### 2. Configure AWS Amplify

See [AMPLIFY_INTEGRATION_GUIDE.md](./AMPLIFY_INTEGRATION_GUIDE.md) for detailed instructions.

**Quick steps**:
1. Go to AWS Amplify Console
2. Connect to GitHub repository: `flowency-live/builder`
3. Select branch: `main`
4. Add environment variables from infrastructure outputs
5. Deploy!

### 3. Configure Secrets

```bash
cd infrastructure
./scripts/update-secrets.sh dev
```

Enter your API keys when prompted.

### 4. Verify SES Email

1. Go to AWS SES Console
2. Verify your sender email address
3. Request production access (for sending to any email)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Git Push → GitHub → AWS Amplify → Next.js App         │
│                                                          │
│  Uses CDK Infrastructure:                               │
│  • DynamoDB (sessions, specifications, submissions)     │
│  • S3 (PDFs, exports)                                   │
│  • SES (email notifications)                            │
│  • CloudFront (CDN)                                     │
│  • CloudWatch (monitoring)                              │
└─────────────────────────────────────────────────────────┘
```

## 📚 Documentation

- **[AMPLIFY_INTEGRATION_GUIDE.md](./AMPLIFY_INTEGRATION_GUIDE.md)** - Complete Amplify setup guide
- **[AWS_INFRASTRUCTURE_SETUP.md](./AWS_INFRASTRUCTURE_SETUP.md)** - Infrastructure overview
- **[infrastructure/README.md](./infrastructure/README.md)** - Infrastructure documentation
- **[infrastructure/DEPLOYMENT_GUIDE.md](./infrastructure/DEPLOYMENT_GUIDE.md)** - Detailed deployment steps
- **[infrastructure/QUICK_REFERENCE.md](./infrastructure/QUICK_REFERENCE.md)** - Common commands

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start LocalStack (for local AWS services)
docker-compose up -d

# Run development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests
npm run test:property
```

## 🔐 Security

- All data encrypted at rest (DynamoDB, S3)
- TLS 1.2+ for data in transit
- IAM roles with least-privilege access
- API keys stored in AWS Secrets Manager
- CSRF protection on all API routes
- Rate limiting enabled

## 📊 Monitoring

- CloudWatch Dashboard: View metrics and logs
- CloudWatch Alarms: Automated alerts for errors
- X-Ray Tracing: Distributed request tracing (optional)

Access dashboard: AWS Console → CloudWatch → Dashboards → `spec-wizard-{env}`

## 🌍 Environments

- **Development**: `dev` branch → dev environment
- **Staging**: `staging` branch → staging environment  
- **Production**: `main` branch → production environment

## 💰 Cost Estimation

Estimated monthly costs for low-medium traffic: **$10-50**

- DynamoDB: $5-15 (on-demand)
- S3: $1-5
- CloudFront: $0-10
- SES: $0-5
- Other services: $5-15

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Commit with descriptive message
5. Push to GitHub
6. Amplify auto-deploys!

## 📝 Environment Variables

### Required for Amplify

```bash
# AWS Infrastructure (from CDK outputs)
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=spec-wizard-sessions-dev
S3_BUCKET_NAME=spec-wizard-exports-dev-123456789012
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# SES Configuration
SES_FROM_EMAIL=noreply@flowency.build
SES_CONFIGURATION_SET=spec-wizard-dev

# Application
NEXT_PUBLIC_APP_URL=https://your-app.amplifyapp.com
NODE_ENV=production
```

## 🐛 Troubleshooting

### Build Fails in Amplify
- Check build logs in Amplify Console
- Verify environment variables are set
- Check Node.js version compatibility

### Can't Access DynamoDB
- Verify IAM role has correct permissions
- Check table name matches CDK output
- Verify AWS region is correct

### Emails Not Sending
- Verify sender email in SES
- Check SES sandbox status
- Review IAM permissions for SES

See [AMPLIFY_INTEGRATION_GUIDE.md](./AMPLIFY_INTEGRATION_GUIDE.md) for more troubleshooting tips.

## 📞 Support

- **Infrastructure Issues**: Check CloudWatch logs
- **Application Issues**: Check Amplify build logs
- **AWS Support**: https://console.aws.amazon.com/support/

## 📄 License

Proprietary - FlowencyBuild

## 🎯 Features

- ✅ Conversational AI-powered specification creation
- ✅ Real-time specification preview
- ✅ Progress tracking with dynamic topics
- ✅ Cross-device session continuity (magic links)
- ✅ PDF export with professional formatting
- ✅ Email notifications
- ✅ Submission workflow with reference numbers
- ✅ Comprehensive property-based testing
- ✅ Security and data protection
- ✅ Monitoring and observability

## 🚦 Status

- ✅ Infrastructure: Complete
- ✅ Core Features: Complete
- ✅ Testing: Complete
- ✅ Documentation: Complete
- 🔄 Deployment: Ready for Amplify

---

**Ready to deploy!** Push to GitHub and connect Amplify to get started.
