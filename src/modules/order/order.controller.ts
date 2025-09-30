import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Logger,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { log } from 'node:console';
import { OrderStatus } from '@prisma/client';

@Controller('order')
export class OrderController {
  // private readonly logger = new Logger(OrderController.name);
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

  //------------------ See client controller for order tracking (buyer and seller) ------------------//
  // for buyer
  @UseGuards(JwtAuthGuard)
  @Get('track/buyer')
  async trackOrdersByBuyer(
    @Req() req: any,
    @Query() query: { status?: string },
  ) {
    try {
      const buyer_id = req.user.userId;
      const status = query.status;
      if (
        status &&
        ![
          'PENDING',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
        ].includes(status)
      ) {
        return {
          success: false,
          message: `Invalid status value. Allowed values are PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED.`,
        };
      }
      const result = await this.orderService.trackOrdersByBuyer(
        buyer_id,
        status,
      );
      return {
        success: true,
        message: 'Orders retrieved successfully',
        data: result,
      };
    } catch (error) {
      // this.logger.error('Error tracking orders', error.stack);
      return {
        success: false,
        message: `Error tracking orders : ${error.message}`,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('track/buyer/:orderId')
  async trackSpecificOrderByBuyer(
    @Req() req: any,
    @Param('orderId') orderId: string,
  ) {
    try {
      const buyer_id = req.user.userId;
      const result = await this.orderService.trackSpecificOrderByBuyer(
        buyer_id,
        orderId,
      );
      return {
        success: true,
        message: 'Order retrieved successfully',
        data: result,
      };
    } catch (error) {
      // this.logger.error('Error tracking orders', error.stack);
      return {
        success: false,
        message: `Error tracking order details : ${error.message}`,
      };
    }
  }

  // for seller
  @UseGuards(JwtAuthGuard)
  @Get('track/seller')
  async trackOrdersBySeller(
    @Req() req: any,
    @Query() query: { status?: string },
  ) {
    try {
      const seller_id = req.user.userId;
      const status = query.status;
      if (
        status &&
        ![
          'PENDING',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
        ].includes(status)
      ) {
        return {
          success: false,
          message: `Invalid status value. Allowed values are PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED.`,
        };
      }
      const result = await this.orderService.trackOrdersBySeller(
        seller_id,
        status,
      );
      return {
        success: true,
        message: 'Orders retrieved successfully',
        data: result,
      };
    } catch (error) {
      // this.logger.error('Error tracking orders', error.stack);
      return {
        success: false,
        message: `Error tracking orders : ${error.message}`,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('track/seller/:orderId')
  async trackSpecificOrderBySeller(
    @Req() req: any,
    @Param('orderId') orderId: string,
  ) {
    try {
      const seller_id = req.user.userId;
      const result = await this.orderService.trackSpecificOrderBySeller(
        seller_id,
        orderId,
      );
      return {
        success: true,
        message: 'Order retrieved successfully',
        data: result,
      };
    } catch (error) {
      // this.logger.error('Error tracking orders', error.stack);
      return {
        success: false,
        message: `Error tracking order details : ${error.message}`,
      };
    }
  }
}
