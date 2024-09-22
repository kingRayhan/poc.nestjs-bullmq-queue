import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { NotificationService } from './notification/notification.service';
import { MailService } from './mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('trigger')
  async triggerNotificationJob(): Promise<string> {
    await this.notificationService.createNotificationJob({
      notificationType: 'paymentDone',
      recipientId: '1',
      message: 'Your payment is done',
      createdAt: new Date().toISOString(),
    });

    await this.mailService.createMailJob({
      to: 'test@test.com',
      subject: 'Test',
      message: 'Test',
    });

    return 'Job triggered successfully';
  }
}
