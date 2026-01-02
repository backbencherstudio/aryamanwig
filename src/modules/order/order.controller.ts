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
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateOrderDto } from "./dto/create-order.dto";
import { log } from "node:console";
import { OrderStatus } from "@prisma/client";
import { PaginationDto } from "src/common/pagination/dto/offset-pagination.dto";

@Controller("order")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  //create order
  @UseGuards(JwtAuthGuard)
  @Post("create")
  async createOrderForSelectedItems(@Req() req, @Body() dto: CreateOrderDto) {
    const userId = req.user.userId;
    return this.orderService.createOrder(userId, dto);
  }



  // get my all orders
  @UseGuards(JwtAuthGuard)
  @Get("my-orders")
  async getMyOrders(@Req() req, @Query() paginationDto: PaginationDto) {
    const userId = req.user.userId;
    return this.orderService.getMyOrders(userId, paginationDto);
  }


  // get my all orders with pending
  @UseGuards(JwtAuthGuard)
  @Get("my-orders-pending")
  async getMyOrdersWithPending(
    @Req() req,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = req.user.userId;
    return this.orderService.getMyOrdersWithPending(userId, paginationDto);
  }

  

  // get single order
  @UseGuards(JwtAuthGuard)
  @Get("my-single-order/:orderId")
  getSingleOrder(@Param("orderId") orderId: string) {
    return this.orderService.getSingleOrder(orderId);
  }
}
