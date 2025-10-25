import { Module } from '@nestjs/common';
import { DisposalService } from './disposal.service';
import { DisposalController } from './disposal.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule
  ],
  controllers: [DisposalController],
  providers: [DisposalService],
  exports: [DisposalService],
})
export class DisposalModule {}
