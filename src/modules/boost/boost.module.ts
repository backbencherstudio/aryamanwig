import { Module } from '@nestjs/common';
import { BoostService } from './boost.service';
import { BoostController } from './boost.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule
  ],
  controllers: [BoostController],
  providers: [BoostService],
})
export class BoostModule {}
