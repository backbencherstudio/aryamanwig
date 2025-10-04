import { Module } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { OrderModule } from 'src/modules/order/order.module';

@Module({
  imports: [OrderModule], 
  controllers: [PaypalController],
  providers: [PaypalService]
})
export class PaypalModule {}
