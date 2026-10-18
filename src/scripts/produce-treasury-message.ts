import { randomUUID } from 'node:crypto';
import { Kafka } from 'kafkajs';

type TreasuryMessageType = 'RECONCILIATION' | 'CAPACITY_UPDATE';

const defaultProgramId = '00000000-0000-4000-8000-000000000001';
const defaultCurrency = 'USD';

function optionValue(args: string[], option: string): string | undefined {
  const index = args.indexOf(option);
  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`Missing value for ${option}`);
  }

  return value;
}

function requiredOption(args: string[], option: string): string {
  const value = optionValue(args, option);
  if (value === undefined) {
    throw new Error(`Missing required option ${option}`);
  }

  return value;
}

async function produceMessage(): Promise<void> {
  const args = process.argv.slice(2);
  const programId = optionValue(args, '--program') ?? defaultProgramId;
  const rawValue = optionValue(args, '--raw');
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
  const topic = process.env.KAFKA_TOPIC ?? 'treasury.program-capacity';

  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS must contain at least one broker');
  }

  let value = rawValue;
  if (value === undefined) {
    const type = requiredOption(args, '--type');
    if (type !== 'RECONCILIATION' && type !== 'CAPACITY_UPDATE') {
      throw new Error('--type must be RECONCILIATION or CAPACITY_UPDATE');
    }

    const message: Record<string, string> = {
      messageId: randomUUID(),
      type: type as TreasuryMessageType,
      programId,
      sequence: requiredOption(args, '--sequence'),
      currency: optionValue(args, '--currency') ?? defaultCurrency,
      limitMinor: requiredOption(args, '--limit'),
    };

    if (type === 'RECONCILIATION') {
      message.reservedMinor = requiredOption(args, '--reserved');
    }

    message.sentAt = new Date().toISOString();
    value = JSON.stringify(message);
  }

  const kafka = new Kafka({ clientId: 'treasury-producer', brokers });
  const producer = kafka.producer();

  await producer.connect();
  try {
    const result = await producer.send({
      topic,
      messages: [{ key: programId, value }],
    });

    for (const record of result) {
      console.log(`topic=${record.topicName} partition=${record.partition} offset=${record.baseOffset}`);
    }
  } finally {
    await producer.disconnect();
  }
}

produceMessage().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});