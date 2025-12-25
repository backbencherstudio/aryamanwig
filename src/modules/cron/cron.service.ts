import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { releaseDueEarnings } from 'src/common/repository/userpayment/userpayment.repository';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleEarningsRelease() {
    this.logger.log('Starting scheduled earnings release check...');
    try {
      const released = await releaseDueEarnings();
      this.logger.log(`Released ${released} earnings successfully`);
    } catch (error) {
      this.logger.error('Error releasing earnings:', error);
    }
  }
}