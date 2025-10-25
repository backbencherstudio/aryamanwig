import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { OrderModule } from 'src/modules/order/order.module';
import { DisposalModule } from 'src/modules/disposal/disposal.module';

@Module({
  imports: [OrderModule, DisposalModule], 
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}
