import { Body, Controller, Post } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('place')
  async placeOrder(
    @Body()
    body: {
      buyer_id: string;
      seller_id: string;
      shipping_info: {
        shipping_name: string;
        email: string;
        shipping_country: string;
        shipping_state: string;
        shipping_city: string;
        shipping_zip_code: string;
        shipping_address: string;
      };
      order_products: {
        product_id: string;
        quantity: number;
        total_price: number;
      }[];
    },
  ) {
    try {
      const result = await this.orderService.placeOrder(
        body.buyer_id,
        body.seller_id,
        body.shipping_info,
        body.order_products,
      );
      return {
        success: true,
        message: 'Order placed successfully',
        data: result,
      };
    } catch (error) {
      return { success: false, message: 'Error placing order', error };
    }
  }
}
