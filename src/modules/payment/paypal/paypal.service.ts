import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PaypalPayment } from 'src/common/lib/Payment/paypal/PaypalPayment';
import appConfig from 'src/config/app.config';

@Injectable()
export class PaypalService {
  private readonly paypal = new PaypalPayment();
  private readonly api = appConfig().payment.paypal.api;
  private readonly webhookId = appConfig().payment.paypal.webhook_id;

  constructor(private readonly prisma: PrismaService) {}

  async createPaypalOrder(orderId: string, totalAmount: number): Promise<string> {
    const accessToken = await this.paypal['getAccessToken']();

    const response = await axios.post(
      `${this.api}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: totalAmount.toString(),
            },
            custom_id: orderId.toString(), // Important for tracking
          },
        ],
        application_context: {
          return_url: `${appConfig().app.url}/paypal-success`,
          cancel_url: `${appConfig().app.url}/paypal-cancel`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const approvalUrl = response.data.links.find(
      (link) => link.rel === 'approve',
    ).href;

    return approvalUrl;
  }

  async verifyWebhookSignature({
    transmissionId,
    transmissionTime,
    certUrl,
    authAlgo,
    transmissionSig,
    webhookId,
    body,
  }) {
    const accessToken = await this.paypal['getAccessToken']();

    const response = await axios.post(
      `${this.api}/v1/notifications/verify-webhook-signature`,
      {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId || this.webhookId,
        webhook_event: body,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.verification_status === 'SUCCESS';
  }

  async processWebhookEvent(body: any) {
    const eventType = body.event_type;

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('Order approved:', body);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const orderId = body.resource?.custom_id;

        // Update order/payment status
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            payment_status: PaymentStatus.PAID,
          },
        });
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const orderId = body.resource?.custom_id;

        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            payment_status: PaymentStatus.FAILED,
            order_status: OrderStatus.CANCELLED,
          },
        });
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
    }
  }
}
