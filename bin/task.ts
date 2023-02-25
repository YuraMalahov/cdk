#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TaskStack } from '../lib/task-stack';

const app = new cdk.App();
const region = app.node.tryGetContext('region') || 'us-east-1';
const environment = app.node.tryGetContext('environment') || 'dev';

new TaskStack(app, `TaskStack-${environment}`, { env: { region } });

// cdk deploy --context region=us-east-1 --context environment=dev
