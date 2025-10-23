// dashborad.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Prisma, ProductStatus } from '@prisma/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { paginateResponse, PaginationDto } from 'src/common/pagination';
import { Product } from '../products/entities/product.entity';
import { MonthWithDay } from 'src/common/utils/date.utils';


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
  /*============----=   Admin Dashboard     =----============*/
   

  // get total pending products
  async totalPendingProducts(
    paginationDto: PaginationDto) 
    {
      const { page, perPage } = paginationDto;
      const skip = (page - 1) * perPage;

      const whereClause = {
        status: ProductStatus.PENDING,
      }

      const [total, products] = await this.prisma.$transaction([
        this.prisma.product.count({ where: whereClause }),
        this.prisma.product.findMany({
          where: whereClause,
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            product_title: true,
            size: true,
            status: true,
            color: true,
            condition: true,
            price: true,
            photo: true,
            created_at: true,
            user:{
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
            }
          },
        }
        }),
      ]);

      const formattedProducts = products.map((product) => ({
        id: product.id,
        title: product.product_title,
        size: product.size,
        status: product.status,
        color: product.color,
        condition: product.condition,
        price: product.price,
        photo: product.photo ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`) : null,
        createdAt: MonthWithDay(product.created_at),
        user: {
          id: product.user.id,
          name: product.user.name,
        },
      }));

      return {
        success: true,
        message: 'Total pending products fetched successfully',
        ...paginateResponse(formattedProducts, total, page, perPage),
      };
  }
  
  // product approved
  async approveOrRejectProduct(
    productId: string,
    userId: string,
    status: ProductStatus
  ) {
   
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return {
        success: false,
        message: 'Product not found',
      };
    }

    if(product.status === ProductStatus.APPROVED){
      return {
        success: false,
        message: `Product is already approved`,
      };
    }

    // Update product status
    await this.prisma.product.update({
      where: { id: productId },
      data: { 
        status: status,
      },
    });

    return {
      success: true,
      message: `Product ${productId} ${status === ProductStatus.APPROVED ? 'approved' : 'rejected'} successfully`,
    };
  }

  //============ order related

  
  // Total delivered orders
  async totalDeliveredOrders( paginationDto: PaginationDto) {

      const { page, perPage } = paginationDto;
      const skip = (page - 1) * perPage;

      const whereClause = {
        order_status: OrderStatus.DELIVERED,
      }

      const total = await this.prisma.order.count({ where: whereClause });

      const orders = await this.prisma.order.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        include: {
          order_items: {
            include: {
              product: {
                select: {
                  id: true,
                  product_title: true, 
                  photo: true,         
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true, 
            },
          },
          seller: {
            select: {
              id: true,
              name: true, 
            },
          },
        },
        skip,
        take: perPage,
      });

      const formattedOrders = orders.flatMap((order, orderIndex) =>
        order.order_items.map((item, itemIndex) => ({
          No: `${orderIndex + 1}`, 
          Product_Name: item.product.product_title,
          Product_Photo: item.product.photo,
          Seller_Name: order.seller.name,
          Buyer_Name: order.buyer.name,
          Delivery_Address: order.shipping_address,
          Qnty: item.quantity, 
          Amount: item.total_price,
          Delivery_date: MonthWithDay(order.delivery_date),
          Action: order.order_status,
        })),
      );



      return {
        success: true,
        message: 'Completed orders fetched successfully',
        ...paginateResponse(formattedOrders, total, page, perPage),
      };
  }

  // Total Pending orders
  async pendingOrders( paginationDto: PaginationDto) {

   const { page, perPage } = paginationDto;
   const skip = (page - 1) * perPage;

   const whereClause = {
    order_status: OrderStatus.PENDING,
   }
    
   const total = await this.prisma.order.count({ where: whereClause });

   const orders = await this.prisma.order.findMany({
    where: whereClause,
    orderBy: { created_at: 'desc' },
    include: {
     order_items: {
      include: {
       product: {
        select: {
         id: true,
         product_title: true, 
         photo: true,     
        },
       },
      },
     },
     buyer: {
      select: {
       id: true,
       name: true, 
      },
     },
     seller: {
      select: {
       id: true,
       name: true, 
      },
     },
    },
    skip,
    take: perPage,
   });

   const formattedOrders = orders.flatMap((order, orderIndex) =>
    order.order_items.map((item, itemIndex) => ({
     No: `${orderIndex + 1}`, 
     Product_Name: item.product.product_title,
     Product_Photo: item.product.photo,
     Seller_Name: order.seller.name,
     Buyer_Name: order.buyer.name,
     Delivery_Address: order.shipping_address,
     Qnty: item.quantity, 
     Amount: item.total_price,
     Delivery_date: MonthWithDay(order.delivery_date),
     Action: order.order_status,
    })),
   );

   return {
    success: true,
    message: 'Pending orders fetched successfully',
    ...paginateResponse(formattedOrders, total, page, perPage),
   };
  }

  // total cancelled orders
  async cancelledOrders( paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      order_status: OrderStatus.CANCELLED,
    }

    const total = await this.prisma.order.count({ where: whereClause });

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                product_title: true,
                photo: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: perPage,
    });

    const formattedOrders = orders.flatMap((order, orderIndex) =>
      order.order_items.map((item, itemIndex) => ({
        No: `${orderIndex + 1}`,
        Product_Name: item.product.product_title,
        Product_Photo: item.product.photo,
        Seller_Name: order.seller.name,
        Buyer_Name: order.buyer.name,
        Delivery_Address: order.shipping_address,
        Qnty: item.quantity,
        Amount: item.total_price,
        Delivery_date: MonthWithDay(order.delivery_date),
        Action: order.order_status,
      })),
    );

    return {
      success: true,
      message: 'Cancelled orders fetched successfully',
      ...paginateResponse(formattedOrders, total, page, perPage),
    };
  }

}