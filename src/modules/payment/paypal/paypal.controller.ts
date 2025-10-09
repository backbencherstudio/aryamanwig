import {
    Controller,
    Post,
    Req,
    Res,
    Headers,
    Body,
    HttpCode,
    UseGuards,
} from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateOrderDto } from 'src/modules/order/dto/create-order.dto';
import { OrderService } from 'src/modules/order/order.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('payment/paypal')
export class PaypalController {
    constructor(
        private readonly paypalService: PaypalService,
        private readonly orderService: OrderService,
        private readonly prisma: PrismaService,
    ) { }

    // @Post('pay')
    // @UseGuards(JwtAuthGuard)
    // async pay(@Req() req: any, @Body() body: CreateOrderDto) {
    //     const buyer_id = req.user.userId;

    //     // STEP 1: Create Order
    //     const order = await this.orderService.placeOrder(
    //         buyer_id,
    //         body.seller_id,
    //         body.shipping_info,
    //         body.order_products,
    //     );

    //     // STEP 2: Create PayPal order (get approval URL)
    //     const approvalUrl = await this.paypalService.createPaypalOrder(
    //         order.id,
    //         Number(order.grand_total),
    //     );

    //     // STEP 3: Return approval URL to frontend
    //     return {
    //         approvalUrl,
    //         message: 'Redirect user to this URL to complete payment',
    //     };
    // }

    // // This will be called from PayPal after user approves payment
    // @Post('webhook')
    // @HttpCode(200)
    // async handleWebhook(
    //     @Req() req: Request,
    //     @Headers('paypal-transmission-id') transmissionId: string,
    //     @Headers('paypal-transmission-time') transmissionTime: string,
    //     @Headers('paypal-cert-url') certUrl: string,
    //     @Headers('paypal-auth-algo') authAlgo: string,
    //     @Headers('paypal-transmission-sig') transmissionSig: string,
    //     @Headers('paypal-webhook-id') webhookId: string,
    // ) {
    //     const body = req.body;

    //     const isValid = await this.paypalService.verifyWebhookSignature({
    //         transmissionId,
    //         transmissionTime,
    //         certUrl,
    //         authAlgo,
    //         transmissionSig,
    //         webhookId,
    //         body,
    //     });

    //     if (!isValid) {
    //         console.warn('⚠️ Invalid webhook signature');
    //         return;
    //     }

    //     // Update order/payment status based on event
    //     await this.paypalService.processWebhookEvent(body);
    // }
}
