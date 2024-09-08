import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as BinCollectionNotification from '../lib/stacks/bin-collection-notification-stack';
import { test } from "vitest";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/bin-collection-notification-stack.ts
test('DynamoDB Table Created', () => {
  const app = new cdk.App();
  const stack = new BinCollectionNotification.BinCollectionNotificationStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  template.hasResource('AWS::DynamoDB::GlobalTable', {});
});
