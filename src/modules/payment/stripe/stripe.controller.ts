import {
  Controller,
  Post,
  Req,
  Headers,
  UseGuards,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderService } from 'src/modules/order/order.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateOrderDto } from 'src/modules/order/dto/create-order.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { DisposalStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { DisposalService } from 'src/modules/disposal/disposal.service';
import { CreateDisposalDto } from 'src/modules/disposal/dto/create-disposal.dto';

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly disposalService: DisposalService,
  ) {}

  @Post('pay/:orderId')
  @UseGuards(JwtAuthGuard)
  async pay(
   @Req() req: any,
   @Param('orderId') orderId: string) {
    try {
      const buyer_id = req.user.userId;

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          grand_total: true,
          buyer_id: true,
          seller_id: true,
          payment_status: true,
          buyer: { select: { id: true, email: true, name: true, billing_id: true } },
        },
      });
      
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }

      if (order.buyer_id !== buyer_id) {
        throw new ForbiddenException(
          'You do not have permission to pay for this order.',
        );
      }

      if (order.payment_status !== PaymentStatus.DUE) {
        return {
          success: false,
          message: `Payment status is already ${order.payment_status}.`,
          order_id: orderId,
        };
      }

      const totalAmount = Number(order.grand_total);
      const sellerId = order.seller_id;
      const customerBillingId = order.buyer.billing_id;

      if (!customerBillingId) {
        throw new NotFoundException(
          'Customer missing Stripe billing ID. Cannot proceed with payment.',
        );
      }

      const paymentIntent = await StripePayment.createPaymentIntent({
        customer_id: customerBillingId,
        amount: Math.round(totalAmount),
        currency: 'usd',
        metadata: {
          order_id: orderId,
          buyer_id: buyer_id,
          seller_id: sellerId,
          total_pay: totalAmount.toString(),
          type: 'order',
        },
      });

      await this.prisma.paymentTransaction.create({
        data: {
          user_id: buyer_id,
          order_id: orderId,
          type: 'order',
          provider: 'stripe',
          reference_number: paymentIntent.id,
          amount: totalAmount,
          currency: 'usd',
          status: 'pending',
        },
      });


      return {
        success: true,
        message: 'Payment Intent created successfully. Proceed with client-side payment.',
        clientSecret: paymentIntent.client_secret,
        order_id: orderId,
        totalAmount: totalAmount,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error initiating payment for order ${orderId}: ${error.message}`,
      );
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

          if (successMetadata.order_id) {
            await this.prisma.order.update({
              where: { id: successMetadata.order_id },
              data: { payment_status: PaymentStatus.PAID },
            });
          } else if (successMetadata.disposal_id) {
            await this.prisma.disposal.update({
              where: { id: successMetadata.disposal_id },
              data: { payment_status: PaymentStatus.PAID },
            });
          }

          await TransactionRepository.updateTransaction({
            reference_number: paymentIntent.id,
            status: 'succeeded',
            paid_amount: paymentIntent.amount / 100,
            paid_currency: paymentIntent.currency,
            raw_status: paymentIntent.status,
          });
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          const failedMetadata = failedPaymentIntent.metadata;

          await this.prisma.order.update({
            where: { id: failedMetadata.order_id },
            data: {
              payment_status: PaymentStatus.FAILED,
              order_status: OrderStatus.CANCELLED,
            },
          });

          await TransactionRepository.updateTransaction({
            reference_number: failedPaymentIntent.id,
            status: 'failed',
            raw_status: failedPaymentIntent.status,
          });

        case 'payment_intent.canceled':
          const canceledPaymentIntent = event.data.object;

          await TransactionRepository.updateTransaction({
            reference_number: canceledPaymentIntent.id,
            status: 'canceled',
            raw_status: canceledPaymentIntent.status,
          });
          break;
        case 'payment_intent.requires_action':
          const requireActionPaymentIntent = event.data.object;

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
