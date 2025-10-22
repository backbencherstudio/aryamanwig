import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
// import { OrderProductDto, ShippingInfoDto } from './dto/create-order.dto';
import { Decimal, Or } from '@prisma/client/runtime/library';
import { CreateOrderDto } from './dto/create-order.dto';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { paginateResponse, PaginationDto } from 'src/common/pagination';

@Injectable()
export class OrderService {

  constructor(private prisma: PrismaService) {}


  // create order
  async createOrder(buyerId: string, sellerId: string, dto: CreateOrderDto) {

  
    const cart = await this.prisma.cart.findFirst({
      where: { user_id: buyerId },
      include: {
        cartItems: {
          include: {
            product: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');

    const items = cart.cartItems.filter(
      (i) => i.product.user.id === sellerId,
    );

    if (items.length === 0) {
      throw new NotFoundException('No products found for this seller');
    }

    const grandTotal = items.reduce(
      (sum, i) => sum + parseFloat(i.total_price.toString()),
      0,
    );

    // ✅ Transaction শুরু
    const result = await this.prisma.$transaction(async (tx) => {

      
      const order = await tx.order.create({
        data: {
          buyer_id: buyerId,
          seller_id: sellerId,
          grand_total: new Decimal(grandTotal),
          order_status: 'PENDING',
          payment_status: 'DUE',
          shipping_name: dto.shipping_name,
          email: dto.email,
          shipping_country: dto.shipping_country,
          shipping_state: dto.shipping_state,
          shipping_city: dto.shipping_city,
          shipping_zip_code: dto.shipping_zip_code,
          shipping_address: dto.shipping_address,
        },
      });

      
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            total_price: item.total_price,
          },
        });
      }

      // 3️⃣ ওই seller এর কার্ট থেকে পণ্য ডিলিট করা হচ্ছে
      await tx.cartItem.deleteMany({
        where: {
          cart_id: cart.id,
          product: { user_id: sellerId },
        },
      });

      return order;
    });

   
    return {
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: result.id,
        seller_id: sellerId,
        total: grandTotal,
        items: items.map((i) => ({
          product_id: i.product.id,
          title: i.product.product_title,
          price: i.product.price,
          quantity: i.quantity,
          total_price: i.total_price,
        })),
      },
    };
  }


  // get my all orders
  async getMyOrders(userId: string, paginationDto: PaginationDto) {

  const { page, perPage } = paginationDto;
  const skip = (page - 1) * perPage;
  
  const whereClause = { buyer_id: userId };

  const [total, orders] = await this.prisma.$transaction([
    this.prisma.order.count({ where: whereClause }),
    this.prisma.order.findMany({
      where: whereClause,
      skip,
      take: perPage,
      orderBy: { created_at: 'desc' },
      include: {
        seller: {
          select: { id: true, name: true, avatar: true },
        },
        order_items: {
          include: {
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

  if (total === 0) {
    return {
      success: true,
      message: 'No orders found',
      ...paginateResponse([], total, page, perPage),
    };
  }
  
  const baseUrl = appConfig().storageUrl.product;
  const formattedOrders = orders.map((o) => ({
    order_id: o.id,
    seller: {
      id: o.seller.id,
      name: o.seller.name,
      avatar: o.seller.avatar
        ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${o.seller.avatar}`) // Use avatar storage for user avatars
        : null,
    },
    total: o.grand_total,
    status: o.order_status,
    created_at: o.created_at,
    items: o.order_items.map((i) => ({
      product_id: i.product.id,
      title: i.product.product_title,
      price: i.product.price,
      photo: i.product.photo
        ? SojebStorage.url(`${baseUrl}/${i.product.photo}`)
        : null,
      quantity: i.quantity,
      total_price: i.total_price,
    })),
  }));
  
  const paginatedData = paginateResponse(formattedOrders, total, page, perPage);

  return {
    success: true,
    message: 'Orders fetched successfully',
    ...paginatedData, 
  };
}


  // get single order
  async getSingleOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, name: true, email: true, avatar: true } },
        seller: { select: { id: true, name: true, email: true, avatar: true } },
        order_items: {
          include: {
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

    if (!order) throw new NotFoundException('Order not found');

    const baseUrl = appConfig().storageUrl.product;

   
    const sellerAvatar = order.seller?.avatar
      ? SojebStorage.url(`${baseUrl}/${order.seller.avatar}`)
      : null;

    const buyerAvatar = order.buyer?.avatar
      ? SojebStorage.url(`${baseUrl}/${order.buyer.avatar}`)
      : null;

    
    const products = order.order_items.map((item) => ({
      product_id: item.product.id,
      product_title: item.product.product_title,
      price: item.product.price,
      photo: item.product.photo
        ? SojebStorage.url(`${baseUrl}/${item.product.photo}`)
        : null,
      quantity: item.quantity,
      total_price: item.total_price,
    }));

    
    return {
      success: true,
      message: 'Order details fetched successfully',
      data: {
        order_id: order.id,
        grand_total: order.grand_total,
        status: order.order_status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        seller: {
          id: order.seller.id,
          name: order.seller.name,
          email: order.seller.email,
          avatar: sellerAvatar,
        },
        buyer: {
          id: order.buyer.id,
          name: order.buyer.name,
          email: order.buyer.email,
          avatar: buyerAvatar,
        },
        shipping_info: {
          name: order.shipping_name,
          country: order.shipping_country,
          state: order.shipping_state,
          city: order.shipping_city,
          zip_code: order.shipping_zip_code,
          address: order.shipping_address,
        },
        products,
      },
    };
  }


  

}