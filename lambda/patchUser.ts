import { AttributeValue, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const { QUEUE_URL, REGION } = process.env;
const sqsClient = new SQSClient({ region: REGION });

type PathParams = {
  id: string;
};
type BodyProps = {
  firstName: string;
  lastName: string;
};

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const { id } = event.pathParameters as PathParams;

  try {
    const { firstName, lastName } = JSON.parse(event.body ?? '{}') as BodyProps;

    const message = {
      commandName: 'UPDATE',
      params: {
        id,
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
