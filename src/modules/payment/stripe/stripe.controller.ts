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
  Query,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderService } from 'src/modules/order/order.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import {
  BoostPaymentStatus,
  BoostStatus,
  DisposalStatus,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import { DisposalService } from 'src/modules/disposal/disposal.service';
import { Stripe } from 'stripe';

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  // =====================================================================
  // ========================== PAYMENT CREATE ============================
  // =====================================================================

  @Post('pay/:id')
  @UseGuards(JwtAuthGuard)
  async pay(
    @Req() req: any,
    @Param('id') id: string,
    @Query('type') type: 'order' | 'disposal' | 'boost' = 'order',
  ) {
    try {
      const buyer_id = req.user.userId;

      let entity: any = null;
      let totalAmount: number = 0;
      let metadata: any = {};
      let customerBillingId = null;

      // -----------------------------------
      // ORDER PAYMENT
      // -----------------------------------
      if (type === 'order') {
        entity = await this.prisma.order.findUnique({
          where: { id },
          select: {
            grand_total: true,
            buyer_id: true,
            seller_id: true,
            payment_status: true,
            buyer: { select: { billing_id: true } },
          },
        });

        if (!entity) return this.fail(`Order ${id} not found`);

        if (entity.buyer_id !== buyer_id)
          return this.fail('This order does not belong to you');

        if (entity.payment_status !== PaymentStatus.DUE)
          return {
            success: false,
            message: `Already ${entity.payment_status}`,
            id,
          };

        totalAmount = Number(entity.grand_total);
        customerBillingId = entity.buyer.billing_id;

        if (isNaN(totalAmount))
          throw new InternalServerErrorException('Invalid order amount');

        metadata = {
          type: 'order',
          order_id: id,
          buyer_id,
          seller_id: entity.seller_id,
          total_pay: totalAmount.toString(),
        };
      }

      // -----------------------------------
      // BOOST PAYMENT
      // -----------------------------------
      else if (type === 'boost') {
        entity = await this.prisma.boost.findUnique({
          where: { id },
          select: {
            price: true,
            user_id: true,
            payment_status: true,
            status: true,
            user: { select: { billing_id: true } },
          },
        });

        if (!entity) return this.fail(`Boost ${id} not found`);

        if (entity.user_id !== buyer_id)
          return this.fail('This boost does not belong to you');

        if (entity.payment_status !== BoostPaymentStatus.PENDING)
          return {
            success: false,
            message: `Already ${entity.payment_status}`,
            id,
          };

        totalAmount = Number(entity.price);

        if (isNaN(totalAmount))
          throw new InternalServerErrorException('Invalid boost amount');

        customerBillingId = entity.user.billing_id;

        metadata = {
          type: 'boost',
          boost_id: id,
          user_id: buyer_id,
          total_pay: totalAmount.toString(),
        };
      }

      // -----------------------------------
      // DISPOSAL PAYMENT
      // -----------------------------------
      else if (type === 'disposal') {
        entity = await this.prisma.disposal.findUnique({
          where: { id, status: DisposalStatus.CONFIRMED },
          select: {
            final_total_amount: true,
            user_id: true,
            payment_status: true,
            user: { select: { billing_id: true } },
          },
        });

        if (!entity) return this.fail(`Disposal ${id} not found`);
        if (entity.user_id !== buyer_id)
          return this.fail('This disposal does not belong to you');
        if (entity.payment_status !== PaymentStatus.DUE)
          return {
            success: false,
            message: `Already ${entity.payment_status}`,
            id,
          };

        totalAmount = Number(entity.final_total_amount ?? 0);

        if (isNaN(totalAmount))
          throw new InternalServerErrorException('Invalid disposal amount');

        customerBillingId = entity.user.billing_id;

        metadata = {
          type: 'disposal',
          disposal_id: id,
          user_id: buyer_id,
          total_pay: totalAmount.toString(),
        };
      }

      if (!customerBillingId)
        return this.fail('Stripe Customer Billing ID not found!');

      // ------------------------------------
      // STRIPE AMOUNT FIX (always integer)
      // ------------------------------------
      const stripeAmount = Number(totalAmount);

      console.log({
        RAW_TOTAL:
          entity?.grand_total ??
          entity?.boost_price ??
          entity?.final_total_amount,
        PARSED_TOTAL: totalAmount,
        STRIPE_AMOUNT: stripeAmount,
      });

      // ------------------------------------
      // CREATE PAYMENT INTENT
      // ------------------------------------

      const paymentIntent = await StripePayment.createPaymentIntent({
        customer_id: customerBillingId,
        amount: stripeAmount,
        currency: 'usd',
        metadata,
      });

      await this.prisma.paymentTransaction.create({
        data: {
          user_id: buyer_id,
          order_id: type === 'order' ? id : null,
          disposal_id: type === 'disposal' ? id : null,
          boost_id: type === 'boost' ? id : null,
          type,
          provider: 'stripe',
          reference_number: paymentIntent.id,
          amount: totalAmount,
          currency: 'usd',
          status: 'pending',
        },
      });

      return {
        success: true,
        message: 'Payment Intent created',
        clientSecret: paymentIntent.client_secret,
        id,
        type,
        totalAmount,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Payment processing failed');
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

      if (!event.data || !event.data.object) return { received: true };

      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata || {};

      switch (event.type) {
        case 'payment_intent.succeeded':
          if (meta.order_id) {
            await this.prisma.order.update({
              where: { id: meta.order_id },
              data: {
                payment_status: PaymentStatus.PAID,
                order_status: OrderStatus.PROCESSING,
              },
            });
          }

          if (meta.boost_id) {
            await this.prisma.boost.update({
              where: { id: meta.boost_id },
              data: {
                payment_status: BoostPaymentStatus.COMPLETED,
                status: BoostStatus.ACTIVE,
              },
            });
          }

          if (meta.disposal_id) {
            await this.prisma.disposal.update({
              where: { id: meta.disposal_id },
              data: {
                payment_status: PaymentStatus.PAID,
                status: DisposalStatus.PICKUP,
              },
            });
          }

          await TransactionRepository.updateTransaction({
            reference_number: pi.id,
            status: 'succeeded',
            paid_amount: (pi.amount_received ?? 0) / 100,
            paid_currency: pi.currency,
            raw_status: pi.status,
          });
          break;

        case 'payment_intent.payment_failed':
          if (meta.order_id) {
            await this.prisma.order.update({
              where: { id: meta.order_id },
              data: {
                payment_status: PaymentStatus.FAILED,
                order_status: OrderStatus.CANCELLED,
              },
            });
          }

          if (meta.boost_id) {
            await this.prisma.boost.update({
              where: { id: meta.boost_id },
              data: {
                payment_status: BoostPaymentStatus.FAILED,
                status: BoostStatus.CANCELLED,
              },
            });
          }

          if (meta.disposal_id) {
            await this.prisma.disposal.update({
              where: { id: meta.disposal_id },
              data: { payment_status: PaymentStatus.FAILED },
            });
          }

          await TransactionRepository.updateTransaction({
            reference_number: pi.id,
            status: 'failed',
            raw_status: pi.status,
          });
          break;

        case 'payment_intent.canceled':
          await TransactionRepository.updateTransaction({
            reference_number: pi.id,
            status: 'canceled',
            raw_status: pi.status,
          });
          break;

        case 'payment_intent.requires_action':
          await TransactionRepository.updateTransaction({
            reference_number: pi.id,
            status: 'requires_action',
            raw_status: pi.status,
          });
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

  // =====================================================================
  // ======================= UTILITY RESPONSE METHODS ===================
  // =====================================================================

  private fail(message: string) {
    return { success: false, message };
  }

  private error(err: any) {
    console.error('PAYMENT ERROR:', err);

    return {
      success: false,
      message: err?.message ?? 'Payment failed',
      details: err?.response ?? null,
    };
  }
}
