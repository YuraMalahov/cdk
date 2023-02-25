import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const { QUEUE_URL, REGION } = process.env;
const sqsClient = new SQSClient({ region: REGION });

type BodyProps = {
  firstName: string;
  lastName: string;
};

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { firstName, lastName } = JSON.parse(event.body ?? '{}') as BodyProps;

    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ data: 'Invalid input' }),
      };
    }

    const message = {
      commandName: 'POST',
      params: {
        firstName,
        lastName
      }
    };
    const messageCommand = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(message)
    });

    await sqsClient.send(messageCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ data: 'Ok' }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
          message: 'somthing whent wrong',
      }),
    };
  }
};
