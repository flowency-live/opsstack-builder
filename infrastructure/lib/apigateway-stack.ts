import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface APIGatewayStackProps extends cdk.StackProps {
  environment: string;
  appName: string;
  lambdaRole: iam.Role;
}

export class APIGatewayStack extends cdk.Stack {
  public readonly webSocketApi: apigatewayv2.CfnApi;
  public readonly webSocketStage: apigatewayv2.CfnStage;

  constructor(scope: Construct, id: string, props: APIGatewayStackProps) {
    super(scope, id, props);

    const { environment, appName, lambdaRole } = props;

    // WebSocket API
    this.webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketAPI', {
      name: `${appName}-websocket-${environment}`,
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
      description: 'WebSocket API for real-time chat streaming',
    });

    // Lambda function for WebSocket connections (placeholder)
    // In production, this would be replaced with actual Lambda functions
    const connectHandler = new lambda.Function(this, 'ConnectHandler', {
      functionName: `${appName}-ws-connect-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('WebSocket connection:', event);
          return { statusCode: 200, body: 'Connected' };
        };
      `),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
      },
    });

    const disconnectHandler = new lambda.Function(this, 'DisconnectHandler', {
      functionName: `${appName}-ws-disconnect-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('WebSocket disconnection:', event);
          return { statusCode: 200, body: 'Disconnected' };
        };
      `),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
      },
    });

    const messageHandler = new lambda.Function(this, 'MessageHandler', {
      functionName: `${appName}-ws-message-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('WebSocket message:', event);
          return { statusCode: 200, body: 'Message received' };
        };
      `),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(300), // 5 minutes for streaming
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
      },
    });

    // Grant API Gateway permission to invoke Lambda functions
    connectHandler.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    disconnectHandler.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    messageHandler.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // WebSocket integrations
    const connectIntegration = new apigatewayv2.CfnIntegration(this, 'ConnectIntegration', {
      apiId: this.webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectHandler.functionArn}/invocations`,
    });

    const disconnectIntegration = new apigatewayv2.CfnIntegration(this, 'DisconnectIntegration', {
      apiId: this.webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${disconnectHandler.functionArn}/invocations`,
    });

    const messageIntegration = new apigatewayv2.CfnIntegration(this, 'MessageIntegration', {
      apiId: this.webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${messageHandler.functionArn}/invocations`,
    });

    // WebSocket routes
    new apigatewayv2.CfnRoute(this, 'ConnectRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: `integrations/${connectIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, 'DisconnectRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$disconnect',
      target: `integrations/${disconnectIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, 'MessageRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: 'sendMessage',
      target: `integrations/${messageIntegration.ref}`,
    });

    // CloudWatch log group for API Gateway
    const logGroup = new logs.LogGroup(this, 'WebSocketAPILogs', {
      logGroupName: `/aws/apigateway/${appName}-websocket-${environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WebSocket stage
    this.webSocketStage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
      apiId: this.webSocketApi.ref,
      stageName: environment,
      description: `${environment} stage for WebSocket API`,
      autoDeploy: true,
      defaultRouteSettings: {
        throttlingBurstLimit: 500,
        throttlingRateLimit: 100,
      },
      accessLogSettings: {
        destinationArn: logGroup.logGroupArn,
        format: JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          requestTime: '$context.requestTime',
          routeKey: '$context.routeKey',
          status: '$context.status',
          protocol: '$context.protocol',
          responseLength: '$context.responseLength',
        }),
      },
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'WebSocketAPIId', {
      value: this.webSocketApi.ref,
      description: 'WebSocket API ID',
      exportName: `${appName}-WebSocketAPIId-${environment}`,
    });

    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${environment}`,
      description: 'WebSocket API URL',
      exportName: `${appName}-WebSocketURL-${environment}`,
    });

    // Tags
    cdk.Tags.of(connectHandler).add('Component', 'WebSocket');
    cdk.Tags.of(disconnectHandler).add('Component', 'WebSocket');
    cdk.Tags.of(messageHandler).add('Component', 'WebSocket');
  }
}
