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

  constructor(private readonly orderService: OrderService) {}

  // create order
  @UseGuards(JwtAuthGuard)
  @Post('create/:sellerId')
  createOrder(
    @Req() req,
    @Param('sellerId') sellerId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const buyerId = req.user.userId;
    return this.orderService.createOrder(buyerId, sellerId, dto);
  }


  // get my all orders
  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  getMyOrders(@Req() req) {
    const userId = req.user.userId;
    return this.orderService.getMyOrders(userId);
  }


  // get single order
  @UseGuards(JwtAuthGuard)
  @Get('my-single-order/:orderId')
  getSingleOrder(@Param('orderId') orderId: string) {
    return this.orderService.getSingleOrder(orderId);
  }
  


}
