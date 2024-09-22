import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notification-queue')
export class NotificationQueueProcessor extends WorkerHost {
  async process(job: Job<any>): Promise<any> {
    console.log(`Notification-queue-processor`);
    console.log('job-id:' + job.id);
    console.log('job-name:' + job.name);
    console.log('job-data:' + JSON.stringify(job.data, null, 2));
    return { result: 'Job processed successfully' };
  }
}
