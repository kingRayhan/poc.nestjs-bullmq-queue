// src/cli/queue-cli.ts
import { Command } from 'commander';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const program = new Command();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
});

async function getQueue(queueName: string): Promise<Queue> {
  return new Queue(queueName, { connection });
}

async function getQueueNames(): Promise<string[]> {
  const keys = await connection.keys('bull:*');
  const queueNames = new Set<string>();

  for (const key of keys) {
    // Extract queue name from key pattern "bull:queueName:*"
    const match = key.match(/^bull:([^:]+):/);
    if (match) {
      queueNames.add(match[1]);
    }
  }

  return Array.from(queueNames).sort();
}

async function showStatus(queue: Queue) {
  const [
    waitingCount,
    activeCount,
    completedCount,
    failedCount,
    delayedCount
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    'Waiting Jobs': waitingCount,
    'Active Jobs': activeCount,
    'Completed Jobs': completedCount,
    'Failed Jobs': failedCount,
    'Delayed Jobs': delayedCount,
  };
}

// New list command
program
  .command('list')
  .description('List all queues')
  .option('-d, --details', 'Show detailed status for each queue')
  .action(async (options) => {
    try {
      const queueNames = await getQueueNames();

      if (queueNames.length === 0) {
        console.log('No queues found');
        await connection.quit();
        return;
      }

      if (options.details) {
        console.log('Fetching queue details...\n');
        const details = [];

        for (const name of queueNames) {
          const queue = await getQueue(name);
          const status = await showStatus(queue);
          details.push({
            'Queue Name': name,
            ...status
          });
          await queue.close();
        }

        console.table(details);
      } else {
        console.log('Available queues:');
        queueNames.forEach((name, index) => {
          console.log(`${index + 1}. ${name}`);
        });
      }

      await connection.quit();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      await connection.quit();
      process.exit(1);
    }
  });

// Existing commands...
program
  .command('status <queue-name>')
  .description('Show queue status')
  .action(async (queueName) => {
    try {
      const queue = await getQueue(queueName);
      const status = await showStatus(queue);
      console.table(status);
      await queue.close();
      await connection.quit();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      await connection.quit();
      process.exit(1);
    }
  });

program
  .command('clean <queue-name>')
  .description('Clean jobs from queue')
  .option('-s, --status <status>', 'job status to clean (completed, failed, wait, active, delayed)')
  .option('-a, --age <age>', 'clean jobs older than age in hours', '24')
  .action(async (queueName, options) => {
    try {
      const queue = await getQueue(queueName);
      const ageInMs = parseInt(options.age) * 60 * 60 * 1000;

      if (options.status) {
        const result = await queue.clean(ageInMs, options.status);
        const count = Array.isArray(result) ? result.length : result;
        console.log(`Cleaned ${count} ${options.status} jobs older than ${options.age} hours`);
      } else {
        const statuses = ['completed', 'failed', 'wait', 'active', 'delayed'];
        let totalCount = 0;

        for (const status of statuses) {
          const result = await queue.clean(ageInMs, status as any);
          const count = Array.isArray(result) ? result.length : result;
          totalCount += count;
          console.log(`Cleaned ${count} ${status} jobs`);
        }

        console.log(`Total cleaned: ${totalCount} jobs`);
      }

      await queue.close();
      await connection.quit();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      await connection.quit();
      process.exit(1);
    }
  });

program
  .command('drain <queue-name>')
  .description('Remove ALL jobs from queue')
  .option('-f, --force', 'skip confirmation')
  .action(async (queueName, options) => {
    try {
      if (!options.force) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question(`Are you sure you want to drain queue '${queueName}'? This will remove ALL jobs! (y/N) `, resolve);
        });

        readline.close();

        if (answer.toString().toLowerCase() !== 'y') {
          console.log('Operation cancelled');
          await connection.quit();
          process.exit(0);
        }
      }

      const queue = await getQueue(queueName);
      await queue.drain();
      console.log(`Queue '${queueName}' has been drained`);
      await queue.close();
      await connection.quit();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      await connection.quit();
      process.exit(1);
    }
  });

program
  .name('queue-cli')
  .description('CLI to manage BullMQ queues')
  .version('1.0.0');

// Add error handler for unknown commands
program.on('command:*', function () {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}