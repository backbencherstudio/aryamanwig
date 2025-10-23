// dashborad.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { paginateResponse, PaginationDto } from 'src/common/pagination';


@Injectable()
export class DashboradService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches and paginates orders for a user, either as a buyer or a seller.
   * This is a private helper method to keep the code DRY.
   */
  private async fetchOrders(
    userId: string,
    role: 'buyer' | 'seller',
    paginationDto: PaginationDto,
    status?: OrderStatus,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereCondition: Prisma.OrderWhereInput = {};
    if (role === 'buyer') whereCondition.buyer_id = userId;
    if (role === 'seller') whereCondition.seller_id = userId;
    if (status) whereCondition.order_status = status;

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: whereCondition }),
      this.prisma.order.findMany({
        where: whereCondition,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
       
        select: {
          id: true,
          order_status: true,
          buyer: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          seller: {
            select: { id: true, name: true, email: true, avatar: true },
          },
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
      }),
    ]);

    
    const formattedOrders = orders.map((order) => ({
      order_id: order.id,
      order_status: order.order_status,
      // If the user is a 'buyer', show the 'seller' info, and vice-versa.
      order_partner:
        role === 'buyer'
          ? {
              id: order.seller?.id,
              name: order.seller?.name,
              email: order.seller?.email,
              avatar: order.seller?.avatar
                ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${order.seller.avatar}`)
                : null,
            }
          : {
              id: order.buyer?.id,
              name: order.buyer?.name,
              email: order.buyer?.email,
              avatar: order.buyer?.avatar
                ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${order.buyer.avatar}`)
                : null,
            },
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
    
    return { total, orders: formattedOrders };
  }

  /*================= Brought Item For User =====================*/

  async totalBroughtItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'buyer', paginationDto);
    return {
      success: true,
      message: 'Total brought items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  async boughtPendingItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'buyer', paginationDto, 'PENDING');
    return {
      success: true,
      message: 'Bought pending items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  async boughtDeliveredItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'buyer', paginationDto, 'DELIVERED');
    return {
      success: true,
      message: 'Bought delivered items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  async boughtCancelledItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'buyer', paginationDto, 'CANCELLED');
    return {
      success: true,
      message: 'Bought cancelled items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  /*================= Selling Item For User =====================*/

  async totalSellingItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'seller', paginationDto);
    return {
      success: true,
      message: 'Total selling items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  async sellingPendingItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'seller', paginationDto, 'PENDING');
    return {
      success: true,
      message: 'Selling pending items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  async sellingDeliveredItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'seller', paginationDto, 'DELIVERED');
    return {
      success: true,
      message: 'Selling delivered items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  async sellingCancelledItem(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const { total, orders } = await this.fetchOrders(userId, 'seller', paginationDto, 'CANCELLED');
    return {
      success: true,
      message: 'Selling cancelled items fetched successfully',
      ...paginateResponse(orders, total, page, perPage),
    };
  }

  /*================= Selling Item For User =====================*/
}