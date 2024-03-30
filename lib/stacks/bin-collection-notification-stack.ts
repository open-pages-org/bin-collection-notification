import { Duration, Stack, aws_events, aws_events_targets, aws_lambda, aws_lambda_nodejs, aws_sns, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export class BinCollectionNotificationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const topic = new aws_sns.Topic(this, 'BinCollectionNotifications', {
      displayName: 'Bin Collection Notifications',
      topicName: 'BinCollectionNotifications'
    });

    const lambdaEntryPath = path.join(__dirname + "/../functions/checkBinCollections/index.ts")
    const lambda = new aws_lambda_nodejs.NodejsFunction(this, 'checkBinCollectionsLambda', {
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      bundling: {
        sourceMap: true,
        minify: true,
      },
      entry: lambdaEntryPath,
      environment: {
        TOPIC_ARN: topic.topicArn
      },
      memorySize: 256,
      timeout: Duration.seconds(30)
    });

    topic.grantPublish(lambda);

    const rule = new aws_events.Rule(this, 'Rule', {
      schedule: aws_events.Schedule.expression('cron(0 18 ? * * *)')
    });

    rule.addTarget(new aws_events_targets.LambdaFunction(lambda));

  }
}
