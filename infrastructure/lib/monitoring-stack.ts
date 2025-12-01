import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
  dynamoDBTable: dynamodb.Table;
  exportsBucket: s3.Bucket;
  apiGateway: apigatewayv2.CfnApi;
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, appName, dynamoDBTable, exportsBucket, apiGateway } = props;

    // SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${appName}-alarms-${environment}`,
      displayName: 'CloudWatch Alarms',
    });

    // Subscribe alert email to alarm topic
    if (process.env.ALERT_EMAIL) {
      this.alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(process.env.ALERT_EMAIL)
      );
    }

    // CloudWatch log groups
    const applicationLogGroup = new logs.LogGroup(this, 'ApplicationLogs', {
      logGroupName: `/aws/${appName}/${environment}/application`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const errorLogGroup = new logs.LogGroup(this, 'ErrorLogs', {
      logGroupName: `/aws/${appName}/${environment}/errors`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB alarms
    const dynamoDBReadThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoDBReadThrottle', {
      alarmName: `${appName}-${environment}-dynamodb-read-throttle`,
      metric: dynamoDBTable.metricUserErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dynamoDBReadThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    const dynamoDBWriteThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoDBWriteThrottle', {
      alarmName: `${appName}-${environment}-dynamodb-write-throttle`,
      metric: dynamoDBTable.metricSystemErrorsForOperations({
        operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.UPDATE_ITEM],
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dynamoDBWriteThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // S3 alarms
    const s34xxErrorAlarm = new cloudwatch.Alarm(this, 'S34xxErrors', {
      alarmName: `${appName}-${environment}-s3-4xx-errors`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: '4xxErrors',
        dimensionsMap: {
          BucketName: exportsBucket.bucketName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 50,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    s34xxErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    const s35xxErrorAlarm = new cloudwatch.Alarm(this, 'S35xxErrors', {
      alarmName: `${appName}-${environment}-s3-5xx-errors`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: '5xxErrors',
        dimensionsMap: {
          BucketName: exportsBucket.bucketName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    s35xxErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Gateway alarms
    const apiGateway5xxAlarm = new cloudwatch.Alarm(this, 'APIGateway5xxErrors', {
      alarmName: `${appName}-${environment}-apigateway-5xx-errors`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiId: apiGateway.ref,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiGateway5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${appName}-${environment}`,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Operations',
        left: [
          dynamoDBTable.metricConsumedReadCapacityUnits(),
          dynamoDBTable.metricConsumedWriteCapacityUnits(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Latency',
        left: [
          dynamoDBTable.metricSuccessfulRequestLatency({
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'S3 Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'AllRequests',
            dimensionsMap: {
              BucketName: exportsBucket.bucketName,
            },
            statistic: 'Sum',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'S3 Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: '4xxErrors',
            dimensionsMap: {
              BucketName: exportsBucket.bucketName,
            },
            statistic: 'Sum',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: '5xxErrors',
            dimensionsMap: {
              BucketName: exportsBucket.bucketName,
            },
            statistic: 'Sum',
          }),
        ],
        width: 12,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: {
              ApiId: apiGateway.ref,
            },
            statistic: 'Sum',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'IntegrationLatency',
            dimensionsMap: {
              ApiId: apiGateway.ref,
            },
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // Custom metrics for business KPIs
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Sessions Created (24h)',
        metrics: [
          new cloudwatch.Metric({
            namespace: `${appName}/${environment}`,
            metricName: 'SessionsCreated',
            statistic: 'Sum',
            period: cdk.Duration.days(1),
          }),
        ],
        width: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Submissions (24h)',
        metrics: [
          new cloudwatch.Metric({
            namespace: `${appName}/${environment}`,
            metricName: 'SubmissionsCompleted',
            statistic: 'Sum',
            period: cdk.Duration.days(1),
          }),
        ],
        width: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Avg Session Duration',
        metrics: [
          new cloudwatch.Metric({
            namespace: `${appName}/${environment}`,
            metricName: 'SessionDuration',
            statistic: 'Average',
            period: cdk.Duration.days(1),
          }),
        ],
        width: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Completion Rate',
        metrics: [
          new cloudwatch.MathExpression({
            expression: '(submissions / sessions) * 100',
            usingMetrics: {
              sessions: new cloudwatch.Metric({
                namespace: `${appName}/${environment}`,
                metricName: 'SessionsCreated',
                statistic: 'Sum',
                period: cdk.Duration.days(1),
              }),
              submissions: new cloudwatch.Metric({
                namespace: `${appName}/${environment}`,
                metricName: 'SubmissionsCompleted',
                statistic: 'Sum',
                period: cdk.Duration.days(1),
              }),
            },
          }),
        ],
        width: 6,
      })
    );

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS topic ARN for CloudWatch alarms',
      exportName: `${appName}-AlarmTopicArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch dashboard URL',
    });

    new cdk.CfnOutput(this, 'ApplicationLogGroup', {
      value: applicationLogGroup.logGroupName,
      description: 'Application log group name',
      exportName: `${appName}-ApplicationLogGroup-${environment}`,
    });

    new cdk.CfnOutput(this, 'ErrorLogGroup', {
      value: errorLogGroup.logGroupName,
      description: 'Error log group name',
      exportName: `${appName}-ErrorLogGroup-${environment}`,
    });

    // Tags
    cdk.Tags.of(this.dashboard).add('Component', 'Monitoring');
  }
}
