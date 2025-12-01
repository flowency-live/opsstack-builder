#!/bin/bash

# Deployment script for Specification Wizard infrastructure
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "Deploying Specification Wizard Infrastructure"
echo "Environment: $ENVIRONMENT"
echo "========================================="

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "Loading environment variables from .env"
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Using default values."
fi

# Set environment
export ENVIRONMENT=$ENVIRONMENT

# Navigate to infrastructure directory
cd "$PROJECT_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Bootstrap CDK if needed (first time only)
if [ "$2" == "--bootstrap" ]; then
    echo "Bootstrapping CDK..."
    npm run bootstrap
fi

# Synthesize CloudFormation templates
echo "Synthesizing CloudFormation templates..."
npm run synth

# Deploy based on environment
case $ENVIRONMENT in
    dev)
        echo "Deploying to development environment..."
        npm run deploy:dev
        ;;
    staging)
        echo "Deploying to staging environment..."
        npm run deploy:staging
        ;;
    production)
        echo "Deploying to production environment..."
        echo "WARNING: This will deploy to production!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" == "yes" ]; then
            npm run deploy:prod
        else
            echo "Deployment cancelled."
            exit 1
        fi
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        echo "Valid environments: dev, staging, production"
        exit 1
        ;;
esac

echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Save the CloudFormation outputs to your application's .env file"
echo "2. Update Secrets Manager with your API keys"
echo "3. Verify SES sender email address"
echo "4. Test the infrastructure with a sample deployment"
echo ""
