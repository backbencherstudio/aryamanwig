import { Injectable } from '@nestjs/common';
import { CreateDashboradDto } from './dto/create-dashborad.dto';
import { UpdateDashboradDto } from './dto/update-dashborad.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboradService {

  constructor(private readonly prisma: PrismaService) {}

  // recently order
  // async recentOrder() {
  //   const orders = await this.prisma.order.findMany({
  //     include: {
  //       buyer: true,   
  //       seller: true,  
  //       order_items: {
  //         include: { product: true }
  //       }
  //     },
  //     orderBy: {
  //       created_at: 'desc',
  //     },
  //     take: 5,
  //   });

  //   console.log(orders);
  
  //   return orders;

  // }

  // // get only paid order
  // async paidOrder() {
  //   const paidOrders = await this.prisma.order.findMany({
  //     where: {
  //       payment_status: 'PAID',
  //     },  
  //     include: {
  //       buyer: true,   
  //       seller: true,  
  //     },  
  //     orderBy: {
  //       created_at: 'desc',
  //     },  
  //     take: 5,
  //   }); 
  //   return paidOrders;
  // }


  // // get only pending order
  // async pendingOrder() {
  //   const pendingOrders = await this.prisma.order.findMany({
  //     where: {
  //       payment_status: 'PENDING',
  //     },
  //     include: {
  //       buyer: true,
  //       seller: true,
  //     },
  //     orderBy: {
  //       created_at: 'desc',
  //     },
  //     take: 5,
  //   });
  //   return pendingOrders;
  // } 

  // // product upload approve list request
  // async productUploadRequest() {
  //   const productRequests = await this.prisma.product.findMany({
  //     where: {
  //       status: 'PENDING',
  //     },
  //     include: {
  //       seller: true,
  //     },
  //   });
  //   return productRequests;
  // }

  // product 

}