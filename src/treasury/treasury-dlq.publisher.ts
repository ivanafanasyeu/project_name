import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, type Message, type Producer } from 'kafkajs';
import type { KafkaContext } from '@nestjs/microservices';

@Injectable()
export class TreasuryDlqPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer;
  private connected = false;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    if (brokers.length === 0) {
      throw new Error('KAFKA_BROKERS must contain at least one broker');
    }
    const kafka = new Kafka({ clientId: 'capacity-service-dlq', brokers });
    this.producer = kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.producer.connect();
    this.connected = true;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  async publish(
    context: KafkaContext,
    errorCode: string,
    errorMessage: string,
    fallbackPayload?: unknown,
  ): Promise<void> {
    const source = context.getMessage();
    const headers: Message['headers'] = {
      'error-code': errorCode,
      'error-message': errorMessage,
      'source-topic': context.getTopic(),
      'source-partition': String(context.getPartition()),
      'source-offset': source.offset,
      'failed-at': new Date().toISOString(),
    };
    const rawValue = source.value;
    const value =
      rawValue === undefined ? serializeFallback(fallbackPayload) : rawValue;

    await this.producer.send({
      topic: process.env.KAFKA_DLQ_TOPIC ?? 'treasury.program-capacity.dlq',
      messages: [
        {
          key: source.key,
          value,
          headers,
        },
      ],
    });
  }
}

function serializeFallback(payload: unknown): Message['value'] {
  if (Buffer.isBuffer(payload) || typeof payload === 'string' || payload === null) {
    return payload;
  }
  return JSON.stringify(payload) ?? String(payload);
}
