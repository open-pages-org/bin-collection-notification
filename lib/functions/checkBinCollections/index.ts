import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

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

const sendSNS = async (message: string) => {
  const input = {
    TopicArn: process.env.TOPIC_ARN,
    Message: message,
    Subject: "Bin Collections for Tomorrow",
  };

  console.log("Sending SNS Message");

  const command = new PublishCommand(input);
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

  const message = `Tomorrow the following services will collected\n${bins}`;
  console.log(message);

  await sendSNS(message);

  return {
    statusCode: 200,
    body: message,
  };
};
