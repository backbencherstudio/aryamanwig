import { Body, Controller, Post, Req, UseGuards, Logger } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('order')
export class OrderController {
//   private readonly logger = new Logger(OrderController.name);
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post('place')
  async placeOrder(@Req() req: any, @Body() body: CreateOrderDto) {
    try {
      const buyer_id = req.user.userId;
      const result = await this.orderService.placeOrder(
        buyer_id,
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
      // this.logger.error('Error placing order', error.stack);
      return {
        success: false,
        message: `Error placing order : ${error.message}`,
      };
    }
  }
}
