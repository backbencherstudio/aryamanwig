import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { OrderStatus, Prisma } from "@prisma/client";
import { Decimal, Or } from "@prisma/client/runtime/library";
import { CreateOrderDto } from "./dto/create-order.dto";
import appConfig from "src/config/app.config";
import { SojebStorage } from "src/common/lib/Disk/SojebStorage";
import { paginateResponse, PaginationDto } from "src/common/pagination";
import { handlePrismaError } from "src/common/utils/prisma-error-handler";

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // create order
  async createOrder(userId: string, dto: CreateOrderDto) {
    const {
      cartItemIds,
      shipping_name,
      email,
      shipping_country,
      shipping_state,
      shipping_city,
      shipping_zip_code,
      shipping_address,
    } = dto;

    // Fetch cart items with product info
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        id: { in: cartItemIds },
        cart: { user_id: userId },
      },
      include: {
        product: {
          select: { id: true, user_id: true, price: true, stock: true },
        },
      },
    });

    if (!cartItems.length) throw new NotFoundException("Cart items not found");

    if (cartItems.length !== cartItemIds.length)
      throw new BadRequestException("Some cart items do not belong to you");

    // Ensure all items are from the same seller
    const sellerIds = [
      ...new Set(cartItems.map((item) => item.product.user_id)),
    ];
    if (sellerIds.length > 1) {
      throw new BadRequestException(
        "You cannot order products from multiple sellers at the same time.",
      );
    }

    const sellerId = sellerIds[0];

    // Check stock availability
    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        throw new BadRequestException(
          `Not enough stock for product ${item.product.id}`,
        );
      }
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.total_price),
      0,
    );

    const newOrder = await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          buyer_id: userId,
          seller_id: sellerId,
          grand_total: new Decimal(totalAmount),
          shipping_name,
          email,
          shipping_country,
          shipping_state,
          shipping_city,
          shipping_zip_code,
          shipping_address,
        },
      });

      // Create all order items & update product stock
      for (const item of cartItems) {
        await tx.orderItem.create({
          data: {
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            total_price: item.total_price,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: item.product.stock - item.quantity },
        });
      }

      // Remove ordered items from cart
      await tx.cartItem.deleteMany({
        where: { id: { in: cartItemIds } },
      });

      return order;
    });

    return {
      success: true,
      message: "Order created successfully.",
      order_id: newOrder.id,
      grand_total: totalAmount,
    };
  }

  // get my all orders
  async getMyOrdersWithPending(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = { buyer_id: userId, order_status: OrderStatus.PENDING };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: whereClause }),
      this.prisma.order.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
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
        message: "No orders found",
        ...paginateResponse([], total, page, perPage),
      };
    }

    const formattedOrders = orders.map((o) => ({
      order_id: o.id,
      seller: {
        id: o.seller.id,
        name: o.seller.name,
        avatar: o.seller.avatar
          ? SojebStorage.url(
              `${appConfig().storageUrl.avatar}/${o.seller.avatar}`,
            )
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
          ? i.product.photo.map((p: string) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
        quantity: i.quantity,
        total_price: i.total_price,
      })),
    }));

    const paginatedData = paginateResponse(
      formattedOrders,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: "Orders fetched successfully",
      ...paginatedData,
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
        orderBy: { created_at: "desc" },
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
        message: "No orders found",
        ...paginateResponse([], total, page, perPage),
      };
    }
    const formattedOrders = orders.map((o) => ({
      order_id: o.id,
      seller: {
        id: o.seller.id,
        name: o.seller.name,
        avatar: o.seller.avatar
          ? SojebStorage.url(
              `${appConfig().storageUrl.avatar}/${o.seller.avatar}`,
            )
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
          ? i.product.photo.map((p: string) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
        quantity: i.quantity,
        total_price: i.total_price,
      })),
    }));
    const paginatedData = paginateResponse(
      formattedOrders,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: "Orders fetched successfully",
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

    if (!order) throw new NotFoundException("Order not found");

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
        ? item.product.photo.map((p: string) =>
            SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
          )
        : [],
      quantity: item.quantity,
      total_price: item.total_price,
    }));

    return {
      success: true,
      message: "Order details fetched successfully",
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
