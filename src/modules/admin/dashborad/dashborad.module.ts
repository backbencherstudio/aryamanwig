import { Module } from '@nestjs/common';
import { DashboradService } from './dashborad.service';
import { DashboradController } from './dashborad.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule
  ],
  controllers: [DashboradController],
  providers: [DashboradService],
})
export class DashboradModule {}
