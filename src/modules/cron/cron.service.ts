import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private prisma: PrismaService) {}

  // প্রতি মিনিটে চেক করে Boost শেষ হওয়া প্রোডাক্ট reset করবে
  @Cron(CronExpression.EVERY_MINUTE)
  async handleBoostExpiration() {
    const nowUTC = new Date();

    const expiredProducts = await this.prisma.product.findMany({
      where: {
        // is_boosted: true,
        // boost_until: { lte: nowUTC },
      },
    });

    for (const product of expiredProducts) {
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          // is_boosted: false,
          // boost_until: null,
        },
      });
      this.logger.log(` Product ID ${product.id} boost expired and reset.`);
    }
  }
}
