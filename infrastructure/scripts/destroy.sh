#!/bin/bash

# Destruction script for Specification Wizard infrastructure
# Usage: ./scripts/destroy.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "DESTROYING Specification Wizard Infrastructure"
echo "Environment: $ENVIRONMENT"
echo "========================================="
echo ""
echo "WARNING: This will DELETE all infrastructure including:"
echo "  - DynamoDB tables (all session data)"
echo "  - S3 buckets (all PDFs and exports)"
echo "  - CloudFront distributions"
echo "  - API Gateway endpoints"
echo "  - CloudWatch logs and alarms"
echo "  - IAM roles and policies"
echo ""

if [ "$ENVIRONMENT" == "production" ]; then
    echo "!!! PRODUCTION ENVIRONMENT !!!"
    echo "This will delete PRODUCTION data!"
    echo ""
fi

read -p "Type 'DELETE' to confirm destruction: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "Destruction cancelled."
    exit 1
fi

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
fi

# Set environment
export ENVIRONMENT=$ENVIRONMENT

# Navigate to infrastructure directory
cd "$PROJECT_DIR"

echo ""
echo "Destroying infrastructure..."
npm run destroy

echo "========================================="
echo "Infrastructure destroyed!"
echo "========================================="
