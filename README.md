# NestJS BullMQ Integration Guide

This guide covers setting up and configuring BullMQ in a NestJS application with production-ready settings.

## Table of Contents
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Production Configuration](#production-configuration)
- [Queue Processor Implementation](#queue-processor-implementation)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Installation

```bash
# Install required packages
npm install @nestjs/bullmq bullmq

# Install Redis if you haven't already
# Using Docker
docker run --name redis -p 6379:6379 -d redis
```

## Basic Setup

### 1. App Module Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      defaultConnection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}
```

### 2. Feature Module Setup

```typescript
// email/email.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  providers: [EmailProcessor, EmailService],
  controllers: [EmailController],
})
export class EmailModule {}
```

### 3. Basic Queue Processor

```typescript
// email/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    // Process your job here
    return { success: true };
  }
}
```

## Production Configuration

### Recommended Production Settings

```typescript
// app.module.ts
BullModule.forRoot({
  defaultConnection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
  },
  defaultJobOptions: {
    // Cleanup settings
    removeOnComplete: {
      age: 24 * 3600,    // 24 hours
      count: 1000,       // Keep max 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600,  // 7 days
      count: 5000,         // Keep max 5000 jobs
    },
    // Retry settings
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    timeout: 5 * 60 * 1000,  // 5 minutes
  },
  settings: {
    maxStalledCount: 2,
    lockDuration: 30000,
    stalledInterval: 30000,
  },
})
```

### Queue-Specific Settings

```typescript
// email/email.module.ts
BullModule.registerQueue({
  name: 'email-queue',
  defaultJobOptions: {
    attempts: 5,
    timeout: 30000,
    removeOnComplete: {
      age: 3600,
      count: 500,
    },
  },
  processors: [{
    concurrency: 5,
    maxStalledCount: 3,
  }],
})
```

## Queue Processor Implementation

### Production-Ready Processor

```typescript
@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      await job.updateProgress(10);
      const result = await this.sendEmail(job.data);
      
      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.id}: ${error.message}`,
        error.stack
      );
      
      if (this.isRetryableError(error)) {
        throw error; // Will retry
      }
      
      await job.moveToFailed({
        message: error.message,
        code: error.code,
      }, false);
    }
  }
}
```

## Common Patterns

### Job Cleanup Options

```typescript
// Option 1: Boolean
removeOnComplete: true    // Remove immediately
removeOnFail: true       // Remove immediately

// Option 2: Number
removeOnComplete: 1000   // Keep last 1000 jobs
removeOnFail: 1000      // Keep last 1000 failed jobs

// Option 3: Age-based
removeOnComplete: { 
  age: 3600            // Remove after 1 hour
}

// Option 4: Count and age combined
removeOnComplete: {
  count: 1000,         // Keep max 1000 jobs
  age: 3600           // That are no older than 1 hour
}
```

### Adding Jobs

```typescript
// email.service.ts
@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
  ) {}

  async sendEmail(data: EmailData) {
    const job = await this.emailQueue.add('send-email', data, {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    return job;
  }
}
```

## Best Practices

1. **Error Handling**
    - Implement proper error logging
    - Distinguish between retryable and non-retryable errors
    - Set appropriate retry attempts and backoff strategies

2. **Job Cleanup**
    - Keep completed jobs for a reasonable time (e.g., 24 hours)
    - Keep failed jobs longer for debugging (e.g., 7 days)
    - Set maximum counts to prevent Redis memory issues

3. **Monitoring**
    - Monitor Redis memory usage
    - Set up alerts for failed jobs
    - Track job processing times
    - Monitor queue lengths

4. **Security**
    - Use environment variables for sensitive data
    - Enable Redis authentication
    - Use TLS in production
    - Set appropriate timeouts

5. **Performance**
    - Configure appropriate concurrency levels
    - Set reasonable job timeouts
    - Use job priorities when needed
    - Implement rate limiting if required

## Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_TLS=true
```

Remember to adjust these settings based on your specific requirements and workload patterns.