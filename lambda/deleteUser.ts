import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const { QUEUE_URL, REGION } = process.env;
const sqsClient = new SQSClient({ region: REGION });

type PathParams = {
  id: string;
};

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const { id } = event.pathParameters as PathParams;

  try {
    const message = {
      commandName: 'DELETE',
      params: { id }
    };
    const messageCommand = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(message)
    });

    await sqsClient.send(messageCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ data: id }),
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
