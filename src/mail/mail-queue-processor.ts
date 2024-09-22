import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('mail-queue')
export class MailQueueProcessor extends WorkerHost {
  async process(job: Job<any>): Promise<any> {
    console.log(`Mail-queue-processor`);
    console.log('job-id:' + job.id);
    console.log('job-name:' + job.name);
    console.log('job-data:' + JSON.stringify(job.data, null, 2));
    return { result: 'Job processed successfully' };
  }
}
