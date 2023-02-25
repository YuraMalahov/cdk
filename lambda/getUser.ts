import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const { TABLE_NAME, REGION } = process.env;
const ddbClient = new DynamoDBClient({ region: REGION });

type PathParams = {
  id: string;
};

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  const { id } = event.pathParameters as PathParams;

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'partitionKey = :pk',
    ExpressionAttributeValues: {
      ':pk': {
        S: id
      }
    }
  };

  try {
    const data = await ddbClient.send(new QueryCommand(params));

    console.log(data);

    if (data.Items?.length) {
      return {
        statusCode: 200,
        body: JSON.stringify(data.Items[0]),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({}),
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
