import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class TaskStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const region = props?.env?.region || 'us-east-1';
    const env = scope.node.tryGetContext('environment') || 'dev';

    // SQS
    const queue = new sqs.Queue(this, `TaskQueue-${env}`, {
      visibilityTimeout: Duration.seconds(300)
    });

    // DynamoDB
    const usersTable = new dynamodb.Table(this, `Users-${env}`, {
      partitionKey: {
        name: 'partitionKey',
        type: dynamodb.AttributeType.STRING
      }
    });

    // Lambda
    const writeDataLambda = new lambda.Function(this, `WriteDataHandler-${env}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'writeData.handler',
      environment: {
        TABLE_NAME: usersTable.tableName,
        REGION: region
      }
    });

    writeDataLambda.addEventSource(new SqsEventSource(queue));

    const getUserLambda = new lambda.Function(this, `GetUserHandler-${env}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getUser.handler',
      environment: {
        TABLE_NAME: usersTable.tableName,
        REGION: region
      }
    });

    const getUsersLambda = new lambda.Function(this, `GetUsersHandler-${env}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getUsers.handler',
      environment: {
        TABLE_NAME: usersTable.tableName,
        REGION: region
      }
    });

    const postUserLambda = new lambda.Function(this, `PostUserHandler-${env}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'postUser.handler',
      environment: {
        QUEUE_URL: queue.queueUrl,
        REGION: region
      }
    });

    const patchUserLambda = new lambda.Function(this, `PatchUserHandler-${env}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'patchUser.handler',
      environment: {
        QUEUE_URL: queue.queueUrl,
        REGION: region
      }
    });

    const deleteUserLambda = new lambda.Function(this, `DeleteUserHandler-${env}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'deleteUser.handler',
      environment: {
        QUEUE_URL: queue.queueUrl,
        REGION: region
      }
    });

    // API gate way
    const myApi = new apigateway.RestApi(this, `MyApi-${env}`, {
      restApiName: `My API ${env}`
    });
    const userEndpointResource = myApi.root.addResource('user');
    const userIdResource = userEndpointResource.addResource('{id}');

    // connect lambda to apigateway
    userIdResource.addMethod('GET', new apigateway.LambdaIntegration(getUserLambda));
    userIdResource.addMethod('PATCH', new apigateway.LambdaIntegration(patchUserLambda));
    userIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserLambda));
    userEndpointResource.addMethod('POST', new apigateway.LambdaIntegration(postUserLambda));
    userEndpointResource.addMethod('GET', new apigateway.LambdaIntegration(getUsersLambda), {
      requestParameters: {
        'method.request.querystring.lastEvaluatedKey': true
      }
    });

    // add perpissions for dynamodb
    usersTable.grantReadData(getUserLambda);
    usersTable.grantReadData(getUsersLambda);
    usersTable.grantReadWriteData(writeDataLambda);

    // add perpissions for sqs
    queue.grantSendMessages(postUserLambda);
    queue.grantSendMessages(patchUserLambda);
    queue.grantSendMessages(deleteUserLambda);
  }
}
