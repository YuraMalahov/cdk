import { SQSEvent } from 'aws-lambda';
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  AttributeValue
} from '@aws-sdk/client-dynamodb';
import { DeleteMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';

const { TABLE_NAME, REGION, QUEUE_URL } = process.env;
const ddbClient = new DynamoDBClient({ region: REGION });
const sqsClient = new SQSClient({ region: REGION });

interface PutItemParams {
  firstName: string;
  lastName: string;
};

interface UpdateItemParams {
  id: string;
  firstName?: string;
  lastName?: string;
};

interface DeleteItemParams {
  id: string;
};

const putItem = ({ firstName, lastName }: PutItemParams): PutItemCommand => {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      partitionKey: {
        S: randomUUID()
      },
      firstName: {
        S: firstName
      },
      lastName: {
        S: lastName
      }
    }
  };

  return new PutItemCommand(params);
};

const updateItem = ({ id, firstName, lastName }: UpdateItemParams): UpdateItemCommand => {
  let updateExpression = 'SET';
  let expressionAttributeValues = {} as Record<string, AttributeValue>;

  if (firstName) {
    updateExpression = `${updateExpression} firstName=:val1`;
    expressionAttributeValues[':val1'] = { S: firstName };
  }

  if (lastName) {
    const delimiter = firstName && lastName ? ', ' : '';
    updateExpression = `${updateExpression}${delimiter} lastName=:val2`;
    expressionAttributeValues[':val2'] = { S: lastName };
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      partitionKey: {
        S: id
      }
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  return new UpdateItemCommand(params);
};

const deleteItem = ({ id }: DeleteItemParams): DeleteItemCommand => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      partitionKey: {
        S: id
      }
    },
    ReturnValues: 'ALL_OLD'
  };

  return new DeleteItemCommand(params);
};

const buildCommand = (
  commandName: string,
  params: PutItemParams | UpdateItemParams | DeleteItemParams
): PutItemCommand | UpdateItemCommand | DeleteItemCommand | undefined => {
  if (commandName === 'POST') {
    return putItem(params as PutItemParams);
  }

  if (commandName === 'UPDATE') {
    return updateItem(params as UpdateItemParams);
  }

  if (commandName === 'DELETE') {
    return deleteItem(params as DeleteItemParams);
  }

  return;
}

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  for (const record of event.Records) {
    try {
      const { commandName, params } = JSON.parse(record.body);
      const command = buildCommand(commandName, params);

      if (command) {
        await ddbClient.send(command as any);

        console.log(`Successfully wrote to DynamoDB: ${JSON.stringify(params)}`);
      } else {
        console.error(`command not supported: ${commandName}`);
      }

      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: record.receiptHandle,
      });

      await sqsClient.send(deleteCommand);

      console.log(`Successfully delete message from queue: ${record}`);
    } catch (error) {
      console.error(`Error writing to DynamoDB: ${error}`);
    }
  }
};
