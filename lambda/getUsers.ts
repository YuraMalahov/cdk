import { APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const { TABLE_NAME, REGION } = process.env;
const ddbClient = new DynamoDBClient({ region: REGION });

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  const pageSize = 10;
  const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;

  try {
    const params = {
      TableName: TABLE_NAME,
      Limit: pageSize,
      ExclusiveStartKey: lastEvaluatedKey ? { partitionKey: { S: lastEvaluatedKey } } : undefined,
    };
    const data = await ddbClient.send(new ScanCommand(params));

    console.log(data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: data.Items,
        metadata: {
          count: data.Count,
          LastEvaluatedKey: data?.LastEvaluatedKey?.partitionKey?.S,
        }
      }),
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
