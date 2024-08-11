import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

interface CollectionResponse {
  uprn: string;
  success: boolean;
  error_code: number;
  error_description: string;
  code_description: string;
  collections: Collection[];
}

interface Collection {
  service: string;
  round: string;
  schedule: string;
  day: string;
  date: string;
  read_date: string;
}

interface User {
  uuid: string;
  name: string;
  mobileNumber: string;
}

const usersTable = process.env.USERS_TABLE;
if (!usersTable) {
  throw new Error("No users table defined");
}

const dynamoDBClient = new DynamoDBClient({
  region: "eu-west-2",
});

const snsClient = new SNSClient({
  region: "eu-west-2",
});

const formatDate = (date: Date) => {
  let day: string | number = date.getDate();
  let month: string | number = date.getMonth() + 1; // Month is zero-based, so we add 1
  let year = date.getFullYear();

  // Pad single digit day/month with leading zero
  if (day < 10) day = '0' + day;
  if (month < 10) month = '0' + month;

  return `${day}/${month}/${year} 00:00:00`;
}

const getTomorrowDate = () => {
  let today = new Date();
  let tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Add 1 day

  return formatDate(tomorrow);
}

const url = `https://api.reading.gov.uk/api/collections/310017588`;

const getUsers = async (): Promise<{ uuid: string, name: string, mobileNumber: string }[]> => {
  const input = {
    TableName: usersTable,
  };

  const command = new ScanCommand(input);
  const response = await dynamoDBClient.send(command);

  if (!response.Items) {
    return [];
  }

  const users: User[] = [];

  response.Items.forEach(item => {
    if (!item.uuid.S || !item.name.S || !item.mobileNumber.S) {
      console.log("Invalid user", item);
    } else {
      users.push({
        uuid: item.uuid.S,
        name: item.name.S,
        mobileNumber: item.mobileNumber.S,
      });
    }
  });

  return users;
}

const sendSMS = async (mobileNumber: string, message: string) => {
  console.log("Sending SNS Message to ", mobileNumber);

  const command = new PublishCommand({
    PhoneNumber: mobileNumber,
    Message: message,
    Subject: "Bin Collections Tomorrow",
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "Lynmouth",
      },
    }
  });
  await snsClient.send(command);

  console.log("Sent SNS Message");
}

export const handler = async () => {
  const query = await fetch(url);
  const collections: CollectionResponse = await query.json();

  const match = getTomorrowDate();
  console.log("Filtering events for ", match);
  const collectionsTomorrow = collections.collections.filter(item => match.includes(item.date));

  console.log(collectionsTomorrow);

  if (collectionsTomorrow.length === 0) {
    console.log("No collections tomorrow");
    return {
      statusCode: 200,
      body: "No collections tomorrow",
    };
  }

  const bins = collectionsTomorrow.map(item => `• ${item.read_date} - ${item.service}`).join("\n");

  const users = await getUsers();
  console.log(users);

  const promises = users.map(async user => {
    await sendSMS(user.mobileNumber, `Hi ${user.name}, tomorrow the following services will be collected\n${bins}`);
  });

  const results = await Promise.allSettled(promises);

  results.forEach(result => {
    if (result.status === "rejected") {
      console.error(result.reason);
    }
  });

  return {
    statusCode: 200,
    body: `Sent messages to ${results.filter(result => result.status === "fulfilled").length} users`,
  };
};
