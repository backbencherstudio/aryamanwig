import { Injectable } from '@nestjs/common';
import { CreateDashboradDto } from './dto/create-dashborad.dto';
import { UpdateDashboradDto } from './dto/update-dashborad.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class DashboradService {

  constructor(private readonly prisma: PrismaService) {}


  // fetch order demo list

   private async fetchOrders( userId: string, role: 'buyer' | 'seller', status?: OrderStatus){  

    const whereCondition: any = {};

    if(role === 'buyer'){
      whereCondition.buyer_id = userId;
    }

    if(role === 'seller'){
      whereCondition.seller_id = userId;
    }

    if(status){
      whereCondition.order_status = status;
    }

    const orderList = await this.prisma.order.findMany({
      where: whereCondition,
      select: {
        id: true,
        order_status: true,
        order_items: {
          select: {
            quantity: true,
            total_price: true,
            product: {
              select: {
                id: true,
                product_title: true,
                price: true,
                photo: true,
              },
            },
          },
        },
      },
    });


    return orderList.map((order) => ({
      id: order.id,
      items: order.order_items.map((item) => ({
        quantity: item.quantity,
        total_price: item.total_price,
        product_id: item.product.id,
        product_title: item.product.product_title,
        price: item.product.price,
        photo: item.product.photo
          ? SojebStorage.url(`${appConfig().storageUrl.product}/${item.product.photo}`)
          : null,
      })),
    }));
  }





  /*================= Brought Item For User =====================*/


  // total brought item for user
  async totalBroughtItem(userId: string) {

    const data = await this.fetchOrders( userId, 'buyer');

    return {
      success: true,
      message: 'Total Brought item fetched successfully',
      total_item: data.length,
      data: data
    }

  
  }


  // bought pending item  for user
  async boughtPendingItem(userId: string) {
    const data = await this.fetchOrders(userId, 'buyer', 'PENDING');
    return {
      success: true,
      message: 'Bought pending item fetched successfully',
      total_item: data.length,
      data: data,
    };
  }
  

  // bought delivered item  for user
  async boughtDeliveredItem(userId: string) {
    const data = await this.fetchOrders(userId, 'buyer', 'DELIVERED');
    return {
      success: true,
      total_item: data.length,
      message: 'Bought delivered item fetched successfully',
      data: data,
    };
  }

    
  // bought cancelled item for user
  async boughtCancelledItem(userId: string) {
    const data = await this.fetchOrders(userId, 'buyer', 'CANCELLED');
    return {
      success: true,
      message: 'Bought cancelled item fetched successfully',
      data: data,
    };
  }

  
  /*================= Selling Item For User =====================*/


  // total selling item for user
  async totalSellingItem(userId: string) {
    const data = await this.fetchOrders(userId, 'seller'); // fetchOrders ব্যবহার করা হয়েছে
    return {
      success: true,
      message: 'Total Selling item fetched successfully',
      total_item: data.length,
      data: data,
    };
  } 


  // selling pending item  for user
  async sellingPendingItem(userId: string) {
    const data = await this.fetchOrders(userId, 'seller', 'PENDING');
    return {
      success: true,
      message: 'Selling pending item fetched successfully',
      total_item: data.length,
      data: data,
    };
  }


  // selling delivered item  for user
  async sellingDeliveredItem(userId: string) {
    const data = await this.fetchOrders(userId, 'seller', 'DELIVERED');
    return {
      success: true,
      message: 'Selling delivered item fetched successfully',
      total_item: data.length,
      data: data,
    };
  }


  // selling cancelled item  for user
  async sellingCancelledItem(userId: string) {
    const data = await this.fetchOrders(userId, 'seller', 'CANCELLED');
    return {
      success: true,
      message: 'Selling cancelled item fetched successfully',
      total_item: data.length,
      data: data,
    };
  }


}
  
  