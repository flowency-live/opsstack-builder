#!/bin/bash

# Script to update API keys in AWS Secrets Manager
# Usage: ./scripts/update-secrets.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
APP_NAME=${APP_NAME:-spec-wizard}

echo "========================================="
echo "Updating API Keys in Secrets Manager"
echo "Environment: $ENVIRONMENT"
echo "========================================="

SECRET_NAME="${APP_NAME}/api-keys/${ENVIRONMENT}"

echo ""
echo "Current secret: $SECRET_NAME"
echo ""

# Prompt for API keys
read -p "Enter OpenAI API Key (or press Enter to skip): " OPENAI_KEY
read -p "Enter Anthropic API Key (or press Enter to skip): " ANTHROPIC_KEY

# Build JSON
SECRET_JSON="{"

if [ ! -z "$OPENAI_KEY" ]; then
    SECRET_JSON="${SECRET_JSON}\"openaiApiKey\":\"${OPENAI_KEY}\""
fi

if [ ! -z "$ANTHROPIC_KEY" ]; then
    if [ ! -z "$OPENAI_KEY" ]; then
        SECRET_JSON="${SECRET_JSON},"
    fi
    SECRET_JSON="${SECRET_JSON}\"anthropicApiKey\":\"${ANTHROPIC_KEY}\""
fi

SECRET_JSON="${SECRET_JSON}}"

echo ""
echo "Updating secret..."

aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "${AWS_REGION:-us-east-1}"

echo ""
echo "Secret updated successfully!"
echo ""
echo "To verify, run:"
echo "aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region ${AWS_REGION:-us-east-1}"
