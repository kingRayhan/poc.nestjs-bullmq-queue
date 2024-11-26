import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [  BullModule.registerQueue({
    name: 'invoice-queue',
  }),],
  providers: [InvoiceService]
})
export class InvoiceModule {}
