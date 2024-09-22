import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationQueueProcessor } from './notification-queue-processor';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  providers: [NotificationQueueProcessor, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
