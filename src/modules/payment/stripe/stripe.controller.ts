import {
  Controller,
  Post,
  Req,
  Headers,
  UseGuards,
  Body,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderService } from 'src/modules/order/order.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateOrderDto } from 'src/modules/order/dto/create-order.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  @Post('pay')
  @UseGuards(JwtAuthGuard)
  async pay(@Req() req: any, @Body() body: CreateOrderDto) {
    try {
      const buyer_id = req.user.userId;
      // here i want to create order after payment is successful
      const result = await this.orderService.placeOrder(
        buyer_id,
        body.seller_id,
        body.shipping_info,
        body.order_products,
      );
      const customer = await this.prisma.user.findUnique({
        where: { id: result.buyer_id },
      });

      const payment = await StripePayment.createPaymentIntent({
        customer_id: customer.billing_id,
        amount: Number(result.grand_total),
        currency: 'usd',
        metadata: {
          order_name: `Order_${result.id}`,
          order_id: result.id,
          buyer_id: result.buyer_id,
          seller_id: result.seller_id,
          total_pay: Number(result.grand_total),
        },
      });

      console.log('PaymentIntent Created:', payment.client_secret);
      console.log('Metadata:', payment.metadata);

      return {
        clientSecret: payment.client_secret,
        message: 'PaymentIntent created successfully',
        totalAmount: Number(result.grand_total),
      };
    } catch (error) {
      return {
        success: false,
        message: `Error placing order : ${error.message}`,
      };
    }
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {
      const payload = req.rawBody.toString();
      const event = await this.stripeService.handleWebhook(payload, signature);

      // Handle events
      switch (event.type) {
        case 'customer.created':
          break;
        case 'payment_intent.created':
          break;
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          const successMetadata = paymentIntent.metadata;
          // create tax transaction
          // await StripePayment.createTaxTransaction(
          //   paymentIntent.metadata['tax_calculation'],
          // );
          // Update transaction status in database

          // here update order status to paid
          await this.prisma.order.update({
            where: { id: successMetadata.order_id },
            data: { payment_status: PaymentStatus.PAID },
          });

          await TransactionRepository.updateTransaction({
            reference_number: paymentIntent.id,
            status: 'succeeded',
            paid_amount: paymentIntent.amount / 100, // amount in dollars
            paid_currency: paymentIntent.currency,
            raw_status: paymentIntent.status,
          });
          break;
        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          const failedMetadata = failedPaymentIntent.metadata;

          // here update order status to cancelled and payment status to failed
          await this.prisma.order.update({
            where: { id: failedMetadata.order_id },
            data: {
              payment_status: PaymentStatus.FAILED,
              order_status: OrderStatus.CANCELLED,
            },
          });

          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: failedPaymentIntent.id,
            status: 'failed',
            raw_status: failedPaymentIntent.status,
          });
        case 'payment_intent.canceled':
          const canceledPaymentIntent = event.data.object;
          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: canceledPaymentIntent.id,
            status: 'canceled',
            raw_status: canceledPaymentIntent.status,
          });
          break;
        case 'payment_intent.requires_action':
          const requireActionPaymentIntent = event.data.object;
          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: requireActionPaymentIntent.id,
            status: 'requires_action',
            raw_status: requireActionPaymentIntent.status,
          });
          break;
        case 'payout.paid':
          const paidPayout = event.data.object;
          console.log(paidPayout);
          break;
        case 'payout.failed':
          const failedPayout = event.data.object;
          console.log(failedPayout);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error', error);
      return { received: false };
    }
  }
}
