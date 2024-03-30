# AWS Bin Reminder Notifications

This project is a simple AWS CDK stack that sends a reminder notification to a user when the bin is due to be collected.

## Architecture

![Architecture](./docs/assets/architecture.png)

The architecture of the project is as follows:

1. A CloudWatch Event Rule is created that triggers a Lambda function every day at 6pm.
2. The Lambda function checks the day of the week and sends a notification to the user if the bin is due to be collected the next day.
3. The notification is sent via SNS.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
