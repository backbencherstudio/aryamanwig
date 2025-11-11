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

  // prodduct payment
  @Post('pay/:seller_id')
  @UseGuards(JwtAuthGuard)
  async pay(
    @Req() req: any, 
    @Param('seller_id') seller_id: string,
    @Body() dto: CreateOrderDto) {
    try {
      const buyer_id = req.user.userId;

     // 🟢 1. Create Order first → status = PENDING
      const orderResponse = await this.orderService.createOrder(
        buyer_id,
        seller_id,
        dto
      );

       if (!orderResponse.success) {
        throw new Error(orderResponse.message);
      }

      const orderId = orderResponse.data.order_id;
      const totalAmount = Number(orderResponse.data.total);

      const customer = await this.prisma.user.findUnique({
        where: { id: buyer_id },
      });


      if (!customer || !customer.billing_id) {
        throw new NotFoundException('Customer not found or missing billing ID');
      }

      const paymentIntent = await StripePayment.createPaymentIntent({
        customer_id: customer.billing_id,
        amount: totalAmount,
        currency: 'usd',
        metadata: {
          order_id: orderId,
          buyer_id: buyer_id,
          seller_id: seller_id,
          total_pay: totalAmount,
          type:'order'
        },
      });

       
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: buyer_id,
          order_id: orderId,
          type:"order",
          provider: 'stripe',
          reference_number: paymentIntent.id,
          amount: totalAmount,
          currency: 'usd',
          status: 'pending',
        },
      });

     console.log('PaymentIntent Created:', paymentIntent.client_secret);
     console.log('Metadata:', paymentIntent.metadata);


    return {        
        success: true,
        message: 'PaymentIntent created successfully',
        clientSecret: paymentIntent.client_secret,
        order_id: orderId,
        totalAmount: totalAmount,
      };
    } catch (error) {
      /*
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          order_status: OrderStatus.CANCELLED,
          payment_status: PaymentStatus.FAILED,
        },
      });
      */
      return {
        success: false,
        message: `Error placing order : ${error.message}`,
      };
    }
  } 

  // disposal payment 
  /*
  @Post('pay-disposal/:product_id')
  @UseGuards(JwtAuthGuard)
  async payDisposal(
    @Req() req: any,
    @Param('product_id') product_id: string,
    @Body() dto: CreateDisposalDto, 
  ) {
    const user_id = req.user.userId;

    const disposalResponse = await this.disposalService.createDisposal(
      product_id,
      dto,
      user_id,
    );

    if (!disposalResponse.success) {
      throw new InternalServerErrorException(disposalResponse.message);
    }

    const disposalId = disposalResponse.data.id;
    const totalAmount = Number(disposalResponse.data.item_total_fee);

   
    
    const customer = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.billing_id) {
      throw new NotFoundException(
        'Customer billing ID (Stripe Customer ID) not found',
      );
    }

    
    try {
      const paymentIntent = await StripePayment.createPaymentIntent({
        customer_id: customer.billing_id,
        amount: totalAmount,
        currency: 'usd',
        metadata: {
          disposal_id: disposalId, 
          product_id: product_id,
          user_id: user_id,
          total_pay: totalAmount,
          type: 'disposal', 
        },
      });

      await this.prisma.paymentTransaction.create({
        data: {
          user_id: user_id,
          order_id: disposalId, 
          type: 'disposal',
          provider: 'stripe',
          reference_number: paymentIntent.id,
          amount: totalAmount,
          currency: 'usd', 
          status: 'pending',
        },
      });

     console.log('PaymentIntent Created:', paymentIntent.client_secret);
     console.log('Metadata:', paymentIntent.metadata);

      return {
        success: true,
        message: 'PaymentIntent for disposal created successfully',
        clientSecret: paymentIntent.client_secret,
        disposal_id: disposalId,
        totalAmount: totalAmount,
      };
    } catch (error) {
     
      await this.prisma.disposal.update({
        where: { id: disposalId },
        data: {
          status: DisposalStatus.CANCELLED,
          payment_status: PaymentStatus.FAILED,
        },
      });
      throw new InternalServerErrorException(
        `Error creating payment intent: ${error.message}`,
      );
    }
  }
    */
  
  // Twint with product payment
  /*
  @Post('pay-order-twint/:seller_id')
  @UseGuards(JwtAuthGuard)
  async payOrderTwint(
    @Req() req: any,
    @Param('seller_id') seller_id: string,
    @Body() dto: CreateOrderDto,
  ) {
    try{
    
    const buyer_id = req.user.userId;

    const orderResponse = await this.orderService.createOrder(
      buyer_id,
      seller_id,
      dto
    );

      if (!orderResponse.success) {
        throw new Error(orderResponse.message);
      }

      const orderId = orderResponse.data.order_id;
      const totalAmount = Number(orderResponse.data.total);

      const customer = await this.prisma.user.findUnique({
        where: { id: buyer_id },
      });

      if (!customer || !customer.billing_id) {
        throw new NotFoundException('Customer not found or missing billing ID');
      }

      const paymentIntent = await StripePayment.createPaymentIntent({
        customer_id: customer.billing_id,
        amount: totalAmount,
        currency: 'chf',
        payment_method_types: ['twint'],
        metadata: {
          order_id: orderId,
          buyer_id: buyer_id,
          seller_id: seller_id,
          total_pay: totalAmount,
          type:'order_twint'
        },
      });

      await this.prisma.paymentTransaction.create({
        data: {
          user_id: buyer_id,
          order_id: orderId,
          type:"order_twint",
          provider: 'stripe-twint',
          reference_number: paymentIntent.id,
          amount: totalAmount,
          currency: 'chf',
          status: 'pending',
        },
      });

    return {        
        success: true,
        message: 'TWINT PaymentIntent created successfully',
        clientSecret: paymentIntent.client_secret,
        order_id: orderId,
        totalAmount: totalAmount,
      };
    } catch (error) {
      
     
      return {
        success: false,
        message: `Error placing order : ${error.message}`,
      };
     }

    }
    */


   /*
   @Post('pay-disposal-twint/:product_id')
  @UseGuards(JwtAuthGuard)
  async payDisposalTwint(
    @Req() req: any,
    @Param('product_id') product_id: string,
    @Body() dto: CreateDisposalDto, 
  ) {
    const user_id = req.user.userId;
    const disposalResponse = await this.disposalService.createDisposal(
      product_id,
      dto,
      user_id,
    );

    if (!disposalResponse.success) {
      throw new InternalServerErrorException(disposalResponse.message);
    }

    const disposalId = disposalResponse.data.id;
    const totalAmount = Number(disposalResponse.data.item_total_fee);

    const customer = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.billing_id) {
      throw new NotFoundException(
        'Customer billing ID (Stripe Customer ID) not found',
      );
    }

    try{
    
      const paymentIntent = await StripePayment.createPaymentIntent({
        customer_id: customer.billing_id,
        amount: totalAmount,
        currency: 'chf',
        payment_method_types: ['twint'],
        metadata: {
          disposal_id: disposalId, 
          product_id: product_id,
          user_id: user_id,
          total_pay: totalAmount,
          type: 'disposal_twint', 
        },
      });

      await this.prisma.paymentTransaction.create({
        data: {
          user_id: user_id,
          order_id: disposalId, 
          type: 'disposal_twint',
          provider: 'stripe-twint',
          reference_number: paymentIntent.id,
          amount: totalAmount,
          currency: 'chf',
          status: 'pending',
        },
      });

      return {
        success: true,
        message: 'TWINT PaymentIntent created successfully',
        clientSecret: paymentIntent.client_secret,
        order_id: disposalId,
        totalAmount: totalAmount,
      };
    } catch (error) {
      
      await this.prisma.disposal.update({
        where: { id: disposalId },
        data: {
          order_status: OrderStatus.CANCELLED,
          payment_status: PaymentStatus.FAILED,
        },
      });
      return {
        success: false,
        message: `Error placing order : ${error.message}`,
      };
     }

    }

   */



  
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

          if(successMetadata.order_id){

      
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
