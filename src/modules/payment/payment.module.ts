import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { PaypalModule } from './paypal/paypal.module';
import { TwintModule } from './twint/twint.module';

@Module({
  imports: [StripeModule, PaypalModule, TwintModule],
})
export class PaymentModule {}
