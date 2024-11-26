import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notification-queue')
    private readonly notificationQueue: Queue,
  ) {}

  async createNotificationJob(data: any) {
    // await this.notificationQueue.add('notification:1', data, {
    //   delay: 5000,
    // }); // Add a job to the queue
    // console.log('Job added to the queue');
  }
}
