import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import { it, vi, expect, describe, beforeEach, afterEach } from 'vitest';
import { handler } from ".";
import { collections } from "../../../test/fixtures/collections";

const snsMock = mockClient(SNSClient);
const dynamodbMock = mockClient(DynamoDBClient);

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("handler", () => {
  beforeEach(() => {
    dynamodbMock.on(ScanCommand).resolves({
      Items: [
        {
          uuid: { S: "1" },
          name: { S: "Test User" },
          mobileNumber: { S: "+447700900000" },
        }
      ],
    });

    fetchMock.mockResolvedValue({
      json: async () => collections,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return no collections tomorrow", async () => {
    const date = new Date(2000, 1, 1);
    vi.setSystemTime(date)

    const result = await handler();
    expect(result).toEqual({
      statusCode: 200,
      body: "No collections tomorrow",
    });
  });

  it("should return sent to 1 users", async () => {
    const date = new Date(2024, 8, 8, 12);
    vi.setSystemTime(date)

    const result = await handler();
    expect(result).toEqual({
      statusCode: 200,
      body: "Sent messages to 1 users",
    });

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      PhoneNumber: "+447700900000",
      Message: "Hi Test User, tomorrow the following services will be collected\nDomestic Waste, Food Waste",
      Subject: "Bin Collections Tomorrow",
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: "Lynmouth",
        },
      }
    });
  });

  it("should return sent to 2 users", async () => {
    const date = new Date(2024, 8, 8, 12);
    vi.setSystemTime(date);

    dynamodbMock.on(ScanCommand).resolves({
      Items: [
        {
          uuid: { S: "1" },
          name: { S: "Test User" },
          mobileNumber: { S: "+447700900000" },
        },
        {
          uuid: { S: "2" },
          name: { S: "Test User 2" },
          mobileNumber: { S: "+447700900001" },
        }
      ],
    });

    const result = await handler();
    expect(result).toEqual({
      statusCode: 200,
      body: "Sent messages to 2 users",
    });

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      PhoneNumber: "+447700900000",
      Message: "Hi Test User, tomorrow the following services will be collected\nDomestic Waste, Food Waste",
      Subject: "Bin Collections Tomorrow",
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: "Lynmouth",
        },
      }
    });

    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
      PhoneNumber: "+447700900001",
      Message: "Hi Test User 2, tomorrow the following services will be collected\nDomestic Waste, Food Waste",
      Subject: "Bin Collections Tomorrow",
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: "Lynmouth",
        },
      }
    });
  });
});
