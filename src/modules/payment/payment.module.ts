import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { PaypalModule } from './paypal/paypal.module';

@Module({
  imports: [StripeModule, PaypalModule],
})
export class PaymentModule {}
