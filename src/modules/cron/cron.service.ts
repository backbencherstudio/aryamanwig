import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { releaseDueEarnings } from "src/common/repository/userpayment/userpayment.repository";
import { PrismaService } from "src/prisma/prisma.service";
import { BoostStatus } from "@prisma/client";
import { expireBoosts } from "src/common/repository/boost/boost.repository";

@Injectable()
export class CronService {

  private readonly logger = new Logger(CronService.name);


  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleEarningsRelease() {
    this.logger.log("Starting scheduled earnings release check...");
    try {
      const released = await releaseDueEarnings();
      this.logger.log(`Released ${released} earnings successfully`);
    } catch (error) {
      this.logger.error("Error releasing earnings:", error);
    }
  }

  // Runs every 30 minutes 
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleBoostExpiration() {
    this.logger.log("Starting scheduled boost expiration check...");
    try {
      const expired = await expireBoosts();
      this.logger.log(`Expired ${expired} boosts successfully`);
    } catch (error) {
      this.logger.error("Error expiring boosts:", error);
    }
   
  }


}
