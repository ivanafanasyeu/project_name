import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { TreasuryApplyOutcome, TreasuryService } from './treasury.service.js';
import {
  TreasuryMessageValidationError,
  validateTreasuryMessage,
} from './treasury-message.dto.js';
import {
  TreasuryCurrencyMismatchError,
  TreasuryLimitBelowReservedError,
} from './treasury.errors.js';
import { TreasuryDlqPublisher } from './treasury-dlq.publisher.js';

@Controller()
export class TreasuryConsumer {
  private readonly logger = new Logger(TreasuryConsumer.name);

  constructor(
    private readonly treasuryService: TreasuryService,
    private readonly dlqPublisher: TreasuryDlqPublisher,
  ) {}

  @EventPattern(process.env.KAFKA_TOPIC ?? 'treasury.program-capacity')
  async handleCapacityMessage(
    @Payload() payload: unknown,
    @Ctx() context: unknown,
  ): Promise<void> {
    const kafkaContext = context as KafkaContext;
    const message = kafkaContext.getMessage();
    const metadata = getMessageMetadata(payload);
    const logFields = (outcome: string) =>
      `messageId=${metadata.messageId} programId=${metadata.programId} sequence=${metadata.sequence} partition=${kafkaContext.getPartition()} offset=${message.offset} outcome=${outcome}`;

    let treasuryMessage;
    try {
      treasuryMessage = await validateTreasuryMessage(payload, message.key);
    } catch (error) {
      if (!(error instanceof TreasuryMessageValidationError)) {
        throw error;
      }
      await this.dlqPublisher.publish(
        kafkaContext,
        'INVALID_MESSAGE',
        error.message,
        payload,
      );
      this.logger.error(
        `TREASURY_INVALID_MESSAGE ${logFields('DLQ')} sentLimit=${metadata.limitMinor} sentReserved=${metadata.reservedMinor} error=${error.message}`,
      );
      return;
    }

    metadata.messageId = treasuryMessage.messageId;
    metadata.programId = treasuryMessage.programId;
    metadata.sequence = treasuryMessage.sequence;
    metadata.limitMinor = treasuryMessage.limitMinor;
    metadata.reservedMinor = treasuryMessage.reservedMinor ?? 'unknown';

    let outcome: TreasuryApplyOutcome;
    try {
      outcome = await this.treasuryService.apply(treasuryMessage);
    } catch (error) {
      if (error instanceof TreasuryCurrencyMismatchError) {
        await this.dlqPublisher.publish(
          kafkaContext,
          'CURRENCY_MISMATCH',
          error.message,
          payload,
        );
        this.logger.error(
          `TREASURY_CURRENCY_MISMATCH ${logFields('DLQ')} sentLimit=${metadata.limitMinor} currentReserved=${error.currentReservedMinor} currentCurrency=${error.currentCurrency} sentCurrency=${error.messageCurrency}`,
        );
        return;
      }
      if (error instanceof TreasuryLimitBelowReservedError) {
        await this.dlqPublisher.publish(
          kafkaContext,
          'LIMIT_BELOW_RESERVED',
          error.message,
          payload,
        );
        this.logger.error(
          `TREASURY_LIMIT_BELOW_RESERVED ${logFields('DLQ')} sentLimit=${error.limitMinor} currentReserved=${error.reservedMinor}`,
        );
        return;
      }
      throw error;
    }

    const log = `${logFields(outcome)} topic=${kafkaContext.getTopic()}`;
    if (outcome === TreasuryApplyOutcome.SKIPPED_STALE) {
      this.logger.debug(log);
    } else {
      this.logger.log(log);
    }
  }
}

function getMessageMetadata(payload: unknown): {
  messageId: string;
  programId: string;
  sequence: string;
  limitMinor: string;
  reservedMinor: string;
} {
  let value = payload;
  if (Buffer.isBuffer(value)) {
    try {
      value = JSON.parse(value.toString());
    } catch {
      value = undefined;
    }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      messageId: asLogValue(record.messageId),
      programId: asLogValue(record.programId),
      sequence: asLogValue(record.sequence),
      limitMinor: asLogValue(record.limitMinor),
      reservedMinor: asLogValue(record.reservedMinor),
    };
  }
  return {
    messageId: 'unknown',
    programId: 'unknown',
    sequence: 'unknown',
    limitMinor: 'unknown',
    reservedMinor: 'unknown',
  };
}

function asLogValue(value: unknown): string {
  return typeof value === 'string' ? value : 'unknown';
}