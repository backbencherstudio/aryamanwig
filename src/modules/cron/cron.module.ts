import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { CronService } from './cron.service';


@Module({
  imports: [
    ScheduleModule.forRoot(), // Cron/Scheduler enable করা হলো
  ],
  providers: [CronService, PrismaService],
  exports: [CronService],
})
export class CronModule {}
