import { Module } from '@nestjs/common';
import { TreasuryConsumer } from './treasury.consumer.js';
import { TreasuryDlqPublisher } from './treasury-dlq.publisher.js';
import { TreasuryService } from './treasury.service.js';

@Module({
  controllers: [TreasuryConsumer],
  providers: [TreasuryDlqPublisher, TreasuryService],
})
export class TreasuryModule {}