import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  
  private isJobRunning = false;

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleBoostExpiration() {
    
    if (this.isJobRunning) {
      this.logger.warn(
        'handleBoostExpiration skipped: Previous job is still running.',
      );
      return;
    }

    this.isJobRunning = true;
    this.logger.log('Running boost expiration check...');

    try {
      const nowUTC = new Date();

      const result = await this.prisma.product.updateMany({
        where: {
          is_boosted: true,
          boost_until: { lte: nowUTC }, 
        },
        data: {
          is_boosted: false,
          boost_until: null,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Successfully reset boost for ${result.count} products.`,
        );
      } else {
        this.logger.log('No expired boosts found this hour.');
      }

    } catch (error) {
     
      this.logger.error(
        'Error occurred during handleBoostExpiration job:',
        error.stack,
      );
    } finally {
      this.isJobRunning = false;
    }
  }
}