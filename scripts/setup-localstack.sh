#!/bin/bash

# LocalStack Setup Script
# This script sets up DynamoDB tables and S3 buckets in LocalStack for local development

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"
TABLE_NAME="spec-wizard-sessions"
BUCKET_NAME="spec-wizard-exports"

echo "Setting up LocalStack resources..."

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" > /dev/null; do
  echo "Waiting for LocalStack..."
  sleep 2
done

echo "LocalStack is ready!"

# Create DynamoDB table
echo "Creating DynamoDB table: $TABLE_NAME"
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=magicLinkToken,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=MagicLinkIndex,KeySchema=[{AttributeName=magicLinkToken,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url "$LOCALSTACK_ENDPOINT" \
  --region "$AWS_REGION" \
  2>/dev/null || echo "Table already exists"

# Create S3 bucket
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3 mb "s3://$BUCKET_NAME" \
  --endpoint-url "$LOCALSTACK_ENDPOINT" \
  --region "$AWS_REGION" \
  2>/dev/null || echo "Bucket already exists"

# Configure S3 bucket for public read (for exports)
echo "Configuring S3 bucket policy..."
aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::'"$BUCKET_NAME"'/*"
      }
    ]
  }' \
  --endpoint-url "$LOCALSTACK_ENDPOINT" \
  --region "$AWS_REGION" \
  2>/dev/null || echo "Policy already set"

echo "LocalStack setup complete!"
echo ""
echo "Resources created:"
echo "  - DynamoDB Table: $TABLE_NAME"
echo "  - S3 Bucket: $BUCKET_NAME"
echo ""
echo "You can now run the application with USE_LOCALSTACK=true"
