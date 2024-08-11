import { Duration, RemovalPolicy, Stack, aws_events, aws_events_targets, aws_lambda, type StackProps } from 'aws-cdk-lib';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class BinCollectionNotificationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const usersTable = new TableV2(this, 'users-table', {
      tableName: 'bin-collections-users',
      partitionKey: { name: 'uuid', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const lambda = new NodejsFunction(this, 'checkBinCollectionsLambda', {
      functionName: 'bin-collections-check',
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: "lib/functions/checkBinCollections/index.ts",
      timeout: Duration.seconds(30),
      bundling: {
        platform: "node",
        mainFields: ['module', 'main'],
        format: OutputFormat.ESM,
      },
      environment: {
        USERS_TABLE: usersTable.tableName,
      },
      memorySize: 256,
    });
    usersTable.grantReadData(lambda);
    lambda.addToRolePolicy(new PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
    }));


    const rule = new aws_events.Rule(this, 'Rule', {
      schedule: aws_events.Schedule.expression('cron(0 18 ? * * *)')
    });

    rule.addTarget(new aws_events_targets.LambdaFunction(lambda));
  }
}
