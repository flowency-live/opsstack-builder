#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FlowencyBuildStack } from '../lib/flowency-build-stack';

const app = new cdk.App();

new FlowencyBuildStack(app, 'FlowencyBuildStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION || 'eu-west-2',
  },
  description: 'Flowency Build - Specification Wizard Infrastructure',
  tags: {
    Project: 'FlowencyBuild',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
});

app.synth();
