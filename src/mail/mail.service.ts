import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('mail-queue')
    private readonly mailQueue: Queue,
  ) {}

  async createMailJob(data: any) {
    await this.mailQueue.add(`poc-notification:${Date.now()}`, data, {

    }); // Add a job to the queue
    console.log('Mail queue job added to the queue');
  }
}
