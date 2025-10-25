import { Module } from '@nestjs/common';
import { TwintService } from './twint.service';
import { TwintController } from './twint.controller';

@Module({
  controllers: [TwintController],
  providers: [TwintService],
})
export class TwintModule {}
